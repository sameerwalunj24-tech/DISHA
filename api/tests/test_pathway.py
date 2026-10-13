"""
test_pathway.py - Phase 4: My Path tests
=========================================
Tests:
1. Template loading (all 5 templates exist: electrical_solar, agriculture_dairy, healthcare, it_digital, general_explore)
2. Template selection (deterministic keyword matching)
3. No invented URLs validator (enforces that all URLs exist in opportunities.csv or are null with needs_verification=true)
4. Multilingual strings completeness (mr/hi/en present everywhere)
5. Matched opportunity milestones with deadlines
6. Non-STEM / vocational alternative presence
7. API endpoints: POST /students/{id}/pathway & GET /students/{id}/pathway
"""

import pytest
from fastapi.testclient import TestClient

from api.app.main import app
from api.app.pathways.generator import load_templates, select_template_id, generate_student_pathway
from api.app.pathways.validator import (
    get_allowed_urls,
    validate_pathway_urls,
    validate_multilingual_strings
)

client = TestClient(app)


def test_templates_load_all_five_clusters():
    templates = load_templates()
    assert len(templates) >= 5
    expected_clusters = {
        "electrical_solar",
        "agriculture_dairy",
        "healthcare",
        "it_digital",
        "general_explore"
    }
    assert expected_clusters.issubset(set(templates.keys()))


def test_template_selection_deterministic():
    # 1. Solar
    assert select_template_id({"interests": "सोलर पंप आणि वायरिंग दुरुस्ती"}) == "electrical_solar"
    assert select_template_id({"skills": "electric motor assembly"}) == "electrical_solar"

    # 2. Agriculture / Dairy
    assert select_template_id({"interests": "सेंद्रिय शेती आणि गोपालन"}) == "agriculture_dairy"
    assert select_template_id({"aspirations": "dairy producer farm"}) == "agriculture_dairy"

    # 3. Healthcare
    assert select_template_id({"interests": "रुग्णालय परिचारिका आणि प्रथमोपचार"}) == "healthcare"
    assert select_template_id({"skills": "first-aid bandage vital signs"}) == "healthcare"

    # 4. IT / Digital
    assert select_template_id({"interests": "संगणक टायपिंग आणि बँक मित्र"}) == "it_digital"
    assert select_template_id({"skills": "excel spreadsheet typing"}) == "it_digital"

    # 5. General exploration fallback
    assert select_template_id({"interests": "मला अजून ठरवायचे आहे"}) == "general_explore"


def test_all_base_templates_have_zero_invented_urls():
    templates = load_templates()
    for cluster_id, tmpl in templates.items():
        errors = validate_pathway_urls(tmpl)
        assert len(errors) == 0, f"Template {cluster_id} failed URL validation: {errors}"


def test_validator_rejects_invented_url():
    """Step 1 & 5 requirement: must not invent courses or links."""
    fake_pathway = {
        "stages": {
            "next_30_days": {
                "weeks": [
                    {
                        "steps": [
                            {
                                "id": "test_fake",
                                "title": {"mr": "चाचणी", "hi": "परीक्षण", "en": "Test"},
                                "description": {"mr": "चाचणी", "hi": "परीक्षण", "en": "Test"},
                                "resource_url": "https://invented-fake-portal.com/course",
                                "needs_verification": False
                            }
                        ]
                    }
                ]
            }
        }
    }
    errors = validate_pathway_urls(fake_pathway)
    assert len(errors) > 0
    assert any("INVENTED_URL_ERROR" in e for e in errors)


def test_all_base_templates_have_complete_mr_hi_en_strings():
    """All strings must exist in Marathi, Hindi, and English."""
    templates = load_templates()
    for cluster_id, tmpl in templates.items():
        errors = validate_multilingual_strings(tmpl)
        assert len(errors) == 0, f"Template {cluster_id} has missing i18n strings: {errors}"


def test_opportunity_milestones_and_deadlines_injected():
    """Top matched opportunities are injected with deadlines and CSV source URLs."""
    sample_profile = {
        "name": "पूजा",
        "interests": "सोलर, वीज",
        "skills": "वायरिंग",
        "aspirations": "इलेक्ट्रिशियन"
    }
    sample_matches = [
        {
            "opportunity": {
                "id": 1,
                "title": "PM National Apprenticeship Promotion Scheme (Solar PV Tech)",
                "benefits": "Rs 8000/month stipend",
                "deadline": "2026-12-31",
                "source_url": "https://www.apprenticeshipindia.gov.in",
                "verification_status": "sample_unverified",
                "documents_needed": "Aadhaar Card; 10th Marksheet"
            }
        }
    ]

    pathway = generate_student_pathway(sample_profile, sample_matches, language="mr")
    m3_milestones = pathway["stages"]["months_3_to_6"]["milestones"]

    # At least one milestone is the injected opportunity
    opp_ms = [m for m in m3_milestones if m.get("is_opportunity_milestone")]
    assert len(opp_ms) >= 1
    assert opp_ms[0]["deadline"] == "2026-12-31"
    assert opp_ms[0]["resource_url"] == "https://www.apprenticeshipindia.gov.in"
    assert "2026-12-31" in opp_ms[0]["description"]["mr"]


def test_vocational_alternative_present():
    """Every pathway must present an alternative vocational/non-STEM path."""
    templates = load_templates()
    for cluster_id, tmpl in templates.items():
        alt = tmpl.get("vocational_alternative")
        assert alt is not None, f"Cluster {cluster_id} missing vocational_alternative"
        assert alt["title"]["mr"]
        assert alt["title"]["hi"]
        assert alt["title"]["en"]


def test_pathway_api_post_and_get():
    # 1. Start discovery session
    start_resp = client.post("/api/v1/discovery/start", json={"language": "mr"})
    session_id = start_resp.json()["session_id"]
    
    # Complete discovery with solar answers matching questions.yaml
    questions = [
        ("q_grade", "१० वी"),
        ("q_age", "16 वर्षे"),
        ("q_location", "सातारा"),
        ("q_subjects", "विज्ञान व गणित"),
        ("q_activities", "सोलर दिवे, विजेचे काम"),
        ("q_family_work", "शेती व दुरुस्ती"),
        ("q_aspiration", "सोलर तंत्रज्ञ आणि इलेक्ट्रिशियन"),
        ("q_mobility", "जिल्हा केंद्रात")
    ]
    
    last_resp = None
    for q_id, ans in questions:
        last_resp = client.post("/api/v1/discovery/answer", json={
            "session_id": session_id,
            "question_id": q_id,
            "answer_text": ans,
            "guardian_consent": True,
            "student_name": "सुशांत मोहिते"
        })
        assert last_resp.status_code == 200
    
    final_data = last_resp.json()
    assert final_data.get("is_complete") is True
    student_id = final_data.get("student_id")
    assert student_id is not None

    # 2. POST /api/v1/students/{id}/pathway
    post_res = client.post(f"/api/v1/students/{student_id}/pathway", json={"language": "mr"})
    assert post_res.status_code == 200
    pdata = post_res.json()
    assert pdata["student_id"] == student_id
    assert pdata["career_cluster"] == "electrical_solar"
    assert "next_30_days" in pdata["stages"]
    assert pdata["vocational_alternative"] is not None

    # 3. GET /api/v1/students/{id}/pathway
    get_res = client.get(f"/api/v1/students/{student_id}/pathway")
    assert get_res.status_code == 200
    gdata = get_res.json()
    assert gdata["id"] == pdata["id"]
    assert gdata["career_cluster"] == "electrical_solar"

    # 4. GET /api/v1/pathways/templates
    tmpl_res = client.get("/api/v1/pathways/templates")
    assert tmpl_res.status_code == 200
    assert len(tmpl_res.json()) >= 5


def test_pathway_progress_persistence():
    """Verify pathway progress and micro_steps updates persist in database."""
    from api.app.database import SessionLocal
    from api.app.models import Pathway, Student
    import json

    db = SessionLocal()
    try:
        # Create student directly
        student = Student(
            name="नेहा कांबळे",
            preferred_language="mr",
            grade=10,
            guardian_consent=True
        )
        db.add(student)
        db.commit()
        db.refresh(student)

        # Generate and save pathway
        res = client.post(f"/api/v1/students/{student.id}/pathway", json={"language": "mr"})
        assert res.status_code == 200
        pathway_id = res.json()["id"]

        # Simulate student ticking off steps 1 and 2
        pathway_db = db.query(Pathway).filter(Pathway.id == pathway_id).first()
        assert pathway_db is not None
        p_data = json.loads(pathway_db.micro_steps_json)
        
        # Mark steps as completed in data
        completed_step_ids = ["es_w1_s1", "es_w1_s2"]
        p_data["completed_steps"] = completed_step_ids
        pathway_db.micro_steps_json = json.dumps(p_data)
        db.commit()

        # Re-fetch from API to confirm persistence survives reload
        get_res = client.get(f"/api/v1/students/{student.id}/pathway")
        assert get_res.status_code == 200
        reloaded_db = db.query(Pathway).filter(Pathway.id == pathway_id).first()
        reloaded_data = json.loads(reloaded_db.micro_steps_json)
        assert reloaded_data["completed_steps"] == ["es_w1_s1", "es_w1_s2"]
    finally:
        db.close()

