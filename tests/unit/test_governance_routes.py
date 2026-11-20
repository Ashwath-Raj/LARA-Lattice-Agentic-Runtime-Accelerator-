import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_governance_principals_admin_only(client):
    # Operator is denied
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res = client.get("/api/v1/governance/principals")
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "POLICY_DENIED"

    # Supervisor is denied
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_supervisor_01"})
    res2 = client.get("/api/v1/governance/principals")
    assert res2.status_code == 403

    # Admin is allowed
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_admin_01"})
    res3 = client.get("/api/v1/governance/principals")
    assert res3.status_code == 200
    principals = res3.json()
    assert isinstance(principals, list)
    assert len(principals) >= 4

    # Security check: verify no password hashes are exposed
    for p in principals:
        assert "password_hash" not in p
        assert "password" not in p
        assert "principal_id" in p
        assert "roles" in p

def test_governance_decisions_scoping(client):
    # Log in as operator and create/record some decisions
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})

    # Evaluate a policy to generate a decision
    client.post("/api/v1/policies/evaluate", json={
        "action": "source.read",
        "resource_id": "source:incident-log",
        "purpose": "incident_investigation"
    })

    # Retrieve governance decisions
    res = client.get("/api/v1/governance/decisions")
    assert res.status_code == 200
    decisions = res.json()
    assert isinstance(decisions, list)
    for d in decisions:
        assert d.get("tenant_id", "demo-enterprise") == "demo-enterprise"
