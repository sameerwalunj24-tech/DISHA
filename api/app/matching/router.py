from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.app.database import get_db
from api.app.models import Student, Opportunity
from api.app.schemas import (
    OpportunityResponse, 
    OpportunityMatchResponse, 
    ScoreBreakdown, 
    EligibilityCheckRequest
)
from api.app.matching.rules_engine import evaluate_opportunity
from api.app.matching.explainer import generate_grounded_explanation

router = APIRouter(prefix="/api/v1", tags=["Matching & Eligibility"])

@router.get("/students/{student_id}/matches", response_model=List[OpportunityMatchResponse])
def get_student_matches(
    student_id: str,
    family_income: Optional[float] = Query(None, description="Optional family income for shortlisted check (NOT saved to database)"),
    social_category: Optional[str] = Query(None, description="Optional social category (NOT saved to database)"),
    language: str = Query("mr", description="mr, hi, or en"),
    category: Optional[str] = Query(None, description="Filter by category: scholarship, apprenticeship, vocational, scheme"),
    db: Session = Depends(get_db)
):
    """
    Grounded opportunity matching for a student profile with deterministic eligibility scoring.
    Excludes expired schemes, ranks verified records first, and never persists sensitive fields.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    student_profile = {
        "grade": student.grade,
        "state": student.state,
        "district": student.district,
        "gender": student.gender or "ALL",
        "primary_interests": [s.strip() for s in (student.interests or "").split(",") if s.strip()],
        "practical_skills": [s.strip() for s in (student.skills or "").split(",") if s.strip()],
        "career_aspirations": [s.strip() for s in (student.aspirations or "").split(",") if s.strip()],
        "mobility_preference": "DISTRICT"
    }

    # Sensitive fields kept in-memory request scope ONLY
    sensitive_context = {
        "family_income": family_income,
        "social_category": social_category
    }

    query = db.query(Opportunity)
    if category:
        query = query.filter(Opportunity.category == category)
    opportunities = query.all()

    matches: List[OpportunityMatchResponse] = []

    for opp in opportunities:
        evaluation = evaluate_opportunity(
            opp=opp,
            student_profile=student_profile,
            sensitive_context=sensitive_context
        )

        # Exclude completely expired opportunities
        if evaluation.is_expired:
            continue

        explanation = generate_grounded_explanation(
            opp=opp,
            evaluation=evaluation,
            student_profile=student_profile,
            lang=language
        )

        match_resp = OpportunityMatchResponse(
            opportunity=OpportunityResponse.model_validate(opp),
            overall_eligibility=evaluation.overall_eligibility,
            score=evaluation.total_score,
            score_breakdown=ScoreBreakdown(
                base_eligibility=evaluation.score_breakdown.get("base_eligibility", 0),
                verification_bonus=evaluation.score_breakdown.get("verification_bonus", 0),
                interest_overlap=evaluation.score_breakdown.get("interest_overlap", 0),
                mobility_fit=evaluation.score_breakdown.get("mobility_fit", 0),
                deadline_bonus=evaluation.score_breakdown.get("deadline_bonus", 0),
                total_score=evaluation.total_score
            ),
            passed_rules=[r.detail for r in evaluation.passed_rules],
            failed_rules=[r.detail for r in evaluation.failed_rules],
            missing_info=[r.detail for r in evaluation.unknown_rules],
            explanation=explanation
        )
        matches.append(match_resp)

    # Sort deterministically: highest score first
    matches.sort(key=lambda m: m.score, reverse=True)
    return matches

@router.post("/eligibility/check", response_model=OpportunityMatchResponse)
def check_single_eligibility(
    req: EligibilityCheckRequest,
    db: Session = Depends(get_db)
):
    """
    Check deterministic eligibility for a single opportunity with student parameters.
    """
    opp = db.query(Opportunity).filter(Opportunity.id == req.opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    student_profile = {
        "grade": req.grade,
        "state": req.state,
        "gender": req.gender or "ALL",
        "primary_interests": req.interests or [],
        "mobility_preference": req.mobility or "DISTRICT"
    }

    sensitive_context = {
        "family_income": req.family_income,
        "social_category": req.social_category
    }

    evaluation = evaluate_opportunity(
        opp=opp,
        student_profile=student_profile,
        sensitive_context=sensitive_context
    )

    explanation = generate_grounded_explanation(
        opp=opp,
        evaluation=evaluation,
        student_profile=student_profile,
        lang=req.language or "mr"
    )

    return OpportunityMatchResponse(
        opportunity=OpportunityResponse.model_validate(opp),
        overall_eligibility=evaluation.overall_eligibility,
        score=evaluation.total_score,
        score_breakdown=ScoreBreakdown(
            base_eligibility=evaluation.score_breakdown.get("base_eligibility", 0),
            verification_bonus=evaluation.score_breakdown.get("verification_bonus", 0),
            interest_overlap=evaluation.score_breakdown.get("interest_overlap", 0),
            mobility_fit=evaluation.score_breakdown.get("mobility_fit", 0),
            deadline_bonus=evaluation.score_breakdown.get("deadline_bonus", 0),
            total_score=evaluation.total_score
        ),
        passed_rules=[r.detail for r in evaluation.passed_rules],
        failed_rules=[r.detail for r in evaluation.failed_rules],
        missing_info=[r.detail for r in evaluation.unknown_rules],
        explanation=explanation
    )
