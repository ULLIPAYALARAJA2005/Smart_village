from django.urls import path
from .views import (
    admin_announcement_list,
    admin_create_announcement,
    admin_update_announcement,
    admin_delete_announcement,
    admin_toggle_publish,
    admin_ai_translate,
    villager_announcement_list,
    villager_announcement_detail,
    important_announcements,
    emergency_announcements,
    record_announcement_view,
    record_announcement_listen,
    announcement_stats_summary,
)

urlpatterns = [
    # Admin management endpoints
    path("admin/", admin_announcement_list, name="admin_announcement_list"),
    path("admin/create/", admin_create_announcement, name="admin_create_announcement"),
    path("admin/<int:id>/", admin_update_announcement, name="admin_update_announcement"),
    path("admin/<int:id>/delete/", admin_delete_announcement, name="admin_delete_announcement"),
    path("admin/<int:id>/publish/", admin_toggle_publish, name="admin_toggle_publish"),
    path("admin/translate/", admin_ai_translate, name="admin_ai_translate"),

    # Villager / Citizen endpoints
    path("", villager_announcement_list, name="villager_announcement_list"),
    path("stats/", announcement_stats_summary, name="announcement_stats_summary"),
    path("important/", important_announcements, name="important_announcements"),
    path("emergency/", emergency_announcements, name="emergency_announcements"),
    path("<int:id>/", villager_announcement_detail, name="villager_announcement_detail"),
    path("<int:id>/view/", record_announcement_view, name="record_announcement_view"),
    path("<int:id>/listen/", record_announcement_listen, name="record_announcement_listen"),
]

