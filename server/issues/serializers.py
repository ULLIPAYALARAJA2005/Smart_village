from rest_framework import serializers

from .models import Issue, IssueAIAnalysis, WorkAssignment
from users.models import User


class IssueAIAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueAIAnalysis
        fields = [
            "id",
            "predicted_text_category",
            "text_similarity_score",
            "predicted_image_category",
            "image_similarity_score",
            "text_model_version",
            "image_model_version",
            "created_at",
        ]


class WorkerBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "mobile_number"]


class WorkAssignmentSerializer(serializers.ModelSerializer):
    worker_name = serializers.CharField(source="worker.username", read_only=True)
    assigned_by_name = serializers.CharField(source="assigned_by.username", read_only=True)

    class Meta:
        model = WorkAssignment
        fields = [
            "id",
            "issue",
            "worker",
            "worker_name",
            "assigned_by",
            "assigned_by_name",
            "assigned_at",
            "accepted_at",
            "on_the_way_at",
            "reached_at",
            "work_started_at",
            "completed_at",
            "verified_at",
            "work_status",
            "priority",
            "admin_instructions",
            "worker_notes",
            "completion_photo",
            "completion_notes",
        ]
        read_only_fields = ["assigned_at"]


class IssueSerializer(serializers.ModelSerializer):
    _id = serializers.IntegerField(source="id", read_only=True)
    villagerName = serializers.SerializerMethodField()
    citizen_name = serializers.SerializerMethodField()
    citizen_phone = serializers.SerializerMethodField()
    village_name = serializers.SerializerMethodField()
    aadhar = serializers.SerializerMethodField()
    houseNo = serializers.CharField(source="house_no", read_only=True)
    ai_analysis = IssueAIAnalysisSerializer(read_only=True)
    assignment = WorkAssignmentSerializer(read_only=True)
    can_view_contact = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            "id", "_id", "category", "user", "villagerName", "citizen_name",
            "citizen_phone", "village_name", "aadhar",
            "street", "house_no", "houseNo", "description", "photo", "date",
            "time", "status", "deadline", "reason",
            "input_method", "language", "ai_analysis",
            "latitude", "longitude", "location_accuracy", "location_captured",
            "priority", "assignment", "can_view_contact",
        ]

    def _check_contact_permission(self, obj):
        request = self.context.get("request")
        if not request:
            return False

        user = getattr(request, "_force_auth_user", getattr(request, "user", None))
        if not user or not getattr(user, "is_authenticated", False):
            return False

        # 1. Admin can view all contact info
        if getattr(user, "role", "") == "admin":
            return True

        # 2. Villager who owns this complaint can view their own contact info
        if obj.user_id == user.id:
            return True

        # 3. Assigned worker can view contact info ONLY if assigned to this specific complaint
        if getattr(user, "role", "") == "worker":
            # Check if assignment relation exists on issue
            assignment = getattr(obj, "assignment", None)
            if assignment and assignment.worker_id == user.id:
                return True

        return False

    def get_can_view_contact(self, obj):
        return self._check_contact_permission(obj)

    def get_citizen_name(self, obj):
        # Always return citizen's name or username
        return obj.get_citizen_name or (obj.user.username if obj.user else "Citizen")

    def get_villagerName(self, obj):
        return self.get_citizen_name(obj)

    def get_citizen_phone(self, obj):
        if not self._check_contact_permission(obj):
            return ""
        return obj.get_citizen_phone

    def get_village_name(self, obj):
        return obj.get_village_name

    def get_aadhar(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            if request.user.role == "admin" or obj.user_id == request.user.id:
                return getattr(obj.user, "aadhar", "") if obj.user else ""
        return ""
