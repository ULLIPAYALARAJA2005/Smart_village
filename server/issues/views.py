from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Issue, WorkAssignment
from .serializers import IssueSerializer, WorkAssignmentSerializer
from users.models import User


@api_view(["GET", "POST"])
def issue_list(request, category):
    if request.method == "GET":
        if not request.user.is_authenticated:
            return Response({"message": "Login required"}, status=401)
        issues = Issue.objects.filter(category=category)
        all_issues = IssueSerializer(issues, many=True, context={"request": request})
        return Response(all_issues.data)

    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=401)

    if request.user.role != "villager":
        return Response({"message": "You are not allowed"}, status=403)

    lat = request.data.get("latitude")
    lng = request.data.get("longitude")
    acc = request.data.get("location_accuracy")

    issue = Issue.objects.create(
        category=category,
        user=request.user,
        street=request.data.get("street", ""),
        house_no=request.data.get("houseNo", ""),
        description=request.data.get("description", ""),
        photo=request.FILES.get("photo"),
        date=request.data.get("date", ""),
        time=request.data.get("time", ""),
        input_method=request.data.get("input_method", "manual"),
        language=request.data.get("language", "en"),
        latitude=float(lat) if (lat is not None and str(lat).strip() != "") else None,
        longitude=float(lng) if (lng is not None and str(lng).strip() != "") else None,
        location_accuracy=float(acc) if (acc is not None and str(acc).strip() != "") else None,
        location_captured=bool(lat and lng),
        priority=request.data.get("priority", "medium") or "medium",
    )

    pred_text_cat = request.data.get("predicted_text_category")
    pred_img_cat = request.data.get("predicted_image_category")
    if pred_text_cat or pred_img_cat:
        from .models import IssueAIAnalysis
        IssueAIAnalysis.objects.create(
            issue=issue,
            predicted_text_category=pred_text_cat,
            text_similarity_score=float(request.data.get("text_similarity_score", 0.0) or 0.0),
            predicted_image_category=pred_img_cat,
            image_similarity_score=float(request.data.get("image_similarity_score", 0.0) or 0.0),
            text_model_version=request.data.get("text_model_version", "paraphrase-multilingual-MiniLM-L12-v2"),
            image_model_version=request.data.get("image_model_version", "openai/clip-vit-base-patch32"),
        )

    return Response(
        {
            "message": "Issue submitted successfully!",
            "id": issue.id,
            "issue": IssueSerializer(issue, context={"request": request}).data,
        },
        status=201,
    )


@api_view(["PUT"])
def update_issue_status(request, category, id):
    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=401)

    if request.user.role not in ["worker", "admin"]:
        return Response({"message": "You are not allowed"}, status=403)

    try:
        issue = Issue.objects.get(id=id, category=category)
    except Issue.DoesNotExist:
        return Response({"message": "Issue not found"}, status=404)

    issue.status = request.data.get("status", issue.status)

    if "deadline" in request.data:
        issue.deadline = request.data["deadline"]

    if "reason" in request.data:
        issue.reason = request.data["reason"]

    issue.save()

    return Response({
        "success": True,
        "issue": IssueSerializer(issue, context={"request": request}).data,
    })


@api_view(["GET"])
def issues_map(request):
    """All issues with GPS coordinates - for admin map view"""
    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=401)
    if request.user.role != "admin":
        return Response({"message": "Admin only"}, status=403)

    issues = Issue.objects.filter(location_captured=True).select_related("user", "assignment__worker")
    return Response(IssueSerializer(issues, many=True, context={"request": request}).data)


@api_view(["GET"])
def issues_all(request):
    """All issues regardless of category - for admin dashboard"""
    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=401)
    if request.user.role != "admin":
        return Response({"message": "Admin only"}, status=403)

    issues = Issue.objects.all().select_related("user", "assignment__worker").order_by("-id")
    return Response(IssueSerializer(issues, many=True, context={"request": request}).data)


@api_view(["POST"])
def assign_worker(request, issue_id):
    """Admin assigns a worker to an issue"""
    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=401)
    if request.user.role != "admin":
        return Response({"message": "Admin only"}, status=403)

    try:
        issue = Issue.objects.get(id=issue_id)
    except Issue.DoesNotExist:
        return Response({"message": "Issue not found"}, status=404)

    worker_id = request.data.get("worker_id")
    if not worker_id:
        return Response({"message": "worker_id required"}, status=400)

    try:
        worker = User.objects.get(id=worker_id, role="worker")
    except User.DoesNotExist:
        return Response({"message": "Worker not found"}, status=404)

    # Remove or update existing assignment
    assignment, created = WorkAssignment.objects.get_or_create(
        issue=issue,
        defaults={
            "worker": worker,
            "assigned_by": request.user,
            "priority": request.data.get("priority", issue.priority or "medium"),
            "admin_instructions": request.data.get("admin_instructions", ""),
            "work_status": "Assigned",
        }
    )

    if not created:
        assignment.worker = worker
        assignment.assigned_by = request.user
        assignment.priority = request.data.get("priority", issue.priority or "medium")
        assignment.admin_instructions = request.data.get("admin_instructions", "")
        assignment.work_status = "Assigned"
        assignment.save()

    # Update issue status and deadline
    issue.status = "Assigned"
    if request.data.get("deadline"):
        issue.deadline = request.data["deadline"]
    if request.data.get("priority"):
        issue.priority = request.data["priority"]
    issue.save()

    return Response({
        "message": "Worker assigned successfully",
        "assignment": WorkAssignmentSerializer(assignment).data,
        "issue": IssueSerializer(issue, context={"request": request}).data,
    }, status=201)


@api_view(["GET"])
def worker_assignments(request):
    """Worker sees their assigned issues with assignment and issue details"""
    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=401)
    if request.user.role != "worker":
        return Response({"message": "Worker only"}, status=403)

    assignments = WorkAssignment.objects.filter(worker=request.user).select_related("issue", "issue__user").order_by("-assigned_at")
    data = []
    for a in assignments:
        issue_data = IssueSerializer(a.issue, context={"request": request}).data
        assignment_data = WorkAssignmentSerializer(a).data
        data.append({**issue_data, "assignment": assignment_data})
    return Response(data)


@api_view(["PUT", "PATCH", "DELETE"])
def manage_issue(request, issue_id):
    """
    Allows villager (owner) or admin to edit or delete a registered complaint
    BEFORE a worker has been assigned to it.
    """
    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=401)

    try:
        issue = Issue.objects.select_related("assignment__worker").get(id=issue_id)
    except Issue.DoesNotExist:
        return Response({"message": "Complaint not found"}, status=404)

    # Permission check: must be owner or admin
    if issue.user_id != request.user.id and request.user.role != "admin":
        return Response({"message": "You are not authorized to modify this complaint"}, status=403)

    # Check if a worker is already assigned to this problem
    has_worker = (
        hasattr(issue, "assignment")
        and issue.assignment.worker is not None
        and issue.assignment.work_status not in ["Unassigned", "Rejected"]
    )
    if has_worker or issue.status not in ["Pending", "Unassigned"]:
        action_word = "delete" if request.method == "DELETE" else "edit"
        return Response(
            {
                "message": f"Cannot {action_word} this complaint because a worker has already been assigned to it."
            },
            status=400,
        )

    if request.method == "DELETE":
        issue.delete()
        return Response({"message": "Complaint deleted successfully!"}, status=200)

    # PUT / PATCH: Update complaint details
    if "category" in request.data and request.data.get("category"):
        issue.category = request.data.get("category")
    if "street" in request.data:
        issue.street = request.data.get("street")
    if "houseNo" in request.data:
        issue.house_no = request.data.get("houseNo")
    elif "house_no" in request.data:
        issue.house_no = request.data.get("house_no")
    if "description" in request.data:
        issue.description = request.data.get("description")
    if "photo" in request.FILES:
        issue.photo = request.FILES.get("photo")

    lat = request.data.get("latitude")
    lng = request.data.get("longitude")
    acc = request.data.get("location_accuracy")

    if lat is not None and str(lat).strip() != "":
        issue.latitude = float(lat)
    if lng is not None and str(lng).strip() != "":
        issue.longitude = float(lng)
    if acc is not None and str(acc).strip() != "":
        issue.location_accuracy = float(acc)
    if issue.latitude and issue.longitude:
        issue.location_captured = True

    issue.save()
    return Response(
        {
            "message": "Complaint updated successfully!",
            "issue": IssueSerializer(issue, context={"request": request}).data,
        },
        status=200,
    )



@api_view(["POST"])
def assignment_action(request, assignment_id, action):
    """Worker or Admin updates assignment status lifecycle"""
    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=401)
    if request.user.role not in ["worker", "admin"]:
        return Response({"message": "Worker or Admin access required"}, status=403)

    from django.db.models import Q

    # Allow lookup by WorkAssignment id OR Issue id
    assignment = WorkAssignment.objects.filter(
        Q(id=assignment_id) | Q(issue_id=assignment_id)
    ).first()

    if not assignment:
        # If assignment doesn't exist yet, check if issue exists and create one
        try:
            issue_obj = Issue.objects.get(id=assignment_id)
            assignment = WorkAssignment.objects.create(
                issue=issue_obj,
                worker=request.user if request.user.role == "worker" else None,
                work_status="Assigned",
                priority=issue_obj.priority or "medium",
            )
        except Issue.DoesNotExist:
            return Response({"message": "Assignment not found"}, status=404)

    # If assignment has no worker yet and user is a worker, assign to this worker
    if assignment.worker is None and request.user.role == "worker":
        assignment.worker = request.user

    now = timezone.now()
    action_map = {
        "accept": ("Accepted", "accepted_at", "In Progress"),
        "on-the-way": ("On the Way", "on_the_way_at", "In Progress"),
        "reached": ("Reached", "reached_at", "In Progress"),
        "start": ("In Progress", "work_started_at", "In Progress"),
        "complete": ("Completed", "completed_at", "In Progress"),
    }

    if action not in action_map:
        return Response({"message": f"Invalid action: {action}"}, status=400)

    work_status, timestamp_field, issue_status = action_map[action]
    assignment.work_status = work_status
    if getattr(assignment, timestamp_field) is None:
        setattr(assignment, timestamp_field, now)

    if action == "complete":
        if request.FILES.get("completion_photo"):
            assignment.completion_photo = request.FILES["completion_photo"]
        if request.data.get("completion_notes"):
            assignment.completion_notes = request.data["completion_notes"]
        if request.data.get("worker_notes"):
            assignment.worker_notes = request.data["worker_notes"]
        # Keep issue status as In Progress until verified by Admin
        assignment.issue.status = "In Progress"
        assignment.issue.save()
    elif issue_status:
        assignment.issue.status = issue_status
        assignment.issue.save()

    if request.data.get("worker_notes"):
        assignment.worker_notes = request.data["worker_notes"]

    assignment.save()

    return Response({
        "message": f"Status updated to {work_status}",
        "assignment": WorkAssignmentSerializer(assignment).data,
    })


@api_view(["POST"])
def verify_assignment(request, assignment_id):
    """Admin verifies completed work, transitions issue to Resolved"""
    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=401)
    if request.user.role != "admin":
        return Response({"message": "Admin only"}, status=403)

    from django.db.models import Q
    assignment = WorkAssignment.objects.filter(
        Q(id=assignment_id) | Q(issue_id=assignment_id)
    ).first()

    if not assignment:
        return Response({"message": "Assignment not found"}, status=404)

    assignment.work_status = "Verified"
    assignment.verified_at = timezone.now()
    assignment.save()

    assignment.issue.status = "Resolved"
    assignment.issue.save()

    return Response({
        "message": "Work verified and issue resolved",
        "assignment": WorkAssignmentSerializer(assignment).data,
        "issue": IssueSerializer(assignment.issue, context={"request": request}).data,
    })


@api_view(["GET"])
def assignment_stats(request):
    """Admin monitoring dashboard stats"""
    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=401)
    if request.user.role != "admin":
        return Response({"message": "Admin only"}, status=403)

    total_issues = Issue.objects.count()
    pending = Issue.objects.filter(status="Pending").count()
    assigned = Issue.objects.filter(status="Assigned").count()
    in_progress = Issue.objects.filter(status="In Progress").count()
    resolved = Issue.objects.filter(status="Resolved").count()
    gps_count = Issue.objects.filter(location_captured=True).count()

    assignments = WorkAssignment.objects.all()
    stats_by_status = {}
    for a in assignments:
        stats_by_status[a.work_status] = stats_by_status.get(a.work_status, 0) + 1

    # Worker breakdown
    workers = User.objects.filter(role="worker")
    worker_stats = []
    for w in workers:
        active = WorkAssignment.objects.filter(worker=w).exclude(work_status__in=["Verified", "Rejected"]).count()
        completed = WorkAssignment.objects.filter(worker=w, work_status__in=["Completed", "Verified"]).count()
        worker_stats.append({
            "id": w.id,
            "username": w.username,
            "email": w.email,
            "active_assignments": active,
            "completed_assignments": completed,
        })

    return Response({
        "total_issues": total_issues,
        "pending_issues": pending,
        "assigned_issues": assigned,
        "in_progress_issues": in_progress,
        "resolved_issues": resolved,
        "gps_issues": gps_count,
        "assignments_by_status": stats_by_status,
        "worker_stats": worker_stats,
    })


@api_view(["GET"])
def list_workers(request):
    """Admin gets approved workers list"""
    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=401)
    if request.user.role != "admin":
        return Response({"message": "Admin only"}, status=403)

    workers = User.objects.filter(role="worker")
    data = []
    for w in workers:
        active = WorkAssignment.objects.filter(worker=w).exclude(work_status__in=["Verified", "Rejected"]).count()
        data.append({
            "id": w.id,
            "username": w.username,
            "first_name": w.first_name,
            "last_name": w.last_name,
            "email": w.email,
            "active_assignments": active,
        })
    return Response(data)


