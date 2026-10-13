# -*- coding: utf-8 -*-
"""
admin_verify.py  -  Human Reviewer Opportunity Verification CLI
================================================================
Admin-only tool for a human reviewer to record verification details
after manually inspecting an official source portal.

RULES:
  - NEVER called automatically.
  - Requires human reviewer's full name.
  - Validates date format (YYYY-MM-DD) and ensures date is not in the future.
  - Updates data/opportunities.csv and syncs with database if running.

Usage:
  python api/admin_verify.py --id 1 --verifier "Pooja Deshmukh"
  python api/admin_verify.py --list
"""

import sys
import io
import csv
import argparse
from datetime import datetime, date
from pathlib import Path
from typing import Optional

# Force UTF-8 on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_CSV_PATH = ROOT_DIR / "data" / "opportunities.csv"

def is_valid_date(date_str: str) -> bool:
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
        return d <= date.today()
    except ValueError:
        return False

def verify_opportunity_record(
    opp_id: int,
    verifier_name: str,
    verification_date: Optional[str] = None,
    csv_path: Optional[Path] = None,
    update_db: bool = True
) -> dict:
    """
    Applies human verification to a specific opportunity row.
    Returns the updated row dict or raises ValueError.
    """
    if not verifier_name or not verifier_name.strip():
        raise ValueError("Human verifier name cannot be empty.")

    v_date = verification_date or date.today().isoformat()
    if not is_valid_date(v_date):
        raise ValueError(f"Invalid verification date '{v_date}'. Must be YYYY-MM-DD and not in the future.")

    path = csv_path or DEFAULT_CSV_PATH
    if not path.exists():
        raise FileNotFoundError(f"Opportunities CSV not found at {path}")

    # Read CSV
    with open(path, mode="r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames or [])
        rows = list(reader)

    # Ensure columns exist
    for col in ["verification_status", "verified_by", "verified_on", "last_verified"]:
        if col not in fieldnames:
            fieldnames.append(col)

    target_row = None
    for row in rows:
        try:
            if int(row["id"]) == int(opp_id):
                target_row = row
                break
        except (ValueError, KeyError):
            continue

    if not target_row:
        raise ValueError(f"Opportunity ID {opp_id} not found in CSV.")

    # Update row
    target_row["verification_status"] = "verified"
    target_row["verified_by"] = verifier_name.strip()
    target_row["verified_on"] = v_date
    target_row["last_verified"] = v_date

    # Write back to CSV
    with open(path, mode="w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    # Optionally update DB if database exists
    if update_db:
        try:
            from api.app.database import SessionLocal
            from api.app.models import Opportunity
            db = SessionLocal()
            try:
                db_opp = db.query(Opportunity).filter(Opportunity.id == int(opp_id)).first()
                if db_opp:
                    db_opp.verification_status = "verified"
                    db_opp.verified_by = verifier_name.strip()
                    db_opp.verified_on = v_date
                    db_opp.last_verified = v_date
                    db_opp.is_sample = False
                    db.commit()
            finally:
                db.close()
        except Exception:
            # DB might not be initialized or SQLite locked in tests; ignore
            pass

    return target_row

def list_opportunities_status(csv_path: Optional[Path] = None):
    path = csv_path or DEFAULT_CSV_PATH
    if not path.exists():
        print(f"File not found: {path}")
        return

    with open(path, mode="r", encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))

    print(f"\n{'ID':<4} | {'Status':<18} | {'Verified By':<20} | {'Verified On':<12} | {'Age (Days)':<10} | {'Title'}")
    print("-" * 95)
    today = date.today()
    for r in rows:
        vid = r.get("id", "?")
        status = r.get("verification_status", "sample_unverified")
        vby = r.get("verified_by", "") or "-"
        von = r.get("verified_on", "") or "-"
        age_str = "-"
        if von != "-":
            try:
                d = datetime.strptime(von, "%Y-%m-%d").date()
                days = (today - d).days
                age_str = f"{days}d"
                if days > 90:
                    age_str += " [RECHECK]"
            except ValueError:
                pass
        title = r.get("title", "")[:32]
        print(f"{vid:<4} | {status:<18} | {vby:<20} | {von:<12} | {age_str:<10} | {title}")
    print()

def main():
    parser = argparse.ArgumentParser(description="Disha Human Verifier CLI")
    parser.add_argument("--id", type=int, help="Opportunity ID to mark as verified")
    parser.add_argument("--verifier", type=str, help="Full name of human reviewer")
    parser.add_argument("--date", type=str, default=None, help="Verification date (YYYY-MM-DD), defaults to today")
    parser.add_argument("--list", action="store_true", help="List all opportunities with verification status")
    parser.add_argument("--csv-path", type=str, default=None, help="Custom path to CSV file")
    args = parser.parse_args()

    custom_path = Path(args.csv_path) if args.csv_path else None

    if args.list:
        list_opportunities_status(custom_path)
        return

    if args.id is None or not args.verifier:
        parser.print_help()
        print("\nERROR: Both --id and --verifier are required to record verification.")
        sys.exit(1)

    try:
        updated = verify_opportunity_record(
            opp_id=args.id,
            verifier_name=args.verifier,
            verification_date=args.date,
            csv_path=custom_path
        )
        print(f"SUCCESS: Opportunity [{args.id}] '{updated['title']}' marked as VERIFIED.")
        print(f"  Verified By : {updated['verified_by']}")
        print(f"  Verified On : {updated['verified_on']}")
        print(f"  Status      : {updated['verification_status']}")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
