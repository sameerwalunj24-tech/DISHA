from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from api.app.database import get_db
from api.app.models import Student, ConsentReceipt
from api.app.schemas import ConsentVerifyResponse

router = APIRouter(prefix="/api/v1/consent", tags=["DPDP Consent Verification"])

class ConsentRecordRequest(BaseModel):
    receipt_hash: str
    consent_version: Optional[str] = "DPDP_V1.0"

@router.get("/verify/{receipt_hash}", response_model=ConsentVerifyResponse)
def verify_consent_receipt(receipt_hash: str, db: Session = Depends(get_db)):
    """
    Verifies a cryptographic consent receipt under DPDP Act 2023.
    Guarantees strictly zero personal demographic leakage:
    Returns only validity, receipt_hash, consent_version, and recorded_at timestamp.
    """
    clean_hash = receipt_hash.strip().lower()
    if not clean_hash or len(clean_hash) < 16 or len(clean_hash) > 128:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="INVALID_RECEIPT_HASH: Receipt hash must be a valid cryptographic digest string."
        )

    # 1. Check dedicated ConsentReceipt registry
    receipt = db.query(ConsentReceipt).filter(ConsentReceipt.receipt_hash == clean_hash).first()
    if receipt:
        ts = receipt.recorded_at.isoformat() if hasattr(receipt.recorded_at, "isoformat") else str(receipt.recorded_at)
        return ConsentVerifyResponse(
            valid=True,
            receipt_hash=receipt.receipt_hash,
            consent_version=receipt.consent_version or "DPDP_V1.0",
            recorded_at=ts
        )

    # 2. Check Student table consent_receipt_hash
    student = db.query(Student).filter(Student.consent_receipt_hash == clean_hash).first()
    if student:
        ts = student.created_at.isoformat() if hasattr(student.created_at, "isoformat") else str(student.created_at)
        return ConsentVerifyResponse(
            valid=True,
            receipt_hash=student.consent_receipt_hash,
            consent_version=student.consent_version or "DPDP_V1.0",
            recorded_at=ts
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="CONSENT_RECEIPT_NOT_FOUND: No consent receipt recorded for this cryptographic hash."
    )

@router.post("/record", response_model=ConsentVerifyResponse)
def record_consent_receipt(req: ConsentRecordRequest, db: Session = Depends(get_db)):
    """
    Directly records a cryptographic consent receipt without requiring a full student profile.
    Complies with DPDP Act 2023 data minimisation.
    """
    clean_hash = req.receipt_hash.strip().lower()
    if not clean_hash or len(clean_hash) < 16 or len(clean_hash) > 128:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="INVALID_RECEIPT_HASH: Receipt hash must be a valid cryptographic digest string."
        )

    receipt = db.query(ConsentReceipt).filter(ConsentReceipt.receipt_hash == clean_hash).first()
    if not receipt:
        receipt = ConsentReceipt(
            receipt_hash=clean_hash,
            consent_version=req.consent_version or "DPDP_V1.0"
        )
        db.add(receipt)
        db.commit()
        db.refresh(receipt)

    ts = receipt.recorded_at.isoformat() if hasattr(receipt.recorded_at, "isoformat") else str(receipt.recorded_at)
    return ConsentVerifyResponse(
        valid=True,
        receipt_hash=receipt.receipt_hash,
        consent_version=receipt.consent_version or "DPDP_V1.0",
        recorded_at=ts
    )
