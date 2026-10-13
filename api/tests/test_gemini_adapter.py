# -*- coding: utf-8 -*-
"""
test_gemini_adapter.py  -  Tests for Gemini LLM Adapter (Phase 8A)
"""
import pytest
import json
from unittest.mock import patch, MagicMock
from types import SimpleNamespace

from api.app.ai.gemini_adapter import GeminiLLMAdapter, CallQuotaManager
from api.app.matching.rules_engine import EvaluationSummary

class DummyOpp:
    def __init__(self):
        self.id = 1
        self.title = "Solar PV Technician Apprenticeship"
        self.provider = "National Apprenticeship Portal"
        self.benefits = "Stipend Rs 8,000/month"
        self.source_name = "National Apprenticeship Portal (MSDE)"
        self.source_url = "https://www.apprenticeshipindia.gov.in"
        self.last_verified = "2026-10-01"
        self.documents_needed = "Aadhaar;Marksheet"
        self.apply_steps = "Register online"

def test_daily_call_quota_manager():
    mgr = CallQuotaManager(daily_limit=3)
    assert mgr.can_call() is True
    mgr.record_call()
    mgr.record_call()
    assert mgr.can_call() is True
    mgr.record_call()
    assert mgr.can_call() is False
    assert mgr.get_count_today() == 3

def test_gemini_explanation_with_valid_mocked_response():
    adapter = GeminiLLMAdapter(api_key="test-key-123", timeout=5.0, daily_call_cap=50)
    opp = DummyOpp()
    evaluation = EvaluationSummary(
        overall_eligibility="ELIGIBLE",
        is_expired=False,
        needs_recheck=False,
        passed_rules=[],
        failed_rules=[],
        unknown_rules=[],
        score_breakdown={},
        total_score=100
    )
    profile = {"grade": 10, "state": "Maharashtra", "district": "Satara"}

    mock_llm_json = {
        "why_fits": "तुमची शैक्षणिक पात्रता आणि सौर ऊर्जेतील प्रात्यक्षिक आवड या प्रशिक्षणासाठी पूर्णपणे योग्य आहे.",
        "what_to_do": "आवश्यक कागदपत्रांसह अधिकृत पोर्टलवर त्वरित नोंदणी करा."
    }

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "candidates": [{
            "content": {
                "parts": [{"text": json.dumps(mock_llm_json)}]
            }
        }]
    }

    with patch("httpx.Client.post", return_value=mock_response):
        exp = adapter.generate_explanation(opp, evaluation, profile, lang="mr")

    assert exp["why_fits"] == mock_llm_json["why_fits"]
    assert exp["what_to_do"] == mock_llm_json["what_to_do"]
    assert exp["source_url"] == opp.source_url
    assert exp["source_name"] == opp.source_name
    assert exp["last_verified"] == opp.last_verified

def test_caching_of_identical_explanations():
    adapter = GeminiLLMAdapter(api_key="test-key-123", timeout=5.0, daily_call_cap=50)
    opp = DummyOpp()
    evaluation = EvaluationSummary(
        overall_eligibility="ELIGIBLE",
        is_expired=False,
        needs_recheck=False,
        passed_rules=[],
        failed_rules=[],
        unknown_rules=[],
        score_breakdown={},
        total_score=100
    )
    profile = {"grade": 10, "state": "Maharashtra", "district": "Satara"}

    mock_llm_json = {
        "why_fits": "AI generated explanation",
        "what_to_do": "AI action guide"
    }
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "candidates": [{
            "content": {
                "parts": [{"text": json.dumps(mock_llm_json)}]
            }
        }]
    }

    with patch("httpx.Client.post", return_value=mock_response) as mock_post:
        # First call hits mock
        exp1 = adapter.generate_explanation(opp, evaluation, profile, lang="mr")
        assert mock_post.call_count == 1

        # Second call with identical params MUST hit cache
        exp2 = adapter.generate_explanation(opp, evaluation, profile, lang="mr")
        assert mock_post.call_count == 1  # No second HTTP call!
        assert exp1 == exp2

def test_daily_call_cap_falls_back_to_template():
    adapter = GeminiLLMAdapter(api_key="test-key-123", timeout=5.0, daily_call_cap=1)
    opp = DummyOpp()
    evaluation = EvaluationSummary(
        overall_eligibility="ELIGIBLE",
        is_expired=False,
        needs_recheck=False,
        passed_rules=[],
        failed_rules=[],
        unknown_rules=[],
        score_breakdown={},
        total_score=100
    )
    profile1 = {"grade": 10, "state": "Maharashtra", "district": "Satara"}
    profile2 = {"grade": 12, "state": "Maharashtra", "district": "Pune"}

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "candidates": [{
            "content": {
                "parts": [{"text": json.dumps({"why_fits": "AI 1", "what_to_do": "Do 1"})}]
            }
        }]
    }

    with patch("httpx.Client.post", return_value=mock_response) as mock_post:
        # Call 1 consumes the single quota slot
        adapter.generate_explanation(opp, evaluation, profile1, lang="mr")
        assert mock_post.call_count == 1

        # Call 2 exceeds daily cap -> must gracefully fall back to template text without calling HTTP
        exp2 = adapter.generate_explanation(opp, evaluation, profile2, lang="mr")
        assert mock_post.call_count == 1
        # Fallback template text contains standard phrase
        assert "तुम्ही इयत्ता 12 मध्ये असून" in exp2["why_fits"]

def test_hallucinated_url_rejected_and_falls_back_to_template():
    adapter = GeminiLLMAdapter(api_key="test-key-123", timeout=5.0, daily_call_cap=50)
    opp = DummyOpp()
    evaluation = EvaluationSummary(
        overall_eligibility="ELIGIBLE",
        is_expired=False,
        needs_recheck=False,
        passed_rules=[],
        failed_rules=[],
        unknown_rules=[],
        score_breakdown={},
        total_score=100
    )
    profile = {"grade": 10, "state": "Maharashtra", "district": "Satara"}

    # Mock returns a hallucinated external link
    mock_hallucinated_json = {
        "why_fits": "Click on https://hallucinated-scam.com to apply!",
        "what_to_do": "Go to http://fake-portal.org now."
    }
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "candidates": [{
            "content": {
                "parts": [{"text": json.dumps(mock_hallucinated_json)}]
            }
        }]
    }

    with patch("httpx.Client.post", return_value=mock_response):
        exp = adapter.generate_explanation(opp, evaluation, profile, lang="mr")

    # The validator MUST discard the hallucination and fall back to the safe grounded template
    assert "https://hallucinated-scam.com" not in exp["why_fits"]
    assert "तुम्ही इयत्ता 10 मध्ये असून" in exp["why_fits"]
    assert exp["source_url"] == opp.source_url
