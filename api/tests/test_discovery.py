import pytest
from fastapi.testclient import TestClient
from api.app.main import app
from api.app.ai.mock_adapter import MockLLMAdapter
from api.app.ai.schemas import StructuredProfile
from api.app.database import SessionLocal
from api.app.models import Student

client = TestClient(app)

def test_discovery_questions_list():
    response = client.get("/api/v1/discovery/questions?language=mr")
    assert response.status_code == 200
    questions = response.json()
    assert len(questions) == 7
    # Verify order and keys
    expected_keys = [
        "grade", "state_district", "favorite_subjects", 
        "things_enjoyed", "family_work", "aspiration", "mobility"
    ]
    for idx, key in enumerate(expected_keys):
        assert questions[idx]["key"] == key
        assert questions[idx]["order"] == idx + 1
        assert len(questions[idx]["text"]) > 0

def test_mock_llm_adapter_schema_validation():
    adapter = MockLLMAdapter()
    sample_answers = {
        "q_grade": "१० वी (Std 10)",
        "q_location": "सातारा (Satara, Maharashtra)",
        "q_subjects": "विज्ञान व प्रॅक्टिकल काम",
        "q_activities": "सोलर पंप आणि मोटर दुरुस्ती",
        "q_family_work": "शेती व दुग्ध व्यवसाय",
        "q_aspiration": "सोलर तंत्रज्ञ बनायचे आहे",
        "q_mobility": "तालुका किंवा जिल्हा केंद्रात"
    }
    import asyncio
    profile = asyncio.run(adapter.extract_profile(sample_answers))
    assert isinstance(profile, StructuredProfile)
    assert profile.grade_level == 10
    assert profile.state == "Maharashtra"
    assert "Satara" in profile.district or "सातारा" in profile.district
    assert any("Solar" in s for s in profile.primary_interests)
    assert profile.is_vocational_recommended is True
    assert profile.mobility_preference == "DISTRICT"
    assert profile.confidence_score > 0.8

def test_discovery_flow_consent_blocked_when_not_granted():
    # 1. Start session
    start_resp = client.post("/api/v1/discovery/start", json={"language": "mr"})
    assert start_resp.status_code == 200
    data = start_resp.json()
    session_id = data["session_id"]
    assert data["total_questions"] == 7

    # 2. Answer questions 1 through 6
    sample_answers = [
        ("q_grade", "१० वी"),
        ("q_location", "सातारा"),
        ("q_subjects", "विज्ञान"),
        ("q_activities", "सोलर पंप दुरुस्ती"),
        ("q_family_work", "शेती"),
        ("q_aspiration", "सोलर मेकॅनिक"),
    ]
    for q_id, ans in sample_answers:
        resp = client.post("/api/v1/discovery/answer", json={
            "session_id": session_id,
            "question_id": q_id,
            "answer_text": ans,
            "guardian_consent": False
        })
        assert resp.status_code == 200
        step_data = resp.json()
        assert step_data["is_complete"] is False
        assert step_data["next_question"] is not None

    # 3. Answer question 7 WITHOUT consent -> must be blocked
    final_resp = client.post("/api/v1/discovery/answer", json={
        "session_id": session_id,
        "question_id": "q_mobility",
        "answer_text": "जिल्हा केंद्रात",
        "guardian_consent": False
    })
    assert final_resp.status_code == 403
    assert "GUARDIAN_CONSENT_REQUIRED" in final_resp.json()["detail"]

def test_discovery_flow_completes_and_saves_student():
    # 1. Start session
    start_resp = client.post("/api/v1/discovery/start", json={"language": "mr"})
    session_id = start_resp.json()["session_id"]

    # 2. Answer all 7 questions with guardian consent
    questions = [
        ("q_grade", "१० वी"),
        ("q_location", "पुणे"),
        ("q_subjects", "गणित व तंत्रज्ञान"),
        ("q_activities", "इलेक्ट्रिक वायरिंग"),
        ("q_family_work", "गॅरेज व कारागिरी"),
        ("q_aspiration", "इलेक्ट्रिकल इंजिनिअर / मेकॅनिक"),
        ("q_mobility", "कुठेही जाण्याची तयारी")
    ]
    final_data = None
    for q_id, ans in questions:
        resp = client.post("/api/v1/discovery/answer", json={
            "session_id": session_id,
            "question_id": q_id,
            "answer_text": ans,
            "guardian_consent": True,
            "student_name": "विकास पाटील"
        })
        assert resp.status_code == 200
        final_data = resp.json()

    assert final_data["is_complete"] is True
    assert final_data["student_id"] is not None
    assert final_data["profile"] is not None
    profile = final_data["profile"]
    assert profile["grade_level"] == 10
    assert profile["state"] == "Maharashtra"

    # Verify saved in SQLite database
    db = SessionLocal()
    try:
        saved_student = db.query(Student).filter(Student.id == final_data["student_id"]).first()
        assert saved_student is not None
        assert saved_student.name == "विकास पाटील"
        assert saved_student.guardian_consent is True
        assert saved_student.grade == 10
    finally:
        db.close()
