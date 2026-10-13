"""
test_fresh_db.py - Verifies fresh clone schema creation and database isolation
==============================================================================
Tests:
1. Fresh clone creates the complete schema from scratch in a new empty database.
2. All tables (students, facilitators, opportunities, pathways) are created with correct columns.
3. Tests run against a temporary test database, NEVER modifying disha.db.
"""

import os
import tempfile
from pathlib import Path
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from api.app.database import init_db
from api.app.models import Student, Opportunity, Pathway, Facilitator

ROOT_DIR = Path(__file__).resolve().parents[2]


def test_fresh_clone_creates_all_tables_from_scratch():
    """
    Simulates a fresh repository clone with no existing SQLite database.
    Running init_db() must build all tables cleanly from scratch.
    """
    temp_fd, temp_db_file = tempfile.mkstemp(prefix="fresh_clone_", suffix=".db")
    os.close(temp_fd)

    try:
        fresh_engine = create_engine(
            f"sqlite:///{temp_db_file}",
            connect_args={"check_same_thread": False}
        )

        # Run fresh schema initialization
        init_db(target_engine=fresh_engine)

        inspector = inspect(fresh_engine)
        table_names = inspector.get_table_names()

        # Verify all core tables exist
        expected_tables = {"students", "facilitators", "opportunities", "pathways"}
        assert expected_tables.issubset(set(table_names)), (
            f"Expected tables {expected_tables} in fresh schema, got: {table_names}"
        )

        # Verify columns on students table
        student_cols = {col["name"] for col in inspector.get_columns("students")}
        assert "id" in student_cols
        assert "guardian_consent" in student_cols
        assert "age_years" in student_cols
        assert "preferred_language" in student_cols

        # Verify columns on opportunities table
        opp_cols = {col["name"] for col in inspector.get_columns("opportunities")}
        assert "verification_status" in opp_cols
        assert "verified_by" in opp_cols
        assert "verified_on" in opp_cols

        # Verify insert and query on fresh database
        FreshSession = sessionmaker(bind=fresh_engine)
        db = FreshSession()
        try:
            student = Student(name="Fresh Learner", grade=10, guardian_consent=True)
            db.add(student)
            db.commit()

            queried = db.query(Student).filter(Student.name == "Fresh Learner").first()
            assert queried is not None
            assert queried.grade == 10
        finally:
            db.close()
            fresh_engine.dispose()
    finally:
        if os.path.exists(temp_db_file):
            os.remove(temp_db_file)
