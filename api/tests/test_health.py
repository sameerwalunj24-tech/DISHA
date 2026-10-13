import pytest
from fastapi.testclient import TestClient
from api.app.main import app

client = TestClient(app)

def test_health_check_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "Disha API"
    assert data["database"] == "connected"

def test_openapi_docs_accessible():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    assert "paths" in spec
    assert "/health" in spec["paths"]
    assert "/api/v1/opportunities" in spec["paths"]
