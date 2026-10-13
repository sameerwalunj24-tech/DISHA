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

## 📱 How to Open on Your Phone (Same Wi-Fi)

1. Connect both your computer and your phone to the same Wi-Fi network.
2. Look at the terminal output from `npm run dev -- --host` for the `Network:` URL (e.g. `http://192.168.1.5:5173`).
3. Open Chrome on Android, dictate answers with the microphone, and test offline airplane mode.

---

## 🧪 Running Automated Tests

Run the full test suite covering health, seed validation, age-gated rules, guardian consent enforcement, sensitive field privacy, pathway template validation, zero invented URLs, milestone deadlines, and progress persistence:
```bash
python -m pytest api/tests -v
```

All 26 unit tests should pass with `100%` success.

