from typing import Optional
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
    state: str
    gender_eligibility: str
    max_family_income: Optional[float] = None
    benefits: str
    source_url: str
    last_verified: str
    is_sample: bool

class StudentCreate(BaseModel):
    name: str = Field(..., json_schema_extra={"example": "Aarav Jadhav"})
    preferred_language: str = Field("mr", json_schema_extra={"example": "mr"})
    grade: int = Field(10, ge=9, le=16, json_schema_extra={"example": 10})
    state: str = Field("Maharashtra", json_schema_extra={"example": "Maharashtra"})
    district: Optional[str] = Field("Satara", json_schema_extra={"example": "Satara"})
    gender: Optional[str] = Field("MALE", json_schema_extra={"example": "MALE"})
    annual_family_income: Optional[float] = Field(None, json_schema_extra={"example": 150000})
    guardian_consent: bool = Field(False, json_schema_extra={"example": True})
    interests: Optional[str] = Field(None, json_schema_extra={"example": "solar pumps, electrical repairs, mechanics"})

class StudentResponse(StudentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
