"""
validator.py - Grounded Pathway Validator
==========================================
Strict constraints:
1. NO INVENTED URLS: Every resource_url must either be None (with needs_verification=True)
   or exist in data/opportunities.csv.
2. MULTILINGUAL COMPLETENESS: Every title, description, and practical_action
   must have translations in mr (Marathi), hi (Hindi), and en (English).
"""

from pathlib import Path
from typing import Dict, Any, Set, List
import pandas as pd

OPPORTUNITIES_CSV_PATH = Path(__file__).resolve().parents[3] / "data" / "opportunities.csv"


def get_allowed_urls() -> Set[str]:
    """Extract set of official source URLs directly from opportunities.csv."""
    if not OPPORTUNITIES_CSV_PATH.exists():
        return set()
    try:
        df = pd.read_csv(OPPORTUNITIES_CSV_PATH)
        urls = set(df["source_url"].dropna().str.strip().tolist())
        return urls
    except Exception:
        return set()


def validate_pathway_urls(pathway: Dict[str, Any]) -> List[str]:
    """
    Validates that no step, milestone, or alternative invents a URL.
    Returns list of validation error messages.
    """
    allowed_urls = get_allowed_urls()
    errors: List[str] = []

    def check_item(item: Dict[str, Any], context: str):
        url = item.get("resource_url")
        needs_verif = item.get("needs_verification")

        if url is not None and url != "":
            url_str = str(url).strip()
            if url_str not in allowed_urls:
                errors.append(
                    f"INVENTED_URL_ERROR in {context}: '{url_str}' is not in opportunities.csv. "
                    f"Set resource_url to null with needs_verification=true until human-verified."
                )
        else:
            # When URL is null, needs_verification must be true
            if needs_verif is False:
                errors.append(
                    f"UNVERIFIED_STATUS_ERROR in {context}: resource_url is null but needs_verification is False."
                )

    stages = pathway.get("stages", {})
    # Check 30 days steps
    next_30 = stages.get("next_30_days", {})
    for w_idx, week in enumerate(next_30.get("weeks", [])):
        for s_idx, step in enumerate(week.get("steps", [])):
            check_item(step, f"30_days.week_{w_idx+1}.step_{s_idx+1}")

    # Check 3-6 months milestones
    for m_idx, m in enumerate(stages.get("months_3_to_6", {}).get("milestones", [])):
        check_item(m, f"months_3_to_6.milestone_{m_idx+1}")

    # Check 1-2 years milestones
    for y_idx, m in enumerate(stages.get("years_1_to_2", {}).get("milestones", [])):
        check_item(m, f"years_1_to_2.milestone_{y_idx+1}")

    # Check vocational alternative
    alt = pathway.get("vocational_alternative")
    if alt:
        check_item(alt, "vocational_alternative")

    return errors


def validate_multilingual_strings(pathway: Dict[str, Any]) -> List[str]:
    """
    Ensures every user-facing title, description, and practical_action
    contains non-empty Marathi (mr), Hindi (hi), and English (en) text.
    """
    required_langs = {"mr", "hi", "en"}
    errors: List[str] = []

    def check_i18n_field(field_obj: Any, field_name: str, context: str):
        if not isinstance(field_obj, dict):
            errors.append(f"MISSING_I18N_DICT in {context}.{field_name}: expected dict, got {type(field_obj)}")
            return
        for lang in required_langs:
            val = field_obj.get(lang)
            if not val or not str(val).strip():
                errors.append(f"MISSING_TRANSLATION in {context}.{field_name} for '{lang}'")

    # Pathway title and description
    check_i18n_field(pathway.get("title"), "title", "pathway")
    if pathway.get("description"):
        check_i18n_field(pathway.get("description"), "description", "pathway")

    stages = pathway.get("stages", {})
    next_30 = stages.get("next_30_days", {})
    check_i18n_field(next_30.get("title"), "title", "stages.next_30_days")

    for w_idx, week in enumerate(next_30.get("weeks", [])):
        check_i18n_field(week.get("title"), "title", f"week_{w_idx+1}")
        for s_idx, step in enumerate(week.get("steps", [])):
            ctx = f"week_{w_idx+1}.step_{s_idx+1}"
            check_i18n_field(step.get("title"), "title", ctx)
            check_i18n_field(step.get("description"), "description", ctx)
            if step.get("practical_action"):
                check_i18n_field(step.get("practical_action"), "practical_action", ctx)

    for m_idx, m in enumerate(stages.get("months_3_to_6", {}).get("milestones", [])):
        ctx = f"months_3_to_6.milestone_{m_idx+1}"
        check_i18n_field(m.get("title"), "title", ctx)
        check_i18n_field(m.get("description"), "description", ctx)

    for y_idx, m in enumerate(stages.get("years_1_to_2", {}).get("milestones", [])):
        ctx = f"years_1_to_2.milestone_{y_idx+1}"
        check_i18n_field(m.get("title"), "title", ctx)
        check_i18n_field(m.get("description"), "description", ctx)

    alt = pathway.get("vocational_alternative")
    if alt:
        check_i18n_field(alt.get("title"), "title", "vocational_alternative")
        check_i18n_field(alt.get("description"), "description", "vocational_alternative")

    return errors
