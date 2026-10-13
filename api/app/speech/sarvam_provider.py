# -*- coding: utf-8 -*-
import os
import base64
import logging
from typing import Optional
import httpx

from api.app.speech.base import BaseSpeechProvider

logger = logging.getLogger(__name__)

SARVAM_STT_ENDPOINT = "https://api.sarvam.ai/speech-to-text"
SARVAM_TTS_ENDPOINT = "https://api.sarvam.ai/text-to-speech"

LANG_MAP = {
    "mr": "mr-IN",
    "hi": "hi-IN",
    "en": "en-IN"
}

class SarvamSpeechProvider(BaseSpeechProvider):
    """
    Official Sarvam AI speech adapter for Indian vernacular languages.
    Uses saaras:v4 for Speech-to-Text and bulbul:v4-flash for Text-to-Speech.
    API keys come strictly from environment variables.
    """

    def __init__(self, api_key: Optional[str] = None, timeout: float = 10.0):
        self.api_key = api_key or os.getenv("SARVAM_API_KEY", "")
        self.timeout = timeout
        if not self.api_key:
            logger.warning("SarvamSpeechProvider initialized without SARVAM_API_KEY.")

    @property
    def provider_name(self) -> str:
        return "sarvam"

    async def speech_to_text(
        self,
        audio_bytes: bytes,
        language: str = "mr",
        mime_type: str = "audio/webm"
    ) -> str:
        if not self.api_key:
            raise ValueError("SARVAM_API_KEY is not set in environment.")

        lang_code = LANG_MAP.get(language, "mr-IN")
        filename = "audio.webm" if "webm" in mime_type else "audio.wav"

        files = {
            "file": (filename, audio_bytes, mime_type)
        }
        data = {
            "model": "saaras:v4",
            "language_code": lang_code
        }
        headers = {
            "api-subscription-key": self.api_key
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                SARVAM_STT_ENDPOINT,
                headers=headers,
                data=data,
                files=files
            )
            if resp.status_code != 200:
                raise RuntimeError(f"Sarvam STT failed with status {resp.status_code}: {resp.text[:200]}")

            payload = resp.json()
            return payload.get("transcript", "")

    async def text_to_speech(
        self,
        text: str,
        language: str = "mr"
    ) -> bytes:
        if not self.api_key:
            raise ValueError("SARVAM_API_KEY is not set in environment.")

        lang_code = LANG_MAP.get(language, "mr-IN")
        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "text": text,
            "target_language_code": lang_code,
            "model": "bulbul:v4-flash"
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                SARVAM_TTS_ENDPOINT,
                headers=headers,
                json=payload
            )
            if resp.status_code != 200:
                raise RuntimeError(f"Sarvam TTS failed with status {resp.status_code}: {resp.text[:200]}")

            data = resp.json()
            audios = data.get("audios", [])
            if not audios:
                raise RuntimeError("Sarvam TTS returned empty audio list.")

            return base64.b64decode(audios[0])
