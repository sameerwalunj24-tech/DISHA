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

## 📱 How to Open on Your Phone (Same Wi-Fi)

1. Connect both your computer and your phone to the same Wi-Fi network (or your phone's personal hotspot).
2. Look at the terminal output from `npm run dev -- --host`. You will see a `Network:` line, such as:
   ```
   ➜  Network:  http://192.168.1.5:5173/
   ```
3. Open Chrome or your mobile browser on your phone and type that URL (e.g. `http://192.168.1.5:5173`).
4. **Switch Languages:** Tap **मराठी**, **हिंदी**, or **English** in the header.
5. **Test Voice Guide:** Tap the big circular microphone button. You will see live audio wave feedback, followed by recognized speech in the chosen language. Tap the speaker icon on any tile to listen to the prompt read aloud.
6. **Facilitator Portal:** Tap **शिक्षक / संस्था** to preview the teacher & NGO login modal.
7. **Test Offline / Airplane Mode:**
   - Browse the app once so the service worker caches the shell.
   - Turn on **Airplane Mode** on your phone (or disconnect Wi-Fi).
   - Refresh the page: the Disha app shell will continue to load instantly offline with an **"ऑफलाइन मोड" (Offline Mode)** indicator.

---

## 🧪 Running Automated Tests

To verify backend health, database schema, and seed data ingestion:
```bash
# Run pytest from the repository root
python -m pytest api/tests -v
```

All 3 automated tests should pass with `100%` success.
