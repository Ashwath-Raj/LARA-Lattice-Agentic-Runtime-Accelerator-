import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.repositories.base import InMemoryRepository

@pytest.fixture
def client():
    return TestClient(app)

def test_readiness_healthy_in_memory(client):
    """Verify /health/ready returns 200 with all component details in dev/test."""
    res = client.get("/api/v1/health/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert "components" in data

    components = data["components"]
    # Database
    assert components["database"]["status"] == "ok"
    # Principals
    assert components["principals"]["status"] == "ok"
    assert components["principals"]["count"] > 0
    # Vertex AI (reported separately)
    assert components["vertex_ai"]["status"] == "configured"
    assert components["vertex_ai"]["model"] == "gemini-3.8-flash"
    assert components["vertex_ai"]["location"] == "global"
    assert "not consumed by health probes" in components["vertex_ai"]["note"]
    # Sandbox
    assert "kill_switch" in components["sandbox"]

def test_readiness_fails_when_principals_uninitialized(client, monkeypatch):
    """Verify /health/ready returns 503 if database is reachable but zero principals are bootstrapped."""
    from backend.app.repositories import base
    empty_repo = InMemoryRepository()
    # Wipe out synthetic principals
    empty_repo._storage["principals"] = {}
    monkeypatch.setattr(base, "get_repository", lambda: empty_repo)

    res = client.get("/api/v1/health/ready")
    assert res.status_code == 503
    data = res.json()
    assert data["status"] == "not_ready"
    assert data["components"]["principals"]["status"] == "uninitialized"
    assert any("Zero principals provisioned" in err for err in data["errors"])

def test_readiness_fails_when_database_down(client, monkeypatch):
    """Verify /health/ready returns 503 if database check throws an exception."""
    from backend.app.repositories import base
    class FailingRepo:
        def get(self, *args, **kwargs):
            raise ConnectionError("Firestore timeout")
        def list(self, *args, **kwargs):
            raise ConnectionError("Firestore timeout")

    monkeypatch.setattr(base, "get_repository", lambda: FailingRepo())

    res = client.get("/api/v1/health/ready")
    assert res.status_code == 503
    data = res.json()
    assert data["status"] == "not_ready"
    assert data["components"]["database"]["status"] == "down"

def test_readiness_fails_in_production_missing_mandatory_vars(client, monkeypatch):
    """Verify /health/ready returns 503 in production if mandatory env vars are missing."""
    from backend.app.core.config import settings
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "GOOGLE_CLOUD_PROJECT", None)

    res = client.get("/api/v1/health/ready")
    assert res.status_code == 503
    data = res.json()
    assert data["status"] == "not_ready"
    assert any("GOOGLE_CLOUD_PROJECT required in production" in err for err in data["errors"])
