# -*- coding: utf-8 -*-
"""
test_impact_metrics.py  -  Tests for Privacy-Safe Impact Metrics (Phase 8A)
"""
import pytest
from fastapi.testclient import TestClient

from api.app.main import app
from api.app.database import SessionLocal
from api.app.models import ImpactEvent
from api.app.impact.router import record_impact_event, mask_count

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()

def test_mask_count_privacy_rule():
    assert mask_count(0) == 0
    assert mask_count(1) == "<5"
    assert mask_count(2) == "<5"
    assert mask_count(3) == "<5"
    assert mask_count(4) == "<5"
    assert mask_count(5) == 5
    assert mask_count(42) == 42

def test_impact_event_logging_and_privacy_attributes(db):
    # Clean previous test impact events
    db.query(ImpactEvent).delete()
    db.commit()

    ev = record_impact_event(db, "PROFILE_CREATED")
    assert ev is not None
    assert ev.event_type == "PROFILE_CREATED"

    # Verify no sensitive student fields exist on ImpactEvent
    assert not hasattr(ev, "student_name")
    assert not hasattr(ev, "student_id")
    assert not hasattr(ev, "free_text")

def test_impact_summary_endpoint_with_masking(client, db):
    # Clean table
    db.query(ImpactEvent).delete()
    db.commit()

    # Insert 3 profiles (should be masked as "<5")
    for _ in range(3):
        record_impact_event(db, "PROFILE_CREATED")

    # Insert 6 steps completed (>=5, should NOT be masked, shows 6)
    for _ in range(6):
        record_impact_event(db, "STEP_COMPLETED")

    resp = client.get("/api/v1/impact/summary")
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "ok"
    metrics = data["metrics"]

    # 3 profiles -> strictly masked
    assert metrics["profiles_created"] == "<5"
    # 6 steps -> unmasked
    assert metrics["steps_completed"] == 6
    # 0 syncs -> 0
    assert metrics["offline_syncs"] == 0

def test_impact_event_api_endpoint(client):
    # Valid event
    res = client.post("/api/v1/impact/event", json={"event_type": "OPP_VIEWED"})
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    # Invalid event rejected
    bad_res = client.post("/api/v1/impact/event", json={"event_type": "INVALID_INVENTED_EVENT"})
    assert bad_res.status_code == 400
