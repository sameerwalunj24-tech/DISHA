"""
router.py - Offline Sync Batch API
===================================
POST /api/v1/sync
Applies offline outbox items idempotently with last-write-wins conflict resolution.
Guarantees sensitive fields are never persisted.
"""

import json
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.app.database import get_db
from api.app.models import Student, Pathway, SyncLog, Recommendation, Facilitator, utc_now
from api.app.sync.schemas import SyncBatchRequest, SyncBatchResponse, SyncItemResult
from api.app.ai.mock_adapter import MockLLMAdapter
from api.app.pathways.generator import generate_student_pathway
from api.app.matching.router import _run_matches

router = APIRouter(prefix="/api/v1", tags=["Offline Synchronization"])


def parse_iso(dt_str: str) -> datetime:
    """Parse ISO timestamp with fallback to current time."""
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return utc_now()


@router.post("/sync", response_model=SyncBatchResponse)
async def process_sync_batch(
    batch: SyncBatchRequest,
    db: Session = Depends(get_db)
):
    """
    Idempotent offline batch synchronization.
    - Each item id is recorded in SyncLog to prevent duplicate writes.
    - Uses last-write-wins conflict resolution based on updated_at.
    - Sensitive fields (income, caste category) are never persisted.
    """
    results: List[SyncItemResult] = []
    processed = 0
    failed = 0

    llm = MockLLMAdapter()
    last_created_student_id = None

    for item in batch.items:
        # 1. IDEMPOTENCY CHECK
        existing_log = db.query(SyncLog).filter(SyncLog.id == item.id).first()
        if existing_log:
            results.append(SyncItemResult(
                id=item.id,
                status="synced",
                student_id=existing_log.student_id,
                message="Already processed (idempotent)"
            ))
            processed += 1
            continue

        item_time = parse_iso(item.updated_at)
        payload = item.payload or {}

        # Strip any sensitive fields if accidentally included
        payload.pop("family_income", None)
        payload.pop("social_category", None)
        payload.pop("income", None)
        payload.pop("caste", None)

        try:
            # 2. TYPE-BASED HANDLERS
            # Handler A: Offline Quiz Result -> Creates student & pathway
            if item.type == "offline_quiz_result":
                guardian_consent = payload.get("guardian_consent", False)
                if not guardian_consent:
                    results.append(SyncItemResult(
                        id=item.id,
                        status="failed",
                        message="GUARDIAN_CONSENT_REQUIRED: Cannot sync without guardian consent."
                    ))
                    failed += 1
                    continue

                student_name = payload.get("student_name", "विद्यार्थी (Learner)")
                lang = payload.get("language", "mr")
                answers = payload.get("answers", {})

                # Extract profile
                if "profile" in payload and isinstance(payload["profile"], dict):
                    prof_data = payload["profile"]
                    grade_val = prof_data.get("grade_level", 10)
                    state_val = prof_data.get("state", "Maharashtra")
                    dist_val = prof_data.get("district", "Satara")
                    interests_val = ", ".join(prof_data.get("primary_interests", []))
                    skills_val = ", ".join(prof_data.get("practical_skills", []))
                    aspirations_val = ", ".join(prof_data.get("career_aspirations", []))
                else:
                    extracted = await llm.extract_profile(answers)
                    grade_val = extracted.grade_level
                    state_val = extracted.state
                    dist_val = extracted.district
                    interests_val = ", ".join(extracted.primary_interests)
                    skills_val = ", ".join(extracted.practical_skills)
                    aspirations_val = ", ".join(extracted.career_aspirations)

                # Create student
                student = Student(
                    name=student_name,
                    preferred_language=lang,
                    grade=grade_val,
                    state=state_val,
                    district=dist_val,
                    guardian_consent=True,
                    interests=interests_val,
                    skills=skills_val,
                    aspirations=aspirations_val,
                    created_at=item_time,
                    updated_at=item_time
                )
                db.add(student)
                db.flush()
                last_created_student_id = student.id

                # Generate pathway for student
                top_matches = _run_matches(
                    student_id=student.id,
                    language=lang,
                    category=None,
                    family_income=None,
                    social_category=None,
                    db=db
                )
                raw_matches = [
                    {"opportunity": m.opportunity.__dict__} for m in top_matches[:3]
                ]
                pathway_data = generate_student_pathway(
                    student_profile={
                        "name": student.name,
                        "interests": student.interests,
                        "skills": student.skills,
                        "aspirations": student.aspirations,
                        "career_goal": student.aspirations
                    },
                    top_matches=raw_matches,
                    language=lang
                )

                pathway = Pathway(
                    student_id=student.id,
                    title=json.dumps(pathway_data.get("title", {}), ensure_ascii=False),
                    career_goal=pathway_data.get("career_cluster", "general_explore"),
                    is_vocational=True,
                    micro_steps_json=json.dumps(pathway_data, ensure_ascii=False),
                    estimated_days=30,
                    status="ACTIVE",
                    created_at=item_time,
                    updated_at=item_time
                )
                db.add(pathway)

                # Log sync event
                sync_log = SyncLog(
                    id=item.id,
                    item_type=item.type,
                    student_id=student.id,
                    status="synced",
                    updated_at=item_time
                )
                db.add(sync_log)
                db.commit()

                results.append(SyncItemResult(
                    id=item.id,
                    status="synced",
                    student_id=student.id,
                    message="Profile and Pathway successfully created on server"
                ))
                processed += 1

            # Handler B: Pathway Progress (Ticks) -> Conflict resolution (last-write-wins)
            elif item.type == "pathway_progress":
                student_id = payload.get("student_id")
                pathway_id = payload.get("pathway_id")
                completed_step_ids = payload.get("completed_step_ids", [])

                # Find pathway
                pathway = None
                if pathway_id:
                    pathway = db.query(Pathway).filter(Pathway.id == str(pathway_id)).first()
                if not pathway and student_id:
                    pathway = db.query(Pathway).filter(Pathway.student_id == str(student_id)).first()
                if not pathway and last_created_student_id:
                    pathway = db.query(Pathway).filter(Pathway.student_id == str(last_created_student_id)).first()
                if not pathway:
                    pathway = db.query(Pathway).order_by(Pathway.id.desc()).first()

                actual_student_id = pathway.student_id if pathway else student_id

                if not pathway:
                    # If pathway not found, log sync to avoid endless retries
                    sync_log = SyncLog(
                        id=item.id,
                        item_type=item.type,
                        student_id=actual_student_id,
                        status="failed",
                        updated_at=item_time
                    )
                    db.add(sync_log)
                    db.commit()
                    results.append(SyncItemResult(
                        id=item.id,
                        status="failed",
                        message="Pathway not found for progress update"
                    ))
                    failed += 1
                    continue

                # Last-write-wins conflict resolution
                existing_updated = pathway.updated_at
                if existing_updated and existing_updated.tzinfo is None:
                    existing_updated = existing_updated.replace(tzinfo=timezone.utc)

                if existing_updated and item_time < existing_updated:
                    # Incoming update is older than current server state - conflict ignored
                    sync_log = SyncLog(
                        id=item.id,
                        item_type=item.type,
                        student_id=actual_student_id,
                        status="conflict_ignored",
                        updated_at=item_time
                    )
                    db.add(sync_log)
                    db.commit()
                    results.append(SyncItemResult(
                        id=item.id,
                        status="conflict_ignored",
                        student_id=actual_student_id,
                        message="Server has newer progress state (last-write-wins)"
                    ))
                    processed += 1
                    continue

                # Apply progress update to pathway JSON
                try:
                    p_data = json.loads(pathway.micro_steps_json)
                except Exception:
                    p_data = {}
                p_data["completed_steps"] = completed_step_ids
                pathway.micro_steps_json = json.dumps(p_data, ensure_ascii=False)
                pathway.updated_at = item_time

                sync_log = SyncLog(
                    id=item.id,
                    item_type=item.type,
                    student_id=actual_student_id,
                    status="synced",
                    updated_at=item_time
                )
                db.add(sync_log)
                db.commit()

                results.append(SyncItemResult(
                    id=item.id,
                    status="synced",
                    student_id=actual_student_id,
                    message="Pathway progress updated successfully"
                ))
                processed += 1

            # Handler C: Profile Save / Discovery Answer
            elif item.type in ("profile_save", "discovery_answer"):
                student_id = payload.get("student_id")
                if student_id:
                    student = db.query(Student).filter(Student.id == student_id).first()
                else:
                    student = None

                if student:
                    # Update student if newer
                    existing_updated = student.updated_at
                    if existing_updated and existing_updated.tzinfo is None:
                        existing_updated = existing_updated.replace(tzinfo=timezone.utc)

                    if existing_updated and item_time < existing_updated:
                        status_str = "conflict_ignored"
                    else:
                        if "name" in payload:
                            student.name = payload["name"]
                        if "grade" in payload:
                            student.grade = int(payload["grade"])
                        student.updated_at = item_time
                        status_str = "synced"
                else:
                    status_str = "synced"

                sync_log = SyncLog(
                    id=item.id,
                    item_type=item.type,
                    student_id=student_id,
                    status=status_str,
                    updated_at=item_time
                )
                db.add(sync_log)
                db.commit()

                results.append(SyncItemResult(
                    id=item.id,
                    status=status_str,
                    student_id=student_id,
                    message="Sync event applied"
                ))
                processed += 1

            # Handler D: Opportunity Recommendation (from Facilitator)
            elif item.type == "recommendation":
                student_id = payload.get("student_id")
                opportunity_id = payload.get("opportunity_id")
                facilitator_id = payload.get("facilitator_id")
                opp_title = payload.get("opportunity_title", "Recommended Opportunity")
                note = payload.get("note", "")

                if not student_id or not opportunity_id:
                    results.append(SyncItemResult(
                        id=item.id,
                        status="failed",
                        message="MISSING_DATA: student_id and opportunity_id required for recommendation"
                    ))
                    failed += 1
                    continue

                if not facilitator_id:
                    fac = db.query(Facilitator).first()
                    facilitator_id = fac.id if fac else "fac_demo"

                rec = Recommendation(
                    id=item.id,
                    facilitator_id=facilitator_id,
                    student_id=student_id,
                    opportunity_id=opportunity_id,
                    opportunity_title=opp_title,
                    note=note,
                    created_at=item_time
                )
                db.add(rec)

                sync_log = SyncLog(
                    id=item.id,
                    item_type=item.type,
                    student_id=student_id,
                    status="synced",
                    updated_at=item_time
                )
                db.add(sync_log)
                db.commit()

                results.append(SyncItemResult(
                    id=item.id,
                    status="synced",
                    student_id=student_id,
                    message="Recommendation synced successfully"
                ))
                processed += 1

            else:
                # Unknown event type
                results.append(SyncItemResult(
                    id=item.id,
                    status="failed",
                    message=f"Unsupported sync item type: {item.type}"
                ))
                failed += 1

        except Exception as e:
            db.rollback()
            results.append(SyncItemResult(
                id=item.id,
                status="failed",
                message=f"Sync error: {str(e)}"
            ))
            failed += 1

    if processed > 0:
        try:
            from api.app.impact.router import record_impact_event
            record_impact_event(db, "SYNC_COMPLETED")
        except Exception:
            pass

    return SyncBatchResponse(
        results=results,
        processed_count=processed,
        failed_count=failed
    )
