import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.repositories.base import get_repository

@pytest.fixture
def client():
    return TestClient(app)

def test_approvals_role_scoping(client):
    repo = get_repository()
    # Seed an approval for operator
    repo.set("approvals", "app_test_01", {
        "approval_id": "app_test_01",
        "task_id": "task_demo_01",
        "action": "maintenance_request.execute",
        "requested_by": "usr_operator_01",
        "tenant_id": "demo-enterprise",
        "status": "PENDING"
    })
    # Seed an approval for someone else
    repo.set("approvals", "app_test_02", {
        "approval_id": "app_test_02",
        "task_id": "task_demo_02",
        "action": "maintenance_request.execute",
        "requested_by": "usr_other_operator",
        "tenant_id": "demo-enterprise",
        "status": "PENDING"
    })

    # Operator only sees own
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res_op = client.get("/api/v1/approvals")
    assert res_op.status_code == 200
    op_approvals = res_op.json()
    assert all(a["requested_by"] == "usr_operator_01" for a in op_approvals)

    # Supervisor sees all in tenant
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_supervisor_01"})
    res_sup = client.get("/api/v1/approvals")
    assert res_sup.status_code == 200
    sup_approvals = res_sup.json()
    app_ids = [a["approval_id"] for a in sup_approvals]
    assert "app_test_01" in app_ids
    assert "app_test_02" in app_ids

def test_get_approval_by_id(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res = client.get("/api/v1/approvals/app_test_01")
    assert res.status_code == 200
    assert res.json()["approval_id"] == "app_test_01"

def test_get_approval_nonexistent(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res = client.get("/api/v1/approvals/app_nonexistent99")
    assert res.status_code == 404

def test_approval_conflict_on_already_decided(client):
    repo = get_repository()
    repo.set("approvals", "app_decided_01", {
        "approval_id": "app_decided_01",
        "task_id": "task_demo_03",
        "action": "maintenance_request.execute",
        "requested_by": "usr_operator_01",
        "tenant_id": "demo-enterprise",
        "status": "APPROVED",
        "decision": "APPROVE"
    })

    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_supervisor_01"})
    res = client.post(
        "/api/v1/approvals/app_decided_01/decision",
        json={"decision": "APPROVE", "reason": "Attempting to approve again"}
    )
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "STATE_CONFLICT"
