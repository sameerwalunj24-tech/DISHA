import pytest
from fastapi.testclient import TestClient

from api.app.main import app
from api.app.database import SessionLocal
from api.app.models import Opportunity
from api.app.config import settings
from connectors.sample_ngo_feed_connector import (
    read_feed_file,
    transform_and_validate
)

client = TestClient(app)

def test_partner_api_key_auth_rejects_missing_and_invalid_key():
    payload = {
        "items": [
            {
                "title": "चाचणी संधी (Test Opportunity)",
                "category": "vocational",
                "provider": "Test Foundation",
                "benefits": "Free training",
                "source_url": "https://example.org/test"
            }
        ]
    }

    # 1. Missing API key header
    res_no_key = client.post("/api/v1/partner/opportunities/import", json=payload)
    assert res_no_key.status_code == 401
    assert "Invalid or missing Partner API Key" in res_no_key.json()["detail"]

    # 2. Invalid API key header
    res_bad_key = client.post(
        "/api/v1/partner/opportunities/import",
        json=payload,
        headers={"X-API-Key": "wrong_unauthorized_key"}
    )
    assert res_bad_key.status_code == 401

def test_partner_import_enforces_sample_unverified_and_null_verifiers():
    payload = {
        "items": [
            {
                "title": "सौर ऊर्जानिर्मिती तंत्रज्ञ (Solar Energy Technician)",
                "category": "vocational",
                "provider": "ग्रामीण ऊर्जा संस्था (Rural Energy Org)",
                "min_grade": 10,
                "max_grade": 12,
                "min_age": 18,
                "max_age": 28,
                "benefits": "₹३,००० विद्यावेतन व टूलकिट",
                "source_url": "https://ruralenergy.org/solar",
                # Attempt to falsely claim verification in payload
                "verification_status": "verified",
                "verified_by": "Fake Verifier"
            }
        ]
    }

    valid_key = settings.PARTNER_API_KEYS[0]
    res = client.post(
        "/api/v1/partner/opportunities/import",
        json=payload,
        headers={"X-API-Key": valid_key}
    )

    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "success"
    assert data["imported_count"] == 1
    assert data["verification_status"] == "sample_unverified"

    # Query DB directly to verify strict Data Trust enforcement
    db = SessionLocal()
    try:
        opp = db.query(Opportunity).filter(Opportunity.id == data["imported_ids"][0]).first()
        assert opp is not None
        assert opp.title == "सौर ऊर्जानिर्मिती तंत्रज्ञ (Solar Energy Technician)"
        assert opp.verification_status == "sample_unverified"
        assert opp.verified_by is None
        assert opp.verified_on is None
        assert opp.is_sample is True
    finally:
        db.close()

def test_connector_transform_and_import_pipeline():
    import tempfile
    import json
    import os

    sample_feed_data = [
        {
            "name": "कृषी ड्रोन पायलट (Agri Drone Pilot)",
            "category": "vocational",
            "provider": "Agri Tech NGO",
            "min_grade": 10,
            "max_grade": 14,
            "min_age": 18,
            "max_age": 25,
            "benefits": "Free training + License",
            "source_url": "https://agritech.org/pilot"
        }
    ]

    with tempfile.NamedTemporaryFile("w+", suffix=".json", delete=False, encoding="utf-8") as tf:
        json.dump(sample_feed_data, tf)
        tf_path = tf.name

    try:
        raw_items = read_feed_file(tf_path)
        assert len(raw_items) == 1

        cleaned = transform_and_validate(raw_items)
        assert len(cleaned) == 1
        assert cleaned[0]["title"] == "कृषी ड्रोन पायलट (Agri Drone Pilot)"
        assert cleaned[0]["min_grade"] == 10

        valid_key = settings.PARTNER_API_KEYS[0]
        res = client.post(
            "/api/v1/partner/opportunities/import",
            json={"items": cleaned},
            headers={"X-API-Key": valid_key}
        )
        assert res.status_code == 201
        assert res.json()["imported_count"] == 1
    finally:
        if os.path.exists(tf_path):
            os.remove(tf_path)
