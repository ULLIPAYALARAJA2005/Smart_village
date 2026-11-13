from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator


indian_phone_regex = RegexValidator(
    regex=r'^[6-9]\d{9}$',
    message="Mobile number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
)


class User(AbstractUser):

    email = models.EmailField(unique=True)

    aadhar = models.CharField(max_length=12, unique=True, blank=True, null=True)

    full_name = models.CharField(max_length=150, blank=True, default="")

    mobile_number = models.CharField(
        max_length=15,
        blank=True,
        default="",
        validators=[indian_phone_regex]
    )

    village_name = models.CharField(max_length=100, blank=True, default="")

    street_name = models.CharField(max_length=150, blank=True, default="")

    house_number = models.CharField(max_length=50, blank=True, default="")

    role = models.CharField(
        max_length=20,
        choices=[
            ("villager", "Villager"),
            ("worker", "Worker"),
            ("admin", "Admin"),
        ],
        default="villager"
    )

    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
        ],
        default="pending"
    )

    def __str__(self):
        return f"{self.username} ({self.role})"
