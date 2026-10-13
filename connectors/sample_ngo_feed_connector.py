"""
Disha Sample Connector Plugin
Reads opportunity feeds from an external NGO or Employer (JSON or CSV),
transforms them to Disha schema, and imports them via Partner API.

Enforcement:
All ingested records are automatically marked as 'sample_unverified'
until human verification is performed by a qualified reviewer.
"""

import os
import sys
import json
import csv
import argparse
import urllib.request
import urllib.error
from typing import List, Dict, Any

DEFAULT_API_URL = "http://127.0.0.1:8000"
DEFAULT_API_KEY = "disha_partner_test_key_secret_2026"

def read_feed_file(file_path: str) -> List[Dict[str, Any]]:
    """Reads items from either JSON or CSV feed format."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Feed file not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    items = []

    if ext == ".json":
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                items = data
            elif isinstance(data, dict) and "opportunities" in data:
                items = data["opportunities"]
            else:
                raise ValueError("JSON feed must be an array of opportunities or contain an 'opportunities' key.")
    elif ext == ".csv":
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Convert numeric fields
                item = dict(row)
                if "min_grade" in item and item["min_grade"]:
                    item["min_grade"] = int(item["min_grade"])
                if "max_grade" in item and item["max_grade"]:
                    item["max_grade"] = int(item["max_grade"])
                if "min_age" in item and item["min_age"]:
                    item["min_age"] = int(item["min_age"])
                if "max_age" in item and item["max_age"]:
                    item["max_age"] = int(item["max_age"])
                if "income_max" in item and item["income_max"]:
                    item["income_max"] = float(item["income_max"])
                items.append(item)
    else:
        raise ValueError(f"Unsupported feed format: {ext}. Use .json or .csv")

    return items

def transform_and_validate(raw_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Normalizes feed fields into Disha Partner Opportunity schema."""
    cleaned = []
    for raw in raw_items:
        title = raw.get("title") or raw.get("name")
        if not title:
            continue

        item = {
            "title": str(title).strip(),
            "category": str(raw.get("category", "vocational")).strip(),
            "provider": str(raw.get("provider", "NGO Partner")).strip(),
            "min_grade": int(raw.get("min_grade", 9)),
            "max_grade": int(raw.get("max_grade", 16)),
            "min_age": int(raw["min_age"]) if raw.get("min_age") not in (None, "") else None,
            "max_age": int(raw["max_age"]) if raw.get("max_age") not in (None, "") else None,
            "states": str(raw.get("states", "Maharashtra")).strip(),
            "income_max": float(raw["income_max"]) if raw.get("income_max") not in (None, "") else None,
            "gender": str(raw.get("gender", "ALL")).strip().upper(),
            "interest_tags": str(raw.get("interest_tags", "")).strip(),
            "mobility": str(raw.get("mobility", "DISTRICT")).strip().upper(),
            "deadline": str(raw["deadline"]).strip() if raw.get("deadline") else None,
            "documents_needed": str(raw.get("documents_needed", "")).strip(),
            "apply_steps": str(raw.get("apply_steps", "")).strip(),
            "benefits": str(raw.get("benefits", "Skill development and practical training")).strip(),
            "source_name": str(raw.get("source_name", "Partner NGO Feed")).strip(),
            "source_url": str(raw.get("source_url", "https://example.org")).strip()
        }
        cleaned.append(item)
    return cleaned

def send_to_disha_api(
    items: List[Dict[str, Any]],
    api_url: str = DEFAULT_API_URL,
    api_key: str = DEFAULT_API_KEY
) -> Dict[str, Any]:
    """Posts normalized items to Disha's Partner Import endpoint."""
    endpoint = f"{api_url.rstrip('/')}/api/v1/partner/opportunities/import"
    payload = json.dumps({"items": items}).encode("utf-8")

    req = urllib.request.Request(
        endpoint,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-API-Key": api_key
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        raise RuntimeError(f"Disha Partner API HTTP {e.code}: {err_msg}")
    except Exception as e:
        raise RuntimeError(f"Connection error to Disha API: {str(e)}")

def run_import(feed_path: str, api_url: str = DEFAULT_API_URL, api_key: str = DEFAULT_API_KEY) -> Dict[str, Any]:
    """Top-level pipeline: read -> transform -> post."""
    raw = read_feed_file(feed_path)
    cleaned = transform_and_validate(raw)
    result = send_to_disha_api(cleaned, api_url=api_url, api_key=api_key)
    return result

def main():
    parser = argparse.ArgumentParser(description="Disha NGO/Employer Feed Connector")
    parser.add_argument("--feed", default=os.path.join(os.path.dirname(__file__), "sample_ngo_feed.json"), help="Path to JSON or CSV feed file")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="Disha API root URL")
    parser.add_argument("--api-key", default=DEFAULT_API_KEY, help="Partner API Key (X-API-Key)")
    args = parser.parse_args()

    print(f"Reading feed from: {args.feed}")
    try:
        res = run_import(args.feed, api_url=args.api_url, api_key=args.api_key)
        print(f"Import status: {res.get('status')}")
        print(f"Message: {res.get('message')}")
        print(f"Imported count: {res.get('imported_count')}")
        print(f"Imported Opportunity IDs: {res.get('imported_ids')}")
        print(f"Verification status: {res.get('verification_status')} (Human review required)")
    except Exception as e:
        print(f"Error executing feed connector: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
