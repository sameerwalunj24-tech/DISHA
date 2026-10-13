# -*- coding: utf-8 -*-
import os
import json
import hashlib
import logging
from datetime import date
from typing import Dict, Any, Optional
import httpx

from api.app.ai.base import BaseLLMAdapter
from api.app.ai.schemas import StructuredProfile
from api.app.ai.mock_adapter import MockLLMAdapter

logger = logging.getLogger(__name__)

GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

PROFILE_SYSTEM_PROMPT = """You are an expert AI Career Profiler for rural Indian youth (Grades 9 to College Graduation).
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

class CallQuotaManager:
    """Tracks daily API call limits."""
    def __init__(self, daily_limit: int = 100):
        self.daily_limit = daily_limit
        self.calls_by_date: Dict[str, int] = {}

    def can_call(self) -> bool:
        today = date.today().isoformat()
        return self.calls_by_date.get(today, 0) < self.daily_limit

    def record_call(self):
        today = date.today().isoformat()
        self.calls_by_date[today] = self.calls_by_date.get(today, 0) + 1

    def get_count_today(self) -> int:
        return self.calls_by_date.get(date.today().isoformat(), 0)

    def reset_today(self):
        today = date.today().isoformat()
        self.calls_by_date[today] = 0

class GeminiLLMAdapter(BaseLLMAdapter):
    def __init__(
        self,
        api_key: str,
        timeout: float = 8.0,
        max_retries: int = 2,
        daily_call_cap: Optional[int] = None
    ):
        self.api_key = api_key
        self.timeout = timeout
        self.max_retries = max_retries
        limit = daily_call_cap or int(os.getenv("GEMINI_DAILY_CALL_CAP", "100"))
        self.quota_mgr = CallQuotaManager(daily_limit=limit)
        self.explanation_cache: Dict[str, Dict[str, str]] = {}
        self.fallback = MockLLMAdapter()

    @property
    def provider_name(self) -> str:
        return "gemini"

    def _hash_key(self, text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    async def extract_profile(self, answers: Dict[str, Any]) -> StructuredProfile:
        # Check quota
        if not self.quota_mgr.can_call():
            logger.info("Daily Gemini quota reached; using deterministic fallback profile.")
            return await self.fallback.extract_profile(answers)

        url = f"{GEMINI_API_ENDPOINT}?key={self.api_key}"
        # Privacy: never log raw student answers or personal identifiers
        user_content = f"Student Q&A responses:\n{json.dumps(answers, ensure_ascii=False, indent=2)}"

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": PROFILE_SYSTEM_PROMPT},
                        {"text": user_content}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 300,
                "responseMimeType": "application/json"
            }
        }

        for attempt in range(self.max_retries + 1):
            try:
                self.quota_mgr.record_call()
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        text_response = data["candidates"][0]["content"]["parts"][0]["text"]
                        parsed = json.loads(text_response)
                        return StructuredProfile(**parsed)
                    else:
                        logger.warning(f"Gemini API returned status {resp.status_code}")
            except Exception as e:
                logger.warning(f"Gemini attempt {attempt + 1} failed: {type(e).__name__}")

        # Fallback on failure
        return await self.fallback.extract_profile(answers)

    def generate_explanation(
        self,
        opp: Any,
        evaluation: Any,
        student_profile: Dict[str, Any],
        lang: str = "mr"
    ) -> Dict[str, str]:
        """
        Generates grounded, AI-written explanation with strict validation,
        SHA-256 caching, daily quota capping, and template fallback.
        """
        from api.app.matching.explainer import ExplanationValidator, generate_grounded_explanation

        # 1. Deterministic cache lookup
        opp_id = getattr(opp, "id", "")
        grade = student_profile.get("grade") or student_profile.get("grade_level", "")
        district = student_profile.get("district", "")
        eligibility = getattr(evaluation, "overall_eligibility", "ELIGIBLE")
        cache_key = self._hash_key(f"{opp_id}:{grade}:{district}:{lang}:{eligibility}")

        if cache_key in self.explanation_cache:
            return self.explanation_cache[cache_key]

        # 2. Check daily quota
        if not self.quota_mgr.can_call():
            logger.info("Daily Gemini quota reached; falling back to template explanation.")
            return generate_grounded_explanation(opp, evaluation, student_profile, lang)

        # 3. Construct grounded prompt
        lang_name = "Marathi" if lang == "mr" else "Hindi" if lang == "hi" else "English"
        opp_title = getattr(opp, "title", "")
        provider = getattr(opp, "provider", "")
        benefits = getattr(opp, "benefits", "")
        source_name = getattr(opp, "source_name", "Official Portal")
        source_url = getattr(opp, "source_url", "")
        last_verified = getattr(opp, "last_verified", "")

        system_instruction = (
            f"You are a rural career counselor in Maharashtra. "
            f"Write a concise, 2-sentence encouraging explanation in {lang_name} for why this opportunity fits the student, "
            f"and what they should do next.\n"
            f"STRICT RULES:\n"
            f"1. Return ONLY valid JSON with keys 'why_fits' and 'what_to_do'.\n"
            f"2. NEVER invent any website URL. Do NOT mention any external link.\n"
            f"3. Must cite official source: '{source_name}'.\n"
        )

        user_content = (
            f"Opportunity: {opp_title} by {provider}\n"
            f"Benefits: {benefits}\n"
            f"Eligibility Status: {eligibility}\n"
            f"Student: Grade {grade}, District {district}\n"
            f"Official Portal: {source_name} ({source_url})"
        )

        url = f"{GEMINI_API_ENDPOINT}?key={self.api_key}"
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": system_instruction},
                        {"text": user_content}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 256,
                "responseMimeType": "application/json"
            }
        }

        # 4. Attempt call with retries & timeout
        for attempt in range(self.max_retries + 1):
            try:
                self.quota_mgr.record_call()
                with httpx.Client(timeout=self.timeout) as client:
                    resp = client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])
                        text_resp = parts[0].get("text", "")
                        parsed = json.loads(text_resp)

                        explanation = {
                            "why_fits": parsed.get("why_fits", ""),
                            "what_to_do": parsed.get("what_to_do", ""),
                            "source_name": source_name,
                            "source_url": source_url,
                            "last_verified": last_verified
                        }

                        # Strict validator check
                        if ExplanationValidator.validate(explanation, opp):
                            self.explanation_cache[cache_key] = explanation
                            return explanation
                        else:
                            logger.warning("Gemini generated explanation failed strict URL/fact validation; discarding.")
                            break
                    else:
                        logger.warning(f"Gemini API returned status {resp.status_code}")
            except Exception as e:
                logger.warning(f"Gemini attempt {attempt + 1} failed: {type(e).__name__}")

        # 5. Graceful fallback to template text
        fallback_explanation = generate_grounded_explanation(opp, evaluation, student_profile, lang)
        self.explanation_cache[cache_key] = fallback_explanation
        return fallback_explanation
