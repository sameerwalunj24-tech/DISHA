"""
mock_provider.py - In-memory mock SMS provider
==============================================
Default provider for development and test suites.
Never contacts external SMS gateways. Tracks sent OTP messages in-memory.
"""

from typing import List, Dict, Any, Optional
from api.app.sms.base import BaseSMSProvider


class MockSMSProvider(BaseSMSProvider):
    """Mock SMS provider that records dispatched messages in-memory."""

    def __init__(self):
        self.sent_messages: List[Dict[str, Any]] = []

    def send_otp(self, phone_number: str, otp: str, facilitator_name: Optional[str] = None) -> bool:
        message_text = (
            f"दिशा (Disha) पडताळणी कोड: {otp}. पुढील 15 मिनिटांसाठी वैध आहे. "
            f"/ Your Disha OTP is {otp}. Valid for 15 mins."
        )
        record = {
            "phone_number": phone_number,
            "otp": otp,
            "facilitator_name": facilitator_name,
            "message": message_text,
            "provider": "mock"
        }
        self.sent_messages.append(record)
        return True

    def get_provider_name(self) -> str:
        return "mock"

    def get_last_otp(self, phone_number: str) -> Optional[str]:
        """Convenience method for test assertions."""
        for msg in reversed(self.sent_messages):
            if msg["phone_number"] == phone_number:
                return msg["otp"]
        return None

    def clear(self) -> None:
        """Clears recorded messages."""
        self.sent_messages.clear()
