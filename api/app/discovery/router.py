from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.app.database import get_db
from api.app.discovery.state_machine import (
    start_discovery_session,
    submit_discovery_answer,
    load_questions_data,
    get_question_dto,
    QuestionDTO
)

router = APIRouter(prefix="/api/v1/discovery", tags=["Discovery"])

class StartDiscoveryRequest(BaseModel):
    language: str = Field("mr", description="mr, hi, or en")

class AnswerRequest(BaseModel):
    session_id: str
    question_id: str
    answer_text: str
    guardian_consent: Optional[bool] = False
    student_name: Optional[str] = "विद्यार्थी (Learner)"

@router.get("/questions", response_model=List[QuestionDTO])
def list_questions(language: str = "mr"):
    """Get all 7 discovery questions localized in chosen language."""
    questions = load_questions_data()
    return [get_question_dto(q, language) for q in questions]

@router.post("/start")
def start_session(req: StartDiscoveryRequest):
    """Initialize a new 7-question discovery session and get Question 1."""
    session, first_q, total = start_discovery_session(language=req.language)
    return {
        "session_id": session.session_id,
        "language": session.language,
        "total_questions": total,
        "current_step": 1,
        "question": first_q.model_dump()
    }

@router.post("/answer")
async def answer_question(req: AnswerRequest, db: Session = Depends(get_db)):
    """
    Submit an answer to current question.
    Returns the next question or final profile summary once all 7 are completed.
    Enforces child-safe guardian consent before saving.
    """
    result = await submit_discovery_answer(
        session_id=req.session_id,
        question_id=req.question_id,
        answer_text=req.answer_text,
        guardian_consent=req.guardian_consent,
        student_name=req.student_name,
        db=db
    )
    if result.get("consent_blocked"):
        raise HTTPException(status_code=403, detail=result["error"])
    return result
