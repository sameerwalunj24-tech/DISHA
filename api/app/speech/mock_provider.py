# -*- coding: utf-8 -*-
from typing import Optional
from api.app.speech.base import BaseSpeechProvider

class MockSpeechProvider(BaseSpeechProvider):
    """
    Offline deterministic speech provider for development and testing.
    Requires no network connection or cloud API keys.
    """

    @property
    def provider_name(self) -> str:
        return "mock"

    async def speech_to_text(
        self,
        audio_bytes: bytes,
        language: str = "mr",
        mime_type: str = "audio/webm"
    ) -> str:
        # Default mock transcriptions based on language
        if language == "mr":
            return "मला सौर ऊर्जा, इलेक्ट्रिक मोटर आणि शेती अवजारे दुरुस्ती शिकायचे आहे."
        elif language == "hi":
            return "मुझे सौर ऊर्जा, इलेक्ट्रिक मोटर और कृषि उपकरण मरम्मत सीखनी है।"
        else:
            return "I want to learn solar technology, electrical motors, and agricultural equipment."

    async def text_to_speech(
        self,
        text: str,
        language: str = "mr"
    ) -> bytes:
        # Return lightweight mock WAV header bytes (44-byte standard RIFF header)
        riff_header = (
            b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00"
            b"\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
        )
        return riff_header
