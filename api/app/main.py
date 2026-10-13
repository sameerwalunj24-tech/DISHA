from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from api.app.config import settings, is_demo_allowed
from api.app.database import engine, Base, get_db
from api.app.models import Opportunity
from api.app.schemas import HealthResponse, OpportunityResponse
from api.app.discovery.router import router as discovery_router
from api.app.matching.router import router as matching_router
from api.app.pathways.router import router as pathways_router
from api.app.sync.router import router as sync_router
from api.app.facilitator.router import router as facilitator_router
from api.app.marketplace.router import router as marketplace_router
from api.app.partner.router import router as partner_router
from api.app.impact.router import router as impact_router
from api.app.routers.consent import router as consent_router
from api.app.schemas import HealthResponse, OpportunityResponse, StudentCreate, StudentResponse
from api.app.models import Opportunity, Student, ConsentReceipt

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup (creates all tables from scratch on fresh clone)
    from api.app.database import init_db
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description=(
        "Disha - Voice-First Multilingual AI Career & Livelihood Guide for Rural India.\n\n"
        "Key capabilities:\n"
        "- Voice-driven discovery & student profiling\n"
        "- Deterministic rules-based opportunity matching & pathway generator\n"
        "- Resilient offline sync with IndexedDB outbox\n"
        "- Facilitator portal, talent radar flags & cohort management\n"
        "- Marketplace with 12/88 facilitator revenue split\n"
        "- Partner connectors for NGO and employer opportunity feeds\n"
        "- DPDP Act 2023 Cryptographic Consent Verification"
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Restrict CORS to configured origins (from settings / environment)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(discovery_router)
app.include_router(matching_router)
app.include_router(pathways_router)
app.include_router(sync_router)
app.include_router(facilitator_router)
app.include_router(marketplace_router)
app.include_router(partner_router)
app.include_router(consent_router)
app.include_router(impact_router, prefix="/api/v1")

@app.get("/health", response_model=HealthResponse, tags=["System"])
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint validating API and database connectivity."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return HealthResponse(
        status="ok" if "unhealthy" not in db_status else "degraded",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database=db_status
    )

@app.get("/api/v1/opportunities", response_model=List[OpportunityResponse], tags=["Opportunities"])
def list_opportunities(
    category: str = None,
    grade: int = None,
    db: Session = Depends(get_db)
):
    """Retrieve catalog of verified opportunities with deterministic filters."""
    query = db.query(Opportunity)
    if category:
        query = query.filter(Opportunity.category == category)
    if grade:
        query = query.filter(Opportunity.min_grade <= grade, Opportunity.max_grade >= grade)
    
    return query.all()

@app.post("/api/v1/demo/reset", tags=["Demo"])
def reset_demo(
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    db: Session = Depends(get_db)
):
    """Restores pre-configured demo facilitator, cohort DEMO10, and 3 students at various stages."""
    if not is_demo_allowed(settings.ENVIRONMENT, x_admin_key):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="DEMO_RESET_DISABLED: Demo environment reset is disabled in production mode. Provide a valid 'X-Admin-Key' header."
        )
    from api.seed_demo import seed_demo_data
    result = seed_demo_data(db)
    return {
        "status": "success",
        "message": "Demo environment successfully restored with demo facilitator, cohort DEMO10, and 3 students.",
        "details": result
    }

@app.post("/api/v1/students", response_model=StudentResponse, tags=["Students"])
def create_student(student_in: StudentCreate, db: Session = Depends(get_db)):
    """Create a student record with guardian consent and optional cryptographic receipt."""
    if not student_in.guardian_consent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="GUARDIAN_CONSENT_REQUIRED: Child-safe privacy policy requires guardian consent before saving profile."
        )
    student = Student(
        name=student_in.name,
        preferred_language=student_in.preferred_language,
        grade=student_in.grade,
        state=student_in.state,
        district=student_in.district,
        gender=student_in.gender,
        guardian_consent=True,
        consent_receipt_hash=student_in.consent_receipt_hash,
        consent_version=student_in.consent_version or "DPDP_V1.0",
        interests=student_in.interests
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    if student_in.consent_receipt_hash:
        try:
            if not db.query(ConsentReceipt).filter(ConsentReceipt.receipt_hash == student_in.consent_receipt_hash).first():
                cr = ConsentReceipt(
                    receipt_hash=student_in.consent_receipt_hash,
                    consent_version=student_in.consent_version or "DPDP_V1.0",
                    student_id=student.id
                )
                db.add(cr)
                db.commit()
        except Exception:
            pass

    return student

@app.get("/api/v1/students/{student_id}", response_model=StudentResponse, tags=["Students"])
def get_student(student_id: str, db: Session = Depends(get_db)):
    """Retrieve student profile by id."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

