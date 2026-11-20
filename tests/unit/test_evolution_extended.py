import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_evolution_get_proposal(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})

    # Create proposal
    res = client.post("/api/v1/evolution/proposals", json={
        "target_type": "PROMPT",
        "target_id": "prompt:research_agent",
        "trigger_trace_ids": ["trc_mock_01"],
        "failure_summary": "SOP verification gap",
        "change_summary": "Add SOP revision date cross-checking",
        "candidate_content": "You are an enhanced research agent. Always check SOP revision dates."
    })
    assert res.status_code == 201
    proposal_id = res.json()["proposal_id"]

    # Get proposal
    res_get = client.get(f"/api/v1/evolution/proposals/{proposal_id}")
    assert res_get.status_code == 200
    assert res_get.json()["proposal_id"] == proposal_id
    assert res_get.json()["target_id"] == "prompt:research_agent"

def test_evolution_rejection_flow(client):
    # 1. Create proposal as operator
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res = client.post("/api/v1/evolution/proposals", json={
        "target_type": "PROMPT",
        "target_id": "prompt:analysis_agent",
        "trigger_trace_ids": ["trc_mock_02"],
        "failure_summary": "Incomplete fishbone",
        "change_summary": "Enforce 5-whys depth",
        "candidate_content": "You are an enhanced analysis agent. Apply strict 5-whys."
    })
    assert res.status_code == 201
    proposal_id = res.json()["proposal_id"]

    # 2. Operator cannot reject (must be admin)
    res_rej_op = client.post(
        f"/api/v1/evolution/proposals/{proposal_id}/reject",
        json={"reason": "Operator trying to reject"}
    )
    assert res_rej_op.status_code == 403

    # 3. Admin rejects proposal
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_admin_01"})
    res_rej_admin = client.post(
        f"/api/v1/evolution/proposals/{proposal_id}/reject",
        json={"reason": "Candidate does not satisfy enterprise safety guidelines"}
    )
    assert res_rej_admin.status_code == 200
    assert res_rej_admin.json()["status"] == "REJECTED"
    assert res_rej_admin.json()["rejected_by"] == "usr_admin_01"
    assert "safety guidelines" in res_rej_admin.json()["rejection_reason"]

def test_evolution_rollback_flow(client):
    # Operator cannot rollback
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res_op = client.post(
        "/api/v1/evolution/versions/v1.0.1/rollback",
        json={"target_id": "prompt:research_agent", "rollback_to_version": "v1.0.0"}
    )
    assert res_op.status_code == 403

    # Admin can rollback
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_admin_01"})
    res_admin = client.post(
        "/api/v1/evolution/versions/v1.0.1/rollback",
        json={"target_id": "prompt:research_agent", "rollback_to_version": "v1.0.0"}
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["status"] == "ROLLED_BACK"
    assert res_admin.json()["target_id"] == "prompt:research_agent"
    assert res_admin.json()["active_version"] == "v1.0.0"
