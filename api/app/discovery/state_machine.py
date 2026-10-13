import os
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, List
import yaml
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.app.ai import get_llm_adapter, StructuredProfile
from api.app.models import Student

YAML_PATH = Path(__file__).resolve().parent / "questions.yaml"

class QuestionDTO(BaseModel):
    id: str
    order: int
    key: str
    icon: str
    text: str
    subtext: str
    options: List[str]

class DiscoverySession:
    def __init__(self, session_id: str, language: str = "mr"):
        self.session_id = session_id
        self.language = language
        self.current_index = 0
        self.answers: Dict[str, str] = {}
        self.guardian_consent = False
        self.student_name = "विद्यार्थी (Learner)"
        self.is_complete = False
        self.profile: Optional[StructuredProfile] = None
        self.student_id: Optional[str] = None

# In-memory session store (resilient for current active sessions)
SESSIONS: Dict[str, DiscoverySession] = {}

def load_questions_data() -> List[Dict[str, Any]]:
    with open(YAML_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("questions", [])

def get_question_dto(raw_q: Dict[str, Any], lang: str) -> QuestionDTO:
    texts = raw_q.get("text", {})
    subtexts = raw_q.get("subtext", {})
    opts = raw_q.get("options", {})
    
    # Fallback to English if language not found
    text = texts.get(lang) or texts.get("mr") or texts.get("en", "")
    subtext = subtexts.get(lang) or subtexts.get("mr") or subtexts.get("en", "")
    options = opts.get(lang) or opts.get("mr") or opts.get("en", [])

    return QuestionDTO(
        id=raw_q["id"],
        order=raw_q["order"],
        key=raw_q["key"],
        icon=raw_q.get("icon", "HelpCircle"),
        text=text,
        subtext=subtext,
        options=options
    )

def start_discovery_session(language: str = "mr") -> (DiscoverySession, QuestionDTO, int):
    session_id = str(uuid.uuid4())
    session = DiscoverySession(session_id=session_id, language=language)
    SESSIONS[session_id] = session
    
    questions = load_questions_data()
    first_q = get_question_dto(questions[0], language)
    return session, first_q, len(questions)

async def submit_discovery_answer(
    session_id: str,
    question_id: str,
    answer_text: str,
    guardian_consent: bool,
    student_name: Optional[str],
    db: Session
) -> Dict[str, Any]:
    session = SESSIONS.get(session_id)
    questions = load_questions_data()
    total_questions = len(questions)

    if not session:
        # Create on the fly if not started explicitly
        session = DiscoverySession(session_id=session_id)
        SESSIONS[session_id] = session

    if guardian_consent is not None:
        session.guardian_consent = guardian_consent

    if student_name:
        session.student_name = student_name

    # Record answer
    session.answers[question_id] = answer_text

    # Find next question index
    current_q_index = 0
    for idx, q in enumerate(questions):
        if q["id"] == question_id:
            current_q_index = idx
            break

    next_index = current_q_index + 1
    session.current_index = next_index

    # If there are more questions, return next question
    if next_index < total_questions:
        next_q_dto = get_question_dto(questions[next_index], session.language)
        return {
            "session_id": session_id,
            "current_step": next_index + 1,
            "total_questions": total_questions,
            "next_question": next_q_dto.model_dump(),
            "is_complete": False,
            "profile": None,
            "student_id": None
        }

    # All questions answered -> Complete conversation & profile extraction
    session.is_complete = True

    # Check guardian consent constraint: Block saving unless consent is granted!
    if not session.guardian_consent:
        return {
            "session_id": session_id,
            "current_step": total_questions,
            "total_questions": total_questions,
            "next_question": None,
            "is_complete": True,
            "consent_blocked": True,
            "error": "GUARDIAN_CONSENT_REQUIRED: Child-safe privacy policy requires guardian consent before saving profile.",
            "profile": None,
            "student_id": None
        }

    # Extract structured profile via LLM adapter (or mock/fallback)
    adapter = get_llm_adapter()
    profile = await adapter.extract_profile(session.answers)
    session.profile = profile

    # Save / Update Student record in SQLite
    student = Student(
        name=session.student_name,
        preferred_language=session.language,
        grade=profile.grade_level,
        state=profile.state,
        district=profile.district,
        guardian_consent=True,
        interests=", ".join(profile.primary_interests),
        skills=", ".join(profile.practical_skills),
        aspirations=", ".join(profile.career_aspirations)
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    # Privacy-safe impact event tracking (no student names or IDs)
    try:
        from api.app.impact.router import record_impact_event
        record_impact_event(db, "PROFILE_CREATED")
    except Exception:
        pass

    session.student_id = student.id

    return {
        "session_id": session_id,
        "current_step": total_questions,
        "total_questions": total_questions,
        "next_question": None,
        "is_complete": True,
        "consent_blocked": False,
        "profile": profile.model_dump(),
        "student_id": student.id
    }
