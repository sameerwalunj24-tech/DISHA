import json
from datetime import datetime, timezone
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.app.database import get_db
from api.app.models import TrainingModule, ModuleEnrollment, Facilitator, Student
from api.app.facilitator.auth import get_current_facilitator

router = APIRouter(prefix="/api/v1", tags=["Marketplace"])


# ==========================================
# SCHEMAS
# ==========================================

class ModuleStep(BaseModel):
    step_number: int
    title: str
    content: str
    practical_task: Optional[str] = None


class ModuleCreateIn(BaseModel):
    title: str = Field(..., min_length=3, max_length=200, json_schema_extra={"example": "सौर ऊर्जा तंत्रज्ञ मूलभूत कौशल्ये (Solar Technician Fundamentals)"})
    description: Optional[str] = Field(None, json_schema_extra={"example": "सौर पॅनल जोडणी आणि देखभाल प्रात्यक्षिक कोर्स"})
    language: str = Field("mr", json_schema_extra={"example": "mr"})  # mr, hi, en
    price_type: str = Field("FREE", json_schema_extra={"example": "ONE_TIME"})  # FREE, ONE_TIME, MONTHLY
    price_inr: float = Field(0.0, ge=0.0, json_schema_extra={"example": 150.0})
    steps: List[ModuleStep] = Field(default_factory=list)


class ModuleOut(BaseModel):
    id: str
    facilitator_id: str
    facilitator_name: str
    title: str
    description: Optional[str]
    language: str
    price_type: str
    price_inr: float
    steps_count: int
    steps: List[dict]
    created_at: str


class ModuleEnrollIn(BaseModel):
    student_id: str
    payment_method: str = "MOCK_UPI"  # Mock payment prototype (no real gateway)


class EnrollmentOut(BaseModel):
    enrollment_id: str
    module_id: str
    module_title: str
    student_id: str
    payment_status: str
    amount_paid: float
    platform_fee_inr: float       # Platform 12%
    facilitator_share_inr: float   # Facilitator 88%
    enrolled_at: str
    access_granted: bool
    module_content: dict


class ModuleRevenueBreakdown(BaseModel):
    module_id: str
    title: str
    price_type: str
    price_inr: float
    enrollments_count: int
    gross_sales_inr: float
    platform_share_12pct_inr: float
    facilitator_share_88pct_inr: float


class FacilitatorEarningsOut(BaseModel):
    facilitator_id: str
    facilitator_name: str
    total_modules: int
    total_enrollments: int
    gross_revenue_inr: float
    platform_share_12pct_inr: float      # Platform 12%
    facilitator_share_88pct_inr: float   # Facilitator 88%
    modules_breakdown: List[ModuleRevenueBreakdown]


# ==========================================
# ENDPOINTS
# ==========================================

@router.post("/facilitator/modules", response_model=ModuleOut)
def create_training_module(
    module_in: ModuleCreateIn,
    facilitator: Facilitator = Depends(get_current_facilitator),
    db: Session = Depends(get_db)
):
    """
    Facilitator authors a practical training course / module.
    Price can be FREE, ONE_TIME, or MONTHLY.
    """
    steps_data = [s.model_dump() for s in module_in.steps]
    if not steps_data:
        # Default starter lesson if none provided
        steps_data = [{
            "step_number": 1,
            "title": f"प्रस्तावना: {module_in.title}",
            "content": module_in.description or "या मोड्युलमधील मूलभूत प्रात्यक्षिक मार्गदर्शन.",
            "practical_task": "साधनांची ओळख करून घेणे."
        }]

    mod = TrainingModule(
        facilitator_id=facilitator.id,
        title=module_in.title.strip(),
        description=module_in.description.strip() if module_in.description else "",
        language=module_in.language,
        price_type=module_in.price_type.upper(),
        price_inr=0.0 if module_in.price_type.upper() == "FREE" else float(module_in.price_inr),
        steps_json=json.dumps(steps_data, ensure_ascii=False),
        is_published=True
    )
    db.add(mod)
    db.commit()
    db.refresh(mod)

    return ModuleOut(
        id=mod.id,
        facilitator_id=facilitator.id,
        facilitator_name=facilitator.name,
        title=mod.title,
        description=mod.description,
        language=mod.language,
        price_type=mod.price_type,
        price_inr=mod.price_inr,
        steps_count=len(steps_data),
        steps=steps_data,
        created_at=mod.created_at.isoformat()
    )


@router.get("/modules", response_model=List[ModuleOut])
def list_training_modules(
    language: Optional[str] = None,
    facilitator_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Public catalog of training modules for students to browse and enroll.
    Filtered optionally by language (mr, hi, en) or facilitator.
    """
    query = db.query(TrainingModule).filter(TrainingModule.is_published == True)
    if language:
        query = query.filter(TrainingModule.language == language)
    if facilitator_id:
        query = query.filter(TrainingModule.facilitator_id == facilitator_id)

    modules = query.order_by(TrainingModule.created_at.desc()).all()
    results = []
    for m in modules:
        try:
            steps_data = json.loads(m.steps_json)
        except Exception:
            steps_data = []

        fac_name = m.facilitator.name if m.facilitator else "दिशा मार्गदर्शक"
        results.append(ModuleOut(
            id=m.id,
            facilitator_id=m.facilitator_id,
            facilitator_name=fac_name,
            title=m.title,
            description=m.description,
            language=m.language,
            price_type=m.price_type,
            price_inr=m.price_inr,
            steps_count=len(steps_data),
            steps=steps_data,
            created_at=m.created_at.isoformat()
        ))
    return results


@router.get("/modules/{module_id}", response_model=ModuleOut)
def get_module_details(module_id: str, db: Session = Depends(get_db)):
    """Fetches full module lessons for download and offline playback."""
    m = db.query(TrainingModule).filter(TrainingModule.id == module_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Training module not found.")

    try:
        steps_data = json.loads(m.steps_json)
    except Exception:
        steps_data = []

    fac_name = m.facilitator.name if m.facilitator else "दिशा मार्गदर्शक"
    return ModuleOut(
        id=m.id,
        facilitator_id=m.facilitator_id,
        facilitator_name=fac_name,
        title=m.title,
        description=m.description,
        language=m.language,
        price_type=m.price_type,
        price_inr=m.price_inr,
        steps_count=len(steps_data),
        steps=steps_data,
        created_at=m.created_at.isoformat()
    )


@router.post("/modules/{module_id}/enroll", response_model=EnrollmentOut)
def enroll_module_mock_payment(
    module_id: str,
    enroll_in: ModuleEnrollIn,
    db: Session = Depends(get_db)
):
    """
    Student enrolls / buys a training module using mock payment.
    Calculates exact revenue split:
    - Platform share: 12%
    - Facilitator payout: 88%
    """
    mod = db.query(TrainingModule).filter(TrainingModule.id == module_id).first()
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found.")

    student = db.query(Student).filter(Student.id == enroll_in.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Check if already enrolled
    existing = db.query(ModuleEnrollment).filter(
        ModuleEnrollment.student_id == student.id,
        ModuleEnrollment.module_id == mod.id
    ).first()

    if existing:
        try:
            steps_data = json.loads(mod.steps_json)
        except Exception:
            steps_data = []

        return EnrollmentOut(
            enrollment_id=existing.id,
            module_id=mod.id,
            module_title=mod.title,
            student_id=student.id,
            payment_status=existing.payment_status,
            amount_paid=existing.amount_paid,
            platform_fee_inr=existing.platform_fee_inr,
            facilitator_share_inr=existing.facilitator_share_inr,
            enrolled_at=existing.enrolled_at.isoformat(),
            access_granted=True,
            module_content={"title": mod.title, "steps": steps_data}
        )

    # Calculate 12% / 88% revenue split
    amount = float(mod.price_inr) if mod.price_type != "FREE" else 0.0
    platform_fee = round(amount * 0.12, 2)
    facilitator_share = round(amount - platform_fee, 2)

    payment_status = "FREE" if amount == 0.0 else "PAID_MOCK"

    enrollment = ModuleEnrollment(
        student_id=student.id,
        module_id=mod.id,
        payment_status=payment_status,
        amount_paid=amount,
        platform_fee_inr=platform_fee,
        facilitator_share_inr=facilitator_share,
        enrolled_at=datetime.now(timezone.utc)
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    try:
        steps_data = json.loads(mod.steps_json)
    except Exception:
        steps_data = []

    return EnrollmentOut(
        enrollment_id=enrollment.id,
        module_id=mod.id,
        module_title=mod.title,
        student_id=student.id,
        payment_status=payment_status,
        amount_paid=amount,
        platform_fee_inr=platform_fee,
        facilitator_share_inr=facilitator_share,
        enrolled_at=enrollment.enrolled_at.isoformat(),
        access_granted=True,
        module_content={"title": mod.title, "steps": steps_data}
    )


@router.get("/facilitator/earnings", response_model=FacilitatorEarningsOut)
def get_facilitator_earnings(
    facilitator: Facilitator = Depends(get_current_facilitator),
    db: Session = Depends(get_db)
):
    """
    Facilitator Earnings & Revenue Split Dashboard:
    Displays gross earnings, platform fee (12%), and net facilitator earnings (88%).
    """
    modules = db.query(TrainingModule).filter(TrainingModule.facilitator_id == facilitator.id).all()

    total_enrollments = 0
    gross_revenue = 0.0
    platform_share = 0.0
    facilitator_share = 0.0
    breakdown: List[ModuleRevenueBreakdown] = []

    for m in modules:
        m_enrolls = db.query(ModuleEnrollment).filter(ModuleEnrollment.module_id == m.id).all()
        m_count = len(m_enrolls)
        m_gross = sum(e.amount_paid for e in m_enrolls)
        m_plat = sum(e.platform_fee_inr for e in m_enrolls)
        m_fac = sum(e.facilitator_share_inr for e in m_enrolls)

        total_enrollments += m_count
        gross_revenue += m_gross
        platform_share += m_plat
        facilitator_share += m_fac

        breakdown.append(ModuleRevenueBreakdown(
            module_id=m.id,
            title=m.title,
            price_type=m.price_type,
            price_inr=m.price_inr,
            enrollments_count=m_count,
            gross_sales_inr=round(m_gross, 2),
            platform_share_12pct_inr=round(m_plat, 2),
            facilitator_share_88pct_inr=round(m_fac, 2)
        ))

    return FacilitatorEarningsOut(
        facilitator_id=facilitator.id,
        facilitator_name=facilitator.name,
        total_modules=len(modules),
        total_enrollments=total_enrollments,
        gross_revenue_inr=round(gross_revenue, 2),
        platform_share_12pct_inr=round(platform_share, 2),
        facilitator_share_88pct_inr=round(facilitator_share, 2),
        modules_breakdown=breakdown
    )


@router.get("/students/{student_id}/modules", response_model=List[EnrollmentOut])
def get_student_enrolled_modules(student_id: str, db: Session = Depends(get_db)):
    """Lists modules enrolled by a student for offline study."""
    enrollments = db.query(ModuleEnrollment).filter(ModuleEnrollment.student_id == student_id).all()
    results = []
    for e in enrollments:
        mod = e.module
        if not mod:
            continue
        try:
            steps_data = json.loads(mod.steps_json)
        except Exception:
            steps_data = []

        results.append(EnrollmentOut(
            enrollment_id=e.id,
            module_id=mod.id,
            module_title=mod.title,
            student_id=student_id,
            payment_status=e.payment_status,
            amount_paid=e.amount_paid,
            platform_fee_inr=e.platform_fee_inr,
            facilitator_share_inr=e.facilitator_share_inr,
            enrolled_at=e.enrolled_at.isoformat(),
            access_granted=True,
            module_content={"title": mod.title, "steps": steps_data}
        ))
    return results
