from rest_framework import serializers
from issues.models import Issue, IssueAIAnalysis
from issues.serializers import IssueSerializer, IssueAIAnalysisSerializer


class ComplaintAnalysisSerializer(serializers.Serializer):
    description = serializers.CharField(required=False, allow_blank=True, default="")
    language = serializers.ChoiceField(choices=["te", "en", "te-IN", "en-IN"], default="te")
    photo = serializers.ImageField(required=False, allow_null=True)


class IssueStatusResponseSerializer(serializers.ModelSerializer):
    ai_analysis = IssueAIAnalysisSerializer(read_only=True)
    villagerName = serializers.CharField(source="user.username", read_only=True)
    houseNo = serializers.CharField(source="house_no", read_only=True)

    class Meta:
        model = Issue
        fields = [
            "id",
            "category",
            "user",
            "villagerName",
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
            "ai_analysis",
        ]

