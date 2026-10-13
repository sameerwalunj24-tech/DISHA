# Running the Disha Platform 🧭

This guide provides the exact commands to run both the **Backend API** and the **Mobile PWA Web App** on your local machine and on your phone over Wi-Fi.

---

## Prerequisites
- **Python 3.10+** (tested on Python 3.14)
- **Node.js 18+** (tested on Node.js 20+)

---

## 🚀 Running in 2 Simple Commands

Open two separate terminal windows (Command Prompt or PowerShell):

### Terminal 1: Backend API (FastAPI + SQLite)
```bash
# Navigate to the api directory and start the server
cd api
python seed.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
* **API Health Check:** [http://localhost:8000/health](http://localhost:8000/health)
* **Interactive OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Student Matches Endpoint:** `GET /api/v1/students/{id}/matches`
* **Single Eligibility Check:** `POST /api/v1/eligibility/check`
* **Opportunities Catalog:** [http://localhost:8000/api/v1/opportunities](http://localhost:8000/api/v1/opportunities)

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

## 📱 How to Open on Your Phone (Same Wi-Fi)

1. Connect both your computer and your phone to the same Wi-Fi network.
2. Look at the terminal output from `npm run dev -- --host` for the `Network:` URL (e.g. `http://192.168.1.5:5173`).
3. Open Chrome on Android, dictate answers with the microphone, and test offline airplane mode.

---

## 🧪 Running Automated Tests

Run the full backend test suite covering database isolation, fresh schema creation, seed validation, age-gated rules, guardian consent enforcement, sensitive field privacy, pathway templates, zero invented URLs, milestone deadlines, offline batch sync, facilitator JWT auth, cohort access control, talent radar engine, and recommendations:
```bash
python -m pytest api/tests -v
```
All 40 backend unit tests should pass with `100%` success.

Run the frontend test suite verifying sync outbox queueing, sensitive field stripping, shared-device session isolation, and offline roster/recommendation caching:
```bash
cmd /c "npm --prefix web test"
```
All 9 frontend unit tests should pass with `100%` success.


