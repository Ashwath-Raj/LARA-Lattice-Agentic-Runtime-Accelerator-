import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_graph_summary(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res = client.get("/api/v1/graph/summary")
    assert res.status_code == 200
    data = res.json()
    assert "node_count" in data
    assert "edge_count" in data
    assert "version" in data
    assert data["node_count"] > 0
    assert data["edge_count"] > 0

def test_graph_nodes_filter(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})

    # Get all nodes
    res_all = client.get("/api/v1/graph/nodes")
    assert res_all.status_code == 200
    all_nodes = res_all.json()
    assert isinstance(all_nodes, list)

    # Filter by type 'source'
    res_src = client.get("/api/v1/graph/nodes?type=source")
    assert res_src.status_code == 200
    sources = res_src.json()
    assert isinstance(sources, list)
    for s in sources:
        assert s["type"] == "source"

def test_graph_version(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res = client.get("/api/v1/graph/version")
    assert res.status_code == 200
    data = res.json()
    assert "version" in data
    assert isinstance(data["version"], int)

def test_graph_routes_preview(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res = client.post("/api/v1/graph/routes/preview", json={
        "intent": "Investigate P-204 cavitation",
        "required_capabilities": ["source.read", "analysis"]
    })
    assert res.status_code == 200
    preview = res.json()
    assert "route_id" in preview
    assert "selected_path" in preview
    assert "score_components" in preview
    assert preview["principal_id"] == "usr_operator_01"

def test_graph_edges(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res = client.get("/api/v1/graph/edges")
    assert res.status_code == 200
    edges = res.json()
    assert isinstance(edges, list)
    for edge in edges:
        assert "source" in edge
        assert "target" in edge
