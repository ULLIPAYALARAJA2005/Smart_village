from rest_framework import serializers

from .models import Issue


class IssueSerializer(serializers.ModelSerializer):
    _id = serializers.IntegerField(source="id", read_only=True)
    villagerName = serializers.CharField(source="user.username", read_only=True)
    aadhar =  serializers.CharField(source="user.aadhar", read_only=True)
    houseNo = serializers.CharField(source="house_no", read_only=True)

    class Meta:
        model = Issue
        fields = [
            "id", "_id", "category", "user", "villagerName", "aadhar",
            "street", "house_no", "houseNo", "description", "photo", "date",
            "time", "status", "deadline", "reason",
        ]
