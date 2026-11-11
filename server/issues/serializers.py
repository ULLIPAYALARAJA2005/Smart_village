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
        fields = ["id", "username", "first_name", "last_name", "email"]


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
    villagerName = serializers.CharField(source="user.username", read_only=True)
    aadhar = serializers.CharField(source="user.aadhar", read_only=True)
    houseNo = serializers.CharField(source="house_no", read_only=True)
    ai_analysis = IssueAIAnalysisSerializer(read_only=True)
    assignment = WorkAssignmentSerializer(read_only=True)

    class Meta:
        model = Issue
        fields = [
            "id", "_id", "category", "user", "villagerName", "aadhar",
            "street", "house_no", "houseNo", "description", "photo", "date",
            "time", "status", "deadline", "reason",
            "input_method", "language", "ai_analysis",
            "latitude", "longitude", "location_accuracy", "location_captured",
            "priority", "assignment",
        ]
