# Disha Deployment Guide

This guide covers deploying the Disha web PWA and FastAPI backend to cloud platforms and local Docker containers.

---

## 1. Cloud Architecture Overview

Disha is designed as a decoupled architecture:
1. **Frontend PWA**: Static React + TypeScript SPA hosted on an HTTPS CDN (Vercel or Netlify) with offline caching via Service Worker / Cache API.
2. **Backend API**: Python FastAPI ASGI service hosted on Render or Railway, storing data in SQLite or PostgreSQL.

---

## 2. Deploying Web Client (Vercel / Netlify)

### A. Vercel Deployment

1. Connect your repository to [Vercel](https://vercel.com).
2. Configure Project Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Set Environment Variables in Vercel:
   - `VITE_API_URL`: `https://your-disha-api.onrender.com` (your backend URL)
4. Ensure SPA routing by creating `web/vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### B. Netlify Deployment

1. Connect repository to [Netlify](https://netlify.com).
2. Set Build settings:
   - **Base directory**: `web`
   - **Build command**: `npm run build`
   - **Publish directory**: `web/dist`
3. Netlify SPA redirect: create `web/public/_redirects`:
```text
/*    /index.html   200
```

---

## 3. Deploying API Backend (Render / Railway)

### A. Render (Web Service)

1. Create a **New Web Service** on [Render](https://render.com).
2. Connect your Git repository.
3. Configure Service:
   - **Environment**: Python 3 or Docker
   - **Build Command** (if Python): `pip install -r api/requirements.txt`
   - **Start Command**: `python -m uvicorn api.app.main:app --host 0.0.0.0 --port $PORT`
4. Set **Environment Variables** (MANDATORY FOR PRODUCTION):
   - `ENVIRONMENT`: `production`
   - `JWT_SECRET`: Generate a strong 64-character secret (`openssl rand -hex 32`)
     > [!CAUTION]
     > The application **refuses to start** in non-dev mode (`ENVIRONMENT=production`) if `JWT_SECRET` is missing or uses the default prototype secret.
   - `CORS_ORIGINS`: `https://your-disha-app.vercel.app` (Comma-separated list of your frontend origins without trailing slashes. Wildcard `*` is blocked).
   - `PARTNER_API_KEYS`: A secret token for partner feeds, e.g. `partner_prod_secret_token_123`
   - `DATABASE_URL`: `sqlite:////var/data/disha.db` (with a Render Persistent Disk mounted at `/var/data`) or a managed PostgreSQL connection string (`postgresql://user:pass@host/dbname`).

### B. Railway Deployment

1. Click **New Project** -> **Deploy from GitHub repo**.
2. Railway detects Dockerfile or Python automatically.
   - Set **DockerfilePath**: `Dockerfile.api`
3. Add Environment Variables:
   - `ENVIRONMENT=production`
   - `JWT_SECRET=<YOUR_SECURE_KEY>`
   - `CORS_ORIGINS=https://your-disha-app.vercel.app`
   - `PARTNER_API_KEYS=<YOUR_PARTNER_KEYS>`
4. Add a Persistent Volume at `/app` if using SQLite, or link a PostgreSQL database plugin.

---

## 4. Local One-Command Startup

For local evaluation without Docker:

### Windows:
Double-click or run:
```cmd
start.bat
```
This initializes the database, runs `/api/seed_demo.py`, starts the FastAPI backend on port 8000, and opens the web dev server on port 5173.

### macOS / Linux:
```bash
chmod +x start.sh
./start.sh
```

---

## 5. Local Docker Compose Deployment

To build and run all services locally in isolated containers:

```bash
docker compose up --build
```

- **Frontend Web**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **OpenAPI Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

To seed demo data in the running docker container:
```bash
docker compose exec api python api/seed_demo.py
```
