# Disha Partner Connectors Guide

Disha connects rural youth with vetted educational, vocational, apprenticeship, and livelihood opportunities. 

To expand coverage across rural districts, Disha provides an open connector plugin architecture allowing non-profit foundations, vocational training partners, government agencies, and employers to feed opportunities into the platform.

---

## 1. Data Trust Policy

> [!IMPORTANT]
> **All Opportunities are Imported as `sample_unverified`**
> To safeguard vulnerable students from outdated schemes or predatory offerings, Disha's partner import API strictly enforces:
> - `verification_status: "sample_unverified"`
> - `verified_by: null`
> - `verified_on: null`
> - `is_sample: true`
> 
> No external partner can self-certify an opportunity as official. A human reviewer must inspect the official notification, terms, and eligibility before certifying it with human credentials using `/api/verify_report.py`.

---

## 2. Authentication: Partner API Key

External partners authenticate by supplying an `X-API-Key` header with every request to partner endpoints.

- **Header Name**: `X-API-Key`
- **Configured Keys**: Specified in environment variable `PARTNER_API_KEYS` (comma-separated).
- **Default Dev Key**: `disha_partner_test_key_secret_2026`

If the header is missing or unrecognized, the API responds with `HTTP 401 Unauthorized`:
```json
{
  "detail": "Invalid or missing Partner API Key. Provide a valid 'X-API-Key' header."
}
```

---

## 3. Partner Import Endpoint

### `POST /api/v1/partner/opportunities/import`

**Headers**:
- `Content-Type: application/json`
- `X-API-Key: <YOUR_PARTNER_API_KEY>`

**Request Body Schema**:
```json
{
  "items": [
    {
      "title": "ड्रोन कृषी फवारणी तंत्रज्ञ प्रशिक्षण (Agri-Drone Spraying Technician)",
      "category": "vocational",
      "provider": "महा कृषी विकास प्रतिष्ठान (Maha Krishi Foundation)",
      "min_grade": 10,
      "max_grade": 14,
      "min_age": 18,
      "max_age": 28,
      "states": "Maharashtra",
      "income_max": 300000.0,
      "gender": "ALL",
      "interest_tags": "agriculture,drone,technology,mechanic",
      "mobility": "DISTRICT",
      "deadline": "2026-11-30",
      "documents_needed": "१० वी उत्तीर्ण गुणपत्रिका, आधार कार्ड, बँक पासबुक",
      "apply_steps": "१. ऑनलाईन अर्ज भरा. २. केंद्रात चाचणी द्या.",
      "benefits": "मोफत डीजीसीए मान्यताप्राप्त पायलट प्रशिक्षण आणि ₹३,००० विद्यावेतन.",
      "source_name": "Maha Krishi Open NGO Feed",
      "source_url": "https://mahakrishi.org/schemes/drone-tech"
    }
  ]
}
```

**Field Reference**:
| Field | Type | Description |
|---|---|---|
| `title` | string (required) | Title in Marathi, Hindi, or bilingual English |
| `category` | string | `vocational`, `apprenticeship`, `scholarship`, `scheme`, or `job` |
| `provider` | string (required) | Organization, NGO, or employer name |
| `min_grade` | integer (1–16) | Minimum academic standard (10 = SSC, 12 = HSC, 15 = Graduate) |
| `max_grade` | integer (1–16) | Maximum academic standard |
| `min_age` | integer or null | Minimum age limit (or null if unrestricted) |
| `max_age` | integer or null | Maximum age limit (or null if unrestricted) |
| `states` | string | States applicable (default `"Maharashtra"`) |
| `income_max` | float or null | Maximum annual family income in INR (null if not means-tested) |
| `gender` | string | `"ALL"`, `"FEMALE"`, or `"MALE"` |
| `interest_tags` | string | Comma-separated domain tags (e.g. `solar,farming,it`) |
| `mobility` | string | `"LOCAL"`, `"DISTRICT"`, or `"STATE_WIDE"` |
| `deadline` | string or null | `YYYY-MM-DD` or null for rolling admissions |
| `documents_needed`| string | Checklist of certificates or identity proofs |
| `apply_steps` | string | Step-by-step guidance for rural students |
| `benefits` | string (required) | Stipend, free boarding, certification, or toolkits |
| `source_name` | string | Source organization feed name |
| `source_url` | string (required) | Official URL where terms can be audited |

**Response**:
```json
{
  "status": "success",
  "message": "Successfully imported 3 opportunities as sample_unverified.",
  "imported_count": 3,
  "imported_ids": [4, 5, 6],
  "verification_status": "sample_unverified"
}
```

---

## 4. Sample Connector Plugin

Disha includes a reference connector plugin at [`/connectors/sample_ngo_feed_connector.py`](file:///d:/CITIBANK%20HACKTHON/connectors/sample_ngo_feed_connector.py).

### How to Run the Sample Connector
```bash
python connectors/sample_ngo_feed_connector.py \
  --feed connectors/sample_ngo_feed.json \
  --api-url http://127.0.0.1:8000 \
  --api-key disha_partner_test_key_secret_2026
```

### How to Add a New Connector

To integrate a new NGO or employer feed:
1. Create a script in `/connectors/<partner_name>_connector.py`.
2. Implement a fetch function that queries your partner's REST API, webhook, or reads their CSV export.
3. Transform your partner's attributes into the Disha schema (mapping categories, grades, and age rules).
4. Call `send_to_disha_api()` with your partner's secret API key.
5. Set up a daily cron or GitHub action to push updates.
