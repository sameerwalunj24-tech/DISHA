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
* **Discovery Endpoints:** `POST /api/v1/discovery/start`, `POST /api/v1/discovery/answer`
* **Opportunities Endpoint:** [http://localhost:8000/api/v1/opportunities](http://localhost:8000/api/v1/opportunities)

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
3. The app starts Question 1 of 7 in Marathi (`mr`):
   - *Q1 (इयत्ता / Grade):* Tap an option (e.g., **१० वी**) or tap the microphone to speak.
   - *Q2 (गाव / जिल्हा Location):* Tap or type (e.g., **सातारा**).
   - *Q3 (आवडते विषय Subjects):* Tap or type (e.g., **विज्ञान व तंत्रज्ञान**).
   - *Q4 (मोकळ्या वेळेत आवड Activities):* Tap or type (e.g., **यंत्रे व मोटार दुरुस्ती**).
   - *Q5 (कुटुंबाचा व्यवसाय Family work):* Tap or type (e.g., **शेती व दुग्ध व्यवसाय**).
   - *Q6 (भविष्यातील आवड Career goal):* Tap or type (e.g., **सोलर / इलेक्ट्रिकल तंत्रज्ञ**).
   - *Q7 (प्रवासाची तयारी Mobility):* Tap or type (e.g., **तालुका किंवा जिल्हा केंद्रात**).
4. Notice the **पालकांची संमती (Guardian Consent)** checkbox at the bottom (required for saving under the DPDP Act).
5. Upon submitting Question 7, the AI extraction runs (via mock or Gemini) and displays **"तुमचा दिशा करिअर प्रोफाईल तयार आहे!"** with your recommended vocational pathways and skills.
6. The profile is saved directly to the SQLite `Student` table in the backend.

### 2. Offline 8-Question Icon Quiz Fallback
1. Turn off your Wi-Fi or toggle the button **"ऑफलाइन क्विझ वापरा"** inside the Discover screen.
2. The app switches into the icon-based visual quiz:
   - 8 cards with large pictorial icons (solar pump, tractor, tools, medicine, laptop).
   - Tap any card to advance through all 8 questions.
3. The app calculates a deterministic profile entirely in the browser and saves it to **IndexedDB** marked as `pending_sync`.

---

## 📱 How to Open on Your Phone (Same Wi-Fi)

1. Connect both your computer and your phone to the same Wi-Fi network (or your phone's personal hotspot).
2. Look at the terminal output from `npm run dev -- --host`. You will see a `Network:` line, such as:
   ```
   ➜  Network:  http://192.168.1.5:5173/
   ```
3. Open Chrome or your mobile browser on your phone and open that URL.
4. On Chrome on Android, tap the **Microphone** button to dictate answers in Marathi, Hindi, or English using native browser speech recognition.

---

## 🧪 Running Automated Tests

To verify backend health, discovery state machine, schema validation, mock extraction, and consent blocking:
```bash
# Run pytest from the repository root
python -m pytest api/tests -v
```

All 7 automated tests should pass with `100%` success.
