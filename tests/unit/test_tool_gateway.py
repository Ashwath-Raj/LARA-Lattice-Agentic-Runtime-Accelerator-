import pytest
from unittest.mock import AsyncMock
from backend.app.domain.models import Principal
from backend.app.tools.gateway import ToolGateway
from backend.app.repositories.base import InMemoryRepository
from backend.app.core.errors import ValidationError, PolicyDeniedError, NotFoundError

@pytest.fixture
def mock_goboxd_client():
    mock = AsyncMock()
    mock.execute_run.return_value = {
        "status": "accepted",
        "build": {"status": "ok", "stdout": "", "stderr": "", "duration_ms": 15},
        "tests": [{"status": "accepted", "stdout": "42\n", "stderr": "", "duration_ms": 10, "memory_peak_kb": 1200}]
    }
    return mock

@pytest.fixture
def tool_gateway(mock_goboxd_client):
    from backend.app.core.config import settings
    repo = InMemoryRepository()
    repo.set("tasks", "tsk_test_01", {
        "task_id": "tsk_test_01",
        "tenant_id": "demo-enterprise",
        "created_by": "usr_operator_01",
        "status": "QUEUED"
    })
    orig_kill_switch = settings.GOBOXD_KILL_SWITCH
    settings.GOBOXD_KILL_SWITCH = False
    try:
        yield ToolGateway(repo=repo, goboxd_client=mock_goboxd_client)
    finally:
        settings.GOBOXD_KILL_SWITCH = orig_kill_switch

@pytest.mark.asyncio
async def test_sandbox_execution_success(tool_gateway, mock_goboxd_client):
    operator = Principal(principal_id="usr_operator_01", display_name="Operator", roles=["operator"], attributes={"clearance": "internal"})
    res = await tool_gateway.execute_sandbox(
        principal=operator,
        task_id="tsk_test_01",
        language="py3",
        source="print(42)"
    )
    assert res["status"] == "accepted"
    assert res["content_hash"].startswith("sha256:")
    assert mock_goboxd_client.execute_run.called

@pytest.mark.asyncio
async def test_sandbox_rejects_unallowed_language(tool_gateway):
    operator = Principal(principal_id="usr_operator_01", display_name="Operator", roles=["operator"], attributes={"clearance": "internal"})
    with pytest.raises(ValidationError):
        await tool_gateway.execute_sandbox(
            principal=operator,
            task_id="tsk_test_01",
            language="unsupported_lang",
            source="test"
        )

@pytest.mark.asyncio
async def test_sandbox_rejects_path_traversal_filename(tool_gateway):
    operator = Principal(principal_id="usr_operator_01", display_name="Operator", roles=["operator"], attributes={"clearance": "internal"})
    with pytest.raises(ValidationError):
        await tool_gateway.execute_sandbox(
            principal=operator,
            task_id="tsk_test_01",
            language="py3",
            source="print(1)",
            source_filename="../attack.py"
        )

@pytest.mark.asyncio
async def test_sandbox_rejects_compiler_flag_injection(tool_gateway):
    operator = Principal(principal_id="usr_operator_01", display_name="Operator", roles=["operator"], attributes={"clearance": "internal"})
    with pytest.raises(ValidationError):
        await tool_gateway.execute_sandbox(
            principal=operator,
            task_id="tsk_test_01",
            language="cpp",
            source="int main() { return 0; }",
            flags=["-O3", "-Wl,--no-as-needed", "-evil-flag"]
        )

def test_safe_calculator_pure_arithmetic(tool_gateway):
    operator = Principal(principal_id="usr_operator_01", display_name="Operator", roles=["operator"], attributes={"clearance": "internal"})
    res = tool_gateway.execute_calculator(operator, "tsk_test_01", "(10 + 5) * 3")
    assert res["result"] == 45

def test_safe_calculator_rejects_code_injection(tool_gateway):
    operator = Principal(principal_id="usr_operator_01", display_name="Operator", roles=["operator"], attributes={"clearance": "internal"})
    with pytest.raises(ValidationError):
        tool_gateway.execute_calculator(operator, "tsk_test_01", "__import__('os').system('ls')")

@pytest.mark.asyncio
async def test_sandbox_rejects_nonexistent_task(tool_gateway):
    operator = Principal(principal_id="usr_operator_01", display_name="Operator", roles=["operator"], attributes={"clearance": "internal"})
    with pytest.raises(NotFoundError):
        await tool_gateway.execute_sandbox(
            principal=operator,
            task_id="tsk_nonexistent_999",
            language="py3",
            source="print(1)"
        )

@pytest.mark.asyncio
async def test_sandbox_rejects_cross_tenant_task(tool_gateway):
    cross_tenant_user = Principal(
        principal_id="usr_external_01",
        display_name="External",
        roles=["operator"],
        tenant_id="other-enterprise"
    )
    with pytest.raises(PolicyDeniedError, match="Cross-tenant"):
        await tool_gateway.execute_sandbox(
            principal=cross_tenant_user,
            task_id="tsk_test_01",
            language="py3",
            source="print(1)"
        )

@pytest.mark.asyncio
async def test_sandbox_rejects_unauthorized_user_task(tool_gateway):
    different_operator = Principal(
        principal_id="usr_operator_02",
        display_name="Other Operator",
        roles=["operator"],
        tenant_id="demo-enterprise"
    )
    with pytest.raises(PolicyDeniedError, match="initiated by the task creator"):
        await tool_gateway.execute_sandbox(
            principal=different_operator,
            task_id="tsk_test_01",
            language="py3",
            source="print(1)"
        )

def test_tool_gateway_list_tools(tool_gateway):
    tools = tool_gateway.list_tools()
    tool_ids = [t["tool_id"] for t in tools]
    assert "tool:calculator-safe" in tool_ids
    assert "tool:goboxd-sandbox" in tool_ids
    assert "tool:maintenance-request" in tool_ids
    assert "tool:equipment-control" in tool_ids

@pytest.mark.asyncio
async def test_tool_gateway_equipment_control_strictly_denied(tool_gateway):
    operator = Principal(principal_id="usr_operator_01", display_name="Operator", roles=["operator"], attributes={"clearance": "internal"})
    with pytest.raises(PolicyDeniedError, match="Constitutional prohibition"):
        await tool_gateway.execute_tool(
            tool_id="tool:equipment-control",
            arguments={},
            principal=operator,
            task_id="tsk_test_01"
        )

@pytest.mark.asyncio
async def test_tool_gateway_maintenance_request_requires_approval(tool_gateway):
    operator = Principal(principal_id="usr_operator_01", display_name="Operator", roles=["operator"], attributes={"clearance": "internal"})
    res = await tool_gateway.execute_tool(
        tool_id="tool:maintenance-request",
        arguments={"asset_id": "P-204", "reason": "Cavitation check", "urgency": "high"},
        principal=operator,
        task_id="tsk_test_01"
    )
    assert res["status"] == "REQUIRE_APPROVAL"
    assert "approval_id" in res

@pytest.mark.asyncio
async def test_goboxd_client_fail_closed_with_mock_transport():
    import httpx
    from backend.app.adapters.goboxd import GoboxdClient
    from backend.app.core.config import settings
    from backend.app.core.errors import SandboxUnavailableError, SandboxTimeoutError

    orig = settings.GOBOXD_KILL_SWITCH
    settings.GOBOXD_KILL_SWITCH = False
    try:
        # 1. 503 Service Unavailable -> SandboxUnavailableError
        def handler_503(request: httpx.Request):
            return httpx.Response(503, json={"error": "Queue exhausted"})

        client_503 = GoboxdClient(base_url="http://mock-goboxd:8080", auth_token="mock-token-secret-12345", transport=httpx.MockTransport(handler_503))
        with pytest.raises(SandboxUnavailableError):
            await client_503.execute_run({"language": "py3", "source": "print(1)"})

        # 2. Connection error / timeout
        def handler_timeout(request: httpx.Request):
            raise httpx.ConnectTimeout("Connection timed out to goboxd host")

        client_timeout = GoboxdClient(base_url="http://mock-goboxd:8080", auth_token="mock-token-secret-12345", transport=httpx.MockTransport(handler_timeout))
        with pytest.raises((SandboxTimeoutError, SandboxUnavailableError)):
            await client_timeout.execute_run({"language": "py3", "source": "print(1)"})
    finally:
        settings.GOBOXD_KILL_SWITCH = orig

@pytest.mark.asyncio
async def test_kill_switch_active_blocks_tool_gateway(tool_gateway):
    """Verify tool gateway strictly blocks execution when GOBOXD_KILL_SWITCH is True."""
    from backend.app.core.config import settings
    settings.GOBOXD_KILL_SWITCH = True
    operator = Principal(principal_id="usr_operator_01", display_name="Operator", roles=["operator"], attributes={"clearance": "internal"})
    with pytest.raises(PolicyDeniedError, match="administrative kill-switch") as exc_info:
        await tool_gateway.execute_sandbox(
            principal=operator,
            task_id="tsk_test_01",
            language="py3",
            source="print(1)"
        )
    assert exc_info.value.code == "KILL_SWITCH_ACTIVE"

@pytest.mark.asyncio
async def test_kill_switch_cannot_be_bypassed_by_admin(tool_gateway):
    """Verify tool gateway kill-switch cannot be bypassed even by runtime admin."""
    from backend.app.core.config import settings
    settings.GOBOXD_KILL_SWITCH = True
    admin = Principal(principal_id="usr_admin_01", display_name="Administrator", roles=["runtime_admin"], attributes={"clearance": "confidential"})
    with pytest.raises(PolicyDeniedError, match="administrative kill-switch"):
        await tool_gateway.execute_sandbox(
            principal=admin,
            task_id="tsk_test_01",
            language="py3",
            source="print(1)"
        )

@pytest.mark.asyncio
async def test_kill_switch_active_blocks_goboxd_client():
    """Verify GoboxdClient itself enforces kill-switch fail-closed at adapter layer."""
    from backend.app.adapters.goboxd import GoboxdClient
    from backend.app.core.config import settings
    from backend.app.core.errors import SandboxError
    settings.GOBOXD_KILL_SWITCH = True
    client = GoboxdClient(base_url="http://mock-goboxd:8080")
    with pytest.raises(SandboxError, match="administrative kill-switch") as exc_info:
        await client.execute_run({"language": "py3", "source": "print(1)"})
    assert exc_info.value.code == "KILL_SWITCH_ACTIVE"

def test_default_config_kill_switch_is_true():
    """Verify Settings defaults to fail-closed kill-switch (True)."""
    from backend.app.core.config import Settings
    s = Settings()
    assert s.GOBOXD_KILL_SWITCH is True
