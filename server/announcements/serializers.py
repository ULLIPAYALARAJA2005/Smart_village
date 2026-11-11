from rest_framework import serializers
from .models import Announcement, AnnouncementActivity


class AnnouncementActivitySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = AnnouncementActivity
        fields = ["id", "user", "username", "full_name", "viewed", "listened", "viewed_at", "listened_at"]

    def get_full_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name if name else obj.user.username


class AnnouncementSerializer(serializers.ModelSerializer):
    publisher_name = serializers.SerializerMethodField()
    total_views = serializers.IntegerField(read_only=True)
    total_listens = serializers.IntegerField(read_only=True)
    user_viewed = serializers.SerializerMethodField()
    user_listened = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            "id",
            "original_title",
            "original_content",
            "original_language",
            "english_title",
            "english_content",
            "telugu_title",
            "telugu_content",
            "category",
            "priority",
            "attachment",
            "attachment_url",
            "published_by",
            "publisher_name",
            "published_at",
            "expiry_date",
            "is_published",
            "created_at",
            "updated_at",
            "total_views",
            "total_listens",
            "user_viewed",
            "user_listened",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "total_views", "total_listens"]

    def get_publisher_name(self, obj):
        if obj.published_by:
            name = f"{obj.published_by.first_name} {obj.published_by.last_name}".strip()
            return name if name else obj.published_by.username
        return "Village Administration"

    def get_user_viewed(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.activities.filter(user=request.user, viewed=True).exists()
        return False

    def get_user_listened(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.activities.filter(user=request.user, listened=True).exists()
        return False

    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None

