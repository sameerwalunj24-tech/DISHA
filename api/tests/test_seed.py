import pytest
from pathlib import Path
from api.seed import seed_opportunities
from api.app.database import SessionLocal
from api.app.models import Opportunity

def test_seed_opportunities_inserts_records():
    csv_path = Path(__file__).resolve().parent.parent.parent / "data" / "opportunities.csv"
    assert csv_path.exists()
    
    total_processed = seed_opportunities(csv_path)
    assert total_processed >= 10

    db = SessionLocal()
    try:
        opps = db.query(Opportunity).all()
        assert len(opps) >= 10
        # Check first item fields
        solar_opp = db.query(Opportunity).filter(Opportunity.id == 1).first()
        assert solar_opp is not None
        assert "Solar" in solar_opp.title
        assert solar_opp.verification_status == "verified"
        assert solar_opp.category == "apprenticeship"
        assert solar_opp.last_verified == "2026-10-01"
    finally:
        db.close()
