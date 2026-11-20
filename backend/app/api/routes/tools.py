from fastapi import APIRouter, Depends
from backend.app.schemas.api import SandboxRunRequest, SandboxRunResponse
from backend.app.tools.gateway import ToolGateway
from backend.app.core.dependencies import get_current_principal
from backend.app.domain.models import Principal

router = APIRouter(prefix="/tools", tags=["tools"])
gateway = ToolGateway()

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
