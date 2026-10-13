from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from api.app.config import settings

# Handle sqlite connect_args
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db(target_engine=None):
    """
    Initializes database schema from scratch (for fresh clones and test setups).
    """
    # Import all models to ensure they register on Base.metadata
    from api.app import models  # noqa: F401
    eng = target_engine or engine
    Base.metadata.create_all(bind=eng)

def set_engine(new_engine):
    """Allows test fixtures to rebind engine to a temporary test database."""
    global engine, SessionLocal
    engine = new_engine
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
