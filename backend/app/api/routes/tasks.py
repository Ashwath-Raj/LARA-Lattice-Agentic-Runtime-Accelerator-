from fastapi import APIRouter, Depends, status
from typing import List, Dict, Any
from backend.app.schemas.api import TaskCreate, TaskAccepted, TaskResponse
from backend.app.services.orchestrator import OrchestratorService
from backend.app.core.dependencies import get_current_principal
from backend.app.domain.models import Principal
from backend.app.core.errors import NotFoundError

router = APIRouter(prefix="/tasks", tags=["tasks"])
orchestrator = OrchestratorService()

@router.get("", response_model=List[TaskResponse])
def list_tasks(principal: Principal = Depends(get_current_principal)):
    tasks = orchestrator.repo.list("tasks")
    tasks = [t for t in tasks if t.get("tenant_id", "demo-enterprise") == principal.tenant_id]

    if "operator" in principal.roles and "supervisor" not in principal.roles and "runtime_admin" not in principal.roles and "auditor" not in principal.roles:
        tasks = [t for t in tasks if t.get("created_by") == principal.principal_id]

    return [
        TaskResponse(
            task_id=t["task_id"],
            title=t.get("title"),
            prompt=t["prompt"],
            status=t["status"],
            trace_id=t["trace_id"],
            created_at=t["created_at"],
            updated_at=t.get("updated_at", t["created_at"]),
            created_by=t.get("created_by", principal.principal_id),
            result=t.get("result"),
            approvals=t.get("approvals")
        )
        for t in tasks
    ]

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

    # Tenant scoping
    if task.get("tenant_id") != principal.tenant_id:
        raise NotFoundError(f"Task {task_id} not found")  # Do not leak cross-tenant existence

    # Resource-level access: creator, supervisor in same dept, or admin/auditor
    if task.get("created_by") != principal.principal_id:
        if "supervisor" not in principal.roles and "runtime_admin" not in principal.roles and "auditor" not in principal.roles:
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

    if task.get("tenant_id") != principal.tenant_id:
        raise NotFoundError(f"Task {task_id} not found")

    if task.get("created_by") != principal.principal_id:
        if "supervisor" not in principal.roles and "runtime_admin" not in principal.roles and "auditor" not in principal.roles:
            raise NotFoundError(f"Task {task_id} not found")

    events = orchestrator.audit.list_events(task_id=task_id, tenant_id=principal.tenant_id)
    return events

@router.post("/{task_id}/run", response_model=TaskResponse)
def run_task(task_id: str, principal: Principal = Depends(get_current_principal)):
    task = orchestrator.get_task(task_id)
    if not task:
        raise NotFoundError(f"Task {task_id} not found")

    if task.get("tenant_id") != principal.tenant_id:
        raise NotFoundError(f"Task {task_id} not found")

    if task.get("created_by") != principal.principal_id and "runtime_admin" not in principal.roles:
        raise NotFoundError(f"Task {task_id} not found")

    # If already completed or cancelled, reject re-run
    if task.get("status") in ["COMPLETED", "CANCELLED"]:
        from backend.app.core.errors import ConflictError
        raise ConflictError(f"Task {task_id} is already in terminal state '{task.get('status')}'")

    orchestrator.execute_task_pipeline(task_id, principal)
    updated_task = orchestrator.get_task(task_id)

    return TaskResponse(
        task_id=updated_task["task_id"],
        title=updated_task.get("title"),
        prompt=updated_task["prompt"],
        status=updated_task["status"],
        trace_id=updated_task["trace_id"],
        created_at=updated_task["created_at"],
        updated_at=updated_task["updated_at"],
        created_by=updated_task["created_by"],
        result=updated_task.get("result"),
        approvals=updated_task.get("approvals")
    )

@router.post("/{task_id}/cancel", response_model=TaskResponse)
def cancel_task(task_id: str, principal: Principal = Depends(get_current_principal)):
    task = orchestrator.get_task(task_id)
    if not task:
        raise NotFoundError(f"Task {task_id} not found")

    if task.get("tenant_id") != principal.tenant_id:
        raise NotFoundError(f"Task {task_id} not found")

    if task.get("created_by") != principal.principal_id and "runtime_admin" not in principal.roles:
        raise NotFoundError(f"Task {task_id} not found")

    from datetime import datetime, timezone
    from backend.app.core.errors import ConflictError
    if task.get("status") in ["COMPLETED", "FAILED", "CANCELLED"]:
        raise ConflictError(f"Cannot cancel task in terminal state '{task.get('status')}'")

    now = datetime.now(timezone.utc).isoformat()
    orchestrator.repo.update("tasks", task_id, {
        "status": "CANCELLED",
        "updated_at": now
    })

    orchestrator.audit.record_event(
        event_type="TASK_CANCELLED",
        principal_id=principal.principal_id,
        task_id=task_id,
        trace_id=task.get("trace_id"),
        action="task.cancel",
        policy_decision="ALLOW",
        reason_code="USER_CANCELLED"
    )

    updated_task = orchestrator.get_task(task_id)
    return TaskResponse(
        task_id=updated_task["task_id"],
        title=updated_task.get("title"),
        prompt=updated_task["prompt"],
        status=updated_task["status"],
        trace_id=updated_task["trace_id"],
        created_at=updated_task["created_at"],
        updated_at=updated_task["updated_at"],
        created_by=updated_task["created_by"],
        result=updated_task.get("result"),
        approvals=updated_task.get("approvals")
    )
