# Disha Data Guide: Opportunity Curation & Human Verification Protocol

This document defines the schema, sourcing standards, and mandatory human verification procedures for the Disha career intelligence catalog (`/data/opportunities.csv`).

---

## 1. Core Principles of Data Trust

1. **Zero Hallucination Policy**: No automated crawler, agent, or LLM is permitted to mark an opportunity as `verified`.
2. **Human-in-the-Loop Requirement**: An opportunity is marked `verified` **only** after a designated human reviewer has navigated to the official government or accredited portal, reviewed the eligibility guidelines, and signed off with their name and date.
3. **Graceful Expiration (90-Day Freshness Rule)**: Schemes evolve, quotas expire, and application portals change. Any verification older than 90 days is automatically flagged with a **"Needs re-check"** badge in the UI and API, and immediately loses the +30 points verified ranking bonus until re-verified.
4. **All Pre-Loaded Hackathon Data is Unverified**: All mock/sample records are strictly marked `sample_unverified` with empty `verified_by` and `verified_on`.

---

## 2. CSV Column Specification (`/data/opportunities.csv`)

| Column Name | Type | Required? | Description & Allowed Values |
| :--- | :--- | :--- | :--- |
| `id` | Integer | Yes | Unique numerical identifier (e.g. `1`, `2`). |
| `title` | String | Yes | Plain-language title of the scheme, scholarship, or apprenticeship. |
| `category` | Enum | Yes | Must be one of: `apprenticeship`, `scholarship`, `vocational`, `scheme`, `job`. |
| `provider` | String | Yes | Sponsoring department, ministry, or enterprise (e.g. `MSDE`, `MahaDBT`, `NABARD`). |
| `min_grade` | Integer | Yes | Minimum educational grade (e.g. `9` for Std 9, `10` for SSC, `12` for HSC, `15` for Graduation). |
| `max_grade` | Integer | Yes | Maximum educational grade (must be $\ge$ `min_grade`). |
| `min_age` | Integer | Optional | Minimum age in completed years (e.g. `18` for adult schemes). Blank if no floor. |
| `max_age` | Integer | Optional | Maximum age in completed years (e.g. `35`). Blank if no ceiling. |
| `states` | String | Yes | Semicolon-separated eligible states, or `Maharashtra;All India`. |
| `income_max` | Float/Int | Optional | Annual family income ceiling in INR (e.g. `250000`). Blank if no income test. |
| `gender` | Enum | Yes | One of: `ALL`, `FEMALE`, `MALE`. |
| `interest_tags` | String | No | Semicolon-separated domain keywords matching discovery vectors (e.g. `solar;energy;tech`). |
| `mobility` | Enum | Yes | Geographic mobility requirement: `LOCAL`, `DISTRICT`, or `STATE_WIDE`. |
| `deadline` | Date | Optional | `YYYY-MM-DD` or empty if rolling application cycle. |
| `documents_needed` | String | Yes | Semicolon-separated essential documents (e.g. `Aadhaar card;Marksheet;Income certificate`). |
| `apply_steps` | String | Yes | Semicolon-separated application milestones. |
| `benefits` | String | Yes | Concise stipend, fee waiver, or grant amount (e.g. `Rs 8,000/month stipend`). |
| `source_name` | String | Yes | Official portal name (e.g. `National Apprenticeship Portal (MSDE)`). |
| `source_url` | URL | Yes | Full HTTPS portal URL (e.g. `https://www.apprenticeshipindia.gov.in`). |
| `last_verified` | Date | Yes | `YYYY-MM-DD` of last database ingestion or review. |
| `verification_status` | Enum | Yes | Either `sample_unverified` or `verified`. |
| `verified_by` | String | Conditional | Full name of human reviewer. **Mandatory if `verification_status == "verified"`**. |
| `verified_on` | Date | Conditional | Date of human review in `YYYY-MM-DD`. **Mandatory if `verification_status == "verified"`**. |

---

## 3. How to Find Official Sources

When verifying or adding a new scheme:

1. **Prioritize Official Government Domains**:
   - Central Government: `*.gov.in` or `*.nic.in` (e.g., [scholarships.gov.in](https://scholarships.gov.in), [pmvishwakarma.gov.in](https://pmvishwakarma.gov.in)).
   - Maharashtra State Government: `*.maharashtra.gov.in` (e.g., [mahadbt.maharashtra.gov.in](https://mahadbt.maharashtra.gov.in)).
   - Public Sector Undertakings & Banks: Verified institutional portals (e.g., [nabard.org](https://www.nabard.org), [nsdcindia.org](https://www.nsdcindia.org)).
2. **Reject Intermediary Aggregators**:
   - **Never** cite blog posts, news aggregators, WhatsApp forward links, or third-party coaching websites.
3. **Verify HTTPS Transport**:
   - The portal MUST support secure TLS (`https://`). Unencrypted `http://` links are flagged by `api/verify_report.py`.

---

## 4. Human Reviewer Checklist

Before running `python api/admin_verify.py` or editing the CSV, the reviewer MUST verify the following 7 items:

- [ ] **1. Active Portal Check**: The URL loads over HTTPS without security certificate errors.
- [ ] **2. Authentic Provider**: The sponsoring entity on the page matches the government agency or institution.
- [ ] **3. Grade & Age Eligibility**: The minimum and maximum educational grades and age boundaries match the published gazette or scheme guidelines.
- [ ] **4. Income Limits**: Any income ceiling matches the exact monetary cap in the official notification.
- [ ] **5. Gender Criteria**: Clarify whether the scheme is open to all or reserved (e.g. girls-only scholarships).
- [ ] **6. Document List**: Verify that required documents (Aadhaar, domicile certificate, income certificate, caste certificate if applicable) are accurate so students do not face unexpected administrative hurdles.
- [ ] **7. Application Mechanism**: Confirm the application link is active or states whether registration is offline through the Gram Panchayat, ITI, or district collectorate.

---

## 5. Verification Commands

### Step A: Run Link Health Report
```bash
python api/verify_report.py
```
This checks each URL over HTTP, checks redirects, and flags dead or non-HTTPS links.

### Step B: Record Human Verification via Admin CLI
```bash
# Verify row ID 1 after completing the checklist
python api/admin_verify.py --id 1 --verifier "Pooja Deshmukh"

# List verification status and age of all opportunities
python api/admin_verify.py --list
```

### Step C: Test Ingestion
```bash
python api/seed.py
```
If a row has `verification_status = "verified"` but lacks either `verified_by` or `verified_on`, `seed.py` will reject the row with a validation error.
