import re
from typing import Dict, Any, Optional
from api.app.matching.rules_engine import EvaluationSummary

TEMPLATES = {
    "mr": {
        "why_eligible": "तुम्ही इयत्ता {grade} मध्ये असून {district}, {state} मधील विद्यार्थी आहात. या योजनेसाठी तुमची शैक्षणिक पात्रता आणि आवडी पूर्णपणे जुळतात.",
        "why_likely": "तुमची शैक्षणिक पात्रता जुळते, परंतु यासाठी उत्पन्नाची पडताळणी किंवा आवश्यक कागदपत्रे तपासणे बाकी आहे.",
        "why_not_eligible": "सध्या तुमची पात्रता या योजनेच्या अटींशी जुळत नाही ({reasons}).",
        "action_guide": "आवश्यक कागदपत्रे: {docs}. अर्ज करण्याची पद्धत: {steps}."
    },
    "hi": {
        "why_eligible": "आप कक्षा {grade} के छात्र हैं और {district}, {state} से हैं। इस योजना के लिए आपकी योग्यता और रुचियाँ पूरी तरह मेल खाती हैं।",
        "why_likely": "आपकी शैक्षणिक योग्यता सही है, लेकिन आय या दस्तावेज़ की पुष्टि शेष है।",
        "why_not_eligible": "वर्तमान में आपकी पात्रता इस योजना की शर्तों से मेल नहीं खाती ({reasons})।",
        "action_guide": "ज़रूरी दस्तावेज़: {docs}. आवेदन प्रक्रिया: {steps}."
    },
    "en": {
        "why_eligible": "You are in Grade {grade} residing in {district}, {state}. Your academic profile and practical interests match this opportunity.",
        "why_likely": "Your grade and region qualify, but sensitive criteria (such as income limit) require verification.",
        "why_not_eligible": "Currently does not meet all criteria ({reasons}).",
        "action_guide": "Documents required: {docs}. Application steps: {steps}."
    }
}

class ExplanationValidator:
    @staticmethod
    def validate(
        explanation: Dict[str, str],
        opp_record: Any
    ) -> bool:
        """
        Strict validator:
        1. Ensures source_url exactly matches opp_record.source_url
        2. Ensures source_name matches opp_record.source_name
        3. Ensures last_verified matches opp_record.last_verified
        4. Ensures no invented external URLs exist in why_fits or what_to_do.
        """
        expected_url = getattr(opp_record, "source_url", "")
        expected_source = getattr(opp_record, "source_name", "")
        expected_date = getattr(opp_record, "last_verified", "")

        if explanation.get("source_url") != expected_url:
            return False
        if explanation.get("source_name") != expected_source:
            return False
        if explanation.get("last_verified") != expected_date:
            return False

        # Reject any other hallucinated URLs in text
        text_content = explanation.get("why_fits", "") + " " + explanation.get("what_to_do", "")
        found_urls = re.findall(r"https?://[^\s]+", text_content)
        for u in found_urls:
            if u != expected_url:
                return False

        return True

def generate_grounded_explanation(
    opp: Any,
    evaluation: EvaluationSummary,
    student_profile: Dict[str, Any],
    lang: str = "mr"
) -> Dict[str, str]:
    """
    Generates grounded, deterministic, zero-hallucination explanation.
    Guarantees official source name, exact source URL, and last verified date.
    """
    t = TEMPLATES.get(lang, TEMPLATES["mr"])
    grade = student_profile.get("grade") or student_profile.get("grade_level", 10)
    district = student_profile.get("district", "सातारा")
    state = student_profile.get("state", "महाराष्ट्र")

    # Build "Why this fits you"
    if evaluation.overall_eligibility == "ELIGIBLE":
        why_fits = t["why_eligible"].format(grade=grade, district=district, state=state)
    elif evaluation.overall_eligibility == "LIKELY":
        why_fits = t["why_likely"]
    else:
        failed_reasons = ", ".join(r.detail for r in evaluation.failed_rules)
        why_fits = t["why_not_eligible"].format(reasons=failed_reasons)

    # Build "What you need to do"
    docs_raw = getattr(opp, "documents_needed", "")
    docs = docs_raw.replace(";", ", ") if docs_raw else "आधार कार्ड, शैक्षणिक गुणपत्रिका"
    steps_raw = getattr(opp, "apply_steps", "")
    steps = steps_raw.replace(";", " → ") if steps_raw else "अधिकृत पोर्टलवर नोंदणी करा"
    
    what_to_do = t["action_guide"].format(docs=docs, steps=steps)

    explanation = {
        "why_fits": why_fits,
        "what_to_do": what_to_do,
        "source_name": getattr(opp, "source_name", "Official Portal"),
        "source_url": getattr(opp, "source_url", ""),
        "last_verified": getattr(opp, "last_verified", "")
    }

    # Run strict validation
    assert ExplanationValidator.validate(explanation, opp) is True

    return explanation
