import csv
import sys
from pathlib import Path

# Add project root to sys.path so imports work
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from api.app.database import engine, Base, SessionLocal
from api.app.models import Opportunity

def seed_opportunities(csv_path: Path = None):
    if csv_path is None:
        csv_path = ROOT_DIR / "data" / "opportunities.csv"
        
    if not csv_path.exists():
        raise FileNotFoundError(f"Opportunities CSV file not found at: {csv_path}")

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    inserted_count = 0
    updated_count = 0

    try:
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                opp_id = int(row["id"]) if row.get("id") else None
                max_income = float(row["max_family_income"]) if row.get("max_family_income") and row["max_family_income"].strip() else None
                is_sample_val = str(row.get("is_sample", "true")).lower() == "true"

                existing = db.query(Opportunity).filter(Opportunity.id == opp_id).first() if opp_id else None
                if existing:
                    existing.title = row["title"]
                    existing.category = row["category"]
                    existing.provider = row["provider"]
                    existing.min_grade = int(row["min_grade"])
                    existing.max_grade = int(row["max_grade"])
                    existing.state = row["state"]
                    existing.gender_eligibility = row["gender_eligibility"]
                    existing.max_family_income = max_income
                    existing.benefits = row["benefits"]
                    existing.source_url = row["source_url"]
                    existing.last_verified = row["last_verified"]
                    existing.is_sample = is_sample_val
                    updated_count += 1
                else:
                    opp = Opportunity(
                        id=opp_id,
                        title=row["title"],
                        category=row["category"],
                        provider=row["provider"],
                        min_grade=int(row["min_grade"]),
                        max_grade=int(row["max_grade"]),
                        state=row["state"],
                        gender_eligibility=row["gender_eligibility"],
                        max_family_income=max_income,
                        benefits=row["benefits"],
                        source_url=row["source_url"],
                        last_verified=row["last_verified"],
                        is_sample=is_sample_val,
                    )
                    db.add(opp)
                    inserted_count += 1

            db.commit()
            print(f"[SEED SUCCESS] Ingested opportunities: {inserted_count} new, {updated_count} updated.")
            return inserted_count + updated_count

    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR] Failed to seed opportunities: {e}", file=sys.stderr)
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_opportunities()
