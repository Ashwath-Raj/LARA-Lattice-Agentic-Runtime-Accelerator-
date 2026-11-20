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
    repo = InMemoryRepository()
    repo.set("tasks", "tsk_test_01", {
        "task_id": "tsk_test_01",
        "tenant_id": "demo-enterprise",
        "created_by": "usr_operator_01",
        "status": "QUEUED"
    })
    return ToolGateway(repo=repo, goboxd_client=mock_goboxd_client)

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
    from backend.app.core.errors import SandboxUnavailableError, SandboxTimeoutError

    # 1. 503 Service Unavailable -> SandboxUnavailableError
    def handler_503(request: httpx.Request):
        return httpx.Response(503, json={"error": "Queue exhausted"})

    client_503 = GoboxdClient(base_url="http://mock-goboxd:8080", transport=httpx.MockTransport(handler_503))
    with pytest.raises(SandboxUnavailableError):
        await client_503.execute_run({"language": "py3", "source": "print(1)"})

    # 2. Connection error / timeout
    def handler_timeout(request: httpx.Request):
        raise httpx.ConnectTimeout("Connection timed out to goboxd host")

    client_timeout = GoboxdClient(base_url="http://mock-goboxd:8080", transport=httpx.MockTransport(handler_timeout))
    with pytest.raises((SandboxTimeoutError, SandboxUnavailableError)):
        await client_timeout.execute_run({"language": "py3", "source": "print(1)"})
