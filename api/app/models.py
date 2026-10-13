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
    
    # Child-safety / DPDP Act compliance
    guardian_consent = Column(Boolean, default=False, nullable=False)
    
    # Profile vectors / keywords
    interests = Column(Text, nullable=True)  # JSON or comma-separated tags
    skills = Column(Text, nullable=True)
    aspirations = Column(Text, nullable=True)

    facilitator_id = Column(String(36), ForeignKey("facilitators.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    facilitator = relationship("Facilitator", back_populates="students")
    pathways = relationship("Pathway", back_populates="student", cascade="all, delete-orphan")


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


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True)  # apprenticeship, scholarship, vocational, scheme, job
    provider = Column(String(150), nullable=False)
    min_grade = Column(Integer, default=9, nullable=False)
    max_grade = Column(Integer, default=16, nullable=False)
    state = Column(String(50), default="All India", nullable=False)
    gender_eligibility = Column(String(20), default="ALL", nullable=False)  # ALL, FEMALE, MALE
    max_family_income = Column(Float, nullable=True)
    benefits = Column(Text, nullable=False)
    source_url = Column(String(500), nullable=False)
    last_verified = Column(String(20), nullable=False)  # YYYY-MM-DD
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
