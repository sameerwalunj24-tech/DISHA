"""
test_sync.py - Phase 5: Offline Sync API Tests
==============================================
Tests:
1. Offline quiz result sync creates student profile and personal pathway
2. Idempotency (same batch twice produces zero duplicates)
3. Conflict resolution (last-write-wins by updated_at)
4. Partial failure handling (bad item doesn't crash valid items in batch)
5. Sensitive fields excluded (income/category are never stored)
"""

import uuid
import pytest
from fastapi.testclient import TestClient

from api.app.main import app
from api.app.database import SessionLocal
from api.app.models import Student, Pathway, SyncLog

client = TestClient(app)


def test_sync_offline_quiz_creates_student_and_pathway():
    """Offline quiz synced to server must create a student record and pathway."""
    item_id = str(uuid.uuid4())
    batch = {
        "items": [
            {
                "id": item_id,
                "type": "offline_quiz_result",
                "payload": {
                    "student_name": "सचिन कदम",
                    "language": "mr",
                    "guardian_consent": True,
                    "answers": {
                        "1": "opt_1_solar",
                        "2": "opt_2_site",
                        "3": "opt_3_meter",
                        "4": "opt_4_technician"
                    }
                },
                "updated_at": "2026-10-13T12:00:00Z",
                "attempts": 0
            }
        ]
    }

    resp = client.post("/api/v1/sync", json=batch)
    assert resp.status_code == 200
    data = resp.json()
    assert data["processed_count"] == 1
    assert data["failed_count"] == 0

    result = data["results"][0]
    assert result["id"] == item_id
    assert result["status"] == "synced"
    student_id = result["student_id"]
    assert student_id is not None

    # Verify student exists in DB
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        assert student is not None
        assert student.name == "सचिन कदम"
        assert student.guardian_consent is True

        # Verify pathway was auto-created for this student
        pathway = db.query(Pathway).filter(Pathway.student_id == student_id).first()
        assert pathway is not None
        assert pathway.career_goal == "electrical_solar"
    finally:
        db.close()


def test_sync_idempotency_same_batch_twice():
    """Sending the exact same batch twice must return success without duplicate writes."""
    item_id = str(uuid.uuid4())
    batch = {
        "items": [
            {
                "id": item_id,
                "type": "offline_quiz_result",
                "payload": {
                    "student_name": "अमित कांबळे",
                    "language": "mr",
                    "guardian_consent": True,
                    "answers": {
                        "1": "opt_1_farm",
                        "2": "opt_2_outdoor"
                    }
                },
                "updated_at": "2026-10-13T12:00:00Z",
                "attempts": 0
            }
        ]
    }

    # First sync call
    resp1 = client.post("/api/v1/sync", json=batch)
    assert resp1.status_code == 200
    assert resp1.json()["results"][0]["status"] == "synced"
    student_id_1 = resp1.json()["results"][0]["student_id"]

    db = SessionLocal()
    try:
        initial_student_count = db.query(Student).filter(Student.name == "अमित कांबळे").count()
        assert initial_student_count == 1

        # Second sync call (replaying exact same item id)
        resp2 = client.post("/api/v1/sync", json=batch)
        assert resp2.status_code == 200
        res2 = resp2.json()["results"][0]
        assert res2["status"] == "synced"
        assert res2["student_id"] == student_id_1
        assert "idempotent" in res2["message"].lower()

        # Count must remain exactly 1 - NO DUPLICATE CREATED
        new_count = db.query(Student).filter(Student.name == "अमित कांबळे").count()
        assert new_count == 1
    finally:
        db.close()


def test_sync_conflict_resolution_last_write_wins():
    """A newer update overwrites, while an older update is marked conflict_ignored."""
    # 1. Create a student with pathway first
    setup_item_id = str(uuid.uuid4())
    setup_batch = {
        "items": [
            {
                "id": setup_item_id,
                "type": "offline_quiz_result",
                "payload": {
                    "student_name": "दीपक सावंत",
                    "language": "mr",
                    "guardian_consent": True,
                    "answers": {"1": "opt_1_solar"}
                },
                "updated_at": "2026-10-13T10:00:00Z"
            }
        ]
    }
    setup_res = client.post("/api/v1/sync", json=setup_batch)
    student_id = setup_res.json()["results"][0]["student_id"]

    # 2. Apply newer progress (12:00:00)
    newer_item_id = str(uuid.uuid4())
    newer_batch = {
        "items": [
            {
                "id": newer_item_id,
                "type": "pathway_progress",
                "payload": {
                    "student_id": student_id,
                    "completed_step_ids": ["step_1", "step_2"]
                },
                "updated_at": "2026-10-13T12:00:00Z"
            }
        ]
    }
    res_newer = client.post("/api/v1/sync", json=newer_batch)
    assert res_newer.status_code == 200
    assert res_newer.json()["results"][0]["status"] == "synced"

    # 3. Send older progress (11:00:00) -> must be ignored by last-write-wins
    older_item_id = str(uuid.uuid4())
    older_batch = {
        "items": [
            {
                "id": older_item_id,
                "type": "pathway_progress",
                "payload": {
                    "student_id": student_id,
                    "completed_step_ids": ["step_0_stale"]
                },
                "updated_at": "2026-10-13T11:00:00Z"
            }
        ]
    }
    res_older = client.post("/api/v1/sync", json=older_batch)
    assert res_older.status_code == 200
    assert res_older.json()["results"][0]["status"] == "conflict_ignored"

    # Verify DB still has step_1 and step_2
    db = SessionLocal()
    try:
        pw = db.query(Pathway).filter(Pathway.student_id == student_id).first()
        assert "step_1" in pw.micro_steps_json
        assert "step_0_stale" not in pw.micro_steps_json
    finally:
        db.close()


def test_sync_partial_failure_handling():
    """An invalid item in a batch does not cause the valid item to fail."""
    valid_id = str(uuid.uuid4())
    invalid_id = str(uuid.uuid4())

    batch = {
        "items": [
            {
                # Item 1: INVALID - Guardian consent False
                "id": invalid_id,
                "type": "offline_quiz_result",
                "payload": {
                    "student_name": "अवैध विद्यार्थी",
                    "guardian_consent": False
                },
                "updated_at": "2026-10-13T12:00:00Z"
            },
            {
                # Item 2: VALID
                "id": valid_id,
                "type": "offline_quiz_result",
                "payload": {
                    "student_name": "वैध विद्यार्थी",
                    "guardian_consent": True,
                    "answers": {"1": "opt_1_solar"}
                },
                "updated_at": "2026-10-13T12:00:00Z"
            }
        ]
    }

    resp = client.post("/api/v1/sync", json=batch)
    assert resp.status_code == 200
    data = resp.json()

    assert data["failed_count"] == 1
    assert data["processed_count"] == 1

    r_invalid = next(r for r in data["results"] if r["id"] == invalid_id)
    assert r_invalid["status"] == "failed"
    assert "GUARDIAN_CONSENT_REQUIRED" in r_invalid["message"]

    r_valid = next(r for r in data["results"] if r["id"] == valid_id)
    assert r_valid["status"] == "synced"
    assert r_valid["student_id"] is not None


def test_sync_sensitive_fields_never_persisted():
    """Sensitive fields (income, social category) are stripped and never saved."""
    item_id = str(uuid.uuid4())
    batch = {
        "items": [
            {
                "id": item_id,
                "type": "offline_quiz_result",
                "payload": {
                    "student_name": "राहुल शिंदे",
                    "guardian_consent": True,
                    "family_income": 180000.0,
                    "social_category": "OBC",
                    "answers": {"1": "opt_1_solar"}
                },
                "updated_at": "2026-10-13T12:00:00Z"
            }
        ]
    }

    resp = client.post("/api/v1/sync", json=batch)
    assert resp.status_code == 200
    student_id = resp.json()["results"][0]["student_id"]

    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        assert student is not None
        # Must strictly be None
        assert student.annual_family_income is None
    finally:
        db.close()


def test_sync_offline_quiz_plus_three_ticks_batch():
    """Acceptance test: 1 offline quiz result + 3 pathway ticks in single sync batch."""
    q_id = str(uuid.uuid4())
    t1_id = str(uuid.uuid4())
    t2_id = str(uuid.uuid4())
    t3_id = str(uuid.uuid4())

    batch = {
        "items": [
            {
                "id": q_id,
                "type": "offline_quiz_result",
                "payload": {
                    "student_name": "प्रिया माने",
                    "language": "mr",
                    "guardian_consent": True,
                    "answers": {"1": "opt_1_solar", "2": "opt_2_site"}
                },
                "updated_at": "2026-10-13T10:00:00Z"
            },
            {
                "id": t1_id,
                "type": "pathway_progress",
                "payload": {
                    "completed_step_ids": ["step_1"]
                },
                "updated_at": "2026-10-13T10:01:00Z"
            },
            {
                "id": t2_id,
                "type": "pathway_progress",
                "payload": {
                    "completed_step_ids": ["step_1", "step_2"]
                },
                "updated_at": "2026-10-13T10:02:00Z"
            },
            {
                "id": t3_id,
                "type": "pathway_progress",
                "payload": {
                    "completed_step_ids": ["step_1", "step_2", "step_3"]
                },
                "updated_at": "2026-10-13T10:03:00Z"
            }
        ]
    }

    resp = client.post("/api/v1/sync", json=batch)
    assert resp.status_code == 200
    data = resp.json()
    assert data["processed_count"] == 4
    assert data["failed_count"] == 0

    student_id = data["results"][0]["student_id"]
    assert student_id is not None

    db = SessionLocal()
    try:
        pw = db.query(Pathway).filter(Pathway.student_id == student_id).first()
        assert pw is not None
        assert "step_1" in pw.micro_steps_json
        assert "step_2" in pw.micro_steps_json
        assert "step_3" in pw.micro_steps_json
    finally:
        db.close()

