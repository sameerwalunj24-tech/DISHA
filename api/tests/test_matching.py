from datetime import date
import pytest
from fastapi.testclient import TestClient

from api.app.main import app
from api.app.database import SessionLocal
from api.app.models import Student, Opportunity
from api.app.matching.rules_engine import evaluate_opportunity
from api.app.matching.explainer import ExplanationValidator, generate_grounded_explanation

client = TestClient(app)

# Helper mock opportunity dict
SAMPLE_OPP = {
    "id": 99,
    "title": "Solar Apprenticeship Program",
    "min_grade": 10,
    "max_grade": 12,
    "states": "Maharashtra;All India",
    "gender": "ALL",
    "income_max": 250000.0,
    "mobility": "DISTRICT",
    "deadline": "2026-12-31",
    "interest_tags": "solar;electric;pumps",
    "documents_needed": "Aadhaar Card;Marksheet",
    "apply_steps": "Register on portal;Submit form",
    "source_name": "Official Portal",
    "source_url": "https://official.gov.in/solar",
    "last_verified": "2026-10-01",
    "verification_status": "verified"
}

def test_rule_grade_boundaries():
    # Boundary 1: Grade exactly min_grade (10) -> PASS
    res_min = evaluate_opportunity(SAMPLE_OPP, {"grade": 10, "state": "Maharashtra", "mobility": "DISTRICT"}, {"family_income": 100000})
    grade_rule = next(r for r in res_min.passed_rules if r.rule_name == "GRADE")
    assert grade_rule.status == "PASS"

    # Boundary 2: Grade exactly max_grade (12) -> PASS
    res_max = evaluate_opportunity(SAMPLE_OPP, {"grade": 12, "state": "Maharashtra", "mobility": "DISTRICT"}, {"family_income": 100000})
    assert any(r.rule_name == "GRADE" for r in res_max.passed_rules)

    # Boundary 3: Grade 9 (below min) -> FAIL
    res_below = evaluate_opportunity(SAMPLE_OPP, {"grade": 9, "state": "Maharashtra", "mobility": "DISTRICT"}, {"family_income": 100000})
    assert res_below.overall_eligibility == "NOT_ELIGIBLE"
    assert any(r.rule_name == "GRADE" and r.status == "FAIL" for r in res_below.failed_rules)

    # Boundary 4: Grade 13 (above max) -> FAIL
    res_above = evaluate_opportunity(SAMPLE_OPP, {"grade": 13, "state": "Maharashtra", "mobility": "DISTRICT"}, {"family_income": 100000})
    assert res_above.overall_eligibility == "NOT_ELIGIBLE"
    assert any(r.rule_name == "GRADE" and r.status == "FAIL" for r in res_above.failed_rules)

def test_rule_gender_and_unknowns():
    female_opp = {**SAMPLE_OPP, "gender": "FEMALE", "income_max": None}
    
    # Female student -> PASS & ELIGIBLE
    res_f = evaluate_opportunity(female_opp, {"grade": 10, "state": "Maharashtra", "gender": "FEMALE", "mobility": "DISTRICT"})
    assert res_f.overall_eligibility == "ELIGIBLE"

    # Male student -> FAIL & NOT_ELIGIBLE
    res_m = evaluate_opportunity(female_opp, {"grade": 10, "state": "Maharashtra", "gender": "MALE", "mobility": "DISTRICT"})
    assert res_m.overall_eligibility == "NOT_ELIGIBLE"
    assert any(r.rule_name == "GENDER" and r.status == "FAIL" for r in res_m.failed_rules)

    # Gender unspecified -> UNKNOWN & LIKELY
    res_unk = evaluate_opportunity(female_opp, {"grade": 10, "state": "Maharashtra", "gender": "ALL", "mobility": "DISTRICT"})
    assert res_unk.overall_eligibility == "LIKELY"
    assert any(r.rule_name == "GENDER" and r.status == "UNKNOWN" for r in res_unk.unknown_rules)

def test_rule_income_sensitive_and_unknowns():
    # Income within ceiling -> ELIGIBLE
    res_ok = evaluate_opportunity(SAMPLE_OPP, {"grade": 10, "state": "Maharashtra", "mobility": "DISTRICT"}, {"family_income": 200000})
    assert res_ok.overall_eligibility == "ELIGIBLE"

    # Income exceeds ceiling -> NOT_ELIGIBLE
    res_exceed = evaluate_opportunity(SAMPLE_OPP, {"grade": 10, "state": "Maharashtra", "mobility": "DISTRICT"}, {"family_income": 300000})
    assert res_exceed.overall_eligibility == "NOT_ELIGIBLE"

    # Income not provided (sensitive / optional) -> UNKNOWN & LIKELY
    res_omitted = evaluate_opportunity(SAMPLE_OPP, {"grade": 10, "state": "Maharashtra", "mobility": "DISTRICT"}, {})
    assert res_omitted.overall_eligibility == "LIKELY"
    assert any(r.rule_name == "INCOME" and r.status == "UNKNOWN" for r in res_omitted.unknown_rules)

def test_expired_opportunity_is_excluded():
    expired_opp = {**SAMPLE_OPP, "deadline": "2026-05-31"}
    eval_res = evaluate_opportunity(
        expired_opp, 
        {"grade": 10, "state": "Maharashtra", "mobility": "DISTRICT"},
        eval_date=date(2026, 10, 13)
    )
    assert eval_res.is_expired is True
    assert eval_res.overall_eligibility == "NOT_ELIGIBLE"
    assert any(r.reason_code == "DEADLINE_EXPIRED" for r in eval_res.failed_rules)

def test_ranking_verified_above_unverified():
    opp_verif = {**SAMPLE_OPP, "verification_status": "verified"}
    opp_unverif = {**SAMPLE_OPP, "verification_status": "sample_unverified"}

    eval_v = evaluate_opportunity(opp_verif, {"grade": 10, "state": "Maharashtra", "mobility": "DISTRICT"}, {"family_income": 100000})
    eval_u = evaluate_opportunity(opp_unverif, {"grade": 10, "state": "Maharashtra", "mobility": "DISTRICT"}, {"family_income": 100000})

    assert eval_v.score_breakdown["verification_bonus"] == 30
    assert eval_u.score_breakdown["verification_bonus"] == 0
    assert eval_v.total_score > eval_u.total_score

def test_explanation_validator_rejects_invented_urls():
    opp = Opportunity(
        id=1,
        title="Valid Scheme",
        source_name="Official Gov Portal",
        source_url="https://scholarships.gov.in",
        last_verified="2026-10-01",
        documents_needed="Aadhaar",
        apply_steps="Apply online"
    )

    valid_explanation = {
        "why_fits": "Fits you well",
        "what_to_do": "Apply online",
        "source_name": "Official Gov Portal",
        "source_url": "https://scholarships.gov.in",
        "last_verified": "2026-10-01"
    }
    assert ExplanationValidator.validate(valid_explanation, opp) is True

    # Case 1: Invented source_url
    fake_url_explanation = {**valid_explanation, "source_url": "https://fake-scheme.com"}
    assert ExplanationValidator.validate(fake_url_explanation, opp) is False

    # Case 2: Hallucinated external link inside the text body
    hallucinated_text_explanation = {
        **valid_explanation, 
        "why_fits": "Fits you! Visit https://scam-link.net for details"
    }
    assert ExplanationValidator.validate(hallucinated_text_explanation, opp) is False

def test_sensitive_fields_not_persisted_in_db():
    # 1. Create student
    db = SessionLocal()
    student = Student(
        name="Rohit Patil",
        preferred_language="mr",
        grade=10,
        state="Maharashtra",
        district="Satara",
        guardian_consent=True,
        interests="solar, electric",
        skills="wiring",
        aspirations="solar tech"
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    student_id = student.id
    db.close()

    # 2. Call matches API with sensitive fields in POST BODY (never in URL query string)
    resp = client.post(
        f"/api/v1/students/{student_id}/matches",
        json={"language": "mr", "family_income": 150000, "social_category": "OBC"}
    )
    assert resp.status_code == 200
    matches = resp.json()
    assert len(matches) >= 3

    # 3. Verify in database that student record was NOT altered/persisted with sensitive income
    db_check = SessionLocal()
    try:
        check_student = db_check.query(Student).filter(Student.id == student_id).first()
        assert check_student is not None
        # Verify annual_family_income is still None in DB
        assert check_student.annual_family_income is None
    finally:
        db_check.close()


def test_rule_age_gating():
    """Class 10 student must NOT be ELIGIBLE for an 18+ scheme (step-0b)."""
    # Opportunity with min_age=18 (adult-only scheme)
    adult_only_opp = {
        **SAMPLE_OPP,
        "min_age": 18,
        "max_age": None,
        "income_max": None
    }

    # Case 1: student is 16 -> AGE_TOO_YOUNG -> NOT_ELIGIBLE
    res_young = evaluate_opportunity(
        adult_only_opp,
        {"grade": 10, "state": "Maharashtra", "mobility": "DISTRICT", "age_years": 16}
    )
    assert res_young.overall_eligibility == "NOT_ELIGIBLE"
    assert any(r.reason_code == "AGE_TOO_YOUNG" for r in res_young.failed_rules), \
        "Expected AGE_TOO_YOUNG in failed_rules"

    # Case 2: student is 18 -> AGE_IN_RANGE -> ELIGIBLE
    res_ok = evaluate_opportunity(
        adult_only_opp,
        {"grade": 10, "state": "Maharashtra", "mobility": "DISTRICT", "age_years": 18}
    )
    assert res_ok.overall_eligibility == "ELIGIBLE"
    assert any(r.reason_code == "AGE_IN_RANGE" for r in res_ok.passed_rules)

    # Case 3: age not provided -> UNKNOWN -> LIKELY (not FAIL)
    res_unknown = evaluate_opportunity(
        adult_only_opp,
        {"grade": 10, "state": "Maharashtra", "mobility": "DISTRICT"}
    )
    assert res_unknown.overall_eligibility == "LIKELY", \
        "Missing age should give LIKELY not NOT_ELIGIBLE"
    assert any(r.reason_code == "AGE_NOT_PROVIDED" for r in res_unknown.unknown_rules)

    # Case 4: max_age rule – student too old (30 years for a youth scheme)
    youth_opp = {**SAMPLE_OPP, "min_age": None, "max_age": 21, "income_max": None}
    res_old = evaluate_opportunity(
        youth_opp,
        {"grade": 10, "state": "Maharashtra", "mobility": "DISTRICT", "age_years": 30}
    )
    assert res_old.overall_eligibility == "NOT_ELIGIBLE"
    assert any(r.reason_code == "AGE_TOO_OLD" for r in res_old.failed_rules)

    # Case 5: no age restriction -> PASS with AGE_NO_RESTRICTION
    no_age_opp = {**SAMPLE_OPP, "min_age": None, "max_age": None, "income_max": None}
    res_no_age = evaluate_opportunity(
        no_age_opp,
        {"grade": 10, "state": "Maharashtra", "mobility": "DISTRICT"}
    )
    assert any(r.reason_code == "AGE_NO_RESTRICTION" for r in res_no_age.passed_rules)
