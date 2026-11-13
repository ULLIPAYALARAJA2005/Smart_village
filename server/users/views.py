from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.views.decorators.csrf import ensure_csrf_cookie
from django.middleware.csrf import get_token
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout
from .models import User
from django.contrib.auth.decorators import login_required

from .serializers import RegisterSerializer, UserProfileSerializer


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
        user = serializer.save()
        return Response(
            {
                "message": "Signup request sent to admin for approval",
                "userId": user.id,
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
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "")
    role = request.data.get("role", "").strip()

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
            "username": user.username,
            "full_name": user.full_name or user.get_full_name() or user.username,
            "email": user.email,
            "mobile_number": user.mobile_number,
            "village_name": user.village_name,
            "street_name": user.street_name,
            "house_number": user.house_number,
            "aadhar": user.aadhar,
            "status": user.status,
            "role": user.role,
        }
    })


@api_view(["POST"])
def logout_user(request):
    logout(request)
    return Response(status=204)


@api_view(["GET", "PUT", "PATCH"])
def user_profile(request):
    """
    Villager profile endpoint.
    GET: View registered contact & address details.
    PUT/PATCH: Update registered mobile number and address.
    """
    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=status.HTTP_401_UNAUTHORIZED)

    user = request.user

    if request.method == "GET":
        serializer = UserProfileSerializer(user)
        return Response(serializer.data)

    serializer = UserProfileSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        updated_user = serializer.save()
        return Response({
            "message": "Profile updated successfully!",
            "user": UserProfileSerializer(updated_user).data,
        })

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@login_required
@api_view(["GET"])
def get_user(request, id):
    try:
        user = User.objects.get(id=id)
        # Privacy check: only admin, self, or assigned worker can see user details
        if request.user.role != "admin" and request.user.id != user.id:
            return Response({"message": "Unauthorized access"}, status=403)

        return Response({
            "name": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "mobile_number": user.mobile_number,
            "village_name": user.village_name,
            "street_name": user.street_name,
            "house_number": user.house_number,
            "aadhar": user.aadhar,
        })
    except User.DoesNotExist:
        return Response(
            {"message": "User not found"},
            status=404
        )
