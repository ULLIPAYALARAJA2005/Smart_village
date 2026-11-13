from rest_framework import serializers
from issues.models import Issue, IssueAIAnalysis
from issues.serializers import IssueSerializer, IssueAIAnalysisSerializer


class ComplaintAnalysisSerializer(serializers.Serializer):
    description = serializers.CharField(required=False, allow_blank=True, default="")
    language = serializers.ChoiceField(choices=["te", "en", "te-IN", "en-IN"], default="te")
    photo = serializers.ImageField(required=False, allow_null=True)


class IssueStatusResponseSerializer(serializers.ModelSerializer):
    ai_analysis = IssueAIAnalysisSerializer(read_only=True)
    villagerName = serializers.SerializerMethodField()
    citizen_name = serializers.SerializerMethodField()
    citizen_phone = serializers.SerializerMethodField()
    village_name = serializers.SerializerMethodField()
    houseNo = serializers.CharField(source="house_no", read_only=True)
    can_view_contact = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            "id",
            "category",
            "user",
            "villagerName",
            "citizen_name",
            "citizen_phone",
            "village_name",
            "street",
            "house_no",
            "houseNo",
            "description",
            "photo",
            "date",
            "time",
            "status",
            "deadline",
            "reason",
            "input_method",
            "language",
            "latitude",
            "longitude",
            "location_accuracy",
            "location_captured",
            "priority",
            "ai_analysis",
            "can_view_contact",
        ]

    def _check_contact_permission(self, obj):
        request = self.context.get("request")
        if not request:
            return False
        user = getattr(request, "_force_auth_user", getattr(request, "user", None))
        if not user or not getattr(user, "is_authenticated", False):
            return False
        if getattr(user, "role", "") == "admin" or obj.user_id == user.id:
            return True
        if getattr(user, "role", "") == "worker":
            assignment = getattr(obj, "assignment", None)
            if assignment and assignment.worker_id == user.id:
                return True
        return False

    def get_can_view_contact(self, obj):
        return self._check_contact_permission(obj)

    def get_citizen_name(self, obj):
        return obj.get_citizen_name or (obj.user.username if obj.user else "Citizen")

    def get_villagerName(self, obj):
        return self.get_citizen_name(obj)

    def get_citizen_phone(self, obj):
        if not self._check_contact_permission(obj):
            return ""
        return obj.get_citizen_phone

    def get_village_name(self, obj):
        return obj.get_village_name
