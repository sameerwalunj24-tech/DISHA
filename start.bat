@echo off
echo ===================================================
echo   Disha (दिशा) - One-Command Local Startup
echo ===================================================

echo [1/3] Checking Python backend dependencies...
python -c "import fastapi, uvicorn, sqlalchemy" 2>nul
if %errorlevel% neq 0 (
    echo Installing backend dependencies...
    pip install -r api/requirements.txt
)

echo [2/3] Initializing database and seeding demo data...
python api/seed_demo.py

echo [3/3] Launching FastAPI backend (Port 8000) and Web client (Port 5173)...
echo.
echo   - Backend API: http://127.0.0.1:8000
echo   - OpenAPI Docs: http://127.0.0.1:8000/docs
echo   - Web Client: http://localhost:5173
echo.
echo Press Ctrl+C in this terminal window to stop all services.
echo ===================================================

start "Disha API (Port 8000)" cmd /k "python -m uvicorn api.app.main:app --host 127.0.0.1 --port 8000 --reload"
cd web && npm run dev
