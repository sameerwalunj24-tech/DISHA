from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "Disha API"
    version: str = "0.1.0"
    environment: str = "development"
    database: str = "connected"

class OpportunityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    provider: str
    min_grade: int
    max_grade: int
    states: str
    income_max: Optional[float] = None
    gender: str
    interest_tags: str
    mobility: str
    deadline: Optional[str] = None
    documents_needed: str
    apply_steps: str
    benefits: str
    source_name: str
    source_url: str
    last_verified: str
    verification_status: str
    is_sample: bool

class RuleEvaluation(BaseModel):
    rule_name: str
    status: str  # "PASS", "FAIL", "UNKNOWN"
    reason_code: str
    detail: str

class ScoreBreakdown(BaseModel):
    base_eligibility: int
    verification_bonus: int
    interest_overlap: int
    mobility_fit: int
    deadline_bonus: int
    total_score: int

class OpportunityMatchResponse(BaseModel):
    opportunity: OpportunityResponse
    overall_eligibility: str  # "ELIGIBLE", "LIKELY", "NOT_ELIGIBLE"
    score: int
    score_breakdown: ScoreBreakdown
    passed_rules: List[str]
    failed_rules: List[str]
    missing_info: List[str]
    explanation: Dict[str, str]  # {"why_fits": "...", "what_to_do": "...", "source_name": "...", "source_url": "...", "last_verified": "..."}

class EligibilityCheckRequest(BaseModel):
    opportunity_id: int
    grade: int
    state: str = "Maharashtra"
    gender: Optional[str] = "ALL"
    interests: Optional[List[str]] = Field(default_factory=list)
    mobility: Optional[str] = "DISTRICT"
    # SENSITIVE FIELDS: optional in request, never persisted
    family_income: Optional[float] = None
    social_category: Optional[str] = None
    language: Optional[str] = "mr"

class StudentCreate(BaseModel):
    name: str = Field(..., json_schema_extra={"example": "Aarav Jadhav"})
    preferred_language: str = Field("mr", json_schema_extra={"example": "mr"})
    grade: int = Field(10, ge=9, le=16, json_schema_extra={"example": 10})
    state: str = Field("Maharashtra", json_schema_extra={"example": "Maharashtra"})
    district: Optional[str] = Field("Satara", json_schema_extra={"example": "Satara"})
    gender: Optional[str] = Field("MALE", json_schema_extra={"example": "MALE"})
    guardian_consent: bool = Field(False, json_schema_extra={"example": True})
    interests: Optional[str] = Field(None, json_schema_extra={"example": "solar pumps, electrical repairs, mechanics"})

class StudentResponse(StudentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
