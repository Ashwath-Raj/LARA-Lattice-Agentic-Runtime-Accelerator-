import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_health_endpoints(client):
    res = client.get("/api/v1/health/live")
    assert res.status_code == 200
    assert res.json() == {"status": "alive"}

    res2 = client.get("/api/v1/health/ready")
    assert res2.status_code == 200
    assert res2.json() == {"status": "ready"}

def test_health_readiness_failure_on_db_error(client, monkeypatch):
    from backend.app.repositories import base
    class BrokenRepo:
        def get(self, *args, **kwargs):
            raise RuntimeError("Simulated database connection failure")
    monkeypatch.setattr(base, "get_repository", lambda: BrokenRepo())

    res = client.get("/api/v1/health/ready")
    assert res.status_code == 503
    assert res.json()["status"] == "not_ready"
    assert "Database check failed" in res.json()["error"]

def test_unauthenticated_request_rejected(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
    assert "error" in res.json()
    assert res.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"

def test_demo_login_and_me_flow(client):
    res = client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    assert res.status_code == 200
    data = res.json()
    assert data["principal_id"] == "usr_operator_01"
    assert "operator" in data["roles"]

    # Cookie is returned and sent with subsequent requests
    res2 = client.get("/api/v1/auth/me")
    assert res2.status_code == 200
    assert res2.json()["principal_id"] == "usr_operator_01"

def test_task_creation_and_highway_resolution(client):
    # Login as operator
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})

    # Create task
    res = client.post("/api/v1/tasks", json={
        "title": "Investigate P-204 cavitation",
        "prompt": "Investigate cavitation in pump P-204 and check SOP-MNT-014 maintenance steps",
        "incident_id": "INC-204"
    })
    assert res.status_code == 202
    task_data = res.json()
    task_id = task_data["task_id"]
    assert task_id.startswith("tsk_")

    # Get task details
    res_task = client.get(f"/api/v1/tasks/{task_id}")
    assert res_task.status_code == 200
    t = res_task.json()
    assert t["status"] in ["AWAITING_APPROVAL", "COMPLETED"]
    assert t["result"] is not None

    # Resolve highway routes
    res_route = client.get(f"/api/v1/graph/routes/resolve?task_id={task_id}")
    assert res_route.status_code == 200
    route_info = res_route.json()
    assert "source:incident-log" in route_info["permitted_sources"]
    assert "source:vendor-contract" not in route_info["permitted_sources"]

def test_supervisor_approval_lifecycle(client):
    # 1. Operator initiates task
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res = client.post("/api/v1/tasks", json={
        "title": "Pump P-204 emergency maintenance",
        "prompt": "Urgent pump maintenance required for bearing overheating",
        "incident_id": "INC-204"
    })
    task_id = res.json()["task_id"]
    task_res = client.get(f"/api/v1/tasks/{task_id}").json()
    approval_id = task_res["result"].get("approval_id")
    assert approval_id is not None

    # Operator cannot approve
    res_op_appr = client.post(f"/api/v1/approvals/{approval_id}/decision", json={
        "decision": "APPROVE",
        "reason": "Operator self approval attempt"
    })
    assert res_op_appr.status_code == 409  # Separation of duties violation

    # 2. Switch to Supervisor
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_supervisor_01"})
    res_sup_appr = client.post(f"/api/v1/approvals/{approval_id}/decision", json={
        "decision": "APPROVE",
        "reason": "Approved according to current SOP-MNT-014 Rev 3.2"
    })
    assert res_sup_appr.status_code == 200
    appr_data = res_sup_appr.json()
    assert appr_data["status"] == "APPROVED"
    assert appr_data["decided_by"] == "usr_supervisor_01"
