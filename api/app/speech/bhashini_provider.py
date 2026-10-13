# -*- coding: utf-8 -*-
import os
import logging
from typing import Optional
from api.app.speech.base import BaseSpeechProvider

logger = logging.getLogger(__name__)

class BhashiniSpeechProvider(BaseSpeechProvider):
    """
    Bhashini (National Language Translation Mission - NLTM) STT/TTS Provider Stub.

    WHAT IS MISSING FOR PRODUCTION ACTIVATION:
    1. ULCA API Credentials:
       - BHASHINI_USER_ID: Organization / Developer User ID from bhashini.gov.in.
       - BHASHINI_API_KEY: ULCA API authorization key.
       - BHASHINI_PIPELINE_ID: Pipeline configuration ID for ASR/TTS.
    2. Endpoint Discovery:
       - Requires calling Bhashini's ULCA config discovery endpoint
         `https://meity-auth.ulca.ai/ulca/apis/v0/model/getModelsPipeline`
         to dynamically retrieve the inference service URL and token for Marathi (mr) / Hindi (hi).
    3. Payload Signing:
       - Bhashini ULCA requires two-stage request authentication with dynamic serviceId and compute call.

    When BHASHINI_API_KEY is not configured or in stub mode, this provider clearly informs callers.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("BHASHINI_API_KEY", "")
        self.user_id = os.getenv("BHASHINI_USER_ID", "")
        self.pipeline_id = os.getenv("BHASHINI_PIPELINE_ID", "")

    @property
    def provider_name(self) -> str:
        return "bhashini"

    async def speech_to_text(
        self,
        audio_bytes: bytes,
        language: str = "mr",
        mime_type: str = "audio/webm"
    ) -> str:
        raise NotImplementedError(
            "Bhashini STT is in stub mode. Missing: BHASHINI_USER_ID, BHASHINI_API_KEY, and "
            "BHASHINI_PIPELINE_ID from bhashini.gov.in ULCA portal. Use SPEECH_PROVIDER=mock or SPEECH_PROVIDER=sarvam."
        )

    async def text_to_speech(
        self,
        text: str,
        language: str = "mr"
    ) -> bytes:
        raise NotImplementedError(
            "Bhashini TTS is in stub mode. Missing: BHASHINI_USER_ID, BHASHINI_API_KEY, and "
            "BHASHINI_PIPELINE_ID from bhashini.gov.in ULCA portal. Use SPEECH_PROVIDER=mock or SPEECH_PROVIDER=sarvam."
        )
