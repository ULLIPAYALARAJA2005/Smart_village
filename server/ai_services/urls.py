from django.urls import path
from .views import (
    analyze_complaint,
    issue_status_detail,
    my_issues_list,
    speech_transcribe,
    text_to_speech_audio,
)

urlpatterns = [
    path("analyze/", analyze_complaint, name="ai_analyze"),
    path("issues/<int:issue_id>/status/", issue_status_detail, name="ai_issue_status"),
    path("my-issues/", my_issues_list, name="ai_my_issues"),
    path("transcribe/", speech_transcribe, name="ai_transcribe"),
    path("tts/", text_to_speech_audio, name="ai_tts"),
]

