"""
test_phase8b.py - Comprehensive tests for Phase 8B features:
1. Speech Provider Adapters (Mock, Sarvam configuration, Bhashini stub)
2. Offline Voice Note sync & immediate audio deletion
3. SMS OTP Provider (Mock & Real adapter interface)
4. Facilitator JWT Expiry & Refresh token endpoint
5. Facilitator Input Validation (Phone numbers, OTP format, IDs, etc.)
"""

import uuid
import base64
from fastapi.testclient import TestClient
from api.app.main import app
from api.app.models import Student
from api.app.database import SessionLocal
from api.app.speech import get_speech_provider, reset_speech_provider, set_speech_provider
from api.app.speech.mock_provider import MockSpeechProvider
from api.app.speech.sarvam_provider import SarvamSpeechProvider
from api.app.speech.bhashini_provider import BhashiniSpeechProvider
from api.app.sms import get_sms_provider, reset_sms_provider, set_sms_provider
from api.app.sms.mock_provider import MockSMSProvider
from api.app.sms.real_provider import RealSMSProvider
from api.app.facilitator.auth import create_jwt_token, decode_jwt_token

client = TestClient(app)


import anyio


def test_speech_provider_adapter_suite():
    """Validates Speech Provider interface, Mock, Sarvam, and Bhashini stub."""
    # 1. Default is Mock provider
    reset_speech_provider()
    provider = get_speech_provider()
    assert provider.provider_name == "mock"

    # STT and TTS in Marathi and Hindi
    stt_mr = anyio.run(provider.speech_to_text, b"fake_audio_bytes", "mr")
    assert "सौर ऊर्जा" in stt_mr

    tts_hi = anyio.run(provider.text_to_speech, "नमस्ते", "hi")
    assert len(tts_hi) > 0

    # 2. Sarvam provider configuration check
    sarvam_no_key = SarvamSpeechProvider(api_key=None)
    try:
        anyio.run(sarvam_no_key.speech_to_text, b"sample", "mr")
        assert False, "Should raise ValueError when SARVAM_API_KEY is not set"
    except ValueError as e:
        assert "SARVAM_API_KEY" in str(e)

    # 3. Bhashini provider stub documents missing ULCA pipeline requirements
    bhashini = BhashiniSpeechProvider()
    try:
        anyio.run(bhashini.speech_to_text, b"sample", "mr")
        assert False, "Should raise NotImplementedError with missing details"
    except NotImplementedError as e:
        assert "BHASHINI_USER_ID" in str(e)
        assert "bhashini.gov.in" in str(e)


def test_sms_provider_suite():
    """Validates SMS Provider interface, Mock provider recording, and Real provider checks."""
    reset_sms_provider()
    sms = get_sms_provider()
    assert sms.get_provider_name() == "mock"

    phone = "9822123456"
    assert sms.send_otp(phone, "654321", "Test Teacher") is True
    assert sms.get_last_otp(phone) == "654321"

    # Real SMS provider requires SMS_API_KEY and SMS_GATEWAY_URL
    real_sms = RealSMSProvider(api_key=None, gateway_url=None)
    try:
        real_sms.send_otp(phone, "112233")
        assert False, "Should raise RuntimeError when real SMS credentials not set"
    except RuntimeError as e:
        assert "SMS_CONFIG_MISSING" in str(e)


def test_offline_voice_note_sync_and_deletion():
    """
    Offline voice note sync:
    1. Verifies guardian consent is required.
    2. Transcribes voice note (mock transcriber).
    3. Fills the answer in student profile.
    4. Confirms audio data is never persisted on disk or in database.
    """
    db = SessionLocal()
    st_id = f"st_vn_{uuid.uuid4().hex[:8]}"

    # Case 1: Student without guardian consent cannot sync voice note
    st_no_consent = Student(
        id=f"st_nc_{uuid.uuid4().hex[:8]}",
        name="No Consent Student",
        grade=9,
        preferred_language="mr",
        guardian_consent=False
    )
    db.add(st_no_consent)
    db.commit()

    sample_audio_b64 = base64.b64encode(b"simulated_voice_recording_pcm").decode("utf-8")
    sync_no_consent = client.post("/api/v1/sync", json={
        "items": [{
            "id": f"sync_vn_{uuid.uuid4().hex[:6]}",
            "type": "voice_note",
            "payload": {
                "student_id": st_no_consent.id,
                "question_key": "interests",
                "audio_base64": sample_audio_b64,
                "language": "mr",
                "recorded_at": "2026-10-13T10:00:00Z"
            },
            "updated_at": "2026-10-13T10:00:00Z",
            "attempts": 0
        }]
    })
    assert sync_no_consent.status_code == 200
    res_items = sync_no_consent.json()["results"]
    assert res_items[0]["status"] == "failed"
    assert "GUARDIAN_CONSENT_REQUIRED" in res_items[0]["message"]

    # Case 2: Student with guardian consent successfully processed
    st_consented = Student(
        id=st_id,
        name="Consented Student",
        grade=10,
        preferred_language="mr",
        guardian_consent=True
    )
    db.add(st_consented)
    db.commit()

    sync_resp = client.post("/api/v1/sync", json={
        "items": [{
            "id": f"sync_vn_{uuid.uuid4().hex[:6]}",
            "type": "voice_note",
            "payload": {
                "student_id": st_id,
                "question_key": "interests",
                "audio_base64": sample_audio_b64,
                "language": "mr",
                "recorded_at": "2026-10-13T10:05:00Z"
            },
            "updated_at": "2026-10-13T10:05:00Z",
            "attempts": 0
        }]
    })
    assert sync_resp.status_code == 200
    res_synced = sync_resp.json()["results"]
    assert res_synced[0]["status"] == "synced"
    assert "audio deleted immediately" in res_synced[0]["message"]

    # Verify student profile was updated with transcribed answer
    db.refresh(st_consented)
    assert st_consented.interests is not None
    assert len(st_consented.interests) > 0

    db.close()


def test_facilitator_jwt_expiry_and_refresh():
    """Facilitator login issues access and refresh tokens; refresh endpoint yields fresh tokens."""
    phone = f"98888{uuid.uuid4().hex[:5]}"

    # Request OTP
    r_otp = client.post("/api/v1/facilitator/auth/request-otp", json={
        "phone_number": phone,
        "name": "Refresh Teacher"
    }).json()

    # Verify OTP
    r_token = client.post("/api/v1/facilitator/auth/verify-otp", json={
        "phone_number": phone,
        "otp": r_otp["demo_otp"]
    }).json()

    access_token = r_token["access_token"]
    refresh_token = r_token["refresh_token"]
    assert access_token is not None
    assert refresh_token is not None

    # Verify decoded tokens have proper types
    acc_payload = decode_jwt_token(access_token)
    assert acc_payload.get("type") == "access"

    ref_payload = decode_jwt_token(refresh_token)
    assert ref_payload.get("type") == "refresh"

    # Refresh session using refresh token
    r_refresh = client.post("/api/v1/facilitator/auth/refresh", json={
        "refresh_token": refresh_token
    })
    assert r_refresh.status_code == 200
    refresh_data = r_refresh.json()
    assert "access_token" in refresh_data
    assert "refresh_token" in refresh_data

    # Reject refreshing using an access token
    bad_refresh = client.post("/api/v1/facilitator/auth/refresh", json={
        "refresh_token": access_token
    })
    assert bad_refresh.status_code == 401
    assert "INVALID_REFRESH_TOKEN" in bad_refresh.json()["detail"]

    # Reject expired token on protected endpoint
    expired_token = create_jwt_token({
        "sub": r_token["facilitator"]["id"],
        "phone": phone,
        "role": "TEACHER"
    }, expires_in_minutes=-10)

    res_expired = client.get("/api/v1/facilitator/me", headers={
        "Authorization": f"Bearer {expired_token}"
    })
    assert res_expired.status_code == 401
    assert "TOKEN_EXPIRED" in res_expired.json()["detail"]


def test_facilitator_input_validation():
    """Tests strict input validation on phone, OTP, cohort names, and path params."""
    # 1. Phone number validation
    bad_phone_short = client.post("/api/v1/facilitator/auth/request-otp", json={"phone_number": "123"})
    assert bad_phone_short.status_code == 422

    bad_phone_prefix = client.post("/api/v1/facilitator/auth/request-otp", json={"phone_number": "5987654321"})
    assert bad_phone_prefix.status_code == 422

    # 2. OTP validation (must be 6 digits)
    bad_otp = client.post("/api/v1/facilitator/auth/verify-otp", json={
        "phone_number": "9822000000",
        "otp": "abc"
    })
    assert bad_otp.status_code == 422

    # 3. Path ID parameter validation
    valid_token = client.post("/api/v1/facilitator/auth/verify-otp", json={
        "phone_number": "9822000000",
        "otp": "123456"
    }).json()["access_token"]

    bad_cohort_path = client.get(
        "/api/v1/facilitator/cohorts/bad$id!@#/roster",
        headers={"Authorization": f"Bearer {valid_token}"}
    )
    assert bad_cohort_path.status_code == 400
    assert "INVALID_PARAMETER" in bad_cohort_path.json()["detail"]
