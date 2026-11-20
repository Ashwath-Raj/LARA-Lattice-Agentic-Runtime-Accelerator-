import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_list_agents(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res = client.get("/api/v1/agents")
    assert res.status_code == 200
    agents = res.json()
    assert isinstance(agents, list)
    agent_ids = [a["agent_id"] for a in agents]
    assert "agent:research" in agent_ids
    assert "agent:analysis" in agent_ids
    assert "agent:verification" in agent_ids
    assert "agent:diagnostician" in agent_ids

def test_get_agent_by_id(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res = client.get("/api/v1/agents/agent:research")
    assert res.status_code == 200
    data = res.json()
    assert data["agent_id"] == "agent:research"
    assert data["name"] == "Research Specialist Agent"
    assert "source.read.internal" in data["capabilities"]

def test_get_nonexistent_agent(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res = client.get("/api/v1/agents/agent:nonexistent")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"

def test_get_agent_versions(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res = client.get("/api/v1/agents/agent:research/versions")
    assert res.status_code == 200
    versions = res.json()
    assert isinstance(versions, list)
    assert len(versions) >= 1
    assert "version_id" in versions[0]
    assert "status" in versions[0]

def test_get_agent_skills(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res = client.get("/api/v1/agents/agent:diagnostician/skills")
    assert res.status_code == 200
    skills = res.json()
    assert isinstance(skills, list)
    assert len(skills) >= 1
    skill_names = [s["name"] for s in skills]
    assert "Trace Failure Analysis" in skill_names
