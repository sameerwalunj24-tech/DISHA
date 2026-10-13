"""
router.py - Pathway Endpoints
==============================
POST /api/v1/students/{id}/pathway -> generates and saves into the Pathway model
GET  /api/v1/students/{id}/pathway -> returns saved pathway (or auto-generates)
GET  /api/v1/pathways/templates    -> returns all 5 base templates for offline cache
"""

import json
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.app.database import get_db
from api.app.models import Student, Pathway
from api.app.pathways.generator import generate_student_pathway, load_templates
from api.app.pathways.schemas import PathwayGenerateRequest, PathwayResponse
from api.app.matching.router import _run_matches

router = APIRouter(prefix="/api/v1", tags=["Personal Pathways"])


@router.post("/students/{student_id}/pathway", response_model=PathwayResponse)
def create_student_pathway(
    student_id: str,
    req: PathwayGenerateRequest = PathwayGenerateRequest(),
    db: Session = Depends(get_db)
):
    """
    Generates a personalized 30-day pathway with weekly micro-steps and
    matched opportunity milestones, saving it to the student's Pathway record.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get student's top matching opportunities
    top_matches = _run_matches(
        student_id=student_id,
        language=req.language or student.preferred_language or "mr",
        category=None,
        family_income=student.annual_family_income,
        social_category=None,
        db=db
    )

    profile_dict = {
        "name": student.name,
        "grade": student.grade,
        "state": student.state,
        "district": student.district,
        "gender": student.gender,
        "interests": student.interests or "",
        "skills": student.skills or "",
        "aspirations": student.aspirations or "",
        "career_goal": student.aspirations or ""
    }

    raw_matches = [
        {
            "opportunity": {
                "id": m.opportunity.id,
                "title": m.opportunity.title,
                "benefits": m.opportunity.benefits,
                "deadline": m.opportunity.deadline,
                "source_url": m.opportunity.source_url,
                "verification_status": m.opportunity.verification_status,
                "documents_needed": m.opportunity.documents_needed
            }
        }
        for m in top_matches[:3]
    ]

    pathway_data = generate_student_pathway(
        student_profile=profile_dict,
        top_matches=raw_matches,
        language=req.language or student.preferred_language or "mr"
    )

    # Persist in SQLite
    existing_pathway = db.query(Pathway).filter(Pathway.student_id == student_id).first()
    if existing_pathway:
        existing_pathway.title = json.dumps(pathway_data.get("title", {}), ensure_ascii=False)
        existing_pathway.career_goal = pathway_data.get("career_cluster", "general_explore")
        existing_pathway.micro_steps_json = json.dumps(pathway_data, ensure_ascii=False)
        existing_pathway.status = "ACTIVE"
        db.commit()
        db.refresh(existing_pathway)
        pathway_id = existing_pathway.id
        created_at_str = existing_pathway.created_at.isoformat() if existing_pathway.created_at else None
    else:
        new_pathway = Pathway(
            student_id=student_id,
            title=json.dumps(pathway_data.get("title", {}), ensure_ascii=False),
            career_goal=pathway_data.get("career_cluster", "general_explore"),
            is_vocational=True,
            micro_steps_json=json.dumps(pathway_data, ensure_ascii=False),
            estimated_days=30,
            status="ACTIVE"
        )
        db.add(new_pathway)
        db.commit()
        db.refresh(new_pathway)
        pathway_id = new_pathway.id
        created_at_str = new_pathway.created_at.isoformat() if new_pathway.created_at else None

    # Privacy-safe impact event tracking
    try:
        from api.app.impact.router import record_impact_event
        record_impact_event(db, "PATHWAY_STARTED", pathway_data.get("career_cluster"))
    except Exception:
        pass

    return PathwayResponse(
        id=pathway_id,
        student_id=student_id,
        template_id=pathway_data.get("template_id", "general_explore"),
        career_cluster=pathway_data.get("career_cluster", "general_explore"),
        title=pathway_data.get("title", {}),
        description=pathway_data.get("description", {}),
        stages=pathway_data.get("stages", {}),
        vocational_alternative=pathway_data.get("vocational_alternative"),
        status="ACTIVE",
        created_at=created_at_str
    )


@router.get("/students/{student_id}/pathway", response_model=PathwayResponse)
def get_student_pathway(
    student_id: str,
    db: Session = Depends(get_db)
):
    """
    Returns the saved personal pathway for a student.
    If none exists yet, auto-generates one.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    existing_pathway = db.query(Pathway).filter(Pathway.student_id == student_id).first()
    if existing_pathway:
        try:
            pathway_data = json.loads(existing_pathway.micro_steps_json)
            return PathwayResponse(
                id=existing_pathway.id,
                student_id=student_id,
                template_id=pathway_data.get("template_id", "general_explore"),
                career_cluster=pathway_data.get("career_cluster", existing_pathway.career_goal),
                title=pathway_data.get("title", {}),
                description=pathway_data.get("description", {}),
                stages=pathway_data.get("stages", {}),
                vocational_alternative=pathway_data.get("vocational_alternative"),
                status=existing_pathway.status,
                created_at=existing_pathway.created_at.isoformat() if existing_pathway.created_at else None
            )
        except Exception:
            pass

    # If not found or corrupt, generate on the fly
    return create_student_pathway(student_id=student_id, req=PathwayGenerateRequest(language=student.preferred_language), db=db)


@router.get("/pathways/templates", response_model=Dict[str, Any])
def get_pathway_templates():
    """Returns all 5 base career pathway templates for offline client caching."""
    return load_templates()
