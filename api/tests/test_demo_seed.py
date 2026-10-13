import json
import pytest
from fastapi.testclient import TestClient

from api.app.main import app
from api.app.database import SessionLocal
from api.app.config import settings
from api.app.models import Facilitator, Cohort, Student, Pathway, Recommendation, ModuleEnrollment
from api.seed_demo import seed_demo_data

client = TestClient(app)

def test_demo_seed_creates_complete_labeled_environment():
    db = SessionLocal()
    try:
        res = seed_demo_data(db)
        assert res["join_code"] == "DEMO10"
        assert res["facilitator_phone"] == "9822000000"
        assert len(res["student_ids"]) == 3

        # 1. Facilitator Verification
        fac = db.query(Facilitator).filter(Facilitator.id == res["facilitator_id"]).first()
        assert fac is not None
        assert fac.name.startswith("[DEMO]")
        assert fac.phone_number == "9822000000"
        assert fac.is_verified is True

        # 2. Cohort Verification
        cohort = db.query(Cohort).filter(Cohort.join_code == "DEMO10").first()
        assert cohort is not None
        assert cohort.name.startswith("[DEMO]")
        assert len(cohort.members) == 3

        # 3. Student 1 (Exploration stage - 0 ticks)
        s1 = db.query(Student).filter(Student.id == "demo-student-001").first()
        assert s1 is not None
        assert s1.name.startswith("[DEMO]")
        p1 = db.query(Pathway).filter(Pathway.student_id == s1.id).first()
        assert p1 is not None
        assert p1.title.startswith("[DEMO]")
        steps1 = json.loads(p1.micro_steps_json)
        completed_1 = [st for st in steps1 if st.get("is_completed")]
        assert len(completed_1) == 0  # 0 ticks completed

        # 4. Student 2 (Mid-way stage - 15 ticks + Recommendation)
        s2 = db.query(Student).filter(Student.id == "demo-student-002").first()
        assert s2 is not None
        assert s2.name.startswith("[DEMO]")
        p2 = db.query(Pathway).filter(Pathway.student_id == s2.id).first()
        steps2 = json.loads(p2.micro_steps_json)
        completed_2 = [st for st in steps2 if st.get("is_completed")]
        assert len(completed_2) == 15  # Exactly 15 ticks completed
        # Has recommendation
        rec2 = db.query(Recommendation).filter(Recommendation.student_id == s2.id).first()
        assert rec2 is not None
        assert "स्नेहल" in rec2.note

        # 5. Student 3 (Advanced stage - 26 ticks + Module enrollment)
        s3 = db.query(Student).filter(Student.id == "demo-student-003").first()
        assert s3 is not None
        assert s3.name.startswith("[DEMO]")
        p3 = db.query(Pathway).filter(Pathway.student_id == s3.id).first()
        steps3 = json.loads(p3.micro_steps_json)
        completed_3 = [st for st in steps3 if st.get("is_completed")]
        assert len(completed_3) == 26  # 26 ticks completed
        # Enrolled in course with 12/88 split
        enrollment = db.query(ModuleEnrollment).filter(ModuleEnrollment.student_id == s3.id).first()
        assert enrollment is not None
        assert enrollment.amount_paid == 200.0
        assert enrollment.platform_fee_inr == 24.0      # 12%
        assert enrollment.facilitator_share_inr == 176.0 # 88%
    finally:
        db.close()

def test_api_demo_reset_endpoint():
    res = client.post("/api/v1/demo/reset")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "DEMO10" in data["message"] or data["details"]["join_code"] == "DEMO10"

def test_demo_reset_and_login_gated_in_production_mode(monkeypatch):
    """In production mode, demo reset and demo login return 403 unless valid X-Admin-Key is provided."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    # 1. Demo reset without admin key must return 403
    res_reset_blocked = client.post("/api/v1/demo/reset")
    assert res_reset_blocked.status_code == 403
    assert "DEMO_RESET_DISABLED" in res_reset_blocked.json()["detail"]

    # 2. Demo reset with valid admin key succeeds (200)
    res_reset_admin = client.post("/api/v1/demo/reset", headers={"X-Admin-Key": settings.ADMIN_KEY})
    assert res_reset_admin.status_code == 200

    # 3. Demo facilitator login without admin key in production must return 403
    demo_phone = settings.DEMO_FACILITATOR_PHONE
    res_login_blocked = client.post("/api/v1/facilitator/auth/request-otp", json={"phone_number": demo_phone})
    assert res_login_blocked.status_code == 403
    assert "DEMO_LOGIN_DISABLED" in res_login_blocked.json()["detail"]

    # 4. Demo facilitator verify-otp without admin key in production returns 403
    res_verify_blocked = client.post("/api/v1/facilitator/auth/verify-otp", json={"phone_number": demo_phone, "otp": "123456"})
    assert res_verify_blocked.status_code == 403
    assert "DEMO_LOGIN_DISABLED" in res_verify_blocked.json()["detail"]

    # 5. Demo facilitator login with admin key succeeds (200)
    res_login_admin = client.post(
        "/api/v1/facilitator/auth/request-otp",
        json={"phone_number": demo_phone},
        headers={"X-Admin-Key": settings.ADMIN_KEY}
    )
    assert res_login_admin.status_code == 200

    # 6. Regular non-demo phone in production does not leak demo_otp on-screen
    res_prod_regular = client.post(
        "/api/v1/facilitator/auth/request-otp",
        json={"phone_number": "9811122233"}
    )
    assert res_prod_regular.status_code == 200
    assert res_prod_regular.json()["demo_otp"] is None
