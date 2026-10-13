# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

from api.app.database import get_db
from api.app.models import ImpactEvent

router = APIRouter(prefix="/impact", tags=["Impact Metrics"])

ALLOWED_EVENT_TYPES = {
    "PROFILE_CREATED",
    "PATHWAY_STARTED",
    "STEP_COMPLETED",
    "OPP_VIEWED",
    "REC_MADE",
    "SYNC_COMPLETED"
}

class RecordEventRequest(BaseModel):
    event_type: str = Field(..., description="Allowed: PROFILE_CREATED, PATHWAY_STARTED, STEP_COMPLETED, OPP_VIEWED, REC_MADE, SYNC_COMPLETED")
    category: Optional[str] = Field(None, max_length=50, description="Optional high-level category token only. No free text.")

def mask_count(val: int) -> Any:
    """Privacy rule: counts strictly between 1 and 4 are masked as '<5' to prevent re-identification."""
    if 0 < val < 5:
        return "<5"
    return val

def record_impact_event(db: Session, event_type: str, category: Optional[str] = None) -> Optional[ImpactEvent]:
    """Internal helper to record a privacy-safe metric event."""
    if event_type not in ALLOWED_EVENT_TYPES:
        return None
    try:
        ev = ImpactEvent(
            event_type=event_type,
            category=category[:50] if category else None
        )
        db.add(ev)
        db.commit()
        return ev
    except Exception:
        db.rollback()
        return None

@router.post("/event")
def log_impact_event(req: RecordEventRequest, db: Session = Depends(get_db)):
    """Logs a client-side interaction event with strict privacy guarantees (no names, no free text)."""
    if req.event_type not in ALLOWED_EVENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid event_type. Allowed: {sorted(list(ALLOWED_EVENT_TYPES))}")

    ev = record_impact_event(db, req.event_type, req.category)
    if not ev:
        raise HTTPException(status_code=500, detail="Failed to log metric event")
    return {"status": "ok", "event_id": ev.id, "event_type": ev.event_type}

@router.get("/summary")
def get_impact_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns aggregated metrics for community impact reporting.
    Privacy guarantee: Small cell counts (1 to 4) are masked as '<5'
    to prevent individual re-identification in low-density rural cohorts.
    """
    # Query count grouped by event_type
    counts_query = (
        db.query(ImpactEvent.event_type, func.count(ImpactEvent.id))
        .group_by(ImpactEvent.event_type)
        .all()
    )
    raw_counts = {evt: cnt for evt, cnt in counts_query}

    profiles_created = raw_counts.get("PROFILE_CREATED", 0)
    pathways_started = raw_counts.get("PATHWAY_STARTED", 0)
    steps_completed = raw_counts.get("STEP_COMPLETED", 0)
    opps_viewed = raw_counts.get("OPP_VIEWED", 0)
    recs_made = raw_counts.get("REC_MADE", 0)
    syncs_completed = raw_counts.get("SYNC_COMPLETED", 0)

    total_events = sum(raw_counts.values())

    return {
        "status": "ok",
        "privacy_notice": "Counts between 1 and 4 are masked as '<5' to ensure strict privacy for rural learners.",
        "metrics": {
            "profiles_created": mask_count(profiles_created),
            "pathways_started": mask_count(pathways_started),
            "steps_completed": mask_count(steps_completed),
            "opportunities_viewed": mask_count(opps_viewed),
            "recommendations_made": mask_count(recs_made),
            "offline_syncs": mask_count(syncs_completed),
            "total_impact_events": mask_count(total_events)
        },
        "raw_counts_masked": any(0 < c < 5 for c in [
            profiles_created, pathways_started, steps_completed, opps_viewed, recs_made, syncs_completed, total_events
        ])
    }
