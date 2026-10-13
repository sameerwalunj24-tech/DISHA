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
