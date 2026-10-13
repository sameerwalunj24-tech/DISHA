"""
test_facilitator.py - Phase 6 Facilitator, Cohort, Talent Radar & Privacy Tests
================================================================================
Tests:
1. Facilitator Auth flow (Request OTP with on-screen demo code, verify, JWT bearer validation)
2. Access Control (Facilitator A strictly cannot view Facilitator B's cohorts or roster)
3. Cohort Join flow with data minimisation and guardian consent enforcement
4. Deterministic Talent Radar rules (Rising, Strong Fit, Needs Support) and explainable reasons
5. Recommendations via API and offline outbox sync (visible in student's list)
6. Zero sensitive fields in any facilitator response (income, social category never exposed)
7. Anonymized cohort CSV export has zero personal identifiers
"""

import uuid
import pytest
from fastapi.testclient import TestClient

from api.app.main import app
from api.app.database import SessionLocal
from api.app.models import Student, Pathway, Facilitator, Cohort, CohortMember, Opportunity, Recommendation

client = TestClient(app)


def test_facilitator_auth_flow():
    """Facilitator requests OTP (shown on screen in demo), verifies, and receives JWT token."""
    phone = f"98765{uuid.uuid4().hex[:5]}"
    
    # 1. Request OTP
    req_resp = client.post("/api/v1/facilitator/auth/request-otp", json={
        "phone_number": phone,
        "name": "सुरेश माने (सर)",
        "role": "TEACHER",
        "organization": "जि. प. शाळा कराड"
    })
    assert req_resp.status_code == 200
    otp_data = req_resp.json()
    assert "demo_otp" in otp_data
    demo_otp = otp_data["demo_otp"]
    assert len(demo_otp) == 6

    # 2. Verify with invalid OTP -> 400
    bad_resp = client.post("/api/v1/facilitator/auth/verify-otp", json={
        "phone_number": phone,
        "otp": "000000"
    })
    assert bad_resp.status_code == 400

    # 3. Verify with valid OTP -> JWT token
    verify_resp = client.post("/api/v1/facilitator/auth/verify-otp", json={
        "phone_number": phone,
        "otp": demo_otp
    })
    assert verify_resp.status_code == 200
    token_data = verify_resp.json()
    assert "access_token" in token_data
    token = token_data["access_token"]
    assert token_data["facilitator"]["phone_number"] == phone

    # 4. Access /facilitator/me with Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = client.get("/api/v1/facilitator/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["name"] == "सुरेश माने (सर)"

    # 5. Access without token -> 401
    anon_resp = client.get("/api/v1/facilitator/me")
    assert anon_resp.status_code == 401


def test_facilitator_access_control():
    """Facilitator A cannot read Cohort B or Cohort B's roster."""
    # Setup Facilitator A
    phone_a = f"98001{uuid.uuid4().hex[:5]}"
    r_a = client.post("/api/v1/facilitator/auth/request-otp", json={"phone_number": phone_a, "name": "Facilitator A"})
    token_a = client.post("/api/v1/facilitator/auth/verify-otp", json={"phone_number": phone_a, "otp": r_a.json()["demo_otp"]}).json()["access_token"]

    # Setup Facilitator B
    phone_b = f"98002{uuid.uuid4().hex[:5]}"
    r_b = client.post("/api/v1/facilitator/auth/request-otp", json={"phone_number": phone_b, "name": "Facilitator B"})
    token_b = client.post("/api/v1/facilitator/auth/verify-otp", json={"phone_number": phone_b, "otp": r_b.json()["demo_otp"]}).json()["access_token"]

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Facilitator A creates Cohort A
    c_a = client.post("/api/v1/facilitator/cohorts", json={"name": "Class 10-A"}, headers=headers_a).json()
    # Facilitator B creates Cohort B
    c_b = client.post("/api/v1/facilitator/cohorts", json={"name": "Class 10-B"}, headers=headers_b).json()

    # Facilitator A lists cohorts -> only sees Cohort A
    list_a = client.get("/api/v1/facilitator/cohorts", headers=headers_a).json()
    cohort_ids_for_a = [c["id"] for c in list_a]
    assert c_a["id"] in cohort_ids_for_a
    assert c_b["id"] not in cohort_ids_for_a

    # Facilitator A attempts to get Cohort B details -> 404 Forbidden
    assert client.get(f"/api/v1/facilitator/cohorts/{c_b['id']}", headers=headers_a).status_code == 404

    # Facilitator A attempts to get Cohort B roster -> 404 Forbidden
    assert client.get(f"/api/v1/facilitator/cohorts/{c_b['id']}/roster", headers=headers_a).status_code == 404


def test_cohort_join_code_flow_and_guardian_consent():
    """Students join cohort with join code; guardian consent is strictly required."""
    # Create facilitator and cohort
    phone = f"98111{uuid.uuid4().hex[:5]}"
    r_otp = client.post("/api/v1/facilitator/auth/request-otp", json={"phone_number": phone, "name": "Teacher X"}).json()
    token = client.post("/api/v1/facilitator/auth/verify-otp", json={"phone_number": phone, "otp": r_otp["demo_otp"]}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    cohort = client.post("/api/v1/facilitator/cohorts", json={"name": "Batch 2026"}, headers=headers).json()
    join_code = cohort["join_code"]

    db = SessionLocal()
    try:
        # Student 1: NO guardian consent
        s_no_consent = Student(name="अजय पवार", grade=10, guardian_consent=False)
        db.add(s_no_consent)
        # Student 2: WITH guardian consent
        s_consented = Student(name="रोहन गायकवाड", grade=10, guardian_consent=True, interests="solar, electric")
        db.add(s_consented)
        db.commit()
        db.refresh(s_no_consent)
        db.refresh(s_consented)

        # 1. Student without consent attempts to join -> 403 Forbidden
        join_bad = client.post("/api/v1/cohorts/join", json={
            "join_code": join_code,
            "student_id": s_no_consent.id,
            "nickname": "Student #101"
        })
        assert join_bad.status_code == 403
        assert "GUARDIAN_CONSENT_REQUIRED" in join_bad.json()["detail"]

        # 2. Student with consent joins -> 200 OK + plain-language notice
        join_good = client.post("/api/v1/cohorts/join", json={
            "join_code": join_code,
            "student_id": s_consented.id,
            "nickname": "रोहन (Roll 12)"
        })
        assert join_good.status_code == 200
        data = join_good.json()
        assert data["success"] is True
        assert data["nickname"] == "रोहन (Roll 12)"
        assert "शिक्षक" in data["notice"]  # Notice is displayed in Marathi/English
    finally:
        db.close()


def test_talent_radar_rules_and_explanations():
    """Talent Radar generates deterministic supportive flags with plain-language reasons."""
    phone = f"98222{uuid.uuid4().hex[:5]}"
    r_otp = client.post("/api/v1/facilitator/auth/request-otp", json={"phone_number": phone, "name": "Radar Teacher"}).json()
    token = client.post("/api/v1/facilitator/auth/verify-otp", json={"phone_number": phone, "otp": r_otp["demo_otp"]}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    cohort = client.post("/api/v1/facilitator/cohorts", json={"name": "Radar Class"}, headers=headers).json()

    db = SessionLocal()
    try:
        # Student with consistent progress (2 steps completed)
        s_rising = Student(name="प्रिया जोशी", grade=10, guardian_consent=True, interests="solar, electric")
        db.add(s_rising)
        db.flush()

        pw = Pathway(
            student_id=s_rising.id,
            title="Solar Pathway",
            career_goal="electrical_solar",
            micro_steps_json='{"completed_steps": ["es_w1_s1", "es_w1_s2"]}',
            estimated_days=30
        )
        db.add(pw)
        db.commit()

        # Join cohort
        client.post("/api/v1/cohorts/join", json={
            "join_code": cohort["join_code"],
            "student_id": s_rising.id,
            "nickname": "Priya (Roll 5)"
        })

        # Fetch roster
        roster = client.get(f"/api/v1/facilitator/cohorts/{cohort['id']}/roster?language=mr", headers=headers).json()
        assert len(roster) == 1
        member = roster[0]
        assert member["nickname"] == "Priya (Roll 5)"
        assert member["completed_steps"] == 2

        # Verify Radar flags
        flag_codes = [f["code"] for f in member["radar_flags"]]
        assert "RISING" in flag_codes
        rising_flag = next(f for f in member["radar_flags"] if f["code"] == "RISING")
        assert "नियमित" in rising_flag["reason"]
    finally:
        db.close()


def test_recommendation_via_api_and_outbox_sync():
    """Facilitator recommends opportunity; student sees it; also syncs via offline outbox."""
    phone = f"98333{uuid.uuid4().hex[:5]}"
    r_otp = client.post("/api/v1/facilitator/auth/request-otp", json={"phone_number": phone, "name": "Guide"}).json()
    token = client.post("/api/v1/facilitator/auth/verify-otp", json={"phone_number": phone, "otp": r_otp["demo_otp"]}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        student = Student(name="किरण मोरे", grade=10, guardian_consent=True)
        db.add(student)
        db.commit()
        db.refresh(student)

        # 1. Direct Recommendation via Facilitator API
        rec_res = client.post("/api/v1/facilitator/recommend", json={
            "student_id": student.id,
            "opportunity_id": "opp_solar_surya_mitra",
            "opportunity_title": "सूर्य मित्र सौर प्रशिक्षण",
            "note": "तुझ्या प्रात्यक्षिक कौशल्यासाठी हे उत्तम आहे."
        }, headers=headers)
        assert rec_res.status_code == 200

        # 2. Student views recommendations
        s_recs = client.get(f"/api/v1/students/{student.id}/recommendations").json()
        assert len(s_recs) == 1
        assert s_recs[0]["opportunity_id"] == "opp_solar_surya_mitra"
        assert s_recs[0]["note"] == "तुझ्या प्रात्यक्षिक कौशल्यासाठी हे उत्तम आहे."

        # 3. Offline Outbox Recommendation Sync
        item_id = str(uuid.uuid4())
        sync_batch = {
            "items": [
                {
                    "id": item_id,
                    "type": "recommendation",
                    "payload": {
                        "student_id": student.id,
                        "opportunity_id": "opp_iti_diesel_mechanic",
                        "opportunity_title": "ITI डिझेल मेकॅनिक शिकाऊ उमेदवारी",
                        "note": "अर्ज नक्की भर!"
                    },
                    "updated_at": "2026-10-13T12:00:00Z"
                }
            ]
        }
        sync_res = client.post("/api/v1/sync", json=sync_batch)
        assert sync_res.status_code == 200
        assert sync_res.json()["results"][0]["status"] == "synced"

        # Verify student now has 2 recommendations
        s_recs_after = client.get(f"/api/v1/students/{student.id}/recommendations").json()
        assert len(s_recs_after) == 2
    finally:
        db.close()


def test_no_sensitive_fields_in_facilitator_responses():
    """Facilitator endpoints strictly NEVER expose family income or social category."""
    phone = f"98444{uuid.uuid4().hex[:5]}"
    r_otp = client.post("/api/v1/facilitator/auth/request-otp", json={"phone_number": phone, "name": "Privacy Teacher"}).json()
    token = client.post("/api/v1/facilitator/auth/verify-otp", json={"phone_number": phone, "otp": r_otp["demo_otp"]}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    cohort = client.post("/api/v1/facilitator/cohorts", json={"name": "Privacy Batch"}, headers=headers).json()

    db = SessionLocal()
    try:
        student = Student(
            name="राहुल पवार",
            grade=10,
            guardian_consent=True,
            annual_family_income=90000.0,
            interests="farming"
        )
        db.add(student)
        db.commit()
        db.refresh(student)

        client.post("/api/v1/cohorts/join", json={
            "join_code": cohort["join_code"],
            "student_id": student.id,
            "nickname": "Rahul (Roll 1)"
        })

        # Fetch roster
        roster_resp = client.get(f"/api/v1/facilitator/cohorts/{cohort['id']}/roster", headers=headers)
        roster_text = roster_resp.text

        # Verify income and social category are strictly absent
        assert "annual_family_income" not in roster_text
        assert "family_income" not in roster_text
        assert "social_category" not in roster_text
        assert "90000" not in roster_text
    finally:
        db.close()


def test_anonymized_cohort_csv_export():
    """Exported CSV contains aggregated cohort metrics with ZERO student names or IDs."""
    phone = f"98555{uuid.uuid4().hex[:5]}"
    r_otp = client.post("/api/v1/facilitator/auth/request-otp", json={"phone_number": phone, "name": "Export Teacher"}).json()
    token = client.post("/api/v1/facilitator/auth/verify-otp", json={"phone_number": phone, "otp": r_otp["demo_otp"]}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    cohort = client.post("/api/v1/facilitator/cohorts", json={"name": "Export Batch"}, headers=headers).json()

    db = SessionLocal()
    try:
        s = Student(name="गोपाळ तांबडे", grade=10, guardian_consent=True, interests="dairy")
        db.add(s)
        db.commit()
        db.refresh(s)

        client.post("/api/v1/cohorts/join", json={
            "join_code": cohort["join_code"],
            "student_id": s.id,
            "nickname": "Gopal (Roll 3)"
        })

        # Export CSV
        csv_resp = client.get(f"/api/v1/facilitator/cohorts/{cohort['id']}/export.csv", headers=headers)
        assert csv_resp.status_code == 200
        assert "text/csv" in csv_resp.headers["content-type"]
        csv_content = csv_resp.text

        # Header check
        assert "Grade,Career_Cluster,Profile_Status,Pathway_Progress_Band" in csv_content
        # Ensure NO student personal identifiers
        assert "गोपाळ" not in csv_content
        assert s.id not in csv_content
        assert "Gopal" not in csv_content
    finally:
        db.close()
