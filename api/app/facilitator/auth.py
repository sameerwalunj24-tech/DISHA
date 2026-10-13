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

from api.app.config import settings
from api.app.database import get_db
from api.app.models import Facilitator

security = HTTPBearer(auto_error=False)

def get_jwt_secret() -> str:
    return settings.JWT_SECRET

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

    sig = hmac.new(get_jwt_secret().encode(), msg, hashlib.sha256).digest()
    sig_str = base64.urlsafe_b64encode(sig).decode().rstrip("=")
    return f"{h_bytes}.{p_bytes}.{sig_str}"


def decode_jwt_token(token: str) -> dict:
    """Decodes and validates HS256 JWT token."""
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT token structure")

    h_bytes, p_bytes, sig_str = parts
    msg = f"{h_bytes}.{p_bytes}".encode()
    expected_sig = hmac.new(get_jwt_secret().encode(), msg, hashlib.sha256).digest()
    expected_sig_str = base64.urlsafe_b64encode(expected_sig).decode().rstrip("=")

    if not hmac.compare_digest(sig_str, expected_sig_str):
        raise ValueError("Invalid signature")

    padded_p = p_bytes + "=" * ((4 - len(p_bytes) % 4) % 4)
    data = json.loads(base64.urlsafe_b64decode(padded_p).decode())

    # Check expiration
    if "exp" in data and datetime.now(timezone.utc).timestamp() > data["exp"]:
        raise ValueError("Token has expired")

    return data


# In-memory prototype OTP cache: phone -> {"otp": str, "expires_at": datetime}
_OTP_CACHE: Dict[str, Dict[str, any]] = {}

# In-memory rate limiting tracking: phone -> list of timestamp datetimes
_OTP_REQUEST_LOG: Dict[str, list] = {}
_LOGIN_FAILURE_LOG: Dict[str, list] = {}

def check_otp_rate_limit(phone_number: str, max_requests: int = 5, window_seconds: int = 60) -> None:
    """Enforces sliding-window rate limit on OTP generation requests."""
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=window_seconds)
    timestamps = [t for t in _OTP_REQUEST_LOG.get(phone_number, []) if t > cutoff]
    if len(timestamps) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"RATE_LIMIT_EXCEEDED: Maximum {max_requests} OTP requests per minute reached. Please wait before retrying."
        )
    timestamps.append(now)
    _OTP_REQUEST_LOG[phone_number] = timestamps

def check_login_attempt_rate_limit(phone_number: str, max_failures: int = 5, window_seconds: int = 300) -> None:
    """Enforces sliding-window rate limit on failed login attempts."""
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=window_seconds)
    timestamps = [t for t in _LOGIN_FAILURE_LOG.get(phone_number, []) if t > cutoff]
    if len(timestamps) >= max_failures:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"RATE_LIMIT_EXCEEDED: Too many failed login attempts for this number. Temporarily blocked for {window_seconds // 60} minutes."
        )
    _LOGIN_FAILURE_LOG[phone_number] = timestamps

def record_login_failure(phone_number: str) -> None:
    now = datetime.now(timezone.utc)
    failures = _LOGIN_FAILURE_LOG.get(phone_number, [])
    failures.append(now)
    _LOGIN_FAILURE_LOG[phone_number] = failures

def clear_login_failures(phone_number: str) -> None:
    _LOGIN_FAILURE_LOG.pop(phone_number, None)


def generate_otp(phone_number: str) -> str:
    """Generates a 6-digit OTP after checking rate limit."""
    check_otp_rate_limit(phone_number)
    otp = str(random.randint(100000, 999999))
    _OTP_CACHE[phone_number] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15)
    }
    return otp


def verify_otp(phone_number: str, otp_entered: str) -> bool:
    """Verifies entered OTP against cache or default code '123456' with failed attempt rate limiting."""
    check_login_attempt_rate_limit(phone_number)

    # Allow 123456 for frictionless test/demo environments
    if otp_entered.strip() == "123456":
        clear_login_failures(phone_number)
        return True

    entry = _OTP_CACHE.get(phone_number)
    if not entry:
        record_login_failure(phone_number)
        return False

    if datetime.now(timezone.utc) > entry["expires_at"]:
        _OTP_CACHE.pop(phone_number, None)
        record_login_failure(phone_number)
        return False

    if entry["otp"] == otp_entered.strip():
        _OTP_CACHE.pop(phone_number, None)
        clear_login_failures(phone_number)
        return True

    record_login_failure(phone_number)
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
