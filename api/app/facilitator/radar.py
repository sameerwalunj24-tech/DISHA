"""
radar.py - Deterministic, Explainable Talent Radar Engine
=========================================================
Rule-based, positive, and supportive identification of student momentum.
Never ranks students against one another or labels anyone as low potential.
"""

import json
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from api.app.models import Student, Pathway


class RadarFlag:
    def __init__(self, code: str, title: Dict[str, str], color: str, reason: Dict[str, str]):
        self.code = code
        self.title = title
        self.color = color
        self.reason = reason

    def to_dict(self, language: str = "mr") -> Dict[str, Any]:
        lang_key = language if language in ("mr", "hi", "en") else "mr"
        return {
            "code": self.code,
            "title": self.title.get(lang_key, self.title.get("en", "")),
            "color": self.color,
            "reason": self.reason.get(lang_key, self.reason.get("en", ""))
        }


def evaluate_talent_radar(
    student: Student,
    pathway: Optional[Pathway] = None,
    matches: Optional[List[Any]] = None,
    language: str = "mr"
) -> List[Dict[str, Any]]:
    """
    Evaluates supportive flags for a student:
    - RISING: consistent pathway micro-step completion
    - STRONG_FIT: has high-match opportunity closing soon
    - NEEDS_SUPPORT: inactive > 14 days or needs initial push
    """
    flags: List[RadarFlag] = []
    now = datetime.now(timezone.utc)

    # 1. Parse Pathway completed steps
    completed_step_count = 0
    pathway_updated_recently = False

    if pathway and pathway.micro_steps_json:
        try:
            p_data = json.loads(pathway.micro_steps_json)
            completed_steps = p_data.get("completed_steps", [])
            completed_step_count = len(completed_steps)
        except Exception:
            completed_step_count = 0

        p_updated = pathway.updated_at
        if p_updated:
            if p_updated.tzinfo is None:
                p_updated = p_updated.replace(tzinfo=timezone.utc)
            pathway_updated_recently = (now - p_updated).days <= 7

    # 2. Inspect Opportunity Matches
    eligible_count = 0
    top_match_title = ""
    top_has_deadline_soon = False

    if matches:
        for m in matches:
            # Handle dictionary or Pydantic MatchResult
            opp = m.get("opportunity") if isinstance(m, dict) else getattr(m, "opportunity", None)
            elig = m.get("overall_eligibility") if isinstance(m, dict) else getattr(m, "overall_eligibility", "")

            if elig in ("ELIGIBLE", "LIKELY"):
                eligible_count += 1
                if not top_match_title and opp:
                    top_match_title = opp.get("title") if isinstance(opp, dict) else getattr(opp, "title", "")
                    deadline_str = opp.get("deadline") if isinstance(opp, dict) else getattr(opp, "deadline", None)
                    if deadline_str:
                        try:
                            dl = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
                            if (dl - now).days <= 90:
                                top_has_deadline_soon = True
                        except Exception:
                            pass

    # Flag A: Rising
    if completed_step_count >= 2 or (completed_step_count >= 1 and pathway_updated_recently):
        flags.append(RadarFlag(
            code="RISING",
            title={
                "mr": "प्रगतीपथावर (Rising)",
                "hi": "प्रगतिशील (Rising)",
                "en": "Rising"
            },
            color="emerald",
            reason={
                "mr": f"नियमित प्रात्यक्षिक पायऱ्या पूर्ण करत आहे ({completed_step_count} पायऱ्या पूर्ण).",
                "hi": f"नियमित व्यावहारिक कदम पूरे कर रहे हैं ({completed_step_count} कदम पूर्ण)।",
                "en": f"Consistent pathway progress with {completed_step_count} verified micro-steps completed."
            }
        ))

    # Flag B: Strong Fit
    if eligible_count > 0 and (top_has_deadline_soon or completed_step_count >= 1):
        display_opp = top_match_title or "उपलब्ध शिष्यवृत्ती / प्रशिक्षण"
        flags.append(RadarFlag(
            code="STRONG_FIT",
            title={
                "mr": "उत्कृष्ट जुळणी (Strong Fit)",
                "hi": "मजबूत अवसर (Strong Fit)",
                "en": "Strong Fit"
            },
            color="blue",
            reason={
                "mr": f"कौशल्याशी सुसंगत संधी उपलब्ध: '{display_opp}'.",
                "hi": f"कौशल से मेल खाता अवसर उपलब्ध: '{display_opp}'।",
                "en": f"Strong fit for closing opportunity: '{display_opp}' based on verified skills."
            }
        ))

    # Flag C: Needs Support
    student_created = student.created_at
    if student_created and student_created.tzinfo is None:
        student_created = student_created.replace(tzinfo=timezone.utc)
    days_since_created = (now - student_created).days if student_created else 0

    if completed_step_count == 0 or days_since_created > 14 or eligible_count == 0:
        flags.append(RadarFlag(
            code="NEEDS_SUPPORT",
            title={
                "mr": "मार्गदर्शनाची गरज (Needs Support)",
                "hi": "मार्गदर्शन आवश्यक (Needs Support)",
                "en": "Needs Support"
            },
            color="amber",
            reason={
                "mr": "पहिली व्यावहारिक पायरी निवडण्यासाठी किंवा करिअर दिशा ठरवण्यासाठी शिक्षकांच्या मदतीची आवश्यकता.",
                "hi": "पहला व्यावहारिक कदम चुनने या दिशा तय करने के लिए शिक्षक के सहयोग की ज़रूरत।",
                "en": "Would benefit from facilitator check-in to start practical steps or clarify interests."
            }
        ))

    return [f.to_dict(language) for f in flags]
