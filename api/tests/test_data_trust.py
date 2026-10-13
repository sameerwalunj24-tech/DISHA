# -*- coding: utf-8 -*-
"""
test_data_trust.py  -  Tests for Data Trust Tooling (Phase 8A)
"""
import pytest
from datetime import date, timedelta
from pathlib import Path
import csv

from api.verify_report import (
    check_url_health,
    sanitize_content,
    compute_content_hash,
    diff_scheme_hash,
    load_hash_registry,
    save_hash_registry,
    run_verification_report
)
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


def test_sanitize_content_and_compute_content_hash():
    """
    Validates that page sanitization removes scripts and styles, collapses whitespace,
    and produces a stable SHA-256 digest resistant to cosmetic noise.
    """
    html_1 = """
    <html>
      <head>
        <script>var trackingId = 98765;</script>
        <style>body { background: #fff; }</style>
      </head>
      <body>
        <h1>National Apprenticeship Scheme</h1>
        <p>Stipend: Rs 8000/month</p>
      </body>
    </html>
    """

    html_2 = """
    <html>
      <head>
        <script>var differentTracking = 11111; function log() {}</script>
        <style>.btn { color: red; }</style>
      </head>
      <body>
        <h1>National Apprenticeship Scheme</h1>

        <p>Stipend:    Rs 8000/month</p>
      </body>
    </html>
    """

    sanitized_1 = sanitize_content(html_1)
    sanitized_2 = sanitize_content(html_2)
    assert "trackingId" not in sanitized_1
    assert "differentTracking" not in sanitized_2
    assert sanitized_1 == sanitized_2

    hash_1 = compute_content_hash(html_1)
    hash_2 = compute_content_hash(html_2)
    assert len(hash_1) == 64
    assert hash_1 == hash_2, "Sanitized content hashes must match despite script and whitespace differences"


def test_diff_scheme_hash_new_scheme_records_initial_hash():
    """
    New schemes without registry entries record initial content hash and status VERIFIED.
    """
    registry = {}
    h = "aaaabbbbccccddddeeeeffff0000111122223333444455556666777788889999"
    status = diff_scheme_hash(
        scheme_id="101",
        source_url="https://mahadbt.maharashtra.gov.in/scheme101",
        content_hash=h,
        is_alive=True,
        status_code=200,
        registry=registry
    )

    assert status == "VERIFIED"
    assert "101" in registry
    assert registry["101"]["content_hash"] == h
    assert registry["101"]["source_url"] == "https://mahadbt.maharashtra.gov.in/scheme101"
    assert registry["101"]["status"] == "VERIFIED"
    assert "last_checked" in registry["101"]


def test_diff_scheme_hash_verified_unchanged():
    """
    When official government portal returns 200 and hash matches, mark as VERIFIED_UNCHANGED.
    """
    h = "111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000"
    registry = {
        "201": {
            "source_url": "https://scholarships.gov.in/scheme201",
            "content_hash": h,
            "last_checked": "2026-10-01T00:00:00Z",
            "status": "VERIFIED"
        }
    }

    status = diff_scheme_hash(
        scheme_id="201",
        source_url="https://scholarships.gov.in/scheme201",
        content_hash=h,
        is_alive=True,
        status_code=200,
        registry=registry
    )

    assert status == "VERIFIED_UNCHANGED"
    assert registry["201"]["status"] == "VERIFIED"
    assert registry["201"]["content_hash"] == h


def test_diff_scheme_hash_flags_content_change_drift():
    """
    When official portal content hash changes on a 200 response,
    mark as FLAGGED_CONTENT_CHANGED requiring human administrator review.
    """
    old_h = "old_hash_0000000000000000000000000000000000000000000000000000000000"
    new_h = "new_hash_1111111111111111111111111111111111111111111111111111111111"
    registry = {
        "301": {
            "source_url": "https://apprenticeshipindia.gov.in/scheme301",
            "content_hash": old_h,
            "last_checked": "2026-09-01T00:00:00Z",
            "status": "VERIFIED"
        }
    }

    status = diff_scheme_hash(
        scheme_id="301",
        source_url="https://apprenticeshipindia.gov.in/scheme301",
        content_hash=new_h,
        is_alive=True,
        status_code=200,
        registry=registry
    )

    assert status == "FLAGGED_CONTENT_CHANGED"
    assert registry["301"]["status"] == "FLAGGED_CONTENT_CHANGED"
    assert registry["301"]["content_hash"] == new_h
    assert registry["301"]["previous_hash"] == old_h


def test_diff_scheme_hash_broken_link_detection():
    """
    When official government portal returns 404, 500, or network failure,
    mark as BROKEN_LINK.
    """
    existing_h = "existing_hash_9999999999999999999999999999999999999999999999999999999"
    registry = {
        "401": {
            "source_url": "https://deadportal.gov.in/scheme401",
            "content_hash": existing_h,
            "last_checked": "2026-08-01T00:00:00Z",
            "status": "VERIFIED"
        }
    }

    # 404 status code
    status_404 = diff_scheme_hash(
        scheme_id="401",
        source_url="https://deadportal.gov.in/scheme401",
        content_hash=None,
        is_alive=False,
        status_code=404,
        registry=registry
    )
    assert status_404 == "BROKEN_LINK"
    assert registry["401"]["status"] == "BROKEN_LINK"

    # Connection failure / timeout
    status_timeout = diff_scheme_hash(
        scheme_id="402",
        source_url="https://timeout.gov.in/scheme402",
        content_hash=None,
        is_alive=False,
        status_code=None,
        registry=registry
    )
    assert status_timeout == "BROKEN_LINK"
    assert registry["402"]["status"] == "BROKEN_LINK"


def test_hash_registry_save_and_load(tmp_path):
    """
    Validates persistence format and roundtrip loading for scheme_hashes.json.
    Format: {"<scheme_id>": {"source_url": "...", "content_hash": "...", "last_checked": "...", "status": "VERIFIED"}}
    """
    reg_file = tmp_path / "scheme_hashes.json"
    data = {
        "1": {
            "source_url": "https://www.apprenticeshipindia.gov.in",
            "content_hash": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            "last_checked": "2026-10-13T12:00:00Z",
            "status": "VERIFIED"
        }
    }
    save_hash_registry(data, reg_file)
    assert reg_file.exists()

    loaded = load_hash_registry(reg_file)
    assert "1" in loaded
    assert loaded["1"]["content_hash"] == data["1"]["content_hash"]
    assert loaded["1"]["status"] == "VERIFIED"

