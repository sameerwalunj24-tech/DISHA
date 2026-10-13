"""
test_consent.py - Step 0c: verify guardian consent enforcement
==============================================================
Tests:
1. Submitting all answers with guardian_consent=False -> HTTP 403
2. Submitting all answers with guardian_consent=True  -> profile saved
"""

import pytest
from fastapi.testclient import TestClient

from api.app.main import app

client = TestClient(app)

LANG = "en"

def _start_session():
    resp = client.post("/api/v1/discovery/start", json={"language": LANG})
    assert resp.status_code == 200
    data = resp.json()
    return data["session_id"], data["question"]


def _answer_all(session_id: str, first_question: dict, consent: bool) -> dict:
    """Walk through all discovery questions, returning the final response."""
    question = first_question
    last_resp = {}

    while question is not None:
        resp = client.post("/api/v1/discovery/answer", json={
            "session_id": session_id,
            "question_id": question["id"],
            "answer_text": "Test answer",
            "guardian_consent": consent,
            "student_name": "Test Student"
        })

        # After the last question, server returns 200 or 403 depending on consent
        last_resp = resp
        data = resp.json() if resp.status_code == 200 else None

        if resp.status_code == 403:
            break

        if data and data.get("is_complete"):
            break

        question = data.get("next_question") if data else None

    return last_resp


def test_consent_unchecked_blocks_save():
    """
    Step 0c: Completing all questions without consent returns HTTP 403.
    The profile must NOT be saved.
    """
    session_id, first_q = _start_session()
    final_response = _answer_all(session_id, first_q, consent=False)

    assert final_response.status_code == 403, (
        f"Expected 403 when consent=False, got {final_response.status_code}: "
        f"{final_response.text}"
    )
    error_detail = final_response.json().get("detail", "")
    assert "GUARDIAN_CONSENT_REQUIRED" in error_detail or "consent" in error_detail.lower()


def test_consent_checked_allows_save():
    """
    Step 0c: Completing all questions WITH consent returns 200 and a student_id.
    """
    session_id, first_q = _start_session()
    final_response = _answer_all(session_id, first_q, consent=True)

    assert final_response.status_code == 200, (
        f"Expected 200 when consent=True, got {final_response.status_code}"
    )
    data = final_response.json()
    assert data.get("is_complete") is True
    assert data.get("student_id") is not None, "student_id must be returned on successful save"


def test_consent_receipt_verification_endpoint():
    """
    DPDP Act 2023 Cryptographic Consent Receipt Verification:
    - Create a student profile with a SHA-256 consent receipt hash.
    - Call GET /api/v1/consent/verify/{receipt_hash}.
    - Ensure valid=True, version is DPDP_V1.0, recorded_at is present.
    - STRICT GUARANTEE: Zero demographic or personal data leakage.
    """
    import hashlib
    canonical = "Ramesh Jadhav|DPDP_V1.0|2026-10-13T12:00:00Z"
    receipt_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    create_resp = client.post("/api/v1/students", json={
        "name": "Rohan Jadhav",
        "preferred_language": "mr",
        "grade": 10,
        "state": "Maharashtra",
        "district": "Satara",
        "gender": "MALE",
        "guardian_consent": True,
        "consent_receipt_hash": receipt_hash,
        "consent_version": "DPDP_V1.0"
    })
    assert create_resp.status_code == 200
    st_data = create_resp.json()
    assert st_data.get("consent_receipt_hash") == receipt_hash

    # Now verify the consent receipt via public verification endpoint
    verify_resp = client.get(f"/api/v1/consent/verify/{receipt_hash}")
    assert verify_resp.status_code == 200, f"Verification failed: {verify_resp.text}"
    receipt = verify_resp.json()

    assert receipt["valid"] is True
    assert receipt["receipt_hash"] == receipt_hash
    assert receipt["consent_version"] == "DPDP_V1.0"
    assert "recorded_at" in receipt and receipt["recorded_at"] is not None

    # Strict Privacy Test: Ensure absolutely ZERO demographic fields leaked
    forbidden_keys = [
        "name", "student_name", "guardian_name", "grade", "state",
        "district", "gender", "income", "annual_family_income",
        "interests", "skills", "aspirations", "phone", "phone_number"
    ]
    for key in forbidden_keys:
        assert key not in receipt, f"Demographic field '{key}' leaked in consent receipt response!"


def test_consent_receipt_verification_not_found():
    """
    Verifying a non-existent hash returns HTTP 404.
    """
    non_existent = "0000000000000000000000000000000000000000000000000000000000000000"
    resp = client.get(f"/api/v1/consent/verify/{non_existent}")
    assert resp.status_code == 404


def test_consent_receipt_invalid_hash_format():
    """
    Invalid / malformed hash strings are rejected with 400 Bad Request.
    """
    resp = client.get("/api/v1/consent/verify/short")
    assert resp.status_code == 400


def test_discovery_flow_with_cryptographic_receipt():
    """
    Verifies that the full discovery session saves consent_receipt_hash and
    makes it verifiable via the consent endpoint.
    """
    import hashlib
    session_id, first_q = _start_session()
    receipt_hash = hashlib.sha256(b"Suresh Patil|DPDP_V1.0|2026-10-13T12:00:00Z").hexdigest()

    question = first_q
    last_resp = None
    while question is not None:
        resp = client.post("/api/v1/discovery/answer", json={
            "session_id": session_id,
            "question_id": question["id"],
            "answer_text": "Solar energy repair",
            "guardian_consent": True,
            "student_name": "Aarav Patil",
            "consent_receipt_hash": receipt_hash,
            "consent_version": "DPDP_V1.0"
        })
        last_resp = resp
        data = resp.json()
        if data.get("is_complete"):
            break
        question = data.get("next_question")

    assert last_resp.status_code == 200
    st_id = last_resp.json().get("student_id")
    assert st_id is not None

    # Check verification endpoint finds this receipt
    v_resp = client.get(f"/api/v1/consent/verify/{receipt_hash}")
    assert v_resp.status_code == 200
    v_data = v_resp.json()
    assert v_data["valid"] is True
    assert v_data["receipt_hash"] == receipt_hash
    assert v_data["consent_version"] == "DPDP_V1.0"


def test_sync_offline_quiz_persists_consent_receipt():
    """
    Verifies that offline quiz results synced from IndexedDB outbox
    persist the cryptographic consent receipt hash and allow verification.
    """
    import hashlib
    import uuid
    receipt_hash = hashlib.sha256(b"Anjali Deshmukh|DPDP_V1.0|2026-10-13T12:00:00Z").hexdigest()
    item_id = str(uuid.uuid4())

    sync_payload = {
        "items": [
            {
                "id": item_id,
                "type": "offline_quiz_result",
                "payload": {
                    "student_name": "Pooja Deshmukh",
                    "language": "mr",
                    "guardian_consent": True,
                    "consent_receipt_hash": receipt_hash,
                    "consent_version": "DPDP_V1.0",
                    "profile": {
                        "grade_level": 11,
                        "state": "Maharashtra",
                        "district": "Pune",
                        "primary_interests": ["Healthcare", "Nursing"],
                        "practical_skills": ["First Aid"],
                        "career_aspirations": ["Community Nurse"]
                    }
                },
                "updated_at": "2026-10-13T12:00:00Z"
            }
        ]
    }

    res = client.post("/api/v1/sync", json=sync_payload)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["processed_count"] == 1

    # Verify receipt is queryable
    v_resp = client.get(f"/api/v1/consent/verify/{receipt_hash}")
    assert v_resp.status_code == 200
    v_data = v_resp.json()
    assert v_data["valid"] is True
    assert v_data["receipt_hash"] == receipt_hash

