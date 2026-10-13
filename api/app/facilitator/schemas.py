"""
schemas.py - Facilitator, Cohort & Talent Radar Schemas
=======================================================
Guarantees data minimisation:
- Student rosters display nicknames/roll numbers.
- Sensitive income and social category are strictly omitted from all schemas.
"""

import re
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


def validate_phone(v: str) -> str:
    cleaned = v.strip().replace(" ", "").replace("-", "")
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]
    if not (10 <= len(cleaned) <= 15):
        raise ValueError("Phone number must be between 10 and 15 characters.")
    if not re.match(r"^[6-9][0-9a-zA-Z]{9,14}$", cleaned):
        raise ValueError("Invalid phone number format. Must start with 6-9.")
    return cleaned


def validate_otp_code(v: str) -> str:
    cleaned = v.strip()
    if not re.match(r"^\d{6}$", cleaned):
        raise ValueError("OTP must be exactly 6 digits.")
    return cleaned


def sanitize_text(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    cleaned = v.strip()
    return re.sub(r"[<>]", "", cleaned)


class OTPRequest(BaseModel):
    phone_number: str = Field(..., description="Mobile number for facilitator login")
    name: Optional[str] = Field("शिक्षक (Facilitator)", max_length=100, description="Display name for new facilitators")
    role: Optional[str] = Field("TEACHER", max_length=50, description="TEACHER, NGO_LEAD, or VILLAGE_VOLUNTEER")
    organization: Optional[str] = Field("ZP School", max_length=100, description="School or NGO organization")

    @field_validator("phone_number")
    def check_phone(cls, v: str) -> str:
        return validate_phone(v)

    @field_validator("name", "role", "organization")
    def clean_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v)


class OTPResponse(BaseModel):
    phone_number: str
    demo_otp: Optional[str] = Field(None, description="Prototype demo OTP displayed on-screen in dev/demo mode")
    message: str


class OTPVerifyRequest(BaseModel):
    phone_number: str = Field(..., description="Mobile number used to request OTP")
    otp: str = Field(..., description="6-digit OTP code")

    @field_validator("phone_number")
    def check_phone(cls, v: str) -> str:
        return validate_phone(v)

    @field_validator("otp")
    def check_otp(cls, v: str) -> str:
        return validate_otp_code(v)


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10, max_length=1500, description="Valid refresh token")


class FacilitatorDTO(BaseModel):
    id: str
    name: str
    phone_number: str
    role: str
    organization: Optional[str] = None
    state: str = "Maharashtra"
    preferred_language: str = "mr"


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int = 86400
    facilitator: FacilitatorDTO


class CohortCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="e.g. 10th-A, ITI Electrical Batch")
    description: Optional[str] = Field(None, max_length=300)

    @field_validator("name")
    def check_name(cls, v: str) -> str:
        s = sanitize_text(v)
        if not s or len(s) < 2:
            raise ValueError("Cohort name must be at least 2 characters long.")
        return s

    @field_validator("description")
    def clean_desc(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v)


class CohortResponse(BaseModel):
    id: str
    facilitator_id: str
    name: str
    description: Optional[str] = None
    join_code: str
    student_count: int
    created_at: str


class JoinCohortRequest(BaseModel):
    join_code: str = Field(..., min_length=3, max_length=10, description="Short cohort join code")
    student_id: str = Field(..., min_length=1, max_length=64, description="Student UUID or local ID joining cohort")
    nickname: str = Field(..., min_length=1, max_length=50, description="Privacy nickname or roll number")

    @field_validator("join_code")
    def check_code(cls, v: str) -> str:
        s = v.strip().upper()
        if not re.match(r"^[A-Z0-9]{3,10}$", s):
            raise ValueError("Join code must be 3-10 alphanumeric characters.")
        return s

    @field_validator("nickname")
    def check_nickname(cls, v: str) -> str:
        s = sanitize_text(v)
        if not s:
            raise ValueError("Nickname cannot be empty.")
        return s

    @field_validator("student_id")
    def check_student_id(cls, v: str) -> str:
        s = v.strip()
        if not re.match(r"^[A-Za-z0-9_\-]+$", s):
            raise ValueError("Student ID must be alphanumeric or contain dashes/underscores.")
        return s


class JoinCohortResponse(BaseModel):
    success: bool
    cohort_id: str
    cohort_name: str
    student_id: str
    nickname: str
    notice: str = Field(..., description="Plain-language notice about facilitator visibility")


class RadarFlagDTO(BaseModel):
    code: str
    title: str
    color: str
    reason: str


class RosterMemberDTO(BaseModel):
    member_id: str
    student_id: str
    nickname: str  # Roll number or nickname (data minimisation)
    grade: int
    primary_interests: List[str]
    career_cluster: str
    profile_status: str  # "COMPLETE" | "IN_PROGRESS"
    pathway_progress_pct: int
    completed_steps: int
    total_steps: int
    last_activity: str
    radar_flags: List[RadarFlagDTO]


class InterestClusterCount(BaseModel):
    cluster: str
    count: int
    label: str


class UpcomingDeadline(BaseModel):
    opportunity_id: str
    title: str
    deadline: str
    days_remaining: int
    relevant_student_count: int


class CohortSummaryResponse(BaseModel):
    cohort_id: str
    cohort_name: str
    join_code: str
    total_students: int
    completed_profiles: int
    top_interest_clusters: List[InterestClusterCount]
    upcoming_deadlines: List[UpcomingDeadline]


class RecommendationCreate(BaseModel):
    student_id: str = Field(..., min_length=1, max_length=64)
    opportunity_id: str = Field(..., min_length=1, max_length=64)
    opportunity_title: Optional[str] = Field(None, max_length=200)
    note: Optional[str] = Field(None, max_length=500)

    @field_validator("student_id", "opportunity_id")
    def validate_ids(cls, v: str) -> str:
        s = v.strip()
        if not re.match(r"^[A-Za-z0-9_\-]+$", s):
            raise ValueError("ID must be alphanumeric or contain dashes/underscores.")
        return s

    @field_validator("opportunity_title", "note")
    def sanitize_strings(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v)


class RecommendationResponse(BaseModel):
    id: str
    facilitator_id: str
    facilitator_name: str
    student_id: str
    opportunity_id: str
    opportunity_title: Optional[str] = None
    note: Optional[str] = None
    created_at: str
