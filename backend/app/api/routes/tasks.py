from fastapi import APIRouter, Depends, status
from typing import List, Dict, Any
from backend.app.schemas.api import TaskCreate, TaskAccepted, TaskResponse
from backend.app.services.orchestrator import OrchestratorService
from backend.app.core.dependencies import get_current_principal
from backend.app.domain.models import Principal
from backend.app.core.errors import NotFoundError

router = APIRouter(prefix="/tasks", tags=["tasks"])
orchestrator = OrchestratorService()

@router.post("", response_model=TaskAccepted, status_code=status.HTTP_202_ACCEPTED)
def create_task(req: TaskCreate, principal: Principal = Depends(get_current_principal)):
    task = orchestrator.create_task(
        principal=principal,
        prompt=req.prompt,
        title=req.title,
        incident_id=req.incident_id
    )
    return TaskAccepted(
        task_id=task["task_id"],
        status=task["status"],
        trace_id=task["trace_id"],
        created_at=task["created_at"]
    )

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: str, principal: Principal = Depends(get_current_principal)):
    task = orchestrator.get_task(task_id)
    if not task:
        raise NotFoundError(f"Task {task_id} not found")
    return TaskResponse(
        task_id=task["task_id"],
        title=task.get("title"),
        prompt=task["prompt"],
        status=task["status"],
        trace_id=task["trace_id"],
        created_at=task["created_at"],
        updated_at=task["updated_at"],
        created_by=task["created_by"],
        result=task.get("result"),
        approvals=task.get("approvals")
    )

@router.get("/{task_id}/events")
def get_task_events(task_id: str, principal: Principal = Depends(get_current_principal)):
    task = orchestrator.get_task(task_id)
    if not task:
        raise NotFoundError(f"Task {task_id} not found")
    events = orchestrator.audit.list_events(task_id=task_id)
    return events
