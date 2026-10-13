import uuid
import pytest
from fastapi.testclient import TestClient
from api.app.main import app
from api.app.database import SessionLocal
from api.app.models import Student, Facilitator, TrainingModule, ModuleEnrollment

client = TestClient(app)


def test_marketplace_module_creation_and_auth():
    """Facilitator creates a training module; unauthorized creation is rejected."""
    phone = f"98777{uuid.uuid4().hex[:5]}"
    r_otp = client.post("/api/v1/facilitator/auth/request-otp", json={"phone_number": phone, "name": "Guru Shinde"}).json()
    token = client.post("/api/v1/facilitator/auth/verify-otp", json={"phone_number": phone, "otp": r_otp["demo_otp"]}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Unauthenticated creation must fail
    res_unauth = client.post("/api/v1/facilitator/modules", json={
        "title": "Solar Installation",
        "price_type": "ONE_TIME",
        "price_inr": 200.0
    })
    assert res_unauth.status_code in (401, 403)

    # 2. Authenticated creation succeeds
    res_mod = client.post("/api/v1/facilitator/modules", json={
        "title": "सौर ऊर्जा तंत्रज्ञ प्रात्यक्षिक (Solar Technician Practical)",
        "description": "ग्रामीण भागात सौर ऊर्जा उपकरणे बसवणे व दुरुस्ती",
        "language": "mr",
        "price_type": "ONE_TIME",
        "price_inr": 250.0,
        "steps": [
            {"step_number": 1, "title": "पॅनल रचना", "content": "सोलर सेल व इनव्हर्टर जोडणी", "practical_task": "मल्टीमीटरने व्होल्टेज मोजणे"},
            {"step_number": 2, "title": "बॅटरी मेंटेनन्स", "content": "ट्युब्युलर बॅटरी पाणी पातळी तपासणे", "practical_task": "डिस्टिल्ड वॉटर भरणे"}
        ]
    }, headers=headers)
    assert res_mod.status_code == 200
    mod_data = res_mod.json()
    assert mod_data["title"] == "सौर ऊर्जा तंत्रज्ञ प्रात्यक्षिक (Solar Technician Practical)"
    assert mod_data["price_inr"] == 250.0
    assert mod_data["steps_count"] == 2


def test_marketplace_enrollment_and_revenue_split():
    """
    Tests mock payment enrollment and strict 12% platform / 88% facilitator revenue split.
    """
    phone = f"98888{uuid.uuid4().hex[:5]}"
    r_otp = client.post("/api/v1/facilitator/auth/request-otp", json={"phone_number": phone, "name": "Trainer Patil"}).json()
    token = client.post("/api/v1/facilitator/auth/verify-otp", json={"phone_number": phone, "otp": r_otp["demo_otp"]}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create a ₹500 course
    res_mod = client.post("/api/v1/facilitator/modules", json={
        "title": "आधुनिक डेअरी व्यवस्थापन (Modern Dairy Management)",
        "description": "स्वयंचलित दूध काढणी यंत्र व चारा व्यवस्थापन",
        "language": "mr",
        "price_type": "ONE_TIME",
        "price_inr": 500.0,
        "steps": [
            {"step_number": 1, "title": "मिल्किंग मशीन जोडणी", "content": "व्हॅक्यूम प्रेशर सेटिंग"}
        ]
    }, headers=headers)
    mod_id = res_mod.json()["id"]

    db = SessionLocal()
    try:
        student = Student(name="विकास जाधव", grade=11, guardian_consent=True)
        db.add(student)
        db.commit()
        db.refresh(student)

        # Student buys / enrolls with mock payment
        enroll_res = client.post(f"/api/v1/modules/{mod_id}/enroll", json={
            "student_id": student.id,
            "payment_method": "MOCK_UPI"
        })
        assert enroll_res.status_code == 200
        enroll_data = enroll_res.json()

        assert enroll_data["payment_status"] == "PAID_MOCK"
        assert enroll_data["amount_paid"] == 500.0
        # Strict Revenue Split: 12% Platform, 88% Facilitator
        assert enroll_data["platform_fee_inr"] == 60.0    # 500 * 0.12 = 60.0
        assert enroll_data["facilitator_share_inr"] == 440.0 # 500 * 0.88 = 440.0
        assert enroll_data["access_granted"] is True
        assert len(enroll_data["module_content"]["steps"]) == 1

        # Facilitator checks earnings dashboard
        earn_res = client.get("/api/v1/facilitator/earnings", headers=headers)
        assert earn_res.status_code == 200
        earn_data = earn_res.json()

        assert earn_data["total_enrollments"] == 1
        assert earn_data["gross_revenue_inr"] == 500.0
        assert earn_data["platform_share_12pct_inr"] == 60.0
        assert earn_data["facilitator_share_88pct_inr"] == 440.0
        assert len(earn_data["modules_breakdown"]) >= 1

        # Student checks their enrolled modules
        std_modules = client.get(f"/api/v1/students/{student.id}/modules").json()
        assert len(std_modules) == 1
        assert std_modules[0]["module_id"] == mod_id
    finally:
        db.close()


def test_free_module_enrollment():
    """FREE modules cost ₹0 and have 0 fees."""
    phone = f"98999{uuid.uuid4().hex[:5]}"
    r_otp = client.post("/api/v1/facilitator/auth/request-otp", json={"phone_number": phone, "name": "Free Trainer"}).json()
    token = client.post("/api/v1/facilitator/auth/verify-otp", json={"phone_number": phone, "otp": r_otp["demo_otp"]}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res_mod = client.post("/api/v1/facilitator/modules", json={
        "title": "बेसिक डिजिटल बँकिंग व UPI सुरक्षा",
        "price_type": "FREE",
        "price_inr": 0.0
    }, headers=headers)
    mod_id = res_mod.json()["id"]

    db = SessionLocal()
    try:
        s = Student(name="मीरा कुलकर्णी", grade=9, guardian_consent=True)
        db.add(s)
        db.commit()
        db.refresh(s)

        enroll_res = client.post(f"/api/v1/modules/{mod_id}/enroll", json={
            "student_id": s.id
        })
        assert enroll_res.status_code == 200
        e_data = enroll_res.json()
        assert e_data["payment_status"] == "FREE"
        assert e_data["amount_paid"] == 0.0
        assert e_data["platform_fee_inr"] == 0.0
        assert e_data["facilitator_share_inr"] == 0.0
    finally:
        db.close()


def test_deterministic_money_paise_rounding_split():
    """
    Tests that all money amounts are handled as integer paise and split with
    deterministic floor/remainder rounding where platform + facilitator always equals total.
    """
    from api.app.marketplace.router import split_revenue_paise

    # Test cases: (total_paise, expected_platform, expected_facilitator)
    cases = [
        (0, 0, 0),
        (1, 0, 1),
        (8, 0, 8),
        (9, 1, 8),          # 9 * 12 // 100 = 1, remainder = 8
        (9900, 1188, 8712), # ₹99.00
        (19900, 2388, 17512), # ₹199.00
        (25000, 3000, 22000), # ₹250.00
        (50000, 6000, 44000), # ₹500.00
    ]

    for total, exp_plat, exp_fac in cases:
        plat, fac = split_revenue_paise(total)
        assert plat == exp_plat
        assert fac == exp_fac
        assert plat + fac == total, f"Total mismatch for {total}: {plat} + {fac} != {total}"

    # Fuzz test 1000 arbitrary paise amounts
    for val in range(1, 1001):
        plat, fac = split_revenue_paise(val)
        assert plat + fac == val
        assert plat == (val * 12) // 100
        assert fac == val - plat

    # Test via API: create a module with ₹199 and verify paise fields in enrollment response
    phone = f"98765{uuid.uuid4().hex[:5]}"
    r_otp = client.post("/api/v1/facilitator/auth/request-otp", json={"phone_number": phone, "name": "Paise Guru"}).json()
    token = client.post("/api/v1/facilitator/auth/verify-otp", json={"phone_number": phone, "otp": r_otp["demo_otp"]}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res_mod = client.post("/api/v1/facilitator/modules", json={
        "title": "पायथन कोडिंग कौशल्य (Python Skills)",
        "price_type": "ONE_TIME",
        "price_inr": 199.0
    }, headers=headers)
    assert res_mod.status_code == 200
    mod_info = res_mod.json()
    assert mod_info["price_paise"] == 19900
    assert mod_info["price_inr"] == 199.0

    db = SessionLocal()
    try:
        s = Student(name="परीक्षित पाटील", grade=10, guardian_consent=True)
        db.add(s)
        db.commit()
        db.refresh(s)

        enroll_res = client.post(f"/api/v1/modules/{mod_info['id']}/enroll", json={
            "student_id": s.id
        })
        assert enroll_res.status_code == 200
        en_data = enroll_res.json()
        assert en_data["amount_paid_paise"] == 19900
        assert en_data["platform_fee_paise"] == 2388
        assert en_data["facilitator_share_paise"] == 17512
        assert en_data["platform_fee_paise"] + en_data["facilitator_share_paise"] == 19900
    finally:
        db.close()

