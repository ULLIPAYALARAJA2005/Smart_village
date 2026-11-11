from django.contrib import admin
from .models import Announcement, AnnouncementActivity


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ["id", "original_title", "category", "priority", "is_published", "published_at", "total_views", "total_listens"]
    list_filter = ["category", "priority", "is_published", "original_language"]
    search_fields = ["original_title", "english_title", "telugu_title", "english_content", "telugu_content"]


@admin.register(AnnouncementActivity)
class AnnouncementActivityAdmin(admin.ModelAdmin):
    list_display = ["id", "announcement", "user", "viewed", "listened", "viewed_at", "listened_at"]
    list_filter = ["viewed", "listened"]
