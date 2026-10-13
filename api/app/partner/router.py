from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.app.database import get_db
from api.app.config import settings
from api.app.models import Opportunity

router = APIRouter(prefix="/api/v1/partner", tags=["Partner & Connectors"])

def validate_partner_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")) -> str:
    """Dependency verifying external partner / connector API key."""
    if not x_api_key or x_api_key.strip() not in settings.PARTNER_API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing Partner API Key. Provide a valid 'X-API-Key' header."
        )
    return x_api_key.strip()

class PartnerOpportunityItem(BaseModel):
    title: str = Field(..., description="Opportunity title in local language or bilingual", json_schema_extra={"example": "ग्रामीण सौर ऊर्जा तंत्रज्ञ प्रशिक्षण (Rural Solar Tech)"})
    category: str = Field("vocational", description="apprenticeship | scholarship | vocational | scheme | job", json_schema_extra={"example": "vocational"})
    provider: str = Field(..., description="NGO, Foundation, or Employer name", json_schema_extra={"example": "ग्रामविकास कौशल्य प्रतिष्ठान (Rural Skill Trust)"})
    min_grade: int = Field(9, ge=1, le=16, description="Minimum academic standard required", json_schema_extra={"example": 10})
    max_grade: int = Field(16, ge=1, le=16, description="Maximum academic standard eligible", json_schema_extra={"example": 14})
    min_age: Optional[int] = Field(None, ge=12, le=60, description="Minimum age requirement", json_schema_extra={"example": 18})
    max_age: Optional[int] = Field(None, ge=12, le=60, description="Maximum age limit", json_schema_extra={"example": 28})
    states: str = Field("Maharashtra", description="Applicable state(s)", json_schema_extra={"example": "Maharashtra"})
    income_max: Optional[float] = Field(None, description="Max family income threshold in INR", json_schema_extra={"example": 250000.0})
    gender: str = Field("ALL", description="Eligible gender: ALL, FEMALE, MALE", json_schema_extra={"example": "ALL"})
    interest_tags: str = Field("", description="Comma-separated interest keywords", json_schema_extra={"example": "solar,electronics,technician"})
    mobility: str = Field("DISTRICT", description="LOCAL, DISTRICT, STATE_WIDE", json_schema_extra={"example": "DISTRICT"})
    deadline: Optional[str] = Field(None, description="Application deadline YYYY-MM-DD or empty for rolling", json_schema_extra={"example": "2026-12-31"})
    documents_needed: str = Field("", description="List of required certificates or ID documents", json_schema_extra={"example": "आधार कार्ड, १० वी गुणपत्रिका, रहिवासी दाखला"})
    apply_steps: str = Field("", description="Step-by-step guidance on how to apply", json_schema_extra={"example": "१. संस्थेच्या केंद्रात फॉर्म भरा. २. मूळ कागदपत्रांची पडताळणी करा."})
    benefits: str = Field(..., description="Stipend, free toolkit, boarding or certification benefits", json_schema_extra={"example": "मोफत प्रशिक्षण, ₹२,५०० विद्यावेतन आणि राष्ट्रीय कौशल्य प्रमाणपत्र"})
    source_name: str = Field("NGO Feed Connector", description="Name of connector feed or portal", json_schema_extra={"example": "Rural Skill Trust Official Feed"})
    source_url: str = Field(..., description="Official landing URL for applicant verification", json_schema_extra={"example": "https://ruralskilltrust.org/training/solar"})

class ImportOpportunitiesRequest(BaseModel):
    items: List[PartnerOpportunityItem] = Field(
        ...,
        description="List of opportunities to ingest into Disha catalog"
    )

class ImportOpportunitiesResponse(BaseModel):
    status: str
    message: str
    imported_count: int
    imported_ids: List[int]
    verification_status: str

@router.post(
    "/opportunities/import",
    response_model=ImportOpportunitiesResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Import external partner / NGO opportunity feed",
    description=(
        "Ingests opportunities from an external NGO, government, or employer connector feed. "
        "DATA TRUST POLICY: Every imported opportunity is strictly categorized as 'sample_unverified' "
        "with verified_by=null and verified_on=null until verified by a human verifier."
    )
)
def import_partner_opportunities(
    payload: ImportOpportunitiesRequest,
    api_key: str = Depends(validate_partner_api_key),
    db: Session = Depends(get_db)
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Feed cannot be empty. Provide at least one item.")

    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    created_ids: List[int] = []

    for item in payload.items:
        opp = Opportunity(
            title=item.title.strip(),
            category=item.category.strip(),
            provider=item.provider.strip(),
            min_grade=item.min_grade,
            max_grade=item.max_grade,
            min_age=item.min_age,
            max_age=item.max_age,
            states=item.states.strip(),
            income_max=item.income_max,
            gender=item.gender.strip().upper(),
            interest_tags=item.interest_tags.strip(),
            mobility=item.mobility.strip().upper(),
            deadline=item.deadline.strip() if item.deadline else None,
            documents_needed=item.documents_needed.strip(),
            apply_steps=item.apply_steps.strip(),
            benefits=item.benefits.strip(),
            source_name=item.source_name.strip(),
            source_url=item.source_url.strip(),
            last_verified=now_str,
            # Mandatory Data Trust Enforcements:
            verification_status="sample_unverified",
            verified_by=None,
            verified_on=None,
            is_sample=True
        )
        db.add(opp)
        db.flush()
        created_ids.append(opp.id)

    db.commit()

    return ImportOpportunitiesResponse(
        status="success",
        message=f"Successfully imported {len(created_ids)} opportunities as sample_unverified.",
        imported_count=len(created_ids),
        imported_ids=created_ids,
        verification_status="sample_unverified"
    )
