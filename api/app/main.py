from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from api.app.config import settings
from api.app.database import engine, Base, get_db
from api.app.models import Opportunity
from api.app.schemas import HealthResponse, OpportunityResponse
from api.app.discovery.router import router as discovery_router
from api.app.matching.router import router as matching_router
from api.app.pathways.router import router as pathways_router
from api.app.sync.router import router as sync_router
from api.app.facilitator.router import router as facilitator_router
from api.app.marketplace.router import router as marketplace_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup (creates all tables from scratch on fresh clone)
    from api.app.database import init_db
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Restrict CORS to configured origins (from settings / environment)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(discovery_router)
app.include_router(matching_router)
app.include_router(pathways_router)
app.include_router(sync_router)
app.include_router(facilitator_router)
app.include_router(marketplace_router)

@app.get("/health", response_model=HealthResponse, tags=["System"])
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint validating API and database connectivity."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return HealthResponse(
        status="ok" if "unhealthy" not in db_status else "degraded",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database=db_status
    )

@app.get("/api/v1/opportunities", response_model=List[OpportunityResponse], tags=["Opportunities"])
def list_opportunities(
    category: str = None,
    grade: int = None,
    db: Session = Depends(get_db)
):
    """Retrieve catalog of verified opportunities with deterministic filters."""
    query = db.query(Opportunity)
    if category:
        query = query.filter(Opportunity.category == category)
    if grade:
        query = query.filter(Opportunity.min_grade <= grade, Opportunity.max_grade >= grade)
    
    return query.all()
