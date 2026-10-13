#!/usr/bin/env bash
set -e

echo "==================================================="
echo "  Disha (दिशा) - One-Command Local Startup"
echo "==================================================="

echo "[1/3] Checking Python dependencies..."
python3 -c "import fastapi, uvicorn, sqlalchemy" 2>/dev/null || pip3 install -r api/requirements.txt

echo "[2/3] Initializing database & seeding demo data..."
python3 api/seed_demo.py

echo "[3/3] Launching Backend API & Web Client..."
echo "  - Backend API: http://127.0.0.1:8000"
echo "  - OpenAPI Docs: http://127.0.0.1:8000/docs"
echo "  - Web Client: http://localhost:5173"
echo "==================================================="

# Start backend in background
python3 -m uvicorn api.app.main:app --host 127.0.0.1 --port 8000 --reload &
API_PID=$!

# Trap Ctrl+C to kill both services
trap "kill $API_PID 2>/dev/null; exit" SIGINT SIGTERM EXIT

# Start Vite frontend in foreground
cd web && npm run dev
