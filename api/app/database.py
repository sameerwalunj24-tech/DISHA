from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from api.app.config import settings

def create_db_engine(db_url: str = None):
    """
    Creates SQLAlchemy engine dynamically based on the DATABASE_URL dialect.
    - SQLite: check_same_thread=False, WAL mode pragma on connect.
    - PostgreSQL: connection pooling (pool_size=10, max_overflow=20, pool_pre_ping=True).
    """
    url = db_url or settings.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    if url.startswith("sqlite"):
        eng = create_engine(
            url,
            connect_args={"check_same_thread": False},
            echo=False
        )

        @event.listens_for(eng, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            try:
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.close()
            except Exception:
                pass

        return eng
    else:
        return create_engine(
            url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            echo=False
        )

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def init_db(target_engine=None):
    """
    Initializes database schema from scratch (for fresh clones and test setups).
    Uses dialect-agnostic table reflection to perform safe column migrations across SQLite & PostgreSQL.
    """
    # Import all models to ensure they register on Base.metadata
    from api.app import models  # noqa: F401
    eng = target_engine or engine
    Base.metadata.create_all(bind=eng)

    try:
        inspector = inspect(eng)
        table_names = inspector.get_table_names()
        with eng.connect() as conn:
            if "students" in table_names:
                cols = [c["name"] for c in inspector.get_columns("students")]
                if "consent_receipt_hash" not in cols:
                    conn.execute(text("ALTER TABLE students ADD COLUMN consent_receipt_hash VARCHAR(64)"))
                    conn.commit()
                if "consent_version" not in cols:
                    conn.execute(text("ALTER TABLE students ADD COLUMN consent_version VARCHAR(20) DEFAULT 'DPDP_V1.0'"))
                    conn.commit()

            if "sync_logs" in table_names:
                cols_sync = [c["name"] for c in inspector.get_columns("sync_logs")]
                if "client_id" not in cols_sync:
                    conn.execute(text("ALTER TABLE sync_logs ADD COLUMN client_id VARCHAR(64)"))
                    conn.commit()
                if "client_seq" not in cols_sync:
                    conn.execute(text("ALTER TABLE sync_logs ADD COLUMN client_seq INTEGER"))
                    conn.commit()
    except Exception:
        pass

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
