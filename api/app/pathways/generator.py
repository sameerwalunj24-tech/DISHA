"""
generator.py - Personal Pathway Generator
=========================================
Generates a structured, grounded 30-day personal pathway:
1. Selects template deterministically from student profile interests and aspirations.
2. Injects student's top matched opportunities with deadlines as actionable milestones.
3. Adds an alternative non-STEM or vocational option.
4. Enforces the strict validator: NO INVENTED URLs allowed.
"""

from pathlib import Path
import copy
import yaml
from typing import Dict, Any, List, Optional

from api.app.pathways.validator import validate_pathway_urls, validate_multilingual_strings

PATHWAYS_DIR = Path(__file__).resolve().parents[3] / "data" / "pathways"


def load_templates() -> Dict[str, Dict[str, Any]]:
    """Loads all 5 YAML templates from data/pathways/."""
    templates = {}
    if not PATHWAYS_DIR.exists():
        return templates

    for yaml_path in PATHWAYS_DIR.glob("*.yaml"):
        with open(yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            if data and "id" in data:
                templates[data["id"]] = data
    return templates


def select_template_id(profile: Dict[str, Any]) -> str:
    """
    Deterministically selects the career cluster template based on student's
    interests, practical skills, aspirations, and subject keywords.
    """
    text_corpus = " ".join([
        str(profile.get("interests", "")),
        str(profile.get("skills", "")),
        str(profile.get("aspirations", "")),
        str(profile.get("favorite_subjects", "")),
        str(profile.get("things_enjoyed", "")),
        str(profile.get("career_goal", ""))
    ]).lower()

    # Priority matching rules
    # 1. Solar & Electrical
    if any(k in text_corpus for k in [
        "solar", "सोलर", "electric", "विद्युत", "वीज", "wiring", "वायरिंग",
        "motor", "मोटर", "pump", "पंप", "repair", "दुरुस्ती", "mechanic"
    ]):
        return "electrical_solar"

    # 2. Agriculture & Dairy
    if any(k in text_corpus for k in [
        "farm", "शेती", "agriculture", "कृषी", "dairy", "दूध", "दुग्ध",
        "पशुपालन", "livestock", "soil", "माती", "गाय", "गोठा", "crop", "पिके"
    ]):
        return "agriculture_dairy"

    # 3. Healthcare & Paramedic
    if any(k in text_corpus for k in [
        "health", "आरोग्य", "nurse", "परिचारिका", "hospital", "रुग्णालय",
        "clinic", "दवाखाना", "first-aid", "प्रथमोपचार", "asha", "आशा",
        "paramedic", "पॅरामेडिक", "biology", "जीवशास्त्र", "medicine", "औषध"
    ]):
        return "healthcare"

    # 4. IT & Digital Banking
    if any(k in text_corpus for k in [
        "computer", "संगणक", "digital", "डिजिटल", "bank", "बँक", "बँकिंग",
        "software", "coding", "कोडिंग", "typing", "टायपिंग", "mobile", "मोबाईल", "online"
    ]):
        return "it_digital"

    # 5. Fallback to General Exploration
    return "general_explore"


def generate_student_pathway(
    student_profile: Dict[str, Any],
    top_matches: Optional[List[Dict[str, Any]]] = None,
    language: str = "mr"
) -> Dict[str, Any]:
    """
    Constructs the student's personal pathway:
    - Chooses the matched career template
    - Injects real matched opportunity milestones with official deadlines
    - Attaches vocational alternative
    - Validates that zero invented URLs exist
    """
    templates = load_templates()
    if not templates:
        raise RuntimeError("No pathway templates found in data/pathways/")

    template_id = select_template_id(student_profile)
    base_template = templates.get(template_id) or templates.get("general_explore")
    if not base_template:
        base_template = list(templates.values())[0]

    # Deepcopy so template modifications don't leak across requests
    pathway = copy.deepcopy(base_template)
    pathway["template_id"] = template_id

    # Inject student-specific metadata
    student_name = student_profile.get("name", "विद्यार्थी")
    pathway["student_name"] = student_name
    pathway["selected_language"] = language

    # Inject matched opportunities as milestone targets
    if top_matches:
        opp_milestones = []
        for match in top_matches[:3]:
            opp = match.get("opportunity", match)
            if not opp:
                continue

            deadline_str = opp.get("deadline") or "चालू / सतत (Rolling)"
            benefits_str = opp.get("benefits", "")
            title_str = opp.get("title", "")
            source_url = opp.get("source_url")
            is_verified = (opp.get("verification_status") == "verified")

            benefit_prefix_mr = "सरकारी लाभ" if is_verified else "संभाव्य लाभ (Sample - unverified)"
            benefit_prefix_hi = "सरकारी लाभ" if is_verified else "संभावित लाभ (Sample - unverified)"
            benefit_prefix_en = "Govt benefit" if is_verified else "Estimated benefit (Sample - unverified)"

            milestone = {
                "id": f"opp_milestone_{opp.get('id', 'ext')}",
                "opportunity_id": opp.get("id"),
                "is_opportunity_milestone": True,
                "deadline": opp.get("deadline"),
                "title": {
                    "mr": f"लक्ष्य अर्ज: {title_str}",
                    "hi": f"लक्ष्य आवेदन: {title_str}",
                    "en": f"Target Application: {title_str}"
                },
                "description": {
                    "mr": f"{benefit_prefix_mr}: {benefits_str}. अंतिम मुदत: {deadline_str}.",
                    "hi": f"{benefit_prefix_hi}: {benefits_str}। अंतिम तिथि: {deadline_str}।",
                    "en": f"{benefit_prefix_en}: {benefits_str}. Cutoff deadline: {deadline_str}."
                },
                "practical_action": {
                    "mr": f"कागदपत्रे: {opp.get('documents_needed', 'आधार कार्ड')} गोळा करून ठेवा.",
                    "hi: ": f"दस्तावेज़: {opp.get('documents_needed', 'आधार कार्ड')} एकत्र रखें।",
                    "en": f"Gather documents: {opp.get('documents_needed', 'Aadhaar Card')}."
                },
                "resource_url": source_url,
                "needs_verification": not is_verified,
                "icon": "Target"
            }
            # Fix key if space slipped
            if "hi: " in milestone["practical_action"]:
                milestone["practical_action"]["hi"] = milestone["practical_action"].pop("hi: ")

            opp_milestones.append(milestone)

        # Append opportunity milestones to 3-6 months stage
        stages = pathway.setdefault("stages", {})
        m3_stage = stages.setdefault("months_3_to_6", {})
        existing_milestones = m3_stage.setdefault("milestones", [])
        m3_stage["milestones"] = opp_milestones + existing_milestones

    # Validate against invented URLs
    url_errors = validate_pathway_urls(pathway)
    if url_errors:
        raise ValueError(f"Pathway validation failed with URL errors: {url_errors}")

    return pathway
