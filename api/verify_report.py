# -*- coding: utf-8 -*-
"""
verify_report.py  -  Human verification helper
================================================
Run:  python api/verify_report.py

Prints every opportunity row with its title, source_url and eligibility
rules so a human verifier can check them one by one, then update
verified_by and verified_on in data/opportunities.csv.

Output format
-------------
[ID]  TITLE
      category | deadline | states
      SOURCE   : source_url
      ELIGIBILITY: min_grade-max_grade | gender | income_max | mobility
      STATUS   : sample_unverified  (verified_by=, verified_on=)
      ----------------------------------------------------------------
"""

import csv
import sys
import io
from pathlib import Path

# Force UTF-8 output on Windows so Indic characters print correctly
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "opportunities.csv"

# ANSI colours for terminals that support them
RESET  = "\033[0m"
BOLD   = "\033[1m"
YELLOW = "\033[33m"
CYAN   = "\033[36m"
GREEN  = "\033[32m"
RED    = "\033[31m"

def format_income(val: str) -> str:
    if not val or val.strip() == "":
        return "no limit"
    try:
        return f"Rs {int(float(val)):,}"
    except ValueError:
        return val

def main():
    if not CSV_PATH.exists():
        print(f"ERROR: CSV not found at {CSV_PATH}")
        return

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"\n{BOLD}Disha – Opportunity Verification Report{RESET}")
    print(f"CSV: {CSV_PATH}")
    print(f"Total rows: {len(rows)}\n")
    print("=" * 70)

    unverified_count = 0
    for row in rows:
        vid  = row.get("id", "?")
        title = row.get("title", "(no title)")
        cat   = row.get("category", "?")
        dl    = row.get("deadline", "") or "rolling"
        states = row.get("states", "?")
        url   = row.get("source_url", "(no url)")
        src   = row.get("source_name", "?")
        mg    = row.get("min_grade", "?")
        xg    = row.get("max_grade", "?")
        gen   = row.get("gender", "ALL")
        inc   = format_income(row.get("income_max", ""))
        mob   = row.get("mobility", "?")
        vstatus = row.get("verification_status", "sample_unverified")
        vby   = row.get("verified_by", "") or "(empty)"
        von   = row.get("verified_on", "") or "(empty)"
        last  = row.get("last_verified", "?")

        is_verified = vstatus == "verified" and vby != "(empty)" and von != "(empty)"
        status_color = GREEN if is_verified else RED
        if not is_verified:
            unverified_count += 1

        print(f"{BOLD}[{vid}]  {title}{RESET}")
        print(f"      {CYAN}{cat}{RESET} | deadline: {dl} | states: {states}")
        print(f"      SOURCE   : {YELLOW}{src}{RESET}")
        print(f"      URL      : {url}")
        print(f"      ELIGIBILITY: Std {mg}–{xg} | {gen} | income {inc} | {mob}")
        print(f"      LAST VERIFIED: {last}")
        print(f"      STATUS   : {status_color}{vstatus}{RESET}  "
              f"(verified_by={vby}, verified_on={von})")
        print("-" * 70)

    print(f"\n{RED}Unverified rows: {unverified_count}/{len(rows)}{RESET}")
    print(f"{GREEN}Verified rows  : {len(rows) - unverified_count}/{len(rows)}{RESET}")
    print()
    print("To verify a row, open data/opportunities.csv and set:")
    print("  verification_status = verified")
    print("  verified_by         = Your Name")
    print("  verified_on         = YYYY-MM-DD (today)")
    print()
    print("The UI will show the 'Verified ✓' seal only when BOTH fields are filled.")
    print("The ranking bonus (+30 pts) applies only to verified rows.\n")

if __name__ == "__main__":
    main()
