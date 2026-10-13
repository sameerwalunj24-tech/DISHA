"""
schemas.py - Facilitator, Cohort & Talent Radar Schemas
=======================================================
Guarantees data minimisation:
- Student rosters display nicknames/roll numbers.
- Sensitive income and social category are strictly omitted from all schemas.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class OTPRequest(BaseModel):
    phone_number: str = Field(..., description="Mobile number for facilitator login")
    name: Optional[str] = Field("शिक्षक (Facilitator)", description="Display name for new facilitators")
    role: Optional[str] = Field("TEACHER", description="TEACHER, NGO_LEAD, or VILLAGE_VOLUNTEER")
    organization: Optional[str] = Field("ZP School", description="School or NGO organization")


class OTPResponse(BaseModel):
    phone_number: str
    demo_otp: Optional[str] = Field(None, description="Prototype demo OTP displayed on-screen in dev/demo mode")
    message: str


class OTPVerifyRequest(BaseModel):
    phone_number: str
    otp: str = Field(..., description="6-digit OTP code")


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
    token_type: str = "bearer"
    facilitator: FacilitatorDTO


class CohortCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="e.g. 10th-A, ITI Electrical Batch")
    description: Optional[str] = None


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
    student_id: str = Field(..., description="Student UUID or local ID joining cohort")
    nickname: str = Field(..., min_length=1, max_length=50, description="Privacy nickname or roll number")


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
    student_id: str
    opportunity_id: str
    opportunity_title: Optional[str] = None
    note: Optional[str] = None


class RecommendationResponse(BaseModel):
    id: str
    facilitator_id: str
    facilitator_name: str
    student_id: str
    opportunity_id: str
    opportunity_title: Optional[str] = None
    note: Optional[str] = None
    created_at: str
