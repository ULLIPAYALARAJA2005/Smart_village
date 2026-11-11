from django.utils import timezone
from django.db.models import Count, Q
from django.views.decorators.cache import never_cache
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from .models import Announcement, AnnouncementActivity
from .serializers import AnnouncementSerializer, AnnouncementActivitySerializer
from .translator import auto_translate_announcement, translate_text


# =========================================================================
# ADMIN ANNOUNCEMENT MANAGEMENT APIS
# =========================================================================

def is_admin_user(user):
    if not user or not user.is_authenticated:
        return False
    role = getattr(user, "role", "") or ""
    return role.lower() == "admin" or user.is_staff or user.is_superuser


@api_view(["GET"])
@never_cache
def admin_announcement_list(request):
    """
    List all announcements with comprehensive statistics for Admin Dashboard.
    """
    if not is_admin_user(request.user):
        return Response({"message": "Admin privileges required"}, status=status.HTTP_403_FORBIDDEN)

    announcements = Announcement.objects.all().prefetch_related("activities")

    SKIP_VALUES = {"", "all", "undefined", "null", "none"}

    # Filter by category if requested
    category = request.GET.get("category", "").strip()
    if category and category.lower() not in SKIP_VALUES:
        announcements = announcements.filter(category=category)

    # Filter by priority if requested
    priority = request.GET.get("priority", "").strip()
    if priority and priority.lower() not in SKIP_VALUES:
        announcements = announcements.filter(priority=priority)

    # Search filter
    search = request.GET.get("search", "").strip()
    if search and search.lower() not in SKIP_VALUES:
        announcements = announcements.filter(
            Q(english_title__icontains=search)
            | Q(telugu_title__icontains=search)
            | Q(original_title__icontains=search)
            | Q(english_content__icontains=search)
            | Q(telugu_content__icontains=search)
        )

    # Calculate overall dashboard metrics
    all_announcements = Announcement.objects.all()
    total_announcements = all_announcements.count()
    published_count = all_announcements.filter(is_published=True).count()
    emergency_count = all_announcements.filter(priority="emergency", is_published=True).count()
    important_count = all_announcements.filter(priority="important", is_published=True).count()

    total_views = AnnouncementActivity.objects.filter(viewed=True).count()
    total_listens = AnnouncementActivity.objects.filter(listened=True).count()

    serializer = AnnouncementSerializer(announcements, many=True, context={"request": request})

    return Response({
        "stats": {
            "total_announcements": total_announcements,
            "published_announcements": published_count,
            "emergency_announcements": emergency_count,
            "important_announcements": important_count,
            "total_views": total_views,
            "total_listens": total_listens,
        },
        "announcements": serializer.data,
    })


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_create_announcement(request):
    """
    Create a new announcement with automatic bidirectional AI translation.
    """
    if not is_admin_user(request.user):
        return Response({"message": "Admin privileges required"}, status=status.HTTP_403_FORBIDDEN)

    title = request.data.get("title", "").strip()
    content = request.data.get("content", "").strip()
    language = request.data.get("language", "en").strip()

    if not title or not content:
        return Response({"message": "Title and announcement content are required"}, status=status.HTTP_400_BAD_REQUEST)

    # Check if bilingual translations were supplied manually by admin
    english_title = request.data.get("english_title", "").strip()
    english_content = request.data.get("english_content", "").strip()
    telugu_title = request.data.get("telugu_title", "").strip()
    telugu_content = request.data.get("telugu_content", "").strip()

    # Automatically translate if one side is missing
    if not (english_title and english_content and telugu_title and telugu_content):
        translations = auto_translate_announcement(title, content, language)
        english_title = english_title or translations["english_title"]
        english_content = english_content or translations["english_content"]
        telugu_title = telugu_title or translations["telugu_title"]
        telugu_content = telugu_content or translations["telugu_content"]

    category = request.data.get("category", "general")
    priority = request.data.get("priority", "normal")
    expiry_date = request.data.get("expiry_date") or None
    is_published = str(request.data.get("is_published", "true")).lower() in ["true", "1"]

    announcement = Announcement.objects.create(
        original_title=title,
        original_content=content,
        original_language=language,
        english_title=english_title,
        english_content=english_content,
        telugu_title=telugu_title,
        telugu_content=telugu_content,
        category=category,
        priority=priority,
        attachment=request.FILES.get("attachment"),
        published_by=request.user,
        published_at=timezone.now(),
        expiry_date=expiry_date if expiry_date else None,
        is_published=is_published,
    )

    serializer = AnnouncementSerializer(announcement, context={"request": request})
    return Response(
        {
            "message": "Announcement created and published successfully!",
            "announcement": serializer.data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["PUT", "PATCH"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_update_announcement(request, id):
    """
    Update announcement details, translations, attachment, or dates.
    """
    if not is_admin_user(request.user):
        return Response({"message": "Admin privileges required"}, status=status.HTTP_403_FORBIDDEN)

    try:
        announcement = Announcement.objects.get(id=id)
    except Announcement.DoesNotExist:
        return Response({"message": "Announcement not found"}, status=status.HTTP_404_NOT_FOUND)

    if "english_title" in request.data:
        announcement.english_title = request.data.get("english_title", announcement.english_title)
    if "english_content" in request.data:
        announcement.english_content = request.data.get("english_content", announcement.english_content)
    if "telugu_title" in request.data:
        announcement.telugu_title = request.data.get("telugu_title", announcement.telugu_title)
    if "telugu_content" in request.data:
        announcement.telugu_content = request.data.get("telugu_content", announcement.telugu_content)

    if "category" in request.data:
        announcement.category = request.data.get("category", announcement.category)
    if "priority" in request.data:
        announcement.priority = request.data.get("priority", announcement.priority)
    if "expiry_date" in request.data:
        exp = request.data.get("expiry_date")
        announcement.expiry_date = exp if exp else None
    if "is_published" in request.data:
        announcement.is_published = str(request.data.get("is_published")).lower() in ["true", "1"]

    if "attachment" in request.FILES:
        announcement.attachment = request.FILES.get("attachment")

    announcement.save()
    serializer = AnnouncementSerializer(announcement, context={"request": request})
    return Response({
        "message": "Announcement updated successfully!",
        "announcement": serializer.data,
    })


@api_view(["DELETE"])
def admin_delete_announcement(request, id):
    """
    Delete an announcement permanently.
    """
    if not is_admin_user(request.user):
        return Response({"message": "Admin privileges required"}, status=status.HTTP_403_FORBIDDEN)

    try:
        announcement = Announcement.objects.get(id=id)
    except Announcement.DoesNotExist:
        return Response({"message": "Announcement not found"}, status=status.HTTP_404_NOT_FOUND)

    announcement.delete()
    return Response({"message": "Announcement deleted successfully!"})


@api_view(["POST"])
def admin_toggle_publish(request, id):
    """
    Toggle publish or deactivate state of an announcement.
    """
    if not is_admin_user(request.user):
        return Response({"message": "Admin privileges required"}, status=status.HTTP_403_FORBIDDEN)

    try:
        announcement = Announcement.objects.get(id=id)
    except Announcement.DoesNotExist:
        return Response({"message": "Announcement not found"}, status=status.HTTP_404_NOT_FOUND)

    announcement.is_published = not announcement.is_published
    announcement.save()

    status_str = "Published" if announcement.is_published else "Deactivated"
    return Response({
        "message": f"Announcement has been {status_str}!",
        "is_published": announcement.is_published,
    })


@api_view(["POST"])
def admin_ai_translate(request):
    """
    Instant AI translation endpoint so admin can preview/edit translation before publishing.
    """
    if not is_admin_user(request.user):
        return Response({"message": "Admin privileges required"}, status=status.HTTP_403_FORBIDDEN)

    title = request.data.get("title", "").strip()
    content = request.data.get("content", "").strip()
    source_language = request.data.get("language", "en").strip()

    if not title and not content:
        return Response({"message": "Text is required to translate"}, status=status.HTTP_400_BAD_REQUEST)

    result = auto_translate_announcement(title, content, source_language)
    return Response(result)


# =========================================================================
# VILLAGER ANNOUNCEMENT APIS
# =========================================================================

@api_view(["GET"])
@never_cache
def villager_announcement_list(request):
    """
    Returns active published announcements for villagers with activity flags.
    """
    today = timezone.now().date()
    # Active announcements: published and not expired
    announcements = Announcement.objects.filter(
        is_published=True
    ).filter(
        Q(expiry_date__isnull=True) | Q(expiry_date__gte=today)
    )

    SKIP_VALUES = {"", "all", "undefined", "null", "none"}

    category = request.GET.get("category", "").strip()
    if category and category.lower() not in SKIP_VALUES:
        announcements = announcements.filter(category=category)

    priority = request.GET.get("priority", "").strip()
    if priority and priority.lower() not in SKIP_VALUES:
        announcements = announcements.filter(priority=priority)

    search = request.GET.get("search", "").strip()
    if search and search.lower() not in SKIP_VALUES:
        announcements = announcements.filter(
            Q(english_title__icontains=search)
            | Q(telugu_title__icontains=search)
            | Q(english_content__icontains=search)
            | Q(telugu_content__icontains=search)
        )

    serializer = AnnouncementSerializer(announcements, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["GET"])
@never_cache
def villager_announcement_detail(request, id):
    """
    Single announcement detail.
    """
    try:
        announcement = Announcement.objects.get(id=id, is_published=True)
    except Announcement.DoesNotExist:
        return Response({"message": "Announcement not found"}, status=status.HTTP_404_NOT_FOUND)

    serializer = AnnouncementSerializer(announcement, context={"request": request})
    return Response(serializer.data)


@api_view(["GET"])
def important_announcements(request):
    """
    Returns announcements marked as important or emergency.
    """
    today = timezone.now().date()
    announcements = Announcement.objects.filter(
        is_published=True,
        priority__in=["important", "emergency"]
    ).filter(
        Q(expiry_date__isnull=True) | Q(expiry_date__gte=today)
    )
    serializer = AnnouncementSerializer(announcements, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["GET"])
def emergency_announcements(request):
    """
    Returns critical emergency alerts.
    """
    today = timezone.now().date()
    announcements = Announcement.objects.filter(
        is_published=True,
        priority="emergency"
    ).filter(
        Q(expiry_date__isnull=True) | Q(expiry_date__gte=today)
    )
    serializer = AnnouncementSerializer(announcements, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["POST"])
def record_announcement_view(request, id):
    """
    Tracks when a villager views an announcement.
    """
    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        announcement = Announcement.objects.get(id=id)
    except Announcement.DoesNotExist:
        return Response({"message": "Announcement not found"}, status=status.HTTP_404_NOT_FOUND)

    activity, created = AnnouncementActivity.objects.get_or_create(
        announcement=announcement,
        user=request.user,
        defaults={"viewed": True, "viewed_at": timezone.now()},
    )
    if not created and not activity.viewed:
        activity.viewed = True
        activity.viewed_at = timezone.now()
        activity.save()

    return Response({
        "status": "viewed",
        "total_views": announcement.total_views,
    })


@api_view(["POST"])
def record_announcement_listen(request, id):
    """
    Tracks when a villager clicks and listens to an announcement voice audio.
    """
    if not request.user.is_authenticated:
        return Response({"message": "Login required"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        announcement = Announcement.objects.get(id=id)
    except Announcement.DoesNotExist:
        return Response({"message": "Announcement not found"}, status=status.HTTP_404_NOT_FOUND)

    activity, created = AnnouncementActivity.objects.get_or_create(
        announcement=announcement,
        user=request.user,
        defaults={"viewed": True, "viewed_at": timezone.now(), "listened": True, "listened_at": timezone.now()},
    )
    if not created:
        activity.viewed = True
        if not activity.viewed_at:
            activity.viewed_at = timezone.now()
        activity.listened = True
        activity.listened_at = timezone.now()
        activity.save()

    return Response({
        "status": "listened",
        "total_listens": announcement.total_listens,
    })


@api_view(["GET"])
def announcement_stats_summary(request):
    """
    Returns unread badge count and emergency alerts summary for villager dashboard.
    """
    today = timezone.now().date()
    active_qs = Announcement.objects.filter(
        is_published=True
    ).filter(
        Q(expiry_date__isnull=True) | Q(expiry_date__gte=today)
    )

    total_active = active_qs.count()
    emergency_count = active_qs.filter(priority="emergency").count()

    unread_count = 0
    if request.user.is_authenticated:
        viewed_ids = AnnouncementActivity.objects.filter(
            user=request.user, viewed=True
        ).values_list("announcement_id", flat=True)
        unread_count = active_qs.exclude(id__in=viewed_ids).count()

    return Response({
        "total_active": total_active,
        "unread_count": unread_count,
        "emergency_count": emergency_count,
    })
