import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.repositories.base import get_repository

@pytest.fixture
def client():
    return TestClient(app)

def test_audit_events_and_trace_query(client):
    repo = get_repository()
    # Seed an audit event
    repo.set("audit_events", "evt_trace_test_01", {
        "event_id": "evt_trace_test_01",
        "event_type": "POLICY_EVALUATED",
        "trace_id": "trc_test_audit_01",
        "task_id": "task_audit_01",
        "principal_id": "usr_operator_01",
        "tenant_id": "demo-enterprise",
        "action": "source.read",
        "policy_decision": "ALLOW",
        "reason_code": "CLEARANCE_MATCH"
    })

    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})

    # 1. Query by trace_id
    res_trace = client.get("/api/v1/audit/trc_test_audit_01")
    assert res_trace.status_code == 200
    events = res_trace.json()
    assert isinstance(events, list)
    assert len(events) >= 1
    assert events[0]["trace_id"] == "trc_test_audit_01"

    # 2. Get event by event_id
    res_evt = client.get("/api/v1/audit/events/evt_trace_test_01")
    assert res_evt.status_code == 200
    evt_data = res_evt.json()
    assert evt_data["event_id"] == "evt_trace_test_01"
    assert evt_data["policy_decision"] == "ALLOW"

    # 3. Nonexistent event yields 404
    res_404 = client.get("/api/v1/audit/events/evt_nonexistent99")
    assert res_404.status_code == 404

def test_audit_role_scoping(client):
    repo = get_repository()
    repo.set("audit_events", "evt_sup_only", {
        "event_id": "evt_sup_only",
        "event_type": "SUPERVISOR_ACTION",
        "trace_id": "trc_sup_only",
        "principal_id": "usr_supervisor_01",
        "tenant_id": "demo-enterprise",
        "action": "maintenance_request.approve"
    })

    # Operator cannot see supervisor's audit event when getting by id
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res = client.get("/api/v1/audit/events/evt_sup_only")
    assert res.status_code == 404

    # Supervisor can see it
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_supervisor_01"})
    res_sup = client.get("/api/v1/audit/events/evt_sup_only")
    assert res_sup.status_code == 200
