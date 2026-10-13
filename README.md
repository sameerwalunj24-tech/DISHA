# Disha (दिशा) 🧭
### Voice-First, Multilingual, Offline-First AI Career & Livelihood Guide for Rural India

> Built for the Citi India Hackathon — *Reimagining Education & Economic Empowerment for Rural India*  
> **License:** [Apache-2.0](./LICENSE)

---

## 🌟 What is Disha?
**Disha** is an open-source, mobile-first platform tailored for rural Indian learners (Standard 9th to Graduation) and village facilitators (teachers and NGO workers).

Rural youth often lack visibility into practical career pathways beyond a handful of conventional careers, and rarely know which scholarships, state schemes, or apprenticeships they are eligible for. Disha solves this through:
- **Discover:** Natural voice profiling in regional languages (Marathi, Hindi, English).
- **Learn:** Personalized 30-day micro-step pathways focusing on non-STEM and vocational opportunities alongside competitive exams.
- **Opportunity:** Deterministic, zero-hallucination eligibility matching for verified schemes and scholarships with source links.
- **Facilitator Mode & Marketplace:** Village teachers manage entire classrooms and author localized training modules.
- **Offline-First:** Runs on low-end smartphones, queues voice and quizzes offline, and delta-syncs when connected.

---

## 📁 Repository Structure
```
disha/
├── api/             # FastAPI backend (REST, OpenAPI, SQLite/Postgres models)
├── web/             # React + Vite + TypeScript PWA (offline-first, service worker)
├── docs/            # Project specifications, execution guides, architecture
├── data/            # Knowledge base datasets (opportunities, schemes, mock data)
├── .env.example     # Environment template
└── LICENSE          # Apache-2.0 open-source license
```

---

## 🚀 Quick Start
See the complete step-by-step instructions in [`docs/RUN.md`](./docs/RUN.md).

```bash
# 1. Start Backend API
cd api
python -m venv .venv
# On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 2. Start Frontend Web PWA (in a separate terminal)
cd web
npm install
npm run dev -- --host
```

Open `http://localhost:5173` on your browser, or on your phone via `http://<your-computer-ip>:5173`.
