# -*- coding: utf-8 -*-
"""
verify_report.py  -  Human verification helper & Link Health Checker
=====================================================================
Run:  python api/verify_report.py [--skip-network] [--timeout 5] [--only-flags]

Prints every opportunity row with its title, source_url, HTTP link health,
and eligibility rules so a human verifier can check them one by one.
Flags:
  - Non-HTTPS links
  - Dead links (timeout, 4xx, 5xx, connection failure)
  - Redirects (shows destination)
"""

import csv
import sys
import io
import argparse
from pathlib import Path
from typing import Dict, Any, List

try:
    import httpx
except ImportError:
    httpx = None

# Force UTF-8 output on Windows so Indic characters print correctly
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    except Exception:
        pass

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "opportunities.csv"

# ANSI colours for terminals that support them
RESET  = "\033[0m"
BOLD   = "\033[1m"
YELLOW = "\033[33m"
CYAN   = "\033[36m"
GREEN  = "\033[32m"
RED    = "\033[31m"
MAGENTA = "\033[35m"

def format_income(val: str) -> str:
    if not val or val.strip() == "":
        return "no limit"
    try:
        return f"Rs {int(float(val)):,}"
    except ValueError:
        return val

def check_url_health(url: str, timeout: float = 5.0) -> Dict[str, Any]:
    """
    Checks URL over HTTP:
    - Flags non-HTTPS URLs
    - Issues HEAD / GET request with timeout
    - Detects status, redirect, timeout, errors
    """
    flags: List[str] = []
    is_https = str(url).strip().lower().startswith("https://")
    if not is_https:
        flags.append("NON-HTTPS")

    if not httpx:
        flags.append("HTTPX_MISSING")
        return {
            "status_code": None,
            "is_https": is_https,
            "is_alive": True,
            "is_redirect": False,
            "final_url": None,
            "error": "httpx not installed",
            "flags": flags
        }

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DishaVerifier/1.0"}
    try:
        # Use verify=False to avoid failing on older govt portal cert chains
        with httpx.Client(timeout=timeout, follow_redirects=False, verify=False) as client:
            try:
                resp = client.head(url, headers=headers)
                if resp.status_code in (405, 501):
                    resp = client.get(url, headers=headers)
            except Exception:
                resp = client.get(url, headers=headers)

            status_code = resp.status_code
            is_redirect = 300 <= status_code < 400
            location = resp.headers.get("location")
            # 2xx or 3xx or 403 (some portals block bot user-agents but exist)
            is_alive = 200 <= status_code < 400 or status_code == 403

            if not is_alive:
                flags.append(f"HTTP_{status_code}")
                flags.append("DEAD")
            elif is_redirect:
                flags.append(f"REDIRECT_{status_code}")

            return {
                "status_code": status_code,
                "is_https": is_https,
                "is_alive": is_alive,
                "is_redirect": is_redirect,
                "final_url": location,
                "error": None,
                "flags": flags
            }
    except httpx.TimeoutException:
        flags.append("TIMEOUT")
        flags.append("DEAD")
        return {
            "status_code": None,
            "is_https": is_https,
            "is_alive": False,
            "is_redirect": False,
            "final_url": None,
            "error": f"Timeout (>{timeout}s)",
            "flags": flags
        }
    except Exception as e:
        flags.append("CONN_ERROR")
        flags.append("DEAD")
        return {
            "status_code": None,
            "is_https": is_https,
            "is_alive": False,
            "is_redirect": False,
            "final_url": None,
            "error": str(e)[:100],
            "flags": flags
        }

def main():
    parser = argparse.ArgumentParser(description="Disha Opportunity Verification & Link Health Report")
    parser.add_argument("--skip-network", action="store_true", help="Skip HTTP link health checks")
    parser.add_argument("--timeout", type=float, default=5.0, help="HTTP request timeout in seconds (default 5.0)")
    parser.add_argument("--only-flags", action="store_true", help="Only show rows with warnings/flags")
    args = parser.parse_args()

    if not CSV_PATH.exists():
        print(f"ERROR: CSV not found at {CSV_PATH}")
        return

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"\n{BOLD}Disha – Opportunity Verification & Link Health Report{RESET}")
    print(f"CSV: {CSV_PATH}")
    print(f"Total rows: {len(rows)}")
    print(f"Network checking: {'Disabled' if args.skip_network else f'Enabled (timeout={args.timeout}s)'}\n")
    print("=" * 75)

    unverified_count = 0
    non_https_count = 0
    dead_link_count = 0

    for row in rows:
        vid    = row.get("id", "?")
        title  = row.get("title", "(no title)")
        cat    = row.get("category", "?")
        dl     = row.get("deadline", "") or "rolling"
        states = row.get("states", "?")
        url    = row.get("source_url", "(no url)")
        src    = row.get("source_name", "?")
        mg     = row.get("min_grade", "?")
        xg     = row.get("max_grade", "?")
        gen    = row.get("gender", "ALL")
        inc    = format_income(row.get("income_max", ""))
        mob    = row.get("mobility", "?")
        vstatus = row.get("verification_status", "sample_unverified")
        vby    = row.get("verified_by", "") or "(empty)"
        von    = row.get("verified_on", "") or "(empty)"
        last   = row.get("last_verified", "?")

        is_verified = vstatus == "verified" and vby != "(empty)" and von != "(empty)"
        if not is_verified:
            unverified_count += 1

        # Check Link Health
        health_info = None
        flags = []
        if not args.skip_network:
            health_info = check_url_health(url, timeout=args.timeout)
            flags = health_info["flags"]
            if not health_info["is_https"]:
                non_https_count += 1
            if not health_info["is_alive"]:
                dead_link_count += 1
        else:
            if not str(url).strip().lower().startswith("https://"):
                flags.append("NON-HTTPS")
                non_https_count += 1

        if args.only_flags and not flags and is_verified:
            continue

        status_color = GREEN if is_verified else RED
        print(f"{BOLD}[{vid}]  {title}{RESET}")
        print(f"      {CYAN}{cat}{RESET} | deadline: {dl} | states: {states}")
        print(f"      SOURCE   : {YELLOW}{src}{RESET}")
        print(f"      URL      : {url}")

        if health_info:
            code_str = f"HTTP {health_info['status_code']}" if health_info['status_code'] else health_info.get('error', 'N/A')
            alive_col = GREEN if health_info['is_alive'] else RED
            redirect_str = f" -> {health_info['final_url']}" if health_info['final_url'] else ""
            print(f"      HEALTH   : {alive_col}{code_str}{redirect_str}{RESET}")

        if flags:
            print(f"      {MAGENTA}FLAGS    : [{' | '.join(flags)}]{RESET}")

        print(f"      ELIGIBILITY: Std {mg}–{xg} | {gen} | income {inc} | {mob}")
        print(f"      LAST VERIFIED: {last}")
        print(f"      STATUS   : {status_color}{vstatus}{RESET}  (verified_by={vby}, verified_on={von})")
        print("-" * 75)

    print(f"\n{BOLD}Summary Report:{RESET}")
    print(f"  Unverified rows : {unverified_count}/{len(rows)}")
    print(f"  Verified rows   : {len(rows) - unverified_count}/{len(rows)}")
    if not args.skip_network:
        print(f"  Non-HTTPS links : {non_https_count}/{len(rows)}")
        print(f"  Dead/Error links: {dead_link_count}/{len(rows)}")
    print()
    print("To verify a row after human review:")
    print("  Run: python api/admin_verify.py --id <ID> --verifier \"Your Name\"")
    print("  Or see documentation in /docs/DATA_GUIDE.md\n")

if __name__ == "__main__":
    main()
