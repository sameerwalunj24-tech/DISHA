import os
import json
import logging
from typing import Dict, Any
import httpx

from api.app.ai.base import BaseLLMAdapter
from api.app.ai.schemas import StructuredProfile
from api.app.ai.mock_adapter import MockLLMAdapter

logger = logging.getLogger(__name__)

GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

SYSTEM_PROMPT = """You are an expert AI Career Profiler for rural Indian youth (Grades 9 to College Graduation).
Analyze the student's conversation answers (which may be in Marathi, Hindi, or English) and convert them into a structured JSON profile.

STRICT SCHEMA TO OUTPUT (JSON ONLY, NO MARKDOWN, NO COMMENTARY):
{
  "grade_level": <integer between 9 and 16>,
  "state": "<State name, e.g. Maharashtra>",
  "district": "<District name, e.g. Satara, Pune, etc.>",
  "primary_interests": ["<interest 1>", "<interest 2>"],
  "practical_skills": ["<skill 1>", "<skill 2>"],
  "career_aspirations": ["<aspiration 1>", "<aspiration 2>"],
  "is_vocational_recommended": <boolean, prioritize true for hands-on/vocational pathways>,
  "mobility_preference": "<LOCAL or DISTRICT or STATE_WIDE>",
  "family_livelihood_context": "<brief occupation summary>",
  "confidence_score": <float between 0.0 and 1.0>
}
"""

class GeminiLLMAdapter(BaseLLMAdapter):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.fallback = MockLLMAdapter()

    @property
    def provider_name(self) -> str:
        return "gemini"

    async def extract_profile(self, answers: Dict[str, Any]) -> StructuredProfile:
        url = f"{GEMINI_API_ENDPOINT}?key={self.api_key}"
        user_content = f"Student Q&A responses:\n{json.dumps(answers, ensure_ascii=False, indent=2)}"

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": SYSTEM_PROMPT},
                        {"text": user_content}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json"
            }
        }

        # Attempt up to 2 times (retry once on error)
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        text_response = data["candidates"][0]["content"]["parts"][0]["text"]
                        parsed = json.loads(text_response)
                        return StructuredProfile(**parsed)
                    else:
                        logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.warning(f"Gemini attempt {attempt + 1} failed: {e}")

        # Fall back to deterministic keyword rules
        logger.info("Falling back to deterministic MockLLMAdapter")
        return await self.fallback.extract_profile(answers)
