import pytest
import httpx
from unittest.mock import patch, MagicMock
from backend.app.adapters.goboxd import GoboxdClient
from backend.app.core.config import settings
from backend.app.core.errors import SandboxError, SandboxUnavailableError, SandboxTimeoutError

@pytest.fixture(autouse=True)
def disable_kill_switch_for_client_tests():
    orig = settings.GOBOXD_KILL_SWITCH
    settings.GOBOXD_KILL_SWITCH = False
    yield
    settings.GOBOXD_KILL_SWITCH = orig

@pytest.mark.asyncio
async def test_goboxd_client_sends_bearer_token():
    captured_headers = {}

    def mock_handler(request: httpx.Request):
        nonlocal captured_headers
        captured_headers = dict(request.headers)
        return httpx.Response(200, json={"status": "accepted", "tests": []})

    client = GoboxdClient(
        base_url="http://mock-sandbox:8081",
        auth_token="secret-token-12345",
        transport=httpx.MockTransport(mock_handler)
    )

    res = await client.execute_run({"language": "py3", "source": "print(1)"})
    assert res["status"] == "accepted"
    assert captured_headers.get("authorization") == "Bearer secret-token-12345"
    assert "LARA-Runtime" in captured_headers.get("user-agent", "")

@pytest.mark.asyncio
async def test_goboxd_client_fails_closed_when_auth_token_missing():
    client = GoboxdClient(
        base_url="http://mock-sandbox:8081",
        auth_token="",
        transport=httpx.MockTransport(lambda r: httpx.Response(200))
    )
    with pytest.raises(SandboxError, match="Missing required GOBOXD_INTERNAL_AUTH_TOKEN") as exc_info:
        await client.execute_run({"language": "py3", "source": "print(1)"})
    assert exc_info.value.code == "AUTH_TOKEN_MISSING"

@pytest.mark.asyncio
async def test_goboxd_client_handles_401_unauthorized():
    def mock_handler(request: httpx.Request):
        return httpx.Response(401, json={"error": {"code": "UNAUTHORIZED", "message": "Invalid token"}})

    client = GoboxdClient(
        base_url="http://mock-sandbox:8081",
        auth_token="bad-token-12345",
        transport=httpx.MockTransport(mock_handler)
    )

    with pytest.raises(SandboxError, match="Authentication failed against goboxd daemon") as exc_info:
        await client.execute_run({"language": "py3", "source": "print(1)"})
    assert exc_info.value.code == "GOBOXD_UNAUTHORIZED"

@pytest.mark.asyncio
async def test_goboxd_client_handles_403_forbidden():
    def mock_handler(request: httpx.Request):
        return httpx.Response(403, json={"error": {"code": "FORBIDDEN"}})

    client = GoboxdClient(
        base_url="http://mock-sandbox:8081",
        auth_token="token-12345",
        transport=httpx.MockTransport(mock_handler)
    )

    with pytest.raises(SandboxError, match="Access forbidden") as exc_info:
        await client.execute_run({"language": "py3", "source": "print(1)"})
    assert exc_info.value.code == "GOBOXD_FORBIDDEN"

@pytest.mark.asyncio
async def test_goboxd_client_handles_429_rate_limited():
    def mock_handler(request: httpx.Request):
        return httpx.Response(429, json={"error": {"code": "CONCURRENCY_LIMIT"}})

    client = GoboxdClient(
        base_url="http://mock-sandbox:8081",
        auth_token="token-12345",
        transport=httpx.MockTransport(mock_handler)
    )

    with pytest.raises(SandboxUnavailableError, match="concurrency limit reached") as exc_info:
        await client.execute_run({"language": "py3", "source": "print(1)"})
    assert exc_info.value.code == "GOBOXD_RATE_LIMITED"

@pytest.mark.asyncio
async def test_goboxd_client_handles_malformed_json_response():
    def mock_handler(request: httpx.Request):
        return httpx.Response(200, text="not valid json {{{")

    client = GoboxdClient(
        base_url="http://mock-sandbox:8081",
        auth_token="token-12345",
        transport=httpx.MockTransport(mock_handler)
    )

    with pytest.raises(SandboxError, match="Malformed JSON response") as exc_info:
        await client.execute_run({"language": "py3", "source": "print(1)"})
    assert exc_info.value.code == "GOBOXD_MALFORMED_RESPONSE"

@pytest.mark.asyncio
async def test_goboxd_client_enforces_output_truncation_limits():
    oversized = "A" * (settings.SANDBOX_MAX_OUTPUT_BYTES + 500)

    def mock_handler(request: httpx.Request):
        return httpx.Response(200, json={
            "status": "accepted",
            "build": {"stdout": oversized, "stderr": oversized},
            "tests": [{"stdout": oversized, "stderr": oversized}]
        })

    client = GoboxdClient(
        base_url="http://mock-sandbox:8081",
        auth_token="token-12345",
        transport=httpx.MockTransport(mock_handler)
    )

    res = await client.execute_run({"language": "py3", "source": "print(1)"})
    assert "[TRUNCATED_OUTPUT_LIMIT]" in res["build"]["stdout"]
    assert "[TRUNCATED_OUTPUT_LIMIT]" in res["build"]["stderr"]
    assert "[TRUNCATED_OUTPUT_LIMIT]" in res["tests"][0]["stdout"]
    assert "[TRUNCATED_OUTPUT_LIMIT]" in res["tests"][0]["stderr"]

@pytest.mark.asyncio
async def test_goboxd_client_health_and_info():
    def mock_handler(request: httpx.Request):
        if request.url.path == "/readyz":
            return httpx.Response(200, json={"status": "ready", "version": "1.0"})
        if request.url.path == "/info":
            return httpx.Response(200, json={"name": "goboxd", "max_concurrent": 4})
        return httpx.Response(404)

    client = GoboxdClient(
        base_url="http://mock-sandbox:8081",
        auth_token="token-12345",
        transport=httpx.MockTransport(mock_handler)
    )

    health = await client.check_health()
    assert health["status"] == "ready"

    info = await client.get_info()
    assert info["name"] == "goboxd"

def test_goboxd_client_ssl_context_https():
    client_http = GoboxdClient(base_url="http://insecure:8081")
    assert client_http._get_ssl_context() is None

    client_https = GoboxdClient(base_url="https://goboxd.internal:8443")
    ctx = client_https._get_ssl_context()
    assert ctx is not None
