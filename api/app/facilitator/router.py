"""
router.py - Facilitator Portal, Cohorts, and Talent Radar APIs
==============================================================
Endpoints for:
1. Facilitator Phone + OTP authentication (dev demo OTP shown on screen).
2. Cohort creation and student joining via short join code.
3. Roster with Talent Radar flags (explainable, supportive, data-minimised).
4. Opportunity recommendations (direct & offline sync).
5. Aggregated cohort summary and anonymized CSV export.
"""

import io
import csv
import string
import random
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Header
from sqlalchemy.orm import Session

from api.app.config import settings, is_demo_allowed
from api.app.database import get_db
from api.app.models import (
    Facilitator, Student, Pathway, Opportunity,
    Cohort, CohortMember, Recommendation, utc_now
)
import re
from api.app.facilitator.auth import (
    generate_otp, verify_otp, create_jwt_token, create_refresh_token,
    verify_refresh_token, get_current_facilitator
)
from api.app.sms import get_sms_provider
from api.app.facilitator.radar import evaluate_talent_radar
from api.app.facilitator.schemas import (
    OTPRequest, OTPResponse, OTPVerifyRequest, RefreshTokenRequest, TokenResponse,
    FacilitatorDTO, CohortCreate, CohortResponse,
    JoinCohortRequest, JoinCohortResponse, RosterMemberDTO,
    CohortSummaryResponse, InterestClusterCount, UpcomingDeadline,
    RecommendationCreate, RecommendationResponse
)
from api.app.matching.router import _run_matches

router = APIRouter(prefix="/api/v1", tags=["Facilitator & Talent Radar"])


def validate_id_param(val: str, field_name: str = "id") -> str:
    """Validates alphanumeric / uuid route parameters to prevent injection or malformed input."""
    clean = val.strip()
    if not clean or not re.match(r"^[A-Za-z0-9_\-]+$", clean) or len(clean) > 64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"INVALID_PARAMETER: {field_name} must be alphanumeric with hyphens or underscores (max 64 chars)."
        )
    return clean


def generate_join_code() -> str:
    """Generates a 6-character short alphanumeric join code (e.g. DSH4A2)."""
    chars = string.ascii_uppercase + "23456789"
    suffix = "".join(random.choice(chars) for _ in range(3))
    return f"DSH{suffix}"


# ==========================================
# 1. AUTHENTICATION (PHONE + DEV DEMO OTP + SMS ADAPTER + REFRESH)
# ==========================================

@router.post("/facilitator/auth/request-otp", response_model=OTPResponse)
def request_otp(
    req: OTPRequest,
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    db: Session = Depends(get_db)
):
    """
    Prototype-grade OTP login.
    Dispatches OTP via SMS Provider (Mock provider by default, Real SMS provider if configured).
    In dev/demo mode, the OTP is also returned directly in the response for on-screen display.
    In production mode, demo facilitator login is refused and demo_otp is not exposed.
    """
    phone = req.phone_number.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required.")

    # Guard demo facilitator account in non-dev environments
    if phone == settings.DEMO_FACILITATOR_PHONE:
        if not is_demo_allowed(settings.ENVIRONMENT, x_admin_key):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="DEMO_LOGIN_DISABLED: Demo facilitator login is disabled in production mode. Provide a valid 'X-Admin-Key' header."
            )

    # Find or auto-provision facilitator account
    facilitator = db.query(Facilitator).filter(Facilitator.phone_number == phone).first()
    if not facilitator:
        facilitator = Facilitator(
            name=req.name or "शिक्षक (Facilitator)",
            phone_number=phone,
            role=req.role or "TEACHER",
            organization=req.organization or "ZP School",
            state="Maharashtra",
            preferred_language="mr",
            is_verified=True
        )
        db.add(facilitator)
        db.commit()
        db.refresh(facilitator)

    otp_code = generate_otp(phone)

    # Dispatch via SMS provider
    sms_provider = get_sms_provider()
    sms_provider.send_otp(phone, otp_code, facilitator.name)

    if is_demo_allowed(settings.ENVIRONMENT, x_admin_key):
        return OTPResponse(
            phone_number=phone,
            demo_otp=otp_code,
            message=f"Demo OTP: {otp_code} (Valid for 15 minutes)"
        )
    else:
        return OTPResponse(
            phone_number=phone,
            demo_otp=None,
            message="OTP dispatched via SMS provider (Production Mode)."
        )


@router.post("/facilitator/auth/verify-otp", response_model=TokenResponse)
def verify_otp_endpoint(
    req: OTPVerifyRequest,
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    db: Session = Depends(get_db)
):
    """Verifies OTP and issues access token and refresh token."""
    phone = req.phone_number.strip()
    if phone == settings.DEMO_FACILITATOR_PHONE:
        if not is_demo_allowed(settings.ENVIRONMENT, x_admin_key):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="DEMO_LOGIN_DISABLED: Demo facilitator login is disabled in production mode. Provide a valid 'X-Admin-Key' header."
            )

    if not verify_otp(phone, req.otp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="INVALID_OTP: The OTP entered is incorrect or expired."
        )

    facilitator = db.query(Facilitator).filter(Facilitator.phone_number == phone).first()
    if not facilitator:
        raise HTTPException(status_code=404, detail="Facilitator account not found.")

    access_token = create_jwt_token({
        "sub": facilitator.id,
        "phone": facilitator.phone_number,
        "role": facilitator.role
    }, expires_in_minutes=settings.JWT_ACCESS_EXPIRY_MINUTES, token_type="access")

    refresh_token = create_refresh_token({
        "sub": facilitator.id,
        "phone": facilitator.phone_number,
        "role": facilitator.role
    }, expires_in_days=settings.JWT_REFRESH_EXPIRY_DAYS)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_EXPIRY_MINUTES * 60,
        facilitator=FacilitatorDTO(
            id=facilitator.id,
            name=facilitator.name,
            phone_number=facilitator.phone_number,
            role=facilitator.role,
            organization=facilitator.organization,
            state=facilitator.state,
            preferred_language=facilitator.preferred_language
        )
    )


@router.post("/facilitator/auth/refresh", response_model=TokenResponse)
def refresh_token_endpoint(
    req: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Exchanges a valid refresh token for a fresh access token and refresh token."""
    try:
        payload = verify_refresh_token(req.refresh_token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"INVALID_REFRESH_TOKEN: {str(e)}"
        )

    facilitator_id = payload.get("sub")
    facilitator = db.query(Facilitator).filter(Facilitator.id == facilitator_id).first()
    if not facilitator:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="FACILITATOR_NOT_FOUND: Account associated with token does not exist."
        )

    new_access = create_jwt_token({
        "sub": facilitator.id,
        "phone": facilitator.phone_number,
        "role": facilitator.role
    }, expires_in_minutes=settings.JWT_ACCESS_EXPIRY_MINUTES, token_type="access")

    new_refresh = create_refresh_token({
        "sub": facilitator.id,
        "phone": facilitator.phone_number,
        "role": facilitator.role
    }, expires_in_days=settings.JWT_REFRESH_EXPIRY_DAYS)

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_EXPIRY_MINUTES * 60,
        facilitator=FacilitatorDTO(
            id=facilitator.id,
            name=facilitator.name,
            phone_number=facilitator.phone_number,
            role=facilitator.role,
            organization=facilitator.organization,
            state=facilitator.state,
            preferred_language=facilitator.preferred_language
        )
    )


@router.get("/facilitator/me", response_model=FacilitatorDTO)
def get_current_facilitator_profile(
    facilitator: Facilitator = Depends(get_current_facilitator)
):
    """Returns profile of currently authenticated facilitator."""
    return FacilitatorDTO(
        id=facilitator.id,
        name=facilitator.name,
        phone_number=facilitator.phone_number,
        role=facilitator.role,
        organization=facilitator.organization,
        state=facilitator.state,
        preferred_language=facilitator.preferred_language
    )


# ==========================================
# 2. COHORTS (CREATION & ACCESS CONTROL)
# ==========================================

@router.post("/facilitator/cohorts", response_model=CohortResponse)
def create_cohort(
    cohort_in: CohortCreate,
    facilitator: Facilitator = Depends(get_current_facilitator),
    db: Session = Depends(get_db)
):
    """Facilitator creates a new student cohort and receives a short join code."""
    # Generate unique join code
    code = generate_join_code()
    while db.query(Cohort).filter(Cohort.join_code == code).first():
        code = generate_join_code()

    cohort = Cohort(
        facilitator_id=facilitator.id,
        name=cohort_in.name.strip(),
        description=cohort_in.description,
        join_code=code,
        created_at=utc_now()
    )
    db.add(cohort)
    db.commit()
    db.refresh(cohort)

    return CohortResponse(
        id=cohort.id,
        facilitator_id=cohort.facilitator_id,
        name=cohort.name,
        description=cohort.description,
        join_code=cohort.join_code,
        student_count=0,
        created_at=cohort.created_at.isoformat()
    )


@router.get("/facilitator/cohorts", response_model=List[CohortResponse])
def list_my_cohorts(
    facilitator: Facilitator = Depends(get_current_facilitator),
    db: Session = Depends(get_db)
):
    """
    Access Control Guarantee:
    Facilitator can strictly ONLY view their own cohorts.
    """
    cohorts = db.query(Cohort).filter(Cohort.facilitator_id == facilitator.id).all()
    results = []
    for c in cohorts:
        count = db.query(CohortMember).filter(CohortMember.cohort_id == c.id).count()
        results.append(CohortResponse(
            id=c.id,
            facilitator_id=c.facilitator_id,
            name=c.name,
            description=c.description,
            join_code=c.join_code,
            student_count=count,
            created_at=c.created_at.isoformat()
        ))
    return results


@router.get("/facilitator/cohorts/{cohort_id}", response_model=CohortResponse)
def get_cohort_details(
    cohort_id: str,
    facilitator: Facilitator = Depends(get_current_facilitator),
    db: Session = Depends(get_db)
):
    """Access Control: Returns cohort only if owned by the authenticated facilitator."""
    clean_id = validate_id_param(cohort_id, "cohort_id")
    cohort = db.query(Cohort).filter(Cohort.id == clean_id).first()
    if not cohort or cohort.facilitator_id != facilitator.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="COHORT_NOT_FOUND: Cohort does not exist or access is forbidden."
        )

    count = db.query(CohortMember).filter(CohortMember.cohort_id == cohort.id).count()
    return CohortResponse(
        id=cohort.id,
        facilitator_id=cohort.facilitator_id,
        name=cohort.name,
        description=cohort.description,
        join_code=cohort.join_code,
        student_count=count,
        created_at=cohort.created_at.isoformat()
    )


# ==========================================
# 3. STUDENT JOINING COHORT (DATA MINIMISATION)
# ==========================================

@router.post("/cohorts/join", response_model=JoinCohortResponse)
def join_cohort(req: JoinCohortRequest, db: Session = Depends(get_db)):
    """
    Student joins cohort via short join code.
    - Requires student to have guardian consent already given.
    - Displays clear notice in mr/hi/en: 'Your teacher can see your progress and interests.'
    - Uses nickname / roll number for roster (data minimisation).
    """
    code = req.join_code.strip().upper()
    cohort = db.query(Cohort).filter(Cohort.join_code == code).first()
    if not cohort:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="INVALID_JOIN_CODE: No cohort found with this join code."
        )

    # Validate student and guardian consent
    student = db.query(Student).filter(Student.id == req.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="STUDENT_NOT_FOUND: Student record does not exist."
        )

    if not student.guardian_consent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="GUARDIAN_CONSENT_REQUIRED: Student cannot join cohort without guardian consent."
        )

    # Check if already joined
    membership = db.query(CohortMember).filter(
        CohortMember.cohort_id == cohort.id,
        CohortMember.student_id == student.id
    ).first()

    if not membership:
        membership = CohortMember(
            cohort_id=cohort.id,
            student_id=student.id,
            nickname=req.nickname.strip() or student.name,
            joined_at=utc_now()
        )
        db.add(membership)
        # Update student facilitator link
        student.facilitator_id = cohort.facilitator_id
        db.commit()

    return JoinCohortResponse(
        success=True,
        cohort_id=cohort.id,
        cohort_name=cohort.name,
        student_id=student.id,
        nickname=membership.nickname,
        notice="तुमचे शिक्षक तुमची प्रगती व आवडी पाहू शकतात. / Your teacher can see your pathway progress and interests."
    )


# ==========================================
# 4. ROSTER & TALENT RADAR (NO SENSITIVE FIELDS)
# ==========================================

@router.get("/facilitator/cohorts/{cohort_id}/roster", response_model=List[RosterMemberDTO])
def get_cohort_roster(
    cohort_id: str,
    language: str = "mr",
    facilitator: Facilitator = Depends(get_current_facilitator),
    db: Session = Depends(get_db)
):
    """
    Returns cohort roster with Talent Radar flags and reasons.
    Strict privacy guarantees:
    - OMIT family_income and social_category entirely.
    - Show nickname/roll number in roster.
    """
    clean_id = validate_id_param(cohort_id, "cohort_id")
    if language not in ("mr", "hi", "en"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="INVALID_LANGUAGE: Language must be one of 'mr', 'hi', or 'en'."
        )

    cohort = db.query(Cohort).filter(Cohort.id == clean_id).first()
    if not cohort or cohort.facilitator_id != facilitator.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="COHORT_NOT_FOUND: Cohort does not exist or access is forbidden."
        )

    members = db.query(CohortMember).filter(CohortMember.cohort_id == cohort.id).all()
    roster_list: List[RosterMemberDTO] = []

    for mem in members:
        student = mem.student
        if not student:
            continue

        pathway = db.query(Pathway).filter(Pathway.student_id == student.id).first()

        # Parse completed steps
        completed_step_count = 0
        total_steps = 28  # 4 weeks of micro-steps
        last_activity_str = student.updated_at.isoformat() if student.updated_at else student.created_at.isoformat()

        if pathway and pathway.micro_steps_json:
            try:
                p_data = json.loads(pathway.micro_steps_json)
                c_steps = p_data.get("completed_steps", [])
                completed_step_count = len(c_steps)
            except Exception:
                completed_step_count = 0
            if pathway.updated_at:
                last_activity_str = pathway.updated_at.isoformat()

        progress_pct = min(100, round((completed_step_count / max(1, total_steps)) * 100))

        # Evaluate matches for radar fit
        matches = _run_matches(
            student_id=student.id,
            language=language,
            category=None,
            family_income=None,
            social_category=None,
            db=db
        )

        radar_flags = evaluate_talent_radar(
            student=student,
            pathway=pathway,
            matches=matches,
            language=language
        )

        interests_list = [i.strip() for i in (student.interests or "").split(",") if i.strip()]
        career_cluster = pathway.career_goal if pathway else "general_explore"
        profile_status = "COMPLETE" if student.interests else "IN_PROGRESS"

        roster_list.append(RosterMemberDTO(
            member_id=mem.id,
            student_id=student.id,
            nickname=mem.nickname,
            grade=student.grade,
            primary_interests=interests_list,
            career_cluster=career_cluster,
            profile_status=profile_status,
            pathway_progress_pct=progress_pct,
            completed_steps=completed_step_count,
            total_steps=total_steps,
            last_activity=last_activity_str,
            radar_flags=radar_flags
        ))

    return roster_list


# ==========================================
# 5. COHORT SUMMARY & ANONYMIZED CSV EXPORT
# ==========================================

@router.get("/facilitator/cohorts/{cohort_id}/summary", response_model=CohortSummaryResponse)
def get_cohort_summary(
    cohort_id: str,
    facilitator: Facilitator = Depends(get_current_facilitator),
    db: Session = Depends(get_db)
):
    """Returns aggregated stats: top clusters & upcoming deadlines."""
    clean_id = validate_id_param(cohort_id, "cohort_id")
    cohort = db.query(Cohort).filter(Cohort.id == clean_id).first()
    if not cohort or cohort.facilitator_id != facilitator.id:
        raise HTTPException(status_code=404, detail="Cohort not found or access forbidden.")

    members = db.query(CohortMember).filter(CohortMember.cohort_id == cohort.id).all()
    total_students = len(members)
    completed_profiles = 0
    cluster_counts: dict = {}

    for mem in members:
        s = mem.student
        if not s:
            continue
        if s.interests:
            completed_profiles += 1

        pathway = db.query(Pathway).filter(Pathway.student_id == s.id).first()
        cluster = pathway.career_goal if pathway else "general_explore"
        cluster_counts[cluster] = cluster_counts.get(cluster, 0) + 1

    cluster_labels = {
        "electrical_solar": "सौर व विद्युत तंत्रज्ञान (Solar & Electrical)",
        "agriculture_dairy": "कृषी व दुग्ध व्यवसाय (Agri & Dairy)",
        "healthcare": "आरोग्य व नर्सिंग (Healthcare & Nursing)",
        "it_digital": "डिजिटल व संगणक (IT & Digital)",
        "general_explore": "सामान्य शोध (General Exploration)"
    }

    top_clusters = [
        InterestClusterCount(
            cluster=k,
            count=v,
            label=cluster_labels.get(k, k.replace("_", " ").title())
        )
        for k, v in sorted(cluster_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    # Find deadlines closing in opportunities
    now = datetime.now(timezone.utc)
    opps = db.query(Opportunity).filter(Opportunity.deadline.isnot(None)).all()
    upcoming_deadlines: List[UpcomingDeadline] = []

    for opp in opps:
        try:
            dl = datetime.fromisoformat(opp.deadline.replace("Z", "+00:00"))
            days = (dl - now).days
            if 0 <= days <= 90:
                upcoming_deadlines.append(UpcomingDeadline(
                    opportunity_id=opp.id,
                    title=opp.title,
                    deadline=opp.deadline,
                    days_remaining=days,
                    relevant_student_count=max(1, total_students // 2) if total_students > 0 else 0
                ))
        except Exception:
            pass

    return CohortSummaryResponse(
        cohort_id=cohort.id,
        cohort_name=cohort.name,
        join_code=cohort.join_code,
        total_students=total_students,
        completed_profiles=completed_profiles,
        top_interest_clusters=top_clusters[:5],
        upcoming_deadlines=upcoming_deadlines[:5]
    )


@router.get("/facilitator/cohorts/{cohort_id}/export.csv")
def export_cohort_summary_csv(
    cohort_id: str,
    facilitator: Facilitator = Depends(get_current_facilitator),
    db: Session = Depends(get_db)
):
    """
    Exports aggregated cohort data as CSV with statistical disclosure control (k-anonymity).
    STRICT PRIVACY: Excludes all personal identifiers AND hides any count below 5 (<5)
    to prevent individual re-identification in small rural cohorts.
    """
    clean_id = validate_id_param(cohort_id, "cohort_id")
    cohort = db.query(Cohort).filter(Cohort.id == clean_id).first()
    if not cohort or cohort.facilitator_id != facilitator.id:
        raise HTTPException(status_code=404, detail="Cohort not found or access forbidden.")

    members = db.query(CohortMember).filter(CohortMember.cohort_id == cohort.id).all()

    def mask_count(val: int) -> str:
        """Hides any non-zero count below 5 for statistical privacy."""
        if val == 0:
            return "0"
        if val < 5:
            return "<5"
        return str(val)

    # Group records by (grade, cluster, profile_status, progress_band)
    groups: Dict[tuple, Dict[str, int]] = {}

    for mem in members:
        s = mem.student
        if not s:
            continue
        pathway = db.query(Pathway).filter(Pathway.student_id == s.id).first()
        cluster = pathway.career_goal if pathway else "general_explore"

        completed_count = 0
        if pathway and pathway.micro_steps_json:
            try:
                completed_count = len(json.loads(pathway.micro_steps_json).get("completed_steps", []))
            except Exception:
                pass
        progress_pct = round((completed_count / 28) * 100)
        progress_band = (
            "0-25%" if progress_pct <= 25 else
            "26-50%" if progress_pct <= 50 else
            "51-75%" if progress_pct <= 75 else "76-100%"
        )

        matches = _run_matches(
            student_id=s.id,
            language="mr",
            category=None,
            family_income=None,
            social_category=None,
            db=db
        )
        flags = evaluate_talent_radar(s, pathway, matches, "en")
        flag_codes = {f["code"] for f in flags}

        key = (
            str(s.grade or "Unknown"),
            cluster,
            "COMPLETE" if s.interests else "IN_PROGRESS",
            progress_band
        )

        if key not in groups:
            groups[key] = {
                "total": 0,
                "rising": 0,
                "strong_fit": 0,
                "needs_support": 0
            }

        groups[key]["total"] += 1
        if "RISING" in flag_codes:
            groups[key]["rising"] += 1
        if "STRONG_FIT" in flag_codes:
            groups[key]["strong_fit"] += 1
        if "NEEDS_SUPPORT" in flag_codes:
            groups[key]["needs_support"] += 1

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Grade", "Career_Cluster", "Profile_Status", "Pathway_Progress_Band",
        "Student_Count", "Flag_Rising_Count", "Flag_StrongFit_Count", "Flag_NeedsSupport_Count"
    ])

    for key, counts in groups.items():
        grade, cluster, prof_status, band = key
        writer.writerow([
            grade,
            cluster,
            prof_status,
            band,
            mask_count(counts["total"]),
            mask_count(counts["rising"]),
            mask_count(counts["strong_fit"]),
            mask_count(counts["needs_support"])
        ])

    csv_data = output.getvalue()
    filename = f"cohort_{cohort.name.replace(' ', '_')}_anonymized_summary.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==========================================
# 6. RECOMMENDATIONS FOR OPPORTUNITIES
# ==========================================

@router.post("/facilitator/recommend", response_model=RecommendationResponse)
def recommend_opportunity(
    rec_in: RecommendationCreate,
    facilitator: Facilitator = Depends(get_current_facilitator),
    db: Session = Depends(get_db)
):
    """Facilitator recommends a specific opportunity to a student."""
    student = db.query(Student).filter(Student.id == rec_in.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    opp = db.query(Opportunity).filter(Opportunity.id == rec_in.opportunity_id).first()
    opp_title = rec_in.opportunity_title or (opp.title if opp else "Recommended Opportunity")

    rec = Recommendation(
        facilitator_id=facilitator.id,
        student_id=student.id,
        opportunity_id=rec_in.opportunity_id,
        opportunity_title=opp_title,
        note=rec_in.note,
        created_at=utc_now()
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    # Privacy-safe impact metric (no names or student ids)
    try:
        from api.app.impact.router import record_impact_event
        record_impact_event(db, "REC_MADE")
    except Exception:
        pass

    return RecommendationResponse(
        id=rec.id,
        facilitator_id=facilitator.id,
        facilitator_name=facilitator.name,
        student_id=student.id,
        opportunity_id=rec.opportunity_id,
        opportunity_title=rec.opportunity_title,
        note=rec.note,
        created_at=rec.created_at.isoformat()
    )


@router.get("/students/{student_id}/recommendations", response_model=List[RecommendationResponse])
def get_student_recommendations(student_id: str, db: Session = Depends(get_db)):
    """Returns recommendations made for a student (visible in their opportunities list)."""
    clean_id = validate_id_param(student_id, "student_id")
    recs = db.query(Recommendation).filter(Recommendation.student_id == clean_id).all()
    results = []
    for r in recs:
        fac = r.facilitator
        fac_name = fac.name if fac else "तुमचे मार्गदर्शक (Facilitator)"
        results.append(RecommendationResponse(
            id=r.id,
            facilitator_id=r.facilitator_id,
            facilitator_name=fac_name,
            student_id=r.student_id,
            opportunity_id=r.opportunity_id,
            opportunity_title=r.opportunity_title,
            note=r.note,
            created_at=r.created_at.isoformat()
        ))
    return results
