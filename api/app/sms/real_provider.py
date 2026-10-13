"""
real_provider.py - Real transactional SMS provider adapter
==========================================================
Adapter for connecting to real telecom / DLT SMS gateways (e.g. MSG91, Twilio, Fast2SMS).
Keys and endpoints are strictly loaded from environment variables (.env).
Raises a descriptive configuration error if required credentials are missing.
"""

import json
import urllib.request
import urllib.error
from typing import Optional
from api.app.config import settings
from api.app.sms.base import BaseSMSProvider


class RealSMSProvider(BaseSMSProvider):
    """
    Production SMS provider delivering real OTPs via HTTPS API.
    Reads credentials strictly from environment variables:
    - SMS_API_KEY
    - SMS_SENDER_ID (DLT Header)
    - SMS_GATEWAY_URL
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        sender_id: Optional[str] = None,
        gateway_url: Optional[str] = None
    ):
        self.api_key = api_key or settings.SMS_API_KEY
        self.sender_id = sender_id or settings.SMS_SENDER_ID
        self.gateway_url = gateway_url or settings.SMS_GATEWAY_URL

    def send_otp(self, phone_number: str, otp: str, facilitator_name: Optional[str] = None) -> bool:
        if not self.api_key or not self.gateway_url:
            raise RuntimeError(
                "SMS_CONFIG_MISSING: Real SMS provider requires SMS_API_KEY and SMS_GATEWAY_URL "
                "to be configured in .env."
            )

        # Standard transactional SMS template payload
        payload_data = {
            "sender": self.sender_id,
            "recipient": phone_number,
            "template_id": "DISHA_OTP_VERIFY",
            "message": f"Your Disha verification OTP is {otp}. Valid for 15 minutes. Do not share with anyone.",
            "otp": otp
        }
        body = json.dumps(payload_data).encode("utf-8")

        req = urllib.request.Request(
            self.gateway_url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
                "User-Agent": "DishaSMSAdapter/1.0"
            },
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return 200 <= resp.status < 300
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"SMS_GATEWAY_HTTP_ERROR: Status {e.code} - {e.reason}")
        except urllib.error.URLError as e:
            raise RuntimeError(f"SMS_GATEWAY_CONNECTION_ERROR: {str(e.reason)}")

    def get_provider_name(self) -> str:
        return "real"
