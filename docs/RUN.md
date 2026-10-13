# Running the Disha Platform 🧭

This guide provides the exact commands to run both the **Backend API** and the **Mobile PWA Web App** on your local machine and on your phone over Wi-Fi.

---

## 🚀 One-Command Local Startup (Recommended)

### Windows:
Simply run:
```cmd
start.bat
```

### macOS / Linux:
```bash
chmod +x start.sh
./start.sh
```

### Docker Compose:
```bash
docker compose up --build
```

---

## 🏃 Manual Start in 2 Terminals

Open two separate terminal windows (Command Prompt or PowerShell):

### Terminal 1: Backend API (FastAPI + SQLite)
```bash
# Navigate to the api directory and start the server
cd api
python seed_demo.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
* **API Health Check:** [http://localhost:8000/health](http://localhost:8000/health)
* **Interactive OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Student Matches Endpoint:** `GET /api/v1/students/{id}/matches`
* **Single Eligibility Check:** `POST /api/v1/eligibility/check`
* **Opportunities Catalog:** [http://localhost:8000/api/v1/opportunities](http://localhost:8000/api/v1/opportunities)
* **Marketplace Catalog:** `GET /api/v1/marketplace/modules`
* **Demo Reset:** `POST /api/v1/demo/reset`

---

### Terminal 2: Frontend PWA Web App (React + Vite)
```bash
# Navigate to the web directory and start the dev server
cd web
npm run dev -- --host
```
* **Local Web Browser:** [http://localhost:5173](http://localhost:5173)

---

## 🧭 How to Test the "Discover" Feature (Phase 2)

### 1. Online Conversational Discovery (Voice / Typing)
1. Open the app on your computer or phone browser (`http://localhost:5173`).
2. Tap the first big tile: **करिअर शोधा (Discover Career)**.
3. Answer all 7 questions in Marathi (`mr`), Hindi (`hi`), or English (`en`) via voice or tap.
4. Keep **पालकांची संमती (Guardian Consent)** checked and submit the 7th question.
5. The completed profile card displays your **Top Opportunity Matches** with green/amber badges and direct links.

### 2. Offline 8-Question Icon Quiz Fallback
1. Disconnect Wi-Fi or tap **"ऑफलाइन क्विझ वापरा"** inside the Discover screen.
2. Complete the 8 pictorial cards (solar panel, tractor, tools, medicine, laptop).
3. The app generates a local profile and saves it to **IndexedDB** marked as `pending_sync`.

---

## 🎯 How to Test "Opportunities & Grounded Eligibility" (Phase 3)

1. From the home screen, tap the 3rd tile: **संधी व योजना (Opportunities)**.
2. **Eligibility Badges:**
   - `✓ पात्र (Eligible)` — Green badge: passes all deterministic rules.
   - `⚠ बहुतांश पात्र (Likely)` — Amber badge: passed core rules, but optional info (like income ceiling) is unverified.
   - `✕ अपात्र (Not Eligible)` — Grey badge: does not meet grade/gender criteria.
3. **Verification Badges:**
   - Verified schemes display a blue **"✓ अधिकृत शासकीय (Verified)"** badge and rank above sample records.
   - Unverified sample rows display a visible **"Sample - unverified"** badge.
4. **Explainable "Why" & Source Links:**
   - Each card displays a plain-language explanation in the chosen language.
   - Tap **"सविस्तर माहिती व कागदपत्रे ↓"** to view documents required and step-by-step application instructions.
   - Tap **"अधिकृत संकेतस्थळ उघडा"** to open the real government portal (`apprenticeshipindia.gov.in`, `mahadbt.maharashtra.gov.in`, `pmvishwakarma.gov.in`).
5. **Sensitive Fields Privacy:**
   - Use the optional income box at the top to test dynamic income checking (e.g., enter `200000`).
   - Sensitive income and caste category are **never stored in the database**.
6. **Airplane Mode / Offline Verification:**
   - Turn on Airplane Mode or disconnect Wi-Fi.
   - The Opportunities screen continues to load and display all matched schemes from **IndexedDB** offline cache.

---

## 🛣️ How to Test "My Path" (Phase 4)

1. **Accessing My Path:**
   - Tap the middle tile on the home screen: **माझा मार्ग (My Pathway)**, or tap **"माझा ३० दिवसांचा मार्ग पहा (View Pathway) →"** immediately after completing Discovery.
2. **Career Cluster Matching:**
   - Based on profile interests and aspirations (e.g. solar pumps, dairy farming, nursing, digital banking), the app automatically selects one of 5 grounded career clusters (`electrical_solar`, `agriculture_dairy`, `healthcare`, `it_digital`, `general_explore`).
3. **Stage Timeline:**
   - Switch between **"१) पुढील ३० दिवस" (Next 30 Days)**, **"२) ३-६ महिने" (3-6 Months)**, and **"३) १-२ वर्षे" (1-2 Years)**.
4. **30-Day Practical Checklist & Progress Ring:**
   - Browse Week 1 through Week 4 micro-steps (~15 minutes daily practical tasks).
   - Tap any step's checkbox to **tick it off**.
   - Watch the animated **Progress Ring** update (e.g. 25%, 50%, 100%).
   - Ticked steps are stored in **IndexedDB** (`sync_status: pending_sync`) and persist across page reloads and device restarts.
5. **Voice Read Aloud:**
   - Tap the speaker icon (🔊) next to any step or milestone to hear it read aloud in Marathi (`mr-IN`), Hindi (`hi-IN`), or English (`en-IN`) using the voice adapter.
6. **No Invented Links Guarantee:**
   - Every resource URL is strictly verified against `data/opportunities.csv`. Unverified steps display **"🔒 दुवा लवकरच उपलब्ध (Link coming soon)"** so learners are never misled by broken or hallucinated links.
7. **Alternative Vocational / Non-STEM Option:**
   - Scroll to the bottom to see the highlighted practical vocational livelihood alternative (e.g. agricultural pump repair, automated dairy equipment servicing, mobile hardware repair, or traditional artisanal trades).
8. **Airplane Mode / Offline Verification:**
   - Turn on Airplane Mode or disconnect Wi-Fi.
   - Reload the page: the pathway and all ticks load immediately from IndexedDB with an **"✈️ ऑफलाइन कॅश"** badge.

---

## 🔄 How to Test "Offline Sync" (Phase 5 Demo Script)

Disha features a robust offline-first synchronization engine using an IndexedDB outbox queue, last-write-wins conflict resolution, and idempotent batch processing. Sensitive fields (income, caste category) are strictly excluded from the queue.

### Step-by-Step Offline Demo Script:

1. **Simulate Offline Mode:**
   - Either turn on your device's **Airplane Mode** (disconnect Wi-Fi), **OR**
   - Tap the **Disha Compass Logo** in the top-left header **5 times**.
   - An amber notification banner appears: `⚡ डेमो मोड: ऑफलाइन सिम्युलेट केले (Simulated Offline Mode Active)`.
   - The status chip in the header updates to `Offline` (`ऑफलाइन`).

2. **Complete the Offline Quiz (Generates 1 Outbox Item):**
   - Tap **करिअर शोधा (Discover Career)**.
   - The 8-question offline pictorial quiz opens.
   - Keep the child-safe **पालकांची संमती (Guardian Consent)** checkbox checked.
   - Tap an icon option for each of the 8 questions.
   - Upon completing the 8th question, your local career profile is created and queued into the IndexedDB outbox.
   - **Observe:** The header chip updates immediately to `Offline (1 pending)` / `ऑफलाइन (१ प्रलंबित)`.

3. **Tick 3 Pathway Steps (Generates 3 Outbox Items):**
   - Tap **माझा ३० दिवसांचा मार्ग पहा (View Pathway) →**.
   - Under the 30-day practical micro-steps, tick off **3 steps** (e.g. Day 1, Day 2, and Day 3).
   - With each tick, the outbox queues a `pathway_progress` item.
   - **Observe:** The header chip increments with every tick:
     - `Offline (2 pending)`
     - `Offline (3 pending)`
     - `Offline (4 pending)` / `ऑफलाइन (४ प्रलंबित)`

4. **Restore Network Connection (Automatic Trigger):**
   - Turn off Airplane Mode (reconnect Wi-Fi), **OR**
   - Tap the **Disha Compass Logo** **5 times** again to exit demo mode.
   - A green toast appears: `🌐 Demo Mode: Online Mode Restored`.

5. **Instant Sync & Verification:**
   - Within seconds, the sync engine fires automatically, batching all 4 queued writes and sending them via `POST /api/v1/sync`.
   - The header chip shows `Syncing...` (`सिंक होत आहे...`) and then transitions to **`✓ Synced`** (`सिंक झाले (Synced)`).
   - The pending count drops to `0`.
   - The server response returns the permanent student record ID, auto-generates the server pathway, and applies the 3 ticks.

6. **Manual Sync Trigger ("Sync now"):**
   - If connected and any writes are pending, tapping the amber status chip triggers an immediate sync.

---

## 👥 How to Test "Facilitator Mode & Talent Radar" (Phase 6 Demo Script)

Disha includes a dedicated Facilitator Mode designed for rural school teachers and NGO volunteers managing multiple students, featuring a deterministic, explainable **Talent Radar**, shared-device multi-student onboarding, privacy-preserving rosters, and mentor opportunity recommendations.

### Acceptance Demo Script:

1. **Facilitator Login (Phone + Demo OTP):**
   - Tap the **शिक्षक पोर्टल (Facilitator Portal)** button in the top navigation bar.
   - Enter your name (e.g., `सुरेश माने`), mobile number (e.g., `9876543210`), and role (`शाळा/कॉलेज शिक्षक`).
   - Tap **"OTP मिळवा (Send OTP) →"**.
   - A demonstration OTP is shown directly on the screen (e.g., `123456`) — no external SMS gateway needed.
   - Tap **"सत्यापित करा व प्रवेश करा (Verify & Login) →"**.
   - A prototype JWT token is issued, granting access only to your own cohorts.

2. **Create a Cohort & Get Short Join Code:**
   - Tap **"+ नवीन गट तयार करा (Create Cohort)"**.
   - Enter group name: `इयत्ता १०वी - तुकडी ब (Class 10-B)`.
   - Tap **"तयार करा (Create)"**.
   - The cohort appears with a unique 6-character join code (e.g. `KJ92X1`).

3. **Start Shared-Device Mode:**
   - In the cohort dashboard, tap **"📱 सामायिक डिव्हाइस सत्र सुरू करा (Start Shared-Device Session)"**.
   - A persistent dark indigo bar appears across the top of Disha:
     `📱 सामायिक डिव्हाइस: इयत्ता १०वी - तुकडी ब (KJ92X1)` with a prominent **"पुढील विद्यार्थी (Next Student) →"** button.

4. **Join 3 Students from the Same Phone:**
   - **Student 1 (Finishes Discover + Ticks Pathway):**
     - Tap **"वर्ग कोड (Join Cohort)"** in the header or home banner.
     - Enter join code `KJ92X1` and nickname `रोहन (Roll 14)`.
     - View plain-language privacy notice in mr/hi/en: *"तुमचे शिक्षक तुमची प्रगती व आवडी पाहू शकतात."*
     - Complete Discover, keep guardian consent checked, submit.
     - View 30-day pathway and tick 3 micro-steps.
   - **Tap "पुढील विद्यार्थी (Next Student) →"**:
     - Student 1's state is safely saved. The session cleanly resets for the next student without mixing data.
   - **Student 2 (Finishes Discover):**
     - Tap **"वर्ग कोड"**, enter code `KJ92X1` and nickname `प्रिया (Roll 22)`.
     - Complete Discover, keep guardian consent checked, submit.
   - **Tap "पुढील विद्यार्थी (Next Student) →"**:
     - Cleanly resets for student 3.
   - **Student 3 (Enrolled, Discover In-Progress):**
     - Tap **"वर्ग कोड"**, enter code `KJ92X1` and nickname `अमित (Roll 07)`.
     - Student 3 joins the cohort without finishing Discover yet.

5. **View Dashboard & Talent Radar Flags with Reasons:**
   - Tap **"शिक्षक पोर्टल (Facilitator Portal)"** in the header.
   - Open cohort `इयत्ता १०वी - तुकडी ब`.
   - **Roster Table (Data Minimisation):**
     - Shows nicknames (`रोहन (Roll 14)`, `प्रिया (Roll 22)`, `अमित (Roll 07)`), profile status, pathway progress %, and last activity.
     - Strictly excludes family income and caste category.
   - **Talent Radar (Deterministic, Positive & Supportive only):**
     - Student 1: Shows **`RISING` (प्रगतीपथावर)** badge. Click to view reason: *"सातत्यपूर्ण प्रगती: मागील ७ दिवसांत ३ कृती पूर्ण केल्या आहेत."*
     - Student 2: Shows **`STRONG_FIT` (उत्तम संधी सुसंगत)** badge. Click to view reason: *"निकट मुदत असलेली योजना: पात्रतेशी सुसंगत संधी उपलब्ध."*
     - Student 3: Shows **`NEEDS_SUPPORT` (मार्गदर्शन आवश्यक)** badge. Click to view reason: *"अजून करिअर शोध अपूर्ण आहे किंवा गेल्या १४ दिवसांत कृती झालेली नाही."*
     - *Guarantee:* Children are never ranked against each other or labeled as low potential.
   - **Cohort Summary & Aggregated CSV Export:**
     - Summarizes top interest clusters and upcoming deadlines relevant to students.
     - Tap **"CSV डाऊनलोड (Export)"** to download an aggregated CSV with zero personal identifiers.

6. **Recommend Opportunity to Student:**
   - On Student 1's row, tap **"शिफारस करा (Recommend)"**.
   - Select opportunity: `सूर्य मित्र सौर ऊर्जा तंत्रज्ञ प्रशिक्षण` (`opp_solar_surya_mitra`).
   - Enter mentor note: `"तुमच्या प्रात्यक्षिक कौशल्याशी हे जुळते. लगेच अर्ज करा."`.
   - Tap **"शिफारस पाठवा (Send Recommendation)"**.
   - The recommendation is recorded (via API or offline outbox).

7. **Student Views Recommendation:**
   - Tap "सत्र संपवा" or return to Student 1's session.
   - Navigate to **"संधी व योजना (Opportunities)"**.
   - The recommended card displays a highlighted golden banner:
     `⭐ शिक्षकांची शिफारस: सुरेश माने (शिक्षक)`
     `"तुमच्या प्रात्यक्षिक कौशल्याशी हे जुळते. लगेच अर्ज करा."`

---

## 🛒 How to Test "Marketplace & 12/88 Revenue Split" (Phase 7 Demo Script)

Disha empowers local teachers and vocational trainers to monetize practical knowledge while giving students structured micro-courses with an equitable 88% revenue share for facilitators and 12% platform fee.

1. **Facilitator Creates Training Module:**
   - Log into the Facilitator Portal (phone `9822000000`, OTP displayed on screen).
   - Switch to the tab **"कोर्सेस व कमाई (88% Revenue Split)"**.
   - Tap **"+ नवीन कोर्स तयार करा (Author Course)"**.
   - Enter title (e.g., `सौर ऊर्जा इन्व्हर्टर दुरुस्ती`), language (`mr`), price type (`one_time`), and price (e.g. `₹200`).
   - Add practical steps and publish.
2. **Student Browses & Enrolls via Mock Payment:**
   - From the student home screen, tap the 4th tile: **कौशल्य कोर्सेस (Skill Courses)**.
   - Tap on the course card to view the fee breakdown modal:
     - Total Price: `₹200`
     - Facilitator Direct Earnings (88%): `₹176.00`
     - Disha Platform Sustainable Fee (12%): `₹24.00`
   - Tap **"मॉक UPI ने नोंदणी करा (Confirm Mock Payment)"**.
   - Once enrolled, the course steps are cached in local storage for **100% offline access**.
3. **Facilitator Earnings Dashboard:**
   - Return to Facilitator Portal -> **कोर्सेस व कमाई**.
   - KPI cards reflect: Gross Sales `₹200`, Net Facilitator Payout `₹176.00 (88%)`, Platform Fee `₹24.00 (12%)`, and Enrolled Students `1`.

---

## 🔌 How to Test "Open API & Connector Feeds"

1. **Test Partner API Key Auth & Feed Import:**
   - Run the sample connector script against your local API:
     ```bash
     python connectors/sample_ngo_feed_connector.py \
       --feed connectors/sample_ngo_feed.json \
       --api-url http://127.0.0.1:8000 \
       --api-key disha_partner_test_key_secret_2026
     ```
   - Observe stdout:
     `Imported count: 3`
     `Verification status: sample_unverified (Human review required)`
2. **Data Trust Verification:**
   - Inspect the database or call `/api/v1/opportunities`: the imported NGO opportunities appear in the catalog, but are strictly labeled `"Sample - unverified"`.

---

## 🔁 How to Test "Demo Seed & Instant Reset"

1. **Reset Demo via Script:**
   ```bash
   python api/seed_demo.py
   ```
   Restores demo facilitator (`Sunita Patil`, phone `9822000000`), cohort `DEMO10`, and 3 students at different stages (Exploration, Mid-way 15 days + recommendation, and Advanced 26 days + course enrolled).
2. **Reset Demo via Hidden UI Button:**
   - In the header top bar, tap the dashed orange button **"डेमो रिसेट (Reset Demo)"**.
   - Confirm the dialog. The entire demo environment is instantly re-seeded via `POST /api/v1/demo/reset`.

---

## 🛡️ Data Trust Tooling (Phase 8A)

### 1. Opportunity Link Health & HTTPS Checker
Run the link health audit to verify all catalog source URLs over HTTP:
```bash
python api/verify_report.py
```
* Checks HTTP response status and follow redirects.
* Flags non-HTTPS links with `[NON-HTTPS]`.
* Flags timeouts (>5s), connection failures, or dead links with `[DEAD]`.
* Use `--skip-network` for fast offline reporting:
```bash
python api/verify_report.py --skip-network
```

### 2. Human Reviewer Verification CLI
Mark an opportunity row verified **only after manual inspection of the official portal**:
```bash
# Record human sign-off
python api/admin_verify.py --id 1 --verifier "Pooja Deshmukh"

# List verification age and status across catalog
python api/admin_verify.py --list
```
* **90-Day Freshness Policy:** Any verification older than 90 days displays a **"Needs re-check (>90d)"** badge in the UI and immediately loses the +30 points verified ranking bonus until re-verified.
* See full guidelines and human review checklist in [/docs/DATA_GUIDE.md](file:///d:/CITIBANK%20HACKTHON/docs/DATA_GUIDE.md).

---

## 🤖 Real LLM Path (Gemini Adapter)

When a Gemini API key is configured in `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_DAILY_CALL_CAP=100
```
1. **End-to-End Grounded Explanations:**
   - Matches generate AI-written, supportive explanations in Marathi, Hindi, or English.
   - Explanations strictly cite the official source URL and source name.
2. **Built-in Resilience & Safeguards:**
   - **Timeout & Retries:** 8.0s timeout with automatic retry on transient network errors.
   - **Token Caps:** Output constrained to 256 tokens.
   - **Daily Quota Cap:** Defaults to 100 calls/day. When reached, seamlessly falls back to the deterministic template text without failing.
   - **SHA-256 Explanation Caching:** Identical student profiles and opportunity queries hit cache instantly with zero extra API calls.
   - **Anti-Hallucination Validator:** `ExplanationValidator` strictly checks for URL hallucinations. If any invented URL is detected, the AI output is discarded and the system falls back to the safe grounded template.
   - **Privacy Protection:** Student answers, personal details, and keys are never logged.

---

## 📊 Live Privacy-Safe Impact Metrics

1. **Facilitator Impact View:**
   - In the Facilitator Portal, tap the **"समुदाय प्रभाव (Impact Metrics)"** tab.
   - Displays live KPI counts: Profiles Created, Pathways Started, Steps Completed, Opportunities Viewed, Recommendations Made, and Offline Syncs.
2. **Aggregation JSON Endpoint:**
   - `GET /api/v1/impact/summary`
   - **Privacy Masking Rule:** Any small cell count between 1 and 4 is automatically masked as `"<5"` to prevent individual re-identification in rural communities. Counts of 0 or 5+ are displayed transparently.

---

## 🧪 Running Automated Tests

Run the full backend test suite covering security startup checks, link health checks, admin verification CLI, 90-day verification expiry, Gemini LLM adapter with mock provider/caching/quota, privacy-safe impact metrics with cell masking (<5), and demo reset:
```bash
python -m pytest api/tests -v
```
**Expected Result:** 71 passed (`100%` success).

Run the frontend test suite verifying sync outbox queueing, sensitive field stripping, shared-device session clearing, offline roster/recommendation caching, and marketplace deterministic 12/88 integer paise split:
```bash
cmd /c "npm --prefix web test"
```
**Expected Result:** 15 passed (`100%` success).

Run production bundle build verification:
```bash
cmd /c "npm --prefix web run build"
```
**Expected Result:** TypeScript passes and Vite builds dist bundle successfully.




