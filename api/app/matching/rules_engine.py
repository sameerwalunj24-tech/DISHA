from datetime import datetime, date
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

MOBILITY_RANKS = {
    "LOCAL": 1,
    "DISTRICT": 2,
    "STATE_WIDE": 3
}

# Reference hackathon date (October 2026)
REFERENCE_DATE = date(2026, 10, 13)

class RuleResult(BaseModel):
    rule_name: str
    status: str  # "PASS", "FAIL", "UNKNOWN"
    reason_code: str
    detail: str

class EvaluationSummary(BaseModel):
    overall_eligibility: str  # "ELIGIBLE", "LIKELY", "NOT_ELIGIBLE"
    is_expired: bool
    passed_rules: List[RuleResult]
    failed_rules: List[RuleResult]
    unknown_rules: List[RuleResult]
    score_breakdown: Dict[str, int]
    total_score: int

def evaluate_opportunity(
    opp: Any,  # Opportunity model instance or dict
    student_profile: Dict[str, Any],
    sensitive_context: Optional[Dict[str, Any]] = None,
    eval_date: Optional[date] = None
) -> EvaluationSummary:
    """
    Pure deterministic rules engine.
    Evaluates: Grade, State, Gender, Income, Mobility, and Deadline.
    Returns PASS / FAIL / UNKNOWN with exact reason codes.
    """
    current_date = eval_date or REFERENCE_DATE
    sensitive_data = sensitive_context or {}

    passed_rules: List[RuleResult] = []
    failed_rules: List[RuleResult] = []
    unknown_rules: List[RuleResult] = []

    # Helper function to assign rule outcome
    def record_rule(rule_name: str, status: str, reason_code: str, detail: str):
        res = RuleResult(rule_name=rule_name, status=status, reason_code=reason_code, detail=detail)
        if status == "PASS":
            passed_rules.append(res)
        elif status == "FAIL":
            failed_rules.append(res)
        else:
            unknown_rules.append(res)

    # 1. Deadline Rule (Expired opportunities are disqualified)
    is_expired = False
    deadline_str = getattr(opp, "deadline", None) or (opp.get("deadline") if isinstance(opp, dict) else None)
    if deadline_str and str(deadline_str).strip():
        try:
            deadline_date = datetime.strptime(str(deadline_str).strip(), "%Y-%m-%d").date()
            if deadline_date < current_date:
                is_expired = True
                record_rule("DEADLINE", "FAIL", "DEADLINE_EXPIRED", f"Application closed on {deadline_str}")
            else:
                record_rule("DEADLINE", "PASS", "DEADLINE_ACTIVE", f"Open until {deadline_str}")
        except ValueError:
            record_rule("DEADLINE", "UNKNOWN", "DEADLINE_PARSE_ERROR", "Unparseable deadline date format")
    else:
        record_rule("DEADLINE", "PASS", "DEADLINE_ROLLING", "Rolling admissions (No fixed deadline)")

    # 2. Grade Rule
    min_grade = getattr(opp, "min_grade", 9) if not isinstance(opp, dict) else opp.get("min_grade", 9)
    max_grade = getattr(opp, "max_grade", 16) if not isinstance(opp, dict) else opp.get("max_grade", 16)
    student_grade = student_profile.get("grade") or student_profile.get("grade_level", 10)

    if min_grade <= student_grade <= max_grade:
        record_rule("GRADE", "PASS", "GRADE_IN_RANGE", f"Student grade {student_grade} is within required range {min_grade}–{max_grade}")
    else:
        record_rule("GRADE", "FAIL", "GRADE_OUT_OF_RANGE", f"Student grade {student_grade} is outside required range {min_grade}–{max_grade}")

    # 3. State Rule
    opp_states = getattr(opp, "states", "Maharashtra;All India") if not isinstance(opp, dict) else opp.get("states", "Maharashtra;All India")
    state_list = [s.strip().lower() for s in str(opp_states).split(";")]
    student_state = str(student_profile.get("state", "Maharashtra")).strip().lower()

    if "all india" in state_list or student_state in state_list:
        record_rule("STATE", "PASS", "STATE_ELIGIBLE", f"State '{student_profile.get('state')}' is covered by opportunity")
    else:
        record_rule("STATE", "FAIL", "STATE_RESTRICTED", f"Opportunity is only available in {opp_states}")

    # 4. Gender Rule
    opp_gender = str(getattr(opp, "gender", "ALL") if not isinstance(opp, dict) else opp.get("gender", "ALL")).upper()
    student_gender = str(student_profile.get("gender", "ALL")).upper()

    if opp_gender == "ALL":
        record_rule("GENDER", "PASS", "GENDER_ALL", "Open to all genders")
    elif student_gender in [opp_gender]:
        record_rule("GENDER", "PASS", "GENDER_MATCH", f"Matches required gender ({opp_gender})")
    elif student_gender == "ALL" or not student_gender:
        record_rule("GENDER", "UNKNOWN", "GENDER_NOT_PROVIDED", f"Opportunity is for {opp_gender}; student gender not specified")
    else:
        record_rule("GENDER", "FAIL", "GENDER_MISMATCH", f"Exclusive for {opp_gender}; student is {student_gender}")

    # 5. Income Rule (Sensitive: if unknown, marked UNKNOWN, never FAIL)
    income_max = getattr(opp, "income_max", None) if not isinstance(opp, dict) else opp.get("income_max")
    student_income = sensitive_data.get("family_income")

    if income_max is None or income_max == 0:
        record_rule("INCOME", "PASS", "INCOME_NO_LIMIT", "No family income limit required")
    elif student_income is not None:
        if student_income <= income_max:
            record_rule("INCOME", "PASS", "INCOME_WITHIN_LIMIT", f"Income ₹{student_income} is within max limit ₹{income_max}")
        else:
            record_rule("INCOME", "FAIL", "INCOME_EXCEEDS_LIMIT", f"Income ₹{student_income} exceeds ceiling ₹{income_max}")
    else:
        # Sensitive field omitted -> Marked UNKNOWN
        record_rule("INCOME", "UNKNOWN", "INCOME_UNVERIFIED", f"Requires family income below ₹{income_max}. Optional answer not provided.")

    # 6. Mobility Rule
    opp_mobility = str(getattr(opp, "mobility", "DISTRICT") if not isinstance(opp, dict) else opp.get("mobility", "DISTRICT")).upper()
    student_mobility = str(student_profile.get("mobility_preference") or student_profile.get("mobility", "DISTRICT")).upper()
    
    student_mob_rank = MOBILITY_RANKS.get(student_mobility, 2)
    opp_mob_rank = MOBILITY_RANKS.get(opp_mobility, 2)

    if student_mob_rank >= opp_mob_rank:
        record_rule("MOBILITY", "PASS", "MOBILITY_FEASIBLE", f"Student mobility ({student_mobility}) covers program requirement ({opp_mobility})")
    else:
        record_rule("MOBILITY", "FAIL", "MOBILITY_INCOMPATIBLE", f"Program requires traveling ({opp_mobility}), student prefers {student_mobility}")

    # Overall Eligibility Determination
    if failed_rules or is_expired:
        overall_status = "NOT_ELIGIBLE"
    elif unknown_rules:
        overall_status = "LIKELY"
    else:
        overall_status = "ELIGIBLE"

    # Deterministic Scoring & Ranking Breakdown
    score_breakdown: Dict[str, int] = {}
    
    # Base eligibility points
    if overall_status == "ELIGIBLE":
        score_breakdown["base_eligibility"] = 100
    elif overall_status == "LIKELY":
        score_breakdown["base_eligibility"] = 50
    else:
        score_breakdown["base_eligibility"] = -1000

    # Verification bonus: verified rows always rank above sample_unverified
    verif_status = str(getattr(opp, "verification_status", "sample_unverified") if not isinstance(opp, dict) else opp.get("verification_status", "sample_unverified")).lower()
    if verif_status == "verified":
        score_breakdown["verification_bonus"] = 30
    else:
        score_breakdown["verification_bonus"] = 0

    # Interest tag overlap
    opp_tags_raw = getattr(opp, "interest_tags", "") if not isinstance(opp, dict) else opp.get("interest_tags", "")
    opp_tags = [t.strip().lower() for t in str(opp_tags_raw).split(";") if t.strip()]
    student_interests = [str(i).lower() for i in (student_profile.get("primary_interests") or [])]
    student_skills = [str(s).lower() for s in (student_profile.get("practical_skills") or [])]
    student_aspirations = [str(a).lower() for a in (student_profile.get("career_aspirations") or [])]
    combined_learner_tokens = " ".join(student_interests + student_skills + student_aspirations)

    overlap_count = 0
    for tag in opp_tags:
        if tag in combined_learner_tokens:
            overlap_count += 1
    score_breakdown["interest_overlap"] = overlap_count * 10

    # Mobility fit bonus
    score_breakdown["mobility_fit"] = 15 if student_mob_rank >= opp_mob_rank else 0

    # Deadline proximity bonus (if active and closing within 45 days)
    deadline_bonus = 0
    if not is_expired and deadline_str:
        try:
            d_date = datetime.strptime(str(deadline_str).strip(), "%Y-%m-%d").date()
            days_left = (d_date - current_date).days
            if 0 <= days_left <= 45:
                deadline_bonus = 10
        except ValueError:
            pass
    score_breakdown["deadline_bonus"] = deadline_bonus

    total_score = sum(score_breakdown.values()) if not is_expired else -9999

    return EvaluationSummary(
        overall_eligibility=overall_status,
        is_expired=is_expired,
        passed_rules=passed_rules,
        failed_rules=failed_rules,
        unknown_rules=unknown_rules,
        score_breakdown=score_breakdown,
        total_score=total_score
    )
