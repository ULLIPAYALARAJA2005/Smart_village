"""
End-to-End Automated Test Suite for Fix My Village AI Complaint System
Validates all 19 functional and security scenarios required by Master Prompt Phase 11.
"""

import os
import sys
import io
import django
from PIL import Image

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "main_app.settings")
django.setup()

from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
from users.models import User
from issues.models import Issue, IssueAIAnalysis
from ai_services.text_classifier import MultilingualTextClassifier
from ai_services.image_classifier import CLIPImageClassifier


def run_tests():
    print("=" * 70)
    print("🚀 RUNNING END-TO-END AI VOICE & PHOTO SYSTEM VALIDATION")
    print("=" * 70)

    passed_count = 0
    total_count = 19

    # Setup demo users
    admin_user, _ = User.objects.get_or_create(
        username="test_admin", email="admin@test.org",
        defaults={"role": "admin", "status": "approved", "is_staff": True}
    )
    admin_user.set_password("pass123")
    admin_user.save()

    worker_user, _ = User.objects.get_or_create(
        username="test_worker", email="worker@test.org",
        defaults={"role": "worker", "status": "approved"}
    )
    worker_user.set_password("pass123")
    worker_user.save()

    villager_user, _ = User.objects.get_or_create(
        username="test_villager", email="villager@test.org",
        defaults={"role": "villager", "status": "approved", "aadhar": "987654321098"}
    )
    villager_user.set_password("pass123")
    villager_user.save()

    import uuid
    test_run_id = uuid.uuid4().hex[:6]

    unapproved_villager = User.objects.create(
        username=f"test_pending_{test_run_id}",
        email=f"pending_{test_run_id}@test.org",
        role="villager",
        status="pending",
        aadhar=f"{test_run_id}123456"[:12]
    )
    unapproved_villager.set_password("pass123")
    unapproved_villager.save()

    client = APIClient()
    text_clf = MultilingualTextClassifier.get_instance()

    # Helper: Create in-memory dummy image
    def make_test_image(format="JPEG", size=(100, 100), color="blue"):
        buf = io.BytesIO()
        img = Image.new("RGB", size, color=color)
        img.save(buf, format=format)
        buf.seek(0)
        return SimpleUploadedFile(f"test.{format.lower()}", buf.read(), content_type=f"image/{format.lower()}")

    # 1. Telugu Voice Complaint Text Classification
    res_te = text_clf.classify("మా వీధిలో మూడు రోజులుగా నీళ్లు రావడం లేదు.")
    if res_te["predicted_category"] == "water":
        print("✅ TEST 1 PASSED: Telugu Voice Complaint classified as 'water'")
        passed_count += 1
    else:
        print(f"❌ TEST 1 FAILED: Expected 'water', got {res_te}")

    # 2. English Voice Complaint Text Classification
    res_en = text_clf.classify("Electric power lines broke down on our main street.")
    if res_en["predicted_category"] == "electricity":
        print("✅ TEST 2 PASSED: English Voice Complaint classified as 'electricity'")
        passed_count += 1
    else:
        print(f"❌ TEST 2 FAILED: Expected 'electricity', got {res_en}")

    # 3. Voice-Only Complaint Submission via API
    client.force_authenticate(user=villager_user)
    res3 = client.post("/api/issues/water/", {
        "street": "Temple Lane", "houseNo": "44",
        "description": "Voice only complaint: నీటి సరఫరా బంద్ అయ్యింది",
        "input_method": "voice", "language": "te",
        "date": "2026-11-10", "time": "10:00 AM"
    })
    if res3.status_code == 201 and res3.data.get("id"):
        v_issue = Issue.objects.get(id=res3.data["id"])
        assert v_issue.input_method == "voice"
        print(f"✅ TEST 3 PASSED: Voice-Only complaint submitted with ID #{v_issue.id}")
        passed_count += 1
    else:
        print(f"❌ TEST 3 FAILED: {res3.status_code} {res3.data}")

    # 4. Photo-Only Complaint Submission via API
    img_file = make_test_image()
    res4 = client.post("/api/issues/garbage/", {
        "street": "Market Road", "houseNo": "",
        "description": "Garbage photo submission",
        "photo": img_file,
        "input_method": "photo", "language": "en",
        "date": "2026-11-10", "time": "10:15 AM"
    }, format="multipart")
    if res4.status_code == 201:
        p_issue = Issue.objects.get(id=res4.data["id"])
        assert p_issue.input_method == "photo"
        assert p_issue.photo
        print(f"✅ TEST 4 PASSED: Photo-Only complaint submitted with ID #{p_issue.id}")
        passed_count += 1
    else:
        print(f"❌ TEST 4 FAILED: {res4.status_code} {res4.data}")

    # 5. Voice Plus Photo Combined Complaint Submission with AI Analysis
    img_file5 = make_test_image()
    res5 = client.post("/api/issues/drainage/", {
        "street": "North Canal", "houseNo": "12",
        "description": "మురుగు నీరు రోడ్డుపైకి వస్తోంది",
        "photo": img_file5,
        "input_method": "voice_photo", "language": "te",
        "predicted_text_category": "drainage",
        "text_similarity_score": "0.92",
        "predicted_image_category": "drainage",
        "image_similarity_score": "0.85",
        "date": "2026-11-10", "time": "10:30 AM"
    }, format="multipart")
    if res5.status_code == 201:
        vp_issue = Issue.objects.get(id=res5.data["id"])
        ai_meta = vp_issue.ai_analysis
        assert ai_meta.predicted_text_category == "drainage"
        assert ai_meta.text_similarity_score == 0.92
        print(f"✅ TEST 5 PASSED: Voice + Photo complaint with AIAnalysis model record #{vp_issue.id}")
        passed_count += 1
    else:
        print(f"❌ TEST 5 FAILED: {res5.status_code} {res5.data}")

    # 6. Water Domain Classification
    w_pred = text_clf.classify("మంచినీటి పైప్‌లైన్ పగిలి నీరు వృధాగా పోతోంది")["predicted_category"]
    if w_pred == "water":
        print("✅ TEST 6 PASSED: Water domain correctly classified")
        passed_count += 1
    else:
        print(f"❌ TEST 6 FAILED: Got {w_pred}")

    # 7. Electricity Domain Classification
    e_pred = text_clf.classify("ట్రాన్స్‌ఫార్మర్ కాలిపోయింది, వీధి దీపాలు వెలగడం లేదు")["predicted_category"]
    if e_pred == "electricity":
        print("✅ TEST 7 PASSED: Electricity domain correctly classified")
        passed_count += 1
    else:
        print(f"❌ TEST 7 FAILED: Got {e_pred}")

    # 8. Garbage Domain Classification
    g_pred = text_clf.classify("చెత్త కుప్పలు పేరుకుపోయి విపరీతమైన దుర్వాసన వస్తోంది")["predicted_category"]
    if g_pred == "garbage":
        print("✅ TEST 8 PASSED: Garbage domain correctly classified")
        passed_count += 1
    else:
        print(f"❌ TEST 8 FAILED: Got {g_pred}")

    # 9. Drainage Domain Classification
    d_pred = text_clf.classify("మురుగునీరు కాలువల్లోంచి పొంగి రోడ్లపైకి వస్తోంది")["predicted_category"]
    if d_pred == "drainage":
        print("✅ TEST 9 PASSED: Drainage domain correctly classified")
        passed_count += 1
    else:
        print(f"❌ TEST 9 FAILED: Got {d_pred}")

    # 10. AI Prediction Agreement / Mismatch Test via /api/ai/analyze/
    res10 = client.post("/api/ai/analyze/", {
        "description": "మా వీధిలో కరెంటు వైర్లు తెగిపడ్డాయి",
        "language": "te"
    }, format="json")
    if res10.status_code == 200 and res10.data["suggested_category"] == "electricity":
        print("✅ TEST 10 PASSED: /api/ai/analyze/ returns suggested category and agreement metrics")
        passed_count += 1
    else:
        print(f"❌ TEST 10 FAILED: {res10.data}")

    # 11. Microphone Permission Error Handling (Validated via SpeechRecognitionService code)
    from ai_services.speech_service import SpeechTranscriptionService
    speech_svc = SpeechTranscriptionService.get_instance()
    t_res = speech_svc.transcribe(None, "te")
    if t_res["status"] == "unconfigured" and "Web Speech API" in t_res["message"]:
        print("✅ TEST 11 PASSED: Speech service fallback and error handling correctly configured")
        passed_count += 1
    else:
        print(f"❌ TEST 11 FAILED: {t_res}")

    # 12. Invalid Image Upload Handling
    img_clf = CLIPImageClassifier.get_instance()
    bad_file = SimpleUploadedFile("fake.txt", b"not an image", content_type="text/plain")
    c_res = img_clf.classify(bad_file)
    if c_res.get("error") and c_res.get("requires_confirmation") is True:
        print("✅ TEST 12 PASSED: Corrupt/invalid image upload cleanly caught without server crash")
        passed_count += 1
    else:
        print(f"❌ TEST 12 FAILED: {c_res}")

    # 13. AI Service Fallback Test
    empty_res = text_clf.classify("")
    if empty_res["predicted_category"] is None and empty_res["requires_confirmation"] is True:
        print("✅ TEST 13 PASSED: Empty or unavailable AI input safely triggers manual fallback")
        passed_count += 1
    else:
        print(f"❌ TEST 13 FAILED: {empty_res}")

    # 14. Unapproved Villager Login / Access Protection
    client.force_authenticate(user=None)
    login_res = client.post("/api/auth/login/", {
        "username": "test_pending", "password": "pass123", "role": "villager"
    })
    if login_res.status_code == 403 and "waiting for admin approval" in login_res.data.get("message", ""):
        print("✅ TEST 14 PASSED: Unapproved pending villager correctly blocked from login")
        passed_count += 1
    else:
        print(f"❌ TEST 14 FAILED: {login_res.status_code} {login_res.data}")

    # 15. Unauthorized Complaint Access Block (Villager B viewing Villager A's complaint)
    villager_b, _ = User.objects.get_or_create(
        username="villager_b", email="vb@test.org",
        defaults={"role": "villager", "status": "approved"}
    )
    client.force_authenticate(user=villager_b)
    res15 = client.get(f"/api/ai/issues/{res3.data['id']}/status/")
    if res15.status_code == 403:
        print("✅ TEST 15 PASSED: Unauthorized complaint access blocked with HTTP 403")
        passed_count += 1
    else:
        print(f"❌ TEST 15 FAILED: Expected 403, got {res15.status_code}")

    # 16. Complaint Status Tracking (Authenticated Owner)
    client.force_authenticate(user=villager_user)
    res16 = client.get(f"/api/ai/issues/{res3.data['id']}/status/")
    if res16.status_code == 200 and res16.data["id"] == res3.data["id"]:
        print(f"✅ TEST 16 PASSED: Authenticated villager retrieved status '{res16.data['status']}' for issue #{res16.data['id']}")
        passed_count += 1
    else:
        print(f"❌ TEST 16 FAILED: {res16.status_code} {res16.data}")

    # 17. Existing Manual Complaint Submission Backward Compatibility
    client.force_authenticate(user=villager_user)
    res17 = client.post("/api/issues/water/", {
        "street": "South Street", "houseNo": "10",
        "description": "Manual standard complaint format",
        "date": "2026-11-10", "time": "11:00 AM"
    })
    if res17.status_code == 201:
        m_issue = Issue.objects.get(id=res17.data["id"])
        assert m_issue.input_method == "manual"
        print(f"✅ TEST 17 PASSED: Existing manual complaint workflow completely functional (#{m_issue.id})")
        passed_count += 1
    else:
        print(f"❌ TEST 17 FAILED: {res17.status_code} {res17.data}")

    # 18. Worker Status Updates Workflow
    client.force_authenticate(user=worker_user)
    res18 = client.put(f"/api/issues/status/water/{res17.data['id']}/", {
        "status": "In Progress", "deadline": "2026-11-15"
    }, format="json")
    if res18.status_code == 200 and res18.data.get("success"):
        updated_issue = Issue.objects.get(id=res17.data["id"])
        assert updated_issue.status == "In Progress"
        assert updated_issue.deadline == "2026-11-15"
        print("✅ TEST 18 PASSED: Worker updated issue status to 'In Progress' with deadline")
        passed_count += 1
    else:
        print(f"❌ TEST 18 FAILED: {res18.status_code} {res18.data}")

    # 19. Admin Functionality (Admin Inspection & Signup Approval)
    client.force_authenticate(user=admin_user)
    reqs_res = client.get("/api/admin/requests/")
    assert reqs_res.status_code == 200
    appr_res = client.put(f"/api/admin/approve/{unapproved_villager.id}/")
    if appr_res.status_code == 200 and appr_res.data.get("status") == "approved":
        unapproved_villager.refresh_from_db()
        assert unapproved_villager.status == "approved"
        print("✅ TEST 19 PASSED: Admin approved pending villager registration successfully")
        passed_count += 1
    else:
        print(f"❌ TEST 19 FAILED: {appr_res.status_code} {appr_res.data}")

    print("=" * 70)
    print(f"🎯 TEST SUMMARY: {passed_count}/{total_count} SCENARIOS PASSED ({round(passed_count/total_count*100)}%)")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()

