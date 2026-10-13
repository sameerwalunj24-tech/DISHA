import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Search for .env at project root
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

DEFAULT_DEV_SECRET = "disha_dev_insecure_default_secret_2026"

def validate_secrets(env: str, jwt_secret: str) -> None:
    """Refuses to allow application to run in non-dev mode with missing or default secret."""
    env_clean = env.strip().lower()
    is_dev = env_clean in ("development", "dev", "test")
    if not is_dev:
        if not jwt_secret or jwt_secret.strip() == "" or jwt_secret == DEFAULT_DEV_SECRET:
            raise RuntimeError(
                f"FATAL SECURITY CONFIGURATION: In non-development mode (ENVIRONMENT='{env}'), "
                "JWT_SECRET and all secrets must be explicitly provided via environment variables "
                "and cannot use the default prototype secret."
            )

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

    # JWT Secret loaded strictly from environment variable
    JWT_SECRET: str = os.getenv("JWT_SECRET", DEFAULT_DEV_SECRET)
    
    # Restrict CORS to configured origins by default (no wildcard *)
    CORS_ORIGINS: list[str] = [
        origin.strip() 
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip() and origin.strip() != "*"
    ]

    # Partner API Keys for external feeds / connectors
    PARTNER_API_KEYS: list[str] = [
        k.strip()
        for k in os.getenv("PARTNER_API_KEYS", "disha_partner_test_key_secret_2026,partner_key_demo_ngo").split(",")
        if k.strip()
    ]
    
    VOICE_ADAPTER: str = os.getenv("VOICE_ADAPTER", "mock")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "mock")

def get_settings() -> Settings:
    s = Settings()
    validate_secrets(s.ENVIRONMENT, s.JWT_SECRET)
    return s

settings = get_settings()
