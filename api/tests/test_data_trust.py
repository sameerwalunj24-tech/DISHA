# -*- coding: utf-8 -*-
"""
test_data_trust.py  -  Tests for Data Trust Tooling (Phase 8A)
"""
import pytest
from datetime import date, timedelta
from pathlib import Path
import csv

from api.verify_report import check_url_health
from api.admin_verify import verify_opportunity_record, is_valid_date
from api.seed import validate_row
from api.app.matching.rules_engine import evaluate_opportunity, REFERENCE_DATE

def test_check_url_health_flags_non_https():
    result = check_url_health("http://example.com/scheme", timeout=1.0)
    assert "NON-HTTPS" in result["flags"]
    assert result["is_https"] is False

def test_check_url_health_detects_https():
    result = check_url_health("https://example.com/scheme", timeout=1.0)
    assert "NON-HTTPS" not in result["flags"]
    assert result["is_https"] is True

def test_admin_verify_rejects_empty_verifier_or_future_date():
    with pytest.raises(ValueError, match="cannot be empty"):
        verify_opportunity_record(opp_id=1, verifier_name="", update_db=False)

    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    with pytest.raises(ValueError, match="Invalid verification date"):
        verify_opportunity_record(opp_id=1, verifier_name="Reviewer", verification_date=tomorrow, update_db=False)

def test_admin_verify_updates_row_correctly(tmp_path):
    test_csv = tmp_path / "test_opportunities.csv"
    with open(test_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "id", "title", "category", "provider", "min_grade", "max_grade",
            "states", "gender", "benefits", "source_name", "source_url", "last_verified",
            "verification_status", "verified_by", "verified_on"
        ])
        writer.writeheader()
        writer.writerow({
            "id": "1",
            "title": "Solar Apprenticeship",
            "category": "apprenticeship",
            "provider": "MSDE",
            "min_grade": "10",
            "max_grade": "12",
            "states": "Maharashtra",
            "gender": "ALL",
            "benefits": "Stipend",
            "source_name": "Portal",
            "source_url": "https://apprenticeshipindia.gov.in",
            "last_verified": "2026-09-01",
            "verification_status": "sample_unverified",
            "verified_by": "",
            "verified_on": ""
        })

    today_str = date.today().isoformat()
    updated = verify_opportunity_record(
        opp_id=1,
        verifier_name="Pooja Deshmukh",
        verification_date=today_str,
        csv_path=test_csv,
        update_db=False
    )

    assert updated["verification_status"] == "verified"
    assert updated["verified_by"] == "Pooja Deshmukh"
    assert updated["verified_on"] == today_str
    assert updated["last_verified"] == today_str

def test_90_day_rule_fresh_verification_gets_bonus():
    opp = {
        "id": 1,
        "title": "Fresh Verified Scheme",
        "category": "scholarship",
        "min_grade": 10,
        "max_grade": 12,
        "states": "Maharashtra",
        "gender": "ALL",
        "verification_status": "verified",
        "verified_by": "Senior Reviewer",
        "verified_on": (REFERENCE_DATE - timedelta(days=30)).isoformat(), # 30 days old (<90d)
        "mobility": "DISTRICT"
    }
    profile = {"grade": 10, "state": "Maharashtra", "district": "Satara", "gender": "ALL", "mobility_preference": "DISTRICT"}

    eval_result = evaluate_opportunity(opp, profile, eval_date=REFERENCE_DATE)
    assert eval_result.needs_recheck is False
    assert eval_result.score_breakdown["verification_bonus"] == 30

def test_90_day_rule_expired_verification_loses_bonus_and_flags_recheck():
    opp = {
        "id": 1,
        "title": "Old Verified Scheme",
        "category": "scholarship",
        "min_grade": 10,
        "max_grade": 12,
        "states": "Maharashtra",
        "gender": "ALL",
        "verification_status": "verified",
        "verified_by": "Past Reviewer",
        "verified_on": (REFERENCE_DATE - timedelta(days=95)).isoformat(), # 95 days old (>90d)
        "mobility": "DISTRICT"
    }
    profile = {"grade": 10, "state": "Maharashtra", "district": "Satara", "gender": "ALL", "mobility_preference": "DISTRICT"}

    eval_result = evaluate_opportunity(opp, profile, eval_date=REFERENCE_DATE)
    assert eval_result.needs_recheck is True
    assert eval_result.score_breakdown["verification_bonus"] == 0

def test_seed_csv_validation_rejects_malformed_rows():
    base_row = {
        "id": "1",
        "title": "Valid Scheme",
        "category": "scholarship",
        "provider": "Portal",
        "min_grade": "10",
        "max_grade": "12",
        "states": "Maharashtra",
        "gender": "ALL",
        "benefits": "Benefits",
        "source_name": "Official",
        "source_url": "https://gov.in",
        "last_verified": "2026-10-01",
        "verification_status": "sample_unverified"
    }

    # Valid row passes
    valid, msg = validate_row(base_row, 1)
    assert valid is True

    # Bad category fails
    bad_cat = {**base_row, "category": "invalid_category"}
    valid, msg = validate_row(bad_cat, 1)
    assert valid is False
    assert "Invalid category" in msg

    # Non-http URL fails
    bad_url = {**base_row, "source_url": "ftp://bad.com"}
    valid, msg = validate_row(bad_url, 1)
    assert valid is False
    assert "source_url" in msg

    # Verified without human verifier fails
    bad_verif = {**base_row, "verification_status": "verified", "verified_by": "", "verified_on": ""}
    valid, msg = validate_row(bad_verif, 1)
    assert valid is False
    assert "verified_by" in msg
