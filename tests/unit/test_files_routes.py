import io
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_file_upload_and_download(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})

    file_content = b"Simulated log file contents for vibration analysis"
    file = io.BytesIO(file_content)

    res = client.post(
        "/api/v1/files/upload",
        files={"file": ("vibration_log.txt", file, "text/plain")}
    )
    assert res.status_code == 201
    data = res.json()
    assert "file_id" in data
    assert data["filename"] == "vibration_log.txt"
    assert data["size_bytes"] == len(file_content)
    file_id = data["file_id"]

    # Download the file
    res_down = client.get(f"/api/v1/files/{file_id}/download")
    assert res_down.status_code == 200
    assert res_down.content == file_content
    assert "vibration_log.txt" in res_down.headers.get("Content-Disposition", "")

def test_file_upload_rejected_disallowed_mime(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})

    file = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00")
    res = client.post(
        "/api/v1/files/upload",
        files={"file": ("malicious.exe", file, "application/x-dosexec")}
    )
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "VALIDATION_FAILED"

def test_file_upload_rejected_oversized(client, monkeypatch):
    from backend.app.core.config import settings
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 50)

    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    file = io.BytesIO(b"A" * 100)
    res = client.post(
        "/api/v1/files/upload",
        files={"file": ("large_log.txt", file, "text/plain")}
    )
    assert res.status_code == 422
    assert "exceeds maximum" in res.json()["error"]["message"]

def test_file_download_cross_tenant_isolation(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    file = io.BytesIO(b"Secret tenant content")
    res = client.post(
        "/api/v1/files/upload",
        files={"file": ("secret.txt", file, "text/plain")}
    )
    assert res.status_code == 201
    file_id = res.json()["file_id"]

    # Manually change tenant of file to alien-corp in repository
    from backend.app.repositories.base import get_repository
    repo = get_repository()
    repo.update("files", file_id, {"tenant_id": "alien-corp"})

    # Operator from demo-enterprise attempts to download
    res_down = client.get(f"/api/v1/files/{file_id}/download")
    assert res_down.status_code == 404
    assert res_down.json()["error"]["code"] == "NOT_FOUND"

def test_file_download_nonexistent(client):
    client.post("/api/v1/auth/demo-login", json={"principal_id": "usr_operator_01"})
    res = client.get("/api/v1/files/fil_nonexistent99/download")
    assert res.status_code == 404
