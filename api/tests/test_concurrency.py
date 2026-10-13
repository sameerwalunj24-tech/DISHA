"""
test_concurrency.py - Concurrency Hardening & Engine Abstraction Tests
======================================================================
Tests:
1. Dynamic DB engine abstraction (SQLite WAL & PostgreSQL connection pooling).
2. URL normalization for postgres:// to postgresql://.
3. High-concurrency thread safety on /api/v1/sync/batch and /api/v1/discovery/session
   with zero deadlocks and clean transactional commits.
"""

import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
import pytest
from fastapi.testclient import TestClient

from api.app.main import app
from api.app.database import create_db_engine, SessionLocal
from api.app.models import Student, Pathway, SyncLog

client = TestClient(app)


from unittest.mock import MagicMock, patch
from sqlalchemy import text

def test_dynamic_engine_abstraction_sqlite(tmp_path):
    """SQLite engine must configure check_same_thread=False and WAL mode pragma."""
    db_file = tmp_path / "test_concurrency_wal.db"
    sqlite_url = f"sqlite:///{db_file}"
    eng = create_db_engine(sqlite_url)
    assert eng.dialect.name == "sqlite"
    with eng.connect() as conn:
        mode = conn.execute(text("PRAGMA journal_mode")).scalar()
        assert mode.lower() == "wal"


import sys
from unittest.mock import MagicMock
from sqlalchemy import text

@pytest.fixture
def mock_postgres_driver():
    """Mocks psycopg module in sys.modules for headless environments without C-extension binary."""
    m_psycopg = MagicMock()
    m_adapt = MagicMock()
    orig_psycopg = sys.modules.get("psycopg")
    orig_adapt = sys.modules.get("psycopg.adapt")
    sys.modules["psycopg"] = m_psycopg
    sys.modules["psycopg.adapt"] = m_adapt
    try:
        yield
    finally:
        if orig_psycopg is not None:
            sys.modules["psycopg"] = orig_psycopg
        else:
            sys.modules.pop("psycopg", None)
        if orig_adapt is not None:
            sys.modules["psycopg.adapt"] = orig_adapt
        else:
            sys.modules.pop("psycopg.adapt", None)


def test_dynamic_engine_abstraction_postgres(mock_postgres_driver):
    """PostgreSQL engine must normalize postgres:// and configure connection pooling."""
    legacy_pg_url = "postgresql://disha_user:secure_pwd@localhost:5432/disha_db"
    eng = create_db_engine(legacy_pg_url)
    assert eng.dialect.name == "postgresql"
    assert eng.pool.size() == 10
    assert eng.pool._max_overflow == 20
    assert eng.pool._pre_ping is True


def test_postgres_url_normalization(mock_postgres_driver):
    """postgres:// must be normalized to postgresql://."""
    pg_url = "postgres://disha_user:secure_pwd@localhost:5432/disha_db"
    eng = create_db_engine(pg_url)
    assert eng.dialect.name == "postgresql"
    assert "postgresql://" in str(eng.url)





def test_high_concurrency_sync_and_discovery_zero_deadlocks():
    """
    Simulates concurrent requests hitting /api/v1/sync/batch and /api/v1/discovery/session
    simultaneously across multiple worker threads to assert zero deadlocks, thread-safety,
    and transactional integrity.
    """
    concurrency_count = 12
    created_student_names = [f"कन्करंट विद्यार्थी {i}_{uuid.uuid4().hex[:6]}" for i in range(concurrency_count)]

    def run_sync_batch(index: int):
        st_name = created_student_names[index]
        client_id = f"client_dev_{index}"
        batch = {
            "items": [
                {
                    "id": str(uuid.uuid4()),
                    "type": "offline_quiz_result",
                    "client_id": client_id,
                    "client_seq": 1,
                    "payload": {
                        "student_name": st_name,
                        "language": "mr",
                        "guardian_consent": True,
                        "consent_receipt_hash": f"hash_{uuid.uuid4().hex[:16]}",
                        "answers": {"1": "opt_1_solar", "2": "opt_2_site"}
                    },
                    "updated_at": "2026-10-13T10:00:00Z"
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "pathway_progress",
                    "client_id": client_id,
                    "client_seq": 2,
                    "payload": {
                        "completed_step_ids": ["step_1"]
                    },
                    "updated_at": "2026-10-13T10:01:00Z"
                }
            ]
        }
        res = client.post("/api/v1/sync/batch", json=batch)
        return ("sync", res.status_code, res.json())

    def run_discovery_session(index: int):
        # 1. Start discovery session
        res_start = client.post("/api/v1/discovery/session", json={"language": "mr"})
        if res_start.status_code != 200:
            return ("discovery", res_start.status_code, res_start.text)

        sess_data = res_start.json()
        session_id = sess_data["session_id"]

        # 2. Answer question 1
        res_answer = client.post("/api/v1/discovery/answer", json={
            "session_id": session_id,
            "question_id": "q1",
            "answer_text": "सोलर आणि वीज काम (Solar)",
            "guardian_consent": True,
            "student_name": f"डिस्कव्हरी विद्यार्थी {index}"
        })
        return ("discovery", res_answer.status_code, res_answer.json())

    futures = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        for i in range(concurrency_count):
            futures.append(executor.submit(run_sync_batch, i))
            futures.append(executor.submit(run_discovery_session, i))

    results = []
    for f in as_completed(futures):
        results.append(f.result())

    # Assert all operations succeeded without any 500s or database deadlocks
    for task_type, status_code, body in results:
        assert status_code == 200, f"Task {task_type} failed with status {status_code}: {body}"
        if task_type == "sync":
            assert body["processed_count"] == 2
            assert body["failed_count"] == 0

    # Verify database transactional integrity
    db = SessionLocal()
    try:
        for st_name in created_student_names:
            student = db.query(Student).filter(Student.name == st_name).first()
            assert student is not None, f"Student {st_name} should have been committed to DB"
            assert student.guardian_consent is True

            # Pathway created
            pw = db.query(Pathway).filter(Pathway.student_id == student.id).first()
            assert pw is not None
            assert "step_1" in pw.micro_steps_json
    finally:
        db.close()
