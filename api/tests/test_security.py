import pytest
import os
from api.app.config import validate_secrets, DEFAULT_DEV_SECRET
from api.app.facilitator.auth import create_jwt_token, decode_jwt_token

def test_non_dev_mode_refuses_default_or_missing_secret():
    """Security check: The app MUST refuse to start in non-dev mode with default or missing secret."""
    # Production with default secret must raise RuntimeError
    with pytest.raises(RuntimeError, match="FATAL SECURITY CONFIGURATION"):
        validate_secrets("production", DEFAULT_DEV_SECRET)

    # Production with empty secret must raise RuntimeError
    with pytest.raises(RuntimeError, match="FATAL SECURITY CONFIGURATION"):
        validate_secrets("production", "")

    # Staging with default secret must raise RuntimeError
    with pytest.raises(RuntimeError, match="FATAL SECURITY CONFIGURATION"):
        validate_secrets("staging", DEFAULT_DEV_SECRET)

    # Production with a valid explicit secret passes
    validate_secrets("production", "super_secure_production_secret_key_998877")

    # Dev and test environments are allowed to use prototype default secret
    validate_secrets("development", DEFAULT_DEV_SECRET)
    validate_secrets("dev", DEFAULT_DEV_SECRET)
    validate_secrets("test", DEFAULT_DEV_SECRET)


def test_jwt_token_tampering_and_signature_verification():
    """Validates that HS256 JWT tokens cannot be tampered with."""
    payload = {"sub": "facilitator-123", "role": "TEACHER"}
    token = create_jwt_token(payload)

    # Valid token decodes properly
    decoded = decode_jwt_token(token)
    assert decoded["sub"] == "facilitator-123"

    # Tampered signature fails
    parts = token.split(".")
    tampered = f"{parts[0]}.{parts[1]}.tampered_sig"
    with pytest.raises(ValueError, match="Invalid signature"):
        decode_jwt_token(tampered)


def test_otp_request_rate_limiting():
    """Security check: Rapid consecutive OTP requests (>5/min) are blocked with HTTP 429."""
    from fastapi.testclient import TestClient
    from api.app.main import app
    import uuid

    client = TestClient(app)
    phone = f"99000{uuid.uuid4().hex[:5]}"

    # First 5 requests should succeed
    for _ in range(5):
        resp = client.post("/api/v1/facilitator/auth/request-otp", json={
            "phone_number": phone,
            "name": "Teacher Rate Limited"
        })
        assert resp.status_code == 200

    # 6th request within window must be rate-limited
    blocked_resp = client.post("/api/v1/facilitator/auth/request-otp", json={
        "phone_number": phone,
        "name": "Teacher Rate Limited"
    })
    assert blocked_resp.status_code == 429
    assert "RATE_LIMIT_EXCEEDED" in blocked_resp.json()["detail"]


def test_failed_login_attempts_rate_limiting():
    """Security check: Repeated wrong OTP attempts (>5) trigger temporary lockout with HTTP 429."""
    from fastapi.testclient import TestClient
    from api.app.main import app
    import uuid

    client = TestClient(app)
    phone = f"99111{uuid.uuid4().hex[:5]}"
    client.post("/api/v1/facilitator/auth/request-otp", json={"phone_number": phone, "name": "Test User"})

    # Submit 5 incorrect OTP attempts
    for _ in range(5):
        resp = client.post("/api/v1/facilitator/auth/verify-otp", json={
            "phone_number": phone,
            "otp": "000000"
        })
        assert resp.status_code in (400, 401)

    # 6th attempt must be rate-limited
    blocked_resp = client.post("/api/v1/facilitator/auth/verify-otp", json={
        "phone_number": phone,
        "otp": "000000"
    })
    assert blocked_resp.status_code == 429
    assert "RATE_LIMIT_EXCEEDED" in blocked_resp.json()["detail"]


def test_cors_configured_origins_has_no_wildcard():
    """Security check: CORS does not default to wildcard '*' in production/default settings."""
    from api.app.config import settings
    assert "*" not in settings.CORS_ORIGINS
    assert "http://localhost:5173" in settings.CORS_ORIGINS

