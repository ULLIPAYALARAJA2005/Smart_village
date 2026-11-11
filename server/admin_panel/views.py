from rest_framework.decorators import api_view
from rest_framework.response import Response

from users.models import User


@api_view(["GET"])
def signup_requests(request):

    if not request.user.is_authenticated:
        return Response(
            {"message": "Login required"},
            status=401
        )

    if request.user.role != "admin":
        return Response(
            {"message": "Admin access required"},
            status=403
        )

    users = User.objects.filter(
        status="pending"
    ).order_by("id")

    return Response([
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "aadhar": user.aadhar,
        }
        for user in users
    ])


@api_view(["PUT"])
def approve_user(request, id):

    if not request.user.is_authenticated:
        return Response(
            {"message": "Login required"},
            status=401
        )

    if request.user.role != "admin":
        return Response(
            {"message": "Admin access required"},
            status=403
        )

    try:
        user = User.objects.get(
            id=id,
            status="pending"
        )
    except User.DoesNotExist:
        return Response(
            {"message": "Signup request not found"},
            status=404
        )

    user.status = "approved"
    user.save()

    return Response({
        "success": True,
        "status": user.status
    })


@api_view(["PUT"])
def reject_user(request, id):

    if not request.user.is_authenticated:
        return Response(
            {"message": "Login required"},
            status=401
        )

    if request.user.role != "admin":
        return Response(
            {"message": "Admin access required"},
            status=403
        )

    try:
        user = User.objects.get(
            id=id,
            status="pending"
        )
    except User.DoesNotExist:
        return Response(
            {"message": "Signup request not found"},
            status=404
        )

    user.status = "rejected"
    user.save()

    return Response({
        "success": True,
        "status": user.status
    })


@api_view(["POST"])
def create_worker(request):
    """Admin creates a worker account with credentials to give to the worker"""
    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=401)
    if request.user.role != "admin":
        return Response({"message": "Admin access required"}, status=403)

    username = request.data.get("username", "").strip()
    password = request.data.get("password", "").strip()
    email = request.data.get("email", "").strip()
    first_name = request.data.get("first_name", "").strip()
    last_name = request.data.get("last_name", "").strip()
    aadhar = request.data.get("aadhar", "").strip() or None

    if not username:
        return Response({"message": "Username is required"}, status=400)
    if not password:
        return Response({"message": "Password is required"}, status=400)
    if not email:
        return Response({"message": "Email is required"}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"message": f"Username '{username}' is already taken"}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({"message": f"Email '{email}' is already registered"}, status=400)

    if aadhar and User.objects.filter(aadhar=aadhar).exists():
        return Response({"message": f"Aadhaar '{aadhar}' is already registered"}, status=400)

    worker = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        aadhar=aadhar,
        role="worker",
        status="approved",
    )

    return Response(
        {
            "success": True,
            "message": "Worker account created successfully!",
            "worker": {
                "id": worker.id,
                "username": worker.username,
                "email": worker.email,
                "first_name": worker.first_name,
                "last_name": worker.last_name,
                "aadhar": worker.aadhar,
                "role": worker.role,
                "status": worker.status,
            },
            "credentials": {
                "username": username,
                "password": password,
                "role": "Worker",
            },
        },
        status=201,
    )


@api_view(["GET"])
def list_admin_workers(request):
    """Get all workers with active workload statistics"""
    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=401)
    if request.user.role != "admin":
        return Response({"message": "Admin access required"}, status=403)

    from issues.models import WorkAssignment

    workers = User.objects.filter(role="worker").order_by("-date_joined")
    data = []
    for w in workers:
        active_count = WorkAssignment.objects.filter(worker=w).exclude(work_status__in=["Verified", "Rejected"]).count()
        completed_count = WorkAssignment.objects.filter(worker=w, work_status__in=["Completed", "Verified"]).count()
        data.append({
            "id": w.id,
            "username": w.username,
            "first_name": w.first_name,
            "last_name": w.last_name,
            "email": w.email,
            "aadhar": w.aadhar,
            "status": w.status,
            "date_joined": w.date_joined.strftime("%Y-%m-%d"),
            "active_tasks": active_count,
            "completed_tasks": completed_count,
        })
    return Response(data)


@api_view(["POST"])
def reset_worker_password(request, id):
    """Admin resets a worker's password"""
    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=401)
    if request.user.role != "admin":
        return Response({"message": "Admin access required"}, status=403)

    try:
        worker = User.objects.get(id=id, role="worker")
    except User.DoesNotExist:
        return Response({"message": "Worker not found"}, status=404)

    new_password = request.data.get("new_password", "").strip()
    if not new_password:
        return Response({"message": "New password is required"}, status=400)

    worker.set_password(new_password)
    worker.save()

    return Response({
        "success": True,
        "message": f"Password for {worker.username} updated successfully!",
        "credentials": {
            "username": worker.username,
            "password": new_password,
        }
    })
