from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import ensure_csrf_cookie
from django.middleware.csrf import get_token
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout
from .models import User
from django.contrib.auth.decorators import login_required

from .serializers import RegisterSerializer

@ensure_csrf_cookie
@api_view(["GET"])
@permission_classes([AllowAny])
def csrf_token(request):
    token = get_token(request)
    return Response({"csrfToken": token, "message": "CSRF cookie set"})

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def register_user(request):

    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():

        serializer.save()

        return Response(
            {
                "message": "Signup request sent to admin for approval"
            },
            status=status.HTTP_201_CREATED
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def login_user(request):

    username = request.data.get("username")
    password = request.data.get("password")
    role = request.data.get("role")

    user = authenticate(
        request,
        username=username,
        password=password
    )

    if user is None:
        return Response(
            {"message": "Invalid username or password"},
            status=400
        )

    if user.role != role:
        return Response(
            {"message": f"This account is not registered as {role}."},
            status=403
        )

    if user.role == "villager":

        if user.status == "pending":
            return Response(
                {"message": "Your account is waiting for admin approval."},
                status=403
            )

        if user.status == "rejected":
            return Response(
                {"message": "Your signup request was rejected by admin. Please register again."},
                status=403
            )

    login(request, user)

    return Response({
        "message": "Login successful",
        "role": user.role,
        "user": {
            "id": user.id,
            "name": user.username,
            "email": user.email
        }
    })

@api_view(["POST"])
def logout_user(request):

    logout(request)

    return Response(status=204)

@login_required
@api_view(["GET"])
def get_user(request, id):

    try:
        user = User.objects.get(id=id)
        return Response({
            "name": user.username,
            "email": user.email,
            "aadhar": user.aadhar
        })

    except User.DoesNotExist:

        return Response(
            {"message": "User not found"},
            status=404
        )