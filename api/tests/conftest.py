"""
conftest.py - Pytest Configuration for Disha Tests
===================================================
Guarantees:
1. Tests run strictly against an isolated temporary SQLite database, NEVER disha.db.
2. The temporary database is configured in pytest_configure before any test modules import database.
3. Fresh schema is initialized with init_db() and seeded from data/opportunities.csv.
4. Temporary database is cleaned up upon test session teardown.
5. Verifies disha.db is never modified during tests.
"""

import os
import tempfile
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT_DIR = Path(__file__).resolve().parents[2]
DISHA_DB_PATH = ROOT_DIR / "disha.db"

TEMP_DB_PATH = None
DISHA_MTIME_BEFORE = None


def pytest_configure(config):
    """
    Runs before any test files are loaded or imported.
    Sets DATABASE_URL in os.environ so all imports naturally bind to the temporary test DB.
    """
    global TEMP_DB_PATH, DISHA_MTIME_BEFORE

    temp_fd, TEMP_DB_PATH = tempfile.mkstemp(prefix="test_disha_", suffix=".db")
    os.close(temp_fd)

    test_db_url = f"sqlite:///{TEMP_DB_PATH}"
    os.environ["DATABASE_URL"] = test_db_url

    if DISHA_DB_PATH.exists():
        DISHA_MTIME_BEFORE = DISHA_DB_PATH.stat().st_mtime


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Initializes schema and seeds opportunities on the temporary test DB."""
    from api.app.database import engine, init_db, set_engine, get_db
    from api.app.main import app
    from api.seed import seed_opportunities

    test_db_url = f"sqlite:///{TEMP_DB_PATH}"
    test_engine = create_engine(
        test_db_url,
        connect_args={"check_same_thread": False},
        echo=False
    )
    set_engine(test_engine)

    # Initialize full schema
    init_db(target_engine=test_engine)

    # Seed opportunities catalog
    seed_opportunities()

    yield

    test_engine.dispose()


def pytest_unconfigure(config):
    """Cleans up the temporary database file and verifies disha.db was never touched."""
    global TEMP_DB_PATH, DISHA_MTIME_BEFORE

    if TEMP_DB_PATH and os.path.exists(TEMP_DB_PATH):
        try:
            os.remove(TEMP_DB_PATH)
        except Exception:
            pass

    if DISHA_MTIME_BEFORE is not None and DISHA_DB_PATH.exists():
        disha_mtime_after = DISHA_DB_PATH.stat().st_mtime
        assert DISHA_MTIME_BEFORE == disha_mtime_after, (
            "SAFETY VIOLATION: disha.db was modified during test run! Tests must use temporary test database."
        )
