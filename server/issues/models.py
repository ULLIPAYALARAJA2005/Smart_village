from django.db import models
from users.models import User


class Issue(models.Model):

    category = models.CharField(
        max_length=20,
        choices=[
            ("electricity", "Electricity"),
            ("water", "Water"),
            ("garbage", "Garbage"),
            ("drainage", "Drainage"),
        ]
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    citizen_name = models.CharField(max_length=150, blank=True, default="")
    citizen_phone = models.CharField(max_length=15, blank=True, default="")
    village_name = models.CharField(max_length=100, blank=True, default="")

    street = models.CharField(max_length=100, blank=True, default="")

    house_no = models.CharField(max_length=50, blank=True, default="")

    description = models.TextField()

    photo = models.ImageField(
        upload_to="issues/",
        default="issues/demo.jpg"
    )

    date = models.CharField(max_length=20)

    time = models.CharField(max_length=20)

    status = models.CharField(
    max_length=20,
    choices=[
        ("Pending", "Pending"),
        ("Rejected", "Rejected"),
        ("Assigned", "Assigned"),
        ("In Progress", "In Progress"),
        ("Resolved", "Resolved"),
    ],
    default="Pending"
)

    deadline = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    reason = models.TextField(
        blank=True,
        null=True
    )

    input_method = models.CharField(
        max_length=20,
        choices=[
            ("manual", "Manual"),
            ("voice", "Voice"),
            ("photo", "Photo"),
            ("voice_photo", "Voice and Photo"),
        ],
        default="manual"
    )

    language = models.CharField(
        max_length=10,
        choices=[
            ("te", "Telugu"),
            ("en", "English"),
        ],
        default="en"
    )

    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_accuracy = models.FloatField(null=True, blank=True)
    location_captured = models.BooleanField(default=False)
    priority = models.CharField(
        max_length=10,
        choices=[
            ("low", "Low"),
            ("medium", "Medium"),
            ("high", "High"),
            ("urgent", "Urgent"),
        ],
        default="medium"
    )

    @property
    def get_citizen_name(self):
        if self.citizen_name:
            return self.citizen_name
        if self.user:
            return getattr(self.user, 'full_name', '') or self.user.get_full_name() or self.user.username
        return ""

    @property
    def get_citizen_phone(self):
        if self.citizen_phone:
            return self.citizen_phone
        if self.user:
            return getattr(self.user, 'mobile_number', '')
        return ""

    @property
    def get_village_name(self):
        if self.village_name:
            return self.village_name
        if self.user:
            return getattr(self.user, 'village_name', '')
        return ""

    def __str__(self):
        return f"Issue #{self.id} ({self.category}) - {self.get_citizen_name}"



class IssueAIAnalysis(models.Model):
    issue = models.OneToOneField(
        Issue,
        on_delete=models.CASCADE,
        related_name="ai_analysis"
    )

    predicted_text_category = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    text_similarity_score = models.FloatField(
        blank=True,
        null=True
    )

    predicted_image_category = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    image_similarity_score = models.FloatField(
        blank=True,
        null=True
    )

    text_model_version = models.CharField(
        max_length=100,
        default="paraphrase-multilingual-MiniLM-L12-v2"
    )

    image_model_version = models.CharField(
        max_length=100,
        default="openai/clip-vit-base-patch32"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"AI Analysis for Issue #{self.issue_id}"


class WorkAssignment(models.Model):
    WORK_STATUS_CHOICES = [
        ("Assigned", "Assigned"),
        ("Accepted", "Accepted"),
        ("On the Way", "On the Way"),
        ("Reached", "Reached"),
        ("In Progress", "In Progress"),
        ("Completed", "Completed"),
        ("Verified", "Verified"),
        ("Rejected", "Rejected"),
    ]

    issue = models.OneToOneField(
        Issue,
        on_delete=models.CASCADE,
        related_name="assignment"
    )

    worker = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assignments"
    )

    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assignments_made"
    )

    assigned_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    on_the_way_at = models.DateTimeField(null=True, blank=True)
    reached_at = models.DateTimeField(null=True, blank=True)
    work_started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    work_status = models.CharField(
        max_length=20,
        choices=WORK_STATUS_CHOICES,
        default="Assigned"
    )

    priority = models.CharField(
        max_length=10,
        choices=[
            ("low", "Low"),
            ("medium", "Medium"),
            ("high", "High"),
            ("urgent", "Urgent"),
        ],
        default="medium"
    )

    admin_instructions = models.TextField(blank=True, default="")
    worker_notes = models.TextField(blank=True, default="")
    completion_photo = models.ImageField(upload_to="completions/", null=True, blank=True)
    completion_notes = models.TextField(blank=True, default="")

    def __str__(self):
        return f"Assignment #{self.id} - Issue #{self.issue_id}"
