import os
from api.app.ai.base import BaseLLMAdapter
from api.app.ai.mock_adapter import MockLLMAdapter
from api.app.ai.gemini_adapter import GeminiLLMAdapter
from api.app.ai.schemas import StructuredProfile

def get_llm_adapter() -> BaseLLMAdapter:
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    provider = os.getenv("LLM_PROVIDER", "mock").lower()

    if gemini_key and provider == "gemini":
        return GeminiLLMAdapter(api_key=gemini_key)
    return MockLLMAdapter()

__all__ = ["BaseLLMAdapter", "MockLLMAdapter", "GeminiLLMAdapter", "StructuredProfile", "get_llm_adapter"]
