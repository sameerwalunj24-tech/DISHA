from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
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


class MatchRequest(BaseModel):
    """
    POST body for student matches.
    Sensitive fields (income, social category) live here – NEVER in URL query strings.
    Query strings appear in server access logs and browser history; bodies do not.
    """
    language: str = "mr"
    category: Optional[str] = None
    # SENSITIVE: transmitted in body only, never stored, never logged
    family_income: Optional[float] = None
    social_category: Optional[str] = None


@router.post("/students/{student_id}/matches", response_model=List[OpportunityMatchResponse])
def get_student_matches_post(
    student_id: str,
    req: MatchRequest,
    db: Session = Depends(get_db)
):
    """
    POST version of student matches – use this when supplying income/category.
    Sensitive fields are in the request body and never appear in logs or browser history.
    Excludes expired schemes, ranks verified records first, never persists sensitive fields.
    """
    return _run_matches(
        student_id=student_id,
        language=req.language,
        category=req.category,
        family_income=req.family_income,
        social_category=req.social_category,
        db=db
    )


@router.get("/students/{student_id}/matches", response_model=List[OpportunityMatchResponse])
def get_student_matches_get(
    student_id: str,
    language: str = Query("mr", description="mr, hi, or en"),
    category: Optional[str] = Query(None, description="Filter by category: scholarship, apprenticeship, vocational, scheme"),
    db: Session = Depends(get_db)
):
    """
    GET version – no sensitive fields accepted in URL.
    For income/social_category, use POST /students/{id}/matches instead.
    """
    return _run_matches(
        student_id=student_id,
        language=language,
        category=category,
        family_income=None,
        social_category=None,
        db=db
    )


def _run_matches(
    student_id: str,
    language: str,
    category: Optional[str],
    family_income: Optional[float],
    social_category: Optional[str],
    db: Session
) -> List[OpportunityMatchResponse]:
    """Shared matching logic. Sensitive args never leave this function's scope."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    student_profile = {
        "grade": student.grade,
        "state": student.state,
        "district": student.district,
        "gender": student.gender or "ALL",
        "age_years": student.age_years,
        "primary_interests": [s.strip() for s in (student.interests or "").split(",") if s.strip()],
        "practical_skills": [s.strip() for s in (student.skills or "").split(",") if s.strip()],
        "career_aspirations": [s.strip() for s in (student.aspirations or "").split(",") if s.strip()],
        "mobility_preference": "DISTRICT"
    }

    # Sensitive fields: kept in-memory only for this request, never written to DB
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

        opp_model = OpportunityResponse.model_validate(opp)
        opp_model.needs_recheck = evaluation.needs_recheck

        match_resp = OpportunityMatchResponse(
            opportunity=opp_model,
            needs_recheck=evaluation.needs_recheck,
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

    if matches:
        try:
            from api.app.impact.router import record_impact_event
            record_impact_event(db, "OPP_VIEWED")
        except Exception:
            pass

    return matches


@router.post("/eligibility/check", response_model=OpportunityMatchResponse)
def check_single_eligibility(
    req: EligibilityCheckRequest,
    db: Session = Depends(get_db)
):
    """
    Check deterministic eligibility for a single opportunity with student parameters.
    Sensitive fields (family_income, social_category) are in the POST body.
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

    opp_model = OpportunityResponse.model_validate(opp)
    opp_model.needs_recheck = evaluation.needs_recheck

    return OpportunityMatchResponse(
        opportunity=opp_model,
        needs_recheck=evaluation.needs_recheck,
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
