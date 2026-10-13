# -*- coding: utf-8 -*-
"""
verify_report.py  -  Human verification helper & Data Trust Link Health / Hash Checker
======================================================================================
Run:  python api/verify_report.py [--skip-network] [--timeout 5] [--only-flags]

Prints every opportunity row with its title, source_url, HTTP link health,
cryptographic content hash status, and eligibility rules.
Flags:
  - Non-HTTPS links
  - Dead links (timeout, 4xx, 5xx, connection failure)
  - Redirects (shows destination)
  - Content-changed / drift against official government portal baseline
"""

import csv
import sys
import io
import json
import re
import hashlib
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional

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
HASH_REGISTRY_PATH = Path(__file__).resolve().parent.parent / "data" / "scheme_hashes.json"

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

def sanitize_content(content_text: str) -> str:
    """
    Sanitizes HTML/page content by stripping script and style tags, HTML markup,
    and normalizing whitespace to protect against cosmetic noise during diffing.
    """
    if not content_text:
        return ""
    # 1. Remove script and style elements with content
    cleaned = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", content_text, flags=re.DOTALL | re.IGNORECASE)
    # 2. Remove all remaining HTML tags
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    # 3. Collapse whitespace and strip
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned

def compute_content_hash(content_text: str) -> str:
    """Computes SHA-256 digest of sanitized page content."""
    sanitized = sanitize_content(content_text)
    return hashlib.sha256(sanitized.encode("utf-8")).hexdigest()

def load_hash_registry(path: Path = HASH_REGISTRY_PATH) -> Dict[str, Dict[str, Any]]:
    """Loads existing content hash registry from JSON."""
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_hash_registry(registry: Dict[str, Dict[str, Any]], path: Path = HASH_REGISTRY_PATH) -> None:
    """Persists content hash registry to data/scheme_hashes.json."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2, ensure_ascii=False)

def diff_scheme_hash(
    scheme_id: str,
    source_url: str,
    content_hash: Optional[str],
    is_alive: bool,
    status_code: Optional[int],
    registry: Dict[str, Dict[str, Any]]
) -> str:
    """
    Evaluates content hash against registry:
    - If URL is broken / 4xx / 5xx / timeout -> BROKEN_LINK
    - If scheme is new -> Records initial hash -> VERIFIED (or VERIFIED_UNCHANGED on subsequent runs)
    - If 200 OK and hash matches -> VERIFIED_UNCHANGED
    - If 200 OK and hash differs -> FLAGGED_CONTENT_CHANGED
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    if not is_alive or status_code not in (200, 201, 204) or not content_hash:
        existing = registry.get(scheme_id, {})
        registry[scheme_id] = {
            "source_url": source_url,
            "content_hash": existing.get("content_hash"),
            "last_checked": now_iso,
            "status": "BROKEN_LINK"
        }
        return "BROKEN_LINK"

    if scheme_id not in registry:
        # Initial registration of new scheme
        registry[scheme_id] = {
            "source_url": source_url,
            "content_hash": content_hash,
            "last_checked": now_iso,
            "status": "VERIFIED"
        }
        return "VERIFIED"

    existing_entry = registry[scheme_id]
    old_hash = existing_entry.get("content_hash")

    if old_hash and old_hash != content_hash:
        existing_entry["source_url"] = source_url
        existing_entry["previous_hash"] = old_hash
        existing_entry["content_hash"] = content_hash
        existing_entry["last_checked"] = now_iso
        existing_entry["status"] = "FLAGGED_CONTENT_CHANGED"
        return "FLAGGED_CONTENT_CHANGED"
    else:
        existing_entry["source_url"] = source_url
        existing_entry["content_hash"] = content_hash
        existing_entry["last_checked"] = now_iso
        existing_entry["status"] = "VERIFIED"
        return "VERIFIED_UNCHANGED"

def check_url_health(url: str, timeout: float = 5.0) -> Dict[str, Any]:
    """
    Checks URL over HTTP:
    - Flags non-HTTPS URLs
    - Issues GET / HEAD request with timeout
    - Sanitizes body and computes content_hash for status 200 responses
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
            "content_hash": None,
            "error": "httpx not installed",
            "flags": flags
        }

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DishaVerifier/1.0"}
    try:
        # Use verify=False to avoid failing on older govt portal cert chains
        with httpx.Client(timeout=timeout, follow_redirects=False, verify=False) as client:
            try:
                resp = client.get(url, headers=headers)
            except Exception:
                resp = client.head(url, headers=headers)

            status_code = resp.status_code
            is_redirect = 300 <= status_code < 400
            location = resp.headers.get("location")
            is_alive = 200 <= status_code < 400 or status_code == 403

            content_hash = None
            if status_code == 200 and hasattr(resp, "text"):
                content_hash = compute_content_hash(resp.text)

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
                "content_hash": content_hash,
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
            "content_hash": None,
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
            "content_hash": None,
            "error": str(e)[:100],
            "flags": flags
        }

def main():
    parser = argparse.ArgumentParser(description="Disha Opportunity Verification & Content-Hash Diff Report")
    parser.add_argument("--skip-network", action="store_true", help="Skip HTTP link health & content hash checks")
    parser.add_argument("--timeout", type=float, default=5.0, help="HTTP request timeout in seconds (default 5.0)")
    parser.add_argument("--only-flags", action="store_true", help="Only show rows with warnings/flags")
    parser.add_argument("--registry", type=str, default=str(HASH_REGISTRY_PATH), help="Path to scheme_hashes.json")
    args = parser.parse_args()

def run_verification_report(
    csv_path: Path = CSV_PATH,
    registry_path: Path = HASH_REGISTRY_PATH,
    skip_network: bool = False,
    timeout: float = 5.0,
    only_flags: bool = False,
    save_registry: bool = True,
    silent: bool = False
) -> Dict[str, Any]:
    """
    Runs verification and content-hash diffing against the catalog.
    Returns summary metrics dict with counts of unchanged vs. content-changed vs. broken schemes.
    """
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found at {csv_path}")

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    registry = load_hash_registry(registry_path)

    if not silent:
        print(f"\n{BOLD}Disha – Opportunity Verification & Content-Hash Diff Report{RESET}")
        print(f"CSV: {csv_path}")
        print(f"Hash Registry: {registry_path}")
        print(f"Total rows: {len(rows)}")
        print(f"Network checking: {'Disabled' if skip_network else f'Enabled (timeout={timeout}s)'}\n")
        print("=" * 75)

    unverified_count = 0
    non_https_count = 0
    dead_link_count = 0
    unchanged_count = 0
    content_changed_count = 0
    new_scheme_count = 0
    broken_count = 0

    results = []

    for row in rows:
        vid    = str(row.get("id", "?"))
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

        # Check Link Health & Content Hash Diff
        health_info = None
        hash_status = None
        flags = []
        if not skip_network:
            health_info = check_url_health(url, timeout=timeout)
            flags = list(health_info["flags"])
            if not health_info["is_https"]:
                non_https_count += 1
            if not health_info["is_alive"]:
                dead_link_count += 1

            hash_status = diff_scheme_hash(
                scheme_id=vid,
                source_url=url,
                content_hash=health_info.get("content_hash"),
                is_alive=health_info["is_alive"],
                status_code=health_info["status_code"],
                registry=registry
            )

            if hash_status == "FLAGGED_CONTENT_CHANGED":
                flags.append("CONTENT_CHANGED")
                content_changed_count += 1
            elif hash_status == "BROKEN_LINK":
                broken_count += 1
            elif hash_status == "VERIFIED_UNCHANGED":
                unchanged_count += 1
            elif hash_status == "VERIFIED":
                new_scheme_count += 1
        else:
            if not str(url).strip().lower().startswith("https://"):
                flags.append("NON-HTTPS")
                non_https_count += 1

        results.append({
            "id": vid,
            "title": title,
            "source_url": url,
            "is_verified": is_verified,
            "health_info": health_info,
            "hash_status": hash_status,
            "flags": flags
        })

        if not silent:
            if only_flags and not flags and is_verified:
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

            if hash_status:
                h_col = GREEN if hash_status in ("VERIFIED", "VERIFIED_UNCHANGED") else YELLOW if hash_status == "FLAGGED_CONTENT_CHANGED" else RED
                reg_entry = registry.get(vid, {})
                chash_display = (reg_entry.get("content_hash") or "")[:12] + "..." if reg_entry.get("content_hash") else "None"
                print(f"      HASH DIFF: {h_col}{hash_status}{RESET} (SHA-256: {chash_display})")

            if flags:
                print(f"      {MAGENTA}FLAGS    : [{' | '.join(flags)}]{RESET}")

            print(f"      ELIGIBILITY: Std {mg}–{xg} | {gen} | income {inc} | {mob}")
            print(f"      LAST VERIFIED: {last}")
            print(f"      STATUS   : {status_color}{vstatus}{RESET}  (verified_by={vby}, verified_on={von})")
            print("-" * 75)

    if not skip_network and save_registry:
        save_hash_registry(registry, registry_path)

    if not silent:
        print(f"\n{BOLD}Summary Report:{RESET}")
        print(f"  Total schemes evaluated : {len(rows)}")
        print(f"  Unverified rows         : {unverified_count}/{len(rows)}")
        print(f"  Verified rows           : {len(rows) - unverified_count}/{len(rows)}")
        if not skip_network:
            print(f"  Non-HTTPS links         : {non_https_count}/{len(rows)}")
            print(f"  Dead/Error links        : {dead_link_count}/{len(rows)}")
            print(f"  --- Scheme Content-Hash Diff Metrics ---")
            print(f"  Verified Unchanged      : {unchanged_count}")
            print(f"  New Baseline Recorded   : {new_scheme_count}")
            print(f"  Flagged Content-Changed : {content_changed_count}")
            print(f"  Broken Links            : {broken_count}")
        print()
        print("To verify a row after human review:")
        print("  Run: python api/admin_verify.py --id <ID> --verifier \"Your Name\"")
        print("  Or see documentation in /docs/DATA_GUIDE.md\n")

    return {
        "total_rows": len(rows),
        "unverified_count": unverified_count,
        "verified_count": len(rows) - unverified_count,
        "non_https_count": non_https_count,
        "dead_link_count": dead_link_count,
        "unchanged_count": unchanged_count,
        "new_scheme_count": new_scheme_count,
        "content_changed_count": content_changed_count,
        "broken_count": broken_count,
        "registry": registry,
        "results": results
    }

def main():
    parser = argparse.ArgumentParser(description="Disha Opportunity Verification & Content-Hash Diff Report")
    parser.add_argument("--skip-network", action="store_true", help="Skip HTTP link health & content hash checks")
    parser.add_argument("--timeout", type=float, default=5.0, help="HTTP request timeout in seconds (default 5.0)")
    parser.add_argument("--only-flags", action="store_true", help="Only show rows with warnings/flags")
    parser.add_argument("--registry", type=str, default=str(HASH_REGISTRY_PATH), help="Path to scheme_hashes.json")
    args = parser.parse_args()

    run_verification_report(
        csv_path=CSV_PATH,
        registry_path=Path(args.registry),
        skip_network=args.skip_network,
        timeout=args.timeout,
        only_flags=args.only_flags
    )

if __name__ == "__main__":
    main()
