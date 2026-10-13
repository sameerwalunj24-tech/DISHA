import csv
import sys
import logging
from pathlib import Path

# Add project root to sys.path so imports work
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from api.app.database import engine, Base, SessionLocal
from api.app.models import Opportunity

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = [
    "id", "title", "category", "provider", "min_grade", "max_grade",
    "states", "gender", "benefits", "source_name", "source_url", "last_verified"
]

VALID_CATEGORIES = {"apprenticeship", "scholarship", "vocational", "scheme", "job"}
VALID_GENDERS = {"ALL", "FEMALE", "MALE"}

def validate_row(row: dict, row_num: int) -> tuple[bool, str]:
    """Validates CSV row fields, returning (is_valid, error_message)."""
    for col in REQUIRED_COLUMNS:
        if col not in row or not str(row[col]).strip():
            return False, f"Missing required column '{col}'"
    
    # Category validation
    cat = str(row["category"]).strip().lower()
    if cat not in VALID_CATEGORIES:
        return False, f"Invalid category '{cat}'. Must be one of: {sorted(list(VALID_CATEGORIES))}"

    # Gender validation
    gen = str(row["gender"]).strip().upper()
    if gen not in VALID_GENDERS:
        return False, f"Invalid gender '{gen}'. Must be ALL, FEMALE, or MALE"

    # URL validation
    url = str(row["source_url"]).strip().lower()
    if not (url.startswith("http://") or url.startswith("https://")):
        return False, f"source_url '{row['source_url']}' must start with http:// or https://"

    try:
        min_g = int(row["min_grade"])
        max_g = int(row["max_grade"])
        if min_g > max_g:
            return False, f"min_grade ({min_g}) > max_grade ({max_g})"
        if min_g < 1 or max_g > 20:
            return False, f"Grade range ({min_g}-{max_g}) out of bounds (1-20)"
    except ValueError:
        return False, "min_grade or max_grade is not a valid integer"

    # Age bounds validation
    if row.get("min_age") and str(row["min_age"]).strip():
        try:
            min_a = int(row["min_age"])
            if row.get("max_age") and str(row["max_age"]).strip():
                max_a = int(row["max_age"])
                if min_a > max_a:
                    return False, f"min_age ({min_a}) > max_age ({max_a})"
        except ValueError:
            return False, "min_age or max_age is not a valid integer"

    if row.get("income_max") and str(row["income_max"]).strip():
        try:
            float(row["income_max"])
        except ValueError:
            return False, f"income_max '{row['income_max']}' is not a valid number"

    # Verification status rule
    v_status = str(row.get("verification_status", "sample_unverified")).strip()
    v_by = str(row.get("verified_by", "")).strip()
    v_on = str(row.get("verified_on", "")).strip()
    if v_status == "verified":
        if not v_by or not v_on:
            return False, "Row marked 'verified' must have both verified_by (name) and verified_on (date)"

    return True, ""

def seed_opportunities(csv_path: Path = None):
    if csv_path is None:
        csv_path = ROOT_DIR / "data" / "opportunities.csv"
        
    if not csv_path.exists():
        raise FileNotFoundError(f"Opportunities CSV file not found at: {csv_path}")

    # Ensure schema matches latest model definition
    Opportunity.__table__.drop(bind=engine, checkfirst=True)
    Opportunity.__table__.create(bind=engine, checkfirst=True)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    inserted_count = 0
    updated_count = 0
    bad_rows_count = 0

    try:
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row_num, row in enumerate(reader, start=2):
                is_valid, err_msg = validate_row(row, row_num)
                if not is_valid:
                    logger.warning(f"[CSV VALIDATION WARNING] Row {row_num} skipped: {err_msg}")
                    bad_rows_count += 1
                    continue

                opp_id = int(row["id"])
                income_max_val = float(row["income_max"]) if row.get("income_max") and str(row["income_max"]).strip() else None
                min_age_val = int(row["min_age"]) if row.get("min_age") and str(row["min_age"]).strip() else None
                max_age_val = int(row["max_age"]) if row.get("max_age") and str(row["max_age"]).strip() else None
                verif_status = row.get("verification_status", "sample_unverified").strip()
                v_by = row.get("verified_by", "").strip() or None
                v_on = row.get("verified_on", "").strip() or None
                is_sample = verif_status != "verified"

                existing = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
                if existing:
                    existing.title = row["title"]
                    existing.category = row["category"]
                    existing.provider = row["provider"]
                    existing.min_grade = int(row["min_grade"])
                    existing.max_grade = int(row["max_grade"])
                    existing.min_age = min_age_val
                    existing.max_age = max_age_val
                    existing.states = row.get("states", "Maharashtra;All India")
                    existing.income_max = income_max_val
                    existing.gender = row.get("gender", "ALL")
                    existing.interest_tags = row.get("interest_tags", "")
                    existing.mobility = row.get("mobility", "DISTRICT")
                    existing.deadline = row.get("deadline") if row.get("deadline") and str(row["deadline"]).strip() else None
                    existing.documents_needed = row.get("documents_needed", "")
                    existing.apply_steps = row.get("apply_steps", "")
                    existing.benefits = row["benefits"]
                    existing.source_name = row.get("source_name", row["provider"])
                    existing.source_url = row["source_url"]
                    existing.last_verified = row["last_verified"]
                    existing.verification_status = verif_status
                    existing.verified_by = v_by
                    existing.verified_on = v_on
                    existing.is_sample = is_sample
                    updated_count += 1
                else:
                    opp = Opportunity(
                        id=opp_id,
                        title=row["title"],
                        category=row["category"],
                        provider=row["provider"],
                        min_grade=int(row["min_grade"]),
                        max_grade=int(row["max_grade"]),
                        min_age=min_age_val,
                        max_age=max_age_val,
                        states=row.get("states", "Maharashtra;All India"),
                        income_max=income_max_val,
                        gender=row.get("gender", "ALL"),
                        interest_tags=row.get("interest_tags", ""),
                        mobility=row.get("mobility", "DISTRICT"),
                        deadline=row.get("deadline") if row.get("deadline") and str(row["deadline"]).strip() else None,
                        documents_needed=row.get("documents_needed", ""),
                        apply_steps=row.get("apply_steps", ""),
                        benefits=row["benefits"],
                        source_name=row.get("source_name", row["provider"]),
                        source_url=row["source_url"],
                        last_verified=row["last_verified"],
                        verification_status=verif_status,
                        verified_by=v_by,
                        verified_on=v_on,
                        is_sample=is_sample,
                    )
                    db.add(opp)
                    inserted_count += 1

            db.commit()
            print(f"[SEED SUCCESS] Opportunities ingested: {inserted_count} new, {updated_count} updated, {bad_rows_count} bad rows skipped.")
            return inserted_count + updated_count

    except Exception as e:
        db.rollback()
        logger.error(f"[SEED ERROR] Seeding failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_opportunities()
