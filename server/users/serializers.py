import re
from rest_framework import serializers
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "full_name",
            "mobile_number",
            "village_name",
            "street_name",
            "house_number",
            "aadhar",
            "password",
            "confirm_password",
        ]

    def validate_mobile_number(self, value):
        val = str(value).strip().replace(" ", "").replace("-", "")
        if val.startswith("+91"):
            val = val[3:]
        elif val.startswith("0") and len(val) == 11:
            val = val[1:]
        if not re.match(r'^[6-9]\d{9}$', val):
            raise serializers.ValidationError("Mobile number must be a valid 10-digit Indian mobile number.")
        return val

    def validate(self, attrs):
        # Mandatory fields for villager registration
        required_fields = {
            "full_name": "Full Name is required.",
            "mobile_number": "Mobile Number is required.",
            "village_name": "Village Name is required.",
            "street_name": "Street / Area Name is required.",
            "house_number": "House Number is required.",
            "username": "Username is required.",
            "email": "Email Address is required.",
            "password": "Password is required.",
        }
        errors = {}
        for field, err_msg in required_fields.items():
            val = attrs.get(field)
            if val is None or not str(val).strip():
                errors[field] = err_msg

        pwd = attrs.get("password")
        cpwd = attrs.get("confirm_password")
        if cpwd and pwd != cpwd:
            errors["confirm_password"] = "Passwords do not match."

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password", None)
        full_name = validated_data.get("full_name", "").strip()
        parts = full_name.split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

        user = User.objects.create_user(
            username=validated_data["username"].strip(),
            email=validated_data["email"].strip().lower(),
            password=validated_data["password"],
            full_name=full_name,
            first_name=first_name,
            last_name=last_name,
            mobile_number=validated_data.get("mobile_number", "").strip(),
            village_name=validated_data.get("village_name", "").strip(),
            street_name=validated_data.get("street_name", "").strip(),
            house_number=validated_data.get("house_number", "").strip(),
            aadhar=validated_data.get("aadhar", None) or None,
            role="villager",
            status="pending"
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "full_name",
            "mobile_number",
            "village_name",
            "street_name",
            "house_number",
            "aadhar",
            "role",
            "status",
        ]
        read_only_fields = ["id", "username", "role", "status", "aadhar"]

    def validate_mobile_number(self, value):
        if not value:
            return value
        val = str(value).strip().replace(" ", "").replace("-", "")
        if val.startswith("+91"):
            val = val[3:]
        elif val.startswith("0") and len(val) == 11:
            val = val[1:]
        if not re.match(r'^[6-9]\d{9}$', val):
            raise serializers.ValidationError("Mobile number must be a valid 10-digit Indian mobile number.")
        return val

    def validate(self, attrs):
        errors = {}
        for field in ["full_name", "mobile_number", "village_name", "street_name", "house_number"]:
            if field in attrs and not str(attrs[field]).strip():
                errors[field] = f"{field.replace('_', ' ').capitalize()} cannot be empty."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs
