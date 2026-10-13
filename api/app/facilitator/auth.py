"""
auth.py - Prototype-grade authentication for Disha Facilitators
===============================================================
- Phone + OTP authentication (dev/demo OTP displayed on screen).
- Lightweight standard HMAC-SHA256 JWT tokens without external dependencies.
- FastAPI dependency for route authorization.
"""

import json
import hmac
import hashlib
import base64
import random
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from api.app.database import get_db
from api.app.models import Facilitator

JWT_SECRET = "disha_prototype_facilitator_secret_key_2026"
security = HTTPBearer(auto_error=False)

# In-memory prototype OTP cache: phone -> {"otp": str, "expires_at": datetime}
_OTP_CACHE: Dict[str, Dict[str, any]] = {}


def create_jwt_token(payload: dict, expires_in_hours: int = 72) -> str:
    """Creates an HS256 JWT token using Python standard library."""
    now = datetime.now(timezone.utc)
    exp = now + timedelta(hours=expires_in_hours)
    body = {**payload, "exp": int(exp.timestamp()), "iat": int(now.timestamp())}

    header = {"alg": "HS256", "typ": "JWT"}
    h_bytes = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    p_bytes = base64.urlsafe_b64encode(json.dumps(body).encode()).decode().rstrip("=")
    msg = f"{h_bytes}.{p_bytes}".encode()

    sig = hmac.new(JWT_SECRET.encode(), msg, hashlib.sha256).digest()
    sig_str = base64.urlsafe_b64encode(sig).decode().rstrip("=")
    return f"{h_bytes}.{p_bytes}.{sig_str}"


def decode_jwt_token(token: str) -> dict:
    """Decodes and validates HS256 JWT token."""
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT token structure")

    h_bytes, p_bytes, sig_str = parts
    msg = f"{h_bytes}.{p_bytes}".encode()
    expected_sig = hmac.new(JWT_SECRET.encode(), msg, hashlib.sha256).digest()
    expected_sig_str = base64.urlsafe_b64encode(expected_sig).decode().rstrip("=")

    if not hmac.compare_digest(sig_str, expected_sig_str):
        raise ValueError("Invalid signature")

    padded_p = p_bytes + "=" * ((4 - len(p_bytes) % 4) % 4)
    data = json.loads(base64.urlsafe_b64decode(padded_p).decode())

    # Check expiration
    if "exp" in data and datetime.now(timezone.utc).timestamp() > data["exp"]:
        raise ValueError("Token has expired")

    return data


def generate_otp(phone_number: str) -> str:
    """Generates a 6-digit OTP and stores it in cache."""
    # Deterministic fallback or random 6 digits
    otp = str(random.randint(100000, 999999))
    _OTP_CACHE[phone_number] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15)
    }
    return otp


def verify_otp(phone_number: str, otp_entered: str) -> bool:
    """Verifies entered OTP against cache or default prototype code '123456'."""
    # Always allow 123456 for easy offline / local testing
    if otp_entered.strip() == "123456":
        return True

    entry = _OTP_CACHE.get(phone_number)
    if not entry:
        return False

    if datetime.now(timezone.utc) > entry["expires_at"]:
        _OTP_CACHE.pop(phone_number, None)
        return False

    if entry["otp"] == otp_entered.strip():
        _OTP_CACHE.pop(phone_number, None)
        return True

    return False


def get_current_facilitator(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Facilitator:
    """FastAPI dependency: extracts facilitator from Bearer JWT token."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="FACILITATOR_AUTH_REQUIRED: Bearer token is missing."
        )

    try:
        payload = decode_jwt_token(credentials.credentials)
        facilitator_id = payload.get("sub")
        if not facilitator_id:
            raise ValueError("Token payload missing subject")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"INVALID_TOKEN: {str(e)}"
        )

    facilitator = db.query(Facilitator).filter(Facilitator.id == facilitator_id).first()
    if not facilitator:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="FACILITATOR_NOT_FOUND: Account associated with token does not exist."
        )

    return facilitator
