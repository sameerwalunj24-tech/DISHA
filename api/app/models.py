import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from api.app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class Student(Base):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    preferred_language = Column(String(10), default="mr", nullable=False)  # 'mr', 'hi', 'en'
    grade = Column(Integer, nullable=False, default=10)  # Standard 9 to 16 (Graduation)
    state = Column(String(50), default="Maharashtra", nullable=False)
    district = Column(String(50), nullable=True)
    gender = Column(String(10), default="ALL", nullable=True)  # FEMALE, MALE, OTHER, ALL
    annual_family_income = Column(Float, nullable=True)
    age_years = Column(Integer, nullable=True)  # Optional – used for age-gated scheme checks
    
    # Child-safety / DPDP Act compliance
    guardian_consent = Column(Boolean, default=False, nullable=False)
    consent_receipt_hash = Column(String(64), nullable=True, index=True)
    consent_version = Column(String(20), default="DPDP_V1.0", nullable=True)
    
    # Profile vectors / keywords
    interests = Column(Text, nullable=True)  # JSON or comma-separated tags
    skills = Column(Text, nullable=True)
    aspirations = Column(Text, nullable=True)

    facilitator_id = Column(String(36), ForeignKey("facilitators.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    facilitator = relationship("Facilitator", back_populates="students")
    pathways = relationship("Pathway", back_populates="student", cascade="all, delete-orphan")
    cohort_memberships = relationship("CohortMember", back_populates="student", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="student", cascade="all, delete-orphan")
    module_enrollments = relationship("ModuleEnrollment", back_populates="student", cascade="all, delete-orphan")
    consent_receipts = relationship("ConsentReceipt", back_populates="student", cascade="all, delete-orphan")


class ConsentReceipt(Base):
    __tablename__ = "consent_receipts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    receipt_hash = Column(String(64), unique=True, index=True, nullable=False)
    consent_version = Column(String(20), default="DPDP_V1.0", nullable=False)
    recorded_at = Column(DateTime, default=utc_now, nullable=False)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=True)

    student = relationship("Student", back_populates="consent_receipts")


class Facilitator(Base):
    __tablename__ = "facilitators"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    phone_number = Column(String(20), unique=True, index=True, nullable=False)
    organization = Column(String(150), nullable=True)  # School, NGO, Gram Panchayat
    role = Column(String(50), default="TEACHER", nullable=False)  # TEACHER, NGO_LEAD, VILLAGE_VOLUNTEER
    state = Column(String(50), default="Maharashtra", nullable=False)
    district = Column(String(50), nullable=True)
    preferred_language = Column(String(10), default="mr", nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    students = relationship("Student", back_populates="facilitator")
    cohorts = relationship("Cohort", back_populates="facilitator", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="facilitator", cascade="all, delete-orphan")
    training_modules = relationship("TrainingModule", back_populates="facilitator", cascade="all, delete-orphan")


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True)  # apprenticeship, scholarship, vocational, scheme, job
    provider = Column(String(150), nullable=False)
    min_grade = Column(Integer, default=9, nullable=False)
    max_grade = Column(Integer, default=16, nullable=False)
    min_age = Column(Integer, nullable=True)   # e.g. 18 – null means no age floor
    max_age = Column(Integer, nullable=True)   # e.g. 35 – null means no age ceiling
    states = Column(String(255), default="Maharashtra;All India", nullable=False)
    income_max = Column(Float, nullable=True)
    gender = Column(String(20), default="ALL", nullable=False)  # ALL, FEMALE, MALE
    interest_tags = Column(String(255), default="", nullable=False)
    mobility = Column(String(50), default="DISTRICT", nullable=False)  # LOCAL, DISTRICT, STATE_WIDE
    deadline = Column(String(20), nullable=True)  # YYYY-MM-DD or None (rolling)
    documents_needed = Column(Text, default="", nullable=False)
    apply_steps = Column(Text, default="", nullable=False)
    benefits = Column(Text, nullable=False)
    source_name = Column(String(255), default="Official Portal", nullable=False)
    source_url = Column(String(500), nullable=False)
    last_verified = Column(String(20), nullable=False)  # YYYY-MM-DD
    verification_status = Column(String(50), default="sample_unverified", nullable=False)  # verified, sample_unverified
    verified_by = Column(String(100), nullable=True)  # Human verifier name
    verified_on = Column(String(20), nullable=True)  # YYYY-MM-DD
    is_sample = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)


class Pathway(Base):
    __tablename__ = "pathways"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    title = Column(String(200), nullable=False)
    career_goal = Column(String(150), nullable=False)
    is_vocational = Column(Boolean, default=True, nullable=False)
    
    # 30-day micro-steps formatted as JSON string
    micro_steps_json = Column(Text, nullable=False, default="[]")
    
    # Competitive exams to prepare for (JSON string array)
    competitive_exams_json = Column(Text, nullable=False, default="[]")
    
    estimated_days = Column(Integer, default=30, nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, COMPLETED, PAUSED
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    student = relationship("Student", back_populates="pathways")


class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(String(36), primary_key=True)  # Client outbox item UUID
    item_type = Column(String(50), nullable=False)
    student_id = Column(String(36), nullable=True)
    status = Column(String(20), default="synced", nullable=False)
    client_id = Column(String(64), nullable=True, index=True)
    client_seq = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=utc_now, nullable=False)
    applied_at = Column(DateTime, default=utc_now, nullable=False)


class Cohort(Base):
    __tablename__ = "cohorts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    facilitator_id = Column(String(36), ForeignKey("facilitators.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    join_code = Column(String(10), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    facilitator = relationship("Facilitator", back_populates="cohorts")
    members = relationship("CohortMember", back_populates="cohort", cascade="all, delete-orphan")


class CohortMember(Base):
    __tablename__ = "cohort_members"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    cohort_id = Column(String(36), ForeignKey("cohorts.id"), nullable=False)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    nickname = Column(String(50), nullable=False)  # Privacy-preserving roster display
    joined_at = Column(DateTime, default=utc_now, nullable=False)

    cohort = relationship("Cohort", back_populates="members")
    student = relationship("Student", back_populates="cohort_memberships")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    facilitator_id = Column(String(36), ForeignKey("facilitators.id"), nullable=False)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    opportunity_id = Column(String(100), nullable=False)
    opportunity_title = Column(String(200), nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    facilitator = relationship("Facilitator", back_populates="recommendations")
    student = relationship("Student", back_populates="recommendations")


class TrainingModule(Base):
    __tablename__ = "training_modules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    facilitator_id = Column(String(36), ForeignKey("facilitators.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    language = Column(String(10), default="mr", nullable=False)  # mr, hi, en
    price_type = Column(String(20), default="FREE", nullable=False)  # FREE, ONE_TIME, MONTHLY
    price_paise = Column(Integer, default=0, nullable=False)  # Amount in integer paise (1 INR = 100 paise)
    price_inr = Column(Float, default=0.0, nullable=False)
    steps_json = Column(Text, default="[]", nullable=False)  # JSON array of lessons/steps
    is_published = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    facilitator = relationship("Facilitator", back_populates="training_modules")
    enrollments = relationship("ModuleEnrollment", back_populates="module", cascade="all, delete-orphan")


class ModuleEnrollment(Base):
    __tablename__ = "module_enrollments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    module_id = Column(String(36), ForeignKey("training_modules.id"), nullable=False)
    payment_status = Column(String(20), default="PAID_MOCK", nullable=False)  # FREE, PAID_MOCK
    amount_paid_paise = Column(Integer, default=0, nullable=False)  # Integer paise paid
    platform_fee_paise = Column(Integer, default=0, nullable=False)  # Platform 12% (floor) in paise
    facilitator_share_paise = Column(Integer, default=0, nullable=False)  # Facilitator 88% (remainder) in paise
    amount_paid = Column(Float, default=0.0, nullable=False)
    platform_fee_inr = Column(Float, default=0.0, nullable=False)  # Platform share: 12%
    facilitator_share_inr = Column(Float, default=0.0, nullable=False)  # Facilitator share: 88%
    enrolled_at = Column(DateTime, default=utc_now, nullable=False)

    student = relationship("Student", back_populates="module_enrollments")
    module = relationship("TrainingModule", back_populates="enrollments")


class ImpactEvent(Base):
    __tablename__ = "impact_events"

    # Strictly privacy-safe metrics event record.
    # NO student names, NO free-text feedback, NO personal identifiers.
    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_type = Column(String(50), nullable=False, index=True)
    # Types: PROFILE_CREATED, PATHWAY_STARTED, STEP_COMPLETED,
    #        OPP_VIEWED, REC_MADE, SYNC_COMPLETED
    category = Column(String(50), nullable=True)  # Optional cluster/category code (e.g. vocational, solar)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)
