# -*- coding: utf-8 -*-
import os
from api.app.speech.base import BaseSpeechProvider
from api.app.speech.mock_provider import MockSpeechProvider
from api.app.speech.sarvam_provider import SarvamSpeechProvider
from api.app.speech.bhashini_provider import BhashiniSpeechProvider

_speech_provider_instance = None

def get_speech_provider() -> BaseSpeechProvider:
    """
    Returns configured speech provider chosen by environment variables.
    Defaults to MockSpeechProvider.
    """
    global _speech_provider_instance
    if _speech_provider_instance is not None:
        return _speech_provider_instance

    provider_type = os.getenv("SPEECH_PROVIDER", "mock").strip().lower()

    if provider_type == "sarvam":
        return SarvamSpeechProvider()
    elif provider_type == "bhashini":
        return BhashiniSpeechProvider()
    return MockSpeechProvider()

def set_speech_provider(provider: BaseSpeechProvider) -> None:
    global _speech_provider_instance
    _speech_provider_instance = provider

def reset_speech_provider() -> None:
    global _speech_provider_instance
    _speech_provider_instance = None

__all__ = [
    "BaseSpeechProvider",
    "MockSpeechProvider",
    "SarvamSpeechProvider",
    "BhashiniSpeechProvider",
    "get_speech_provider",
    "set_speech_provider",
    "reset_speech_provider"
]

