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
