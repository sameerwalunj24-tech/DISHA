import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Search for .env at project root
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

class Settings(BaseModel):
    PROJECT_NAME: str = "Disha API"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = "Voice-First Multilingual AI Career & Livelihood Guide for Rural India"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # SQLite default, easily swapped with PostgreSQL via DATABASE_URL
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{ROOT_DIR / 'disha.db'}"
    )
    
    CORS_ORIGINS: list[str] = [
        origin.strip() 
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,*").split(",")
        if origin.strip()
    ]
    
    VOICE_ADAPTER: str = os.getenv("VOICE_ADAPTER", "mock")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "mock")

settings = Settings()
