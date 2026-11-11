from django.db import models
from django.utils import timezone
from users.models import User


class Announcement(models.Model):
    CATEGORY_CHOICES = [
        ("general", "General Information / సాధారణ సమాచారం"),
        ("schemes", "Government Schemes / ప్రభుత్వ పథకాలు"),
        ("health", "Health & Medical Camps / ఆరోగ్య & వైద్య శిబిరాలు"),
        ("electricity", "Electricity Updates / విద్యుత్ సమాచారం"),
        ("water", "Water Supply Updates / తాగునీటి సరఫరా"),
        ("meetings", "Village Meetings / గ్రామ సభలు"),
        ("emergency", "Emergency Alerts / అత్యవసర హెచ్చరికలు"),
        ("agriculture", "Agriculture Information / వ్యవసాయ సమాచారం"),
        ("other", "Other / ఇతర సమాచారం"),
    ]

    PRIORITY_CHOICES = [
        ("normal", "Normal"),
        ("important", "Important (ముఖ్యమైనది)"),
        ("emergency", "Emergency (అత్యవసరం)"),
    ]

    LANGUAGE_CHOICES = [
        ("en", "English"),
        ("te", "Telugu (తెలుగు)"),
    ]

    # Original input by Admin
    original_title = models.CharField(max_length=255)
    original_content = models.TextField()
    original_language = models.CharField(max_length=10, choices=LANGUAGE_CHOICES, default="en")

    # Bilingual Translations (Stored side-by-side)
    english_title = models.CharField(max_length=255, blank=True, default="")
    english_content = models.TextField(blank=True, default="")
    telugu_title = models.CharField(max_length=255, blank=True, default="")
    telugu_content = models.TextField(blank=True, default="")

    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default="general")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="normal")
    attachment = models.FileField(upload_to="announcements/", null=True, blank=True)

    published_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="announcements_published"
    )
    published_at = models.DateTimeField(default=timezone.now)
    expiry_date = models.DateField(null=True, blank=True)
    is_published = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]

    def __str__(self):
        return f"[{self.priority.upper()}] {self.english_title or self.original_title}"

    @property
    def title(self):
        return self.original_title

    @property
    def content(self):
        return self.original_content

    @property
    def total_views(self):
        return self.activities.filter(viewed=True).count()

    @property
    def total_listens(self):
        return self.activities.filter(listened=True).count()


class AnnouncementActivity(models.Model):
    announcement = models.ForeignKey(
        Announcement, on_delete=models.CASCADE, related_name="activities"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="announcement_activities"
    )
    viewed = models.BooleanField(default=False)
    listened = models.BooleanField(default=False)
    viewed_at = models.DateTimeField(null=True, blank=True)
    listened_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("announcement", "user")

    def __str__(self):
        return f"{self.user.username} -> {self.announcement.id} (viewed={self.viewed}, listened={self.listened})"
