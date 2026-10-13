# -*- coding: utf-8 -*-
from abc import ABC, abstractmethod

class BaseSpeechProvider(ABC):
    """
    Standard interface for Speech-to-Text (STT) and Text-to-Speech (TTS)
    supporting Marathi ('mr'), Hindi ('hi'), and English ('en').
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    async def speech_to_text(
        self,
        audio_bytes: bytes,
        language: str = "mr",
        mime_type: str = "audio/webm"
    ) -> str:
        """Transcribes incoming audio bytes into text."""
        pass

    @abstractmethod
    async def text_to_speech(
        self,
        text: str,
        language: str = "mr"
    ) -> bytes:
        """Synthesizes text into audio bytes."""
        pass
