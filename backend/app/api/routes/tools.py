from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from backend.app.schemas.api import SandboxRunRequest, SandboxRunResponse, ToolExecuteRequest
from backend.app.tools.gateway import ToolGateway
from backend.app.core.dependencies import get_current_principal
from backend.app.domain.models import Principal

router = APIRouter(prefix="/tools", tags=["tools"])
gateway = ToolGateway()

@router.get("", response_model=List[Dict[str, Any]])
def list_tools(principal: Principal = Depends(get_current_principal)):
    return gateway.list_tools(principal)

@router.post("/execute")
async def execute_tool(req: ToolExecuteRequest, principal: Principal = Depends(get_current_principal)):
    return await gateway.execute_tool(
        principal=principal,
        tool_id=req.tool_id,
        parameters=req.parameters,
        task_id=req.task_id
    )

@router.post("/sandbox/run", response_model=SandboxRunResponse)
async def run_in_sandbox(req: SandboxRunRequest, principal: Principal = Depends(get_current_principal)):
    result = await gateway.execute_sandbox(
        principal=principal,
        task_id=req.task_id,
        language=req.language,
        source=req.source,
        source_filename=req.source_filename,
        artifact_filename=req.artifact_filename,
        flags=req.flags,
        tests=req.tests
    )
    return SandboxRunResponse(
        status=result["status"],
        build=result.get("build"),
        tests=result.get("tests", []),
        content_hash=result["content_hash"],
        execution_time_ms=result["execution_time_ms"]
    )
