"""
base.py - Base interface for SMS OTP providers
==============================================
Defines the contract for transactional SMS dispatch in Disha.
Implementations:
- MockSMSProvider (local development, testing, and offline demos)
- RealSMSProvider (production DLT-compliant SMS gateway)
"""

from abc import ABC, abstractmethod
from typing import Optional


class BaseSMSProvider(ABC):
    """Abstract base class for SMS OTP providers."""

    @abstractmethod
    def send_otp(self, phone_number: str, otp: str, facilitator_name: Optional[str] = None) -> bool:
        """
        Dispatches a 6-digit OTP to the recipient's phone number.
        Returns True if the message was accepted/sent successfully.
        """
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Returns the provider name (e.g. 'mock', 'real')."""
        pass
