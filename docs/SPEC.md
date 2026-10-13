# Project Specification: Disha

> **Theme:** Reimagining Education & Economic Empowerment for Rural India  
> **Target Audience:** Rural Indian students (Standard 9th to Graduation) and Village Teachers/Facilitators  
> **Core Loop:** Discover (Voice Profile) → Learn (Personal Pathway) → Opportunity (Verified Schemes/Scholarships/Jobs)  
> **License:** Apache-2.0  

---

## 1. Executive Summary & Vision

"Disha" is a voice-first, multilingual, offline-first AI career guide designed to empower rural Indian youth with career pathways and direct access to economic opportunities.

Unlike urban-centric platforms requiring fast connections and high digital literacy, Disha is engineered specifically for:
- Low-end Android smartphones.
- Intermittent / low-bandwidth connectivity (offline-first architecture).
- Low-literacy and vernacular users (voice in/out in regional languages, big icons, simple interactions).
- Realistic rural livelihood options: heavy focus on **non-STEM, vocational, apprenticeship, and skilled trade pathways** alongside traditional academic degrees.
- Grounded intelligence: zero hallucination of government schemes through a deterministic eligibility rules engine.

---

## 2. Hard Constraints & Core Architecture

### A. The Core Loop
1. **Discover:** The student interacts through natural voice conversation in their native language (pilot: Marathi, Hindi, English). The system constructs a dynamic learner profile capturing interests, skills, practical capabilities, academic standard (Std 9 to graduation), and geographic state.
2. **Learn:** Generates a structured personal pathway broken down into **30-day micro-steps**, covering foundational skills, practical steps, non-STEM/vocational options, and relevant competitive exams.
3. **Opportunity:** Deterministically matches the student with scholarships, central/state government schemes, apprenticeships, mentors, and employers. Every match includes an **explainable eligibility breakdown**, a direct **source citation**, and a **"last verified" date**.

### B. Facilitator & Marketplace Extensions
- **Facilitator Mode:** Enables village teachers, NGO volunteers, and rural community workers to manage cohorts of students from a single device, review learner profiles, spot talent, and recommend opportunities.
- **Sustainability / Learning Marketplace:** Facilitators can author and run custom hyper-local training modules (e.g., local entrance exam prep, vocational crash courses) and offer them for free, pay-per-module, or subscription.

### C. Technical & System Principles
- **Open Source & Extensible:** Apache-2.0 license. Modular plugin architecture for language packs and opportunity connectors.
- **Offline-First:** Local storage caching (PWA with Service Worker + local storage/IndexedDB), offline voice recording queue, and delta sync upon network restoration (last-write-wins).
- **Voice In/Out Abstraction:** Standardized adapter interfaces for STT (Speech-to-Text) and TTS (Text-to-Speech), swappable with AI4Bharat/Bhashini or cloud APIs, backed by a robust Mock adapter for development without API keys.
- **Child-Safe & Privacy Compliant:** Aligned with India's DPDP Act: guardian consent tracking, data minimization, and a strict guarantee that opportunity ranking is never pay-to-rank.
- **Open Interoperability:** Standards-based REST APIs with OpenAPI documentation, ready for Beckn/ONEST and DigiLocker integrations.

---

## 3. Technology Stack

- **Frontend:** React 19 + Vite + TypeScript PWA with Service Worker offline caching.
- **Backend:** Python FastAPI (REST / OpenAPI 3.0), Pydantic v2.
- **Database:** SQLite (WAL mode, Postgres-compatible schema).
- **Architecture:** Monorepo (`/web`, `/api`, `/docs`, `/data`).
- **AI / LLM Layer:** Abstracted provider interface (mock, OpenAI-compatible, Indic models) swappable via environment variables.

---

## 4. Phase-by-Phase Roadmap

1. **Phase 1 (Foundation):** Monorepo setup, core SQLite models, seed data ingestion, PWA shell with i18n (Marathi, Hindi, English), offline service worker, mock voice adapter, and automated tests.
2. **Phase 2 (Core Loop & Voice):** Multilingual voice discovery flow, deterministic eligibility rules engine, 30-day micro-step pathway generator, and offline sync queue.
3. **Phase 3 (Facilitator & Marketplace):** Facilitator dashboard, cohort management, module creator, and monetization flows.
4. **Phase 4 (Interoperability & Polish):** Standards-based connector APIs (ONEST/DigiLocker mocks), performance optimization on low-end mobile profiles, and demo hardening.
