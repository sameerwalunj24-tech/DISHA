"""
sms/__init__.py - SMS Provider factory and registry
===================================================
Selects the active SMS provider based on the SMS_PROVIDER environment variable.
Defaults to MockSMSProvider.
"""

from typing import Optional
from api.app.config import settings
from api.app.sms.base import BaseSMSProvider
from api.app.sms.mock_provider import MockSMSProvider
from api.app.sms.real_provider import RealSMSProvider

_current_provider: Optional[BaseSMSProvider] = None


def get_sms_provider() -> BaseSMSProvider:
    """Returns the singleton instance of the configured SMS provider."""
    global _current_provider
    if _current_provider is not None:
        return _current_provider

    provider_name = (settings.SMS_PROVIDER or "mock").strip().lower()
    if provider_name in ("real", "msg91", "twilio", "fast2sms"):
        _current_provider = RealSMSProvider()
    else:
        _current_provider = MockSMSProvider()

    return _current_provider


def set_sms_provider(provider: BaseSMSProvider) -> None:
    """Overrides the SMS provider (primarily for unit tests)."""
    global _current_provider
    _current_provider = provider


def reset_sms_provider() -> None:
    """Resets the singleton SMS provider to trigger re-instantiation."""
    global _current_provider
    _current_provider = None
