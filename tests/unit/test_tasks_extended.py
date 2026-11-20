import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_task_run_lifecycle_and_conflict(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})

    # 1. Create task
    res = client.post("/api/v1/tasks", json={
        "title": "Extended Task Run Test",
        "prompt": "General inspection of electrical subsystem",
    })
    assert res.status_code == 202
    task_id = res.json()["task_id"]

    # Reset status to QUEUED in repository to simulate async task execution queue
    from backend.app.repositories.base import get_repository
    repo = get_repository()
    repo.update("tasks", task_id, {"status": "QUEUED"})

    # 2. Run the queued task
    res_run = client.post(f"/api/v1/tasks/{task_id}/run")
    assert res_run.status_code == 200
    data = res_run.json()
    assert data["status"] in ["AWAITING_APPROVAL", "COMPLETED"]

    # 3. Attempting to run an already completed task causes 409 Conflict
    if data["status"] == "COMPLETED":
        res_re_run = client.post(f"/api/v1/tasks/{task_id}/run")
        assert res_re_run.status_code == 409
        assert res_re_run.json()["error"]["code"] == "STATE_CONFLICT"

def test_task_cancel_lifecycle(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})

    # 1. Create task with maintenance prompt so it transitions to AWAITING_APPROVAL (non-terminal)
    res = client.post("/api/v1/tasks", json={
        "title": "Task To Cancel",
        "prompt": "Urgent pump maintenance required for bearing overheating",
        "incident_id": "INC-204"
    })
    assert res.status_code == 202
    task_id = res.json()["task_id"]

    # Confirm it is non-terminal (AWAITING_APPROVAL)
    res_get = client.get(f"/api/v1/tasks/{task_id}")
    assert res_get.json()["status"] == "AWAITING_APPROVAL"

    # 2. Cancel the pending task
    res_cancel = client.post(f"/api/v1/tasks/{task_id}/cancel")
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "CANCELLED"

    # 3. Trying to cancel an already cancelled task yields 409 Conflict
    res_cancel_again = client.post(f"/api/v1/tasks/{task_id}/cancel")
    assert res_cancel_again.status_code == 409
    assert res_cancel_again.json()["error"]["code"] == "STATE_CONFLICT"

def test_task_events_timeline(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})

    # Create task
    res = client.post("/api/v1/tasks", json={
        "title": "Events Timeline Test",
        "prompt": "Investigate P-204 cavitation",
        "incident_id": "INC-204"
    })
    assert res.status_code == 202
    task_id = res.json()["task_id"]

    # Run task
    client.post(f"/api/v1/tasks/{task_id}/run")

    # Get events
    res_events = client.get(f"/api/v1/tasks/{task_id}/events")
    assert res_events.status_code == 200
    events = res_events.json()
    assert isinstance(events, list)
    assert len(events) >= 1
    event_types = [e["event_type"] for e in events]
    assert "TASK_CREATED" in event_types
