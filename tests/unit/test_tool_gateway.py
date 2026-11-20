import pytest
from unittest.mock import AsyncMock
from backend.app.domain.models import Principal
from backend.app.tools.gateway import ToolGateway
from backend.app.repositories.base import InMemoryRepository
from backend.app.core.errors import ValidationError, PolicyDeniedError

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
