import logging
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import status

from issues.models import Issue, IssueAIAnalysis
from issues.serializers import IssueSerializer
from .serializers import ComplaintAnalysisSerializer, IssueStatusResponseSerializer
from .text_classifier import MultilingualTextClassifier
from .image_classifier import CLIPImageClassifier
from .speech_service import SpeechTranscriptionService

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def analyze_complaint(request):
    """
    POST /api/ai/analyze/
    Analyzes complaint description and/or uploaded photo.
    Returns predicted categories, similarity scores, agreement status, and suggestions.
    """
    description = request.data.get("description", "")
    language = request.data.get("language", "te")
    photo = request.FILES.get("photo")

    text_res = None
    image_res = None

    # Run text + image classification in PARALLEL using threads (cuts latency in half)
    from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeout
    futures = {}
    with ThreadPoolExecutor(max_workers=2) as executor:
        if description and description.strip():
            futures["text"] = executor.submit(
                lambda: MultilingualTextClassifier.get_instance().classify(description.strip())
            )
        if photo:
            # Read photo bytes into memory first so the file can be passed to the thread safely
            photo_bytes = photo.read()
            import io as _io
            futures["image"] = executor.submit(
                lambda pb=photo_bytes, fn=getattr(photo, "name", "photo.jpg"): (
                    CLIPImageClassifier.get_instance().classify(
                        type("_InMemFile", (), {
                            "read": lambda self, n=-1: pb if n == -1 else pb[:n],
                            "seek": lambda self, p: None,
                            "size": len(pb),
                            "name": fn,
                        })()
                    )
                )
            )

        # Collect results with a 6-second cap per task (graceful degradation)
        for key, fut in futures.items():
            try:
                result = fut.result(timeout=6)
                if key == "text":
                    text_res = result
                else:
                    image_res = result
            except FuturesTimeout:
                logger.warning(f"AI classification timed out for: {key}")
            except Exception as exc:
                logger.error(f"AI classification error ({key}): {exc}")

    # 3. Decision & Agreement Engine
    text_cat = text_res.get("predicted_category") if text_res else None
    img_cat = image_res.get("predicted_category") if image_res else None

    text_conf = text_res.get("confidence", 0.0) if text_res else 0.0
    img_conf = image_res.get("confidence", 0.0) if image_res else 0.0

    suggested_category = None
    agreement = False
    requires_manual_confirmation = True
    message = ""

    if text_cat and img_cat:
        if text_cat == img_cat:
            agreement = True
            suggested_category = text_cat
            requires_manual_confirmation = False
            message = (
                f"AI suggests this is a {suggested_category} problem. "
                "Both voice and photo models agree."
            )
        else:
            agreement = False
            requires_manual_confirmation = True
            if img_conf >= text_conf and img_cat:
                suggested_category = img_cat
                message = f"AI photo analysis suggests {img_cat} ({img_conf:.0%}), while voice suggests {text_cat}. Please confirm."
            elif text_cat:
                suggested_category = text_cat
                message = f"AI voice analysis suggests {text_cat} ({text_conf:.0%}), while photo suggests {img_cat}. Please confirm."
            else:
                suggested_category = img_cat or text_cat
                message = "AI detected different categories from voice and photo. Please confirm."
    elif text_cat:
        agreement = True
        suggested_category = text_cat
        requires_manual_confirmation = text_res.get("requires_confirmation", False)
        message = f"AI suggests this is a {suggested_category} problem."
    elif img_cat:
        agreement = True
        suggested_category = img_cat
        requires_manual_confirmation = image_res.get("requires_confirmation", False)
        message = f"AI suggests this is a {suggested_category} problem based on photo."
    else:
        message = "Could not confidently classify. Please select category manually."
        requires_manual_confirmation = True

    return Response({
        "success": True,
        "suggested_category": suggested_category,
        "prediction_agreement": agreement,
        "requires_manual_confirmation": requires_manual_confirmation,
        "message": message,
        "text_prediction": text_res,
        "image_prediction": image_res,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def issue_status_detail(request, issue_id):
    """
    GET /api/ai/issues/<int:issue_id>/status/
    Retrieves real-time status of a complaint.
    All authenticated village members and workers can track civic issue progress.
    """
    try:
        issue = Issue.objects.select_related("user").prefetch_related("ai_analysis").get(id=issue_id)
    except Issue.DoesNotExist:
        return Response({"message": f"Complaint #{issue_id} not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = IssueStatusResponseSerializer(issue)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_issues_list(request):
    """
    GET /api/ai/my-issues/
    Returns complaints for the user (villagers see their own; workers/admins see all recent).
    """
    if request.user.role == "villager":
        issues = Issue.objects.filter(user=request.user).order_by("-id")
    else:
        issues = Issue.objects.all().order_by("-id")[:20]

    serializer = IssueStatusResponseSerializer(issues, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def speech_transcribe(request):
    """
    POST /api/ai/transcribe/
    Backend transcription endpoint for uploaded audio clips.
    Converts voice to text with high accuracy in Telugu / English.
    """
    audio_file = request.FILES.get("audio")
    lang = request.data.get("language", "te")

    if not audio_file:
        return Response(
            {"success": False, "transcription": "", "message": "Audio file is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    service = SpeechTranscriptionService.get_instance()
    result = service.transcribe(audio_file, language=lang)
    return Response(result)


@api_view(["GET", "POST", "HEAD"])
@permission_classes([AllowAny])
def text_to_speech_audio(request):
    """
    GET/POST /api/ai/tts/
    Generates natural human-like speech audio (MP3) in Telugu or English.
    Returns: audio/mpeg stream directly playable by any browser.
    """
    import io
    from django.http import HttpResponse

    text = request.GET.get("text") or request.data.get("text", "")
    language = request.GET.get("language") or request.GET.get("lang") or request.data.get("language", "te")

    if not text or not text.strip():
        return Response({"error": "Text parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

    target_lang = "te" if language.startswith("te") else "en"
    try:
        from gtts import gTTS
        tts = gTTS(text=text.strip(), lang=target_lang)
        buffer = io.BytesIO()
        tts.write_to_fp(buffer)
        buffer.seek(0)
        response = HttpResponse(buffer.read(), content_type="audio/mpeg")
        response["Content-Disposition"] = 'inline; filename="speech.mp3"'
        response["Cache-Control"] = "public, max-age=3600"
        return response
    except Exception as e:
        logger.error(f"TTS generation error: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

