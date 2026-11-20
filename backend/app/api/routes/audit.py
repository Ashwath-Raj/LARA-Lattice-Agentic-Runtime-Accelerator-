from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from backend.app.services.audit import AuditService
from backend.app.core.dependencies import get_current_principal
from backend.app.domain.models import Principal
from backend.app.repositories.base import get_repository
from backend.app.core.errors import NotFoundError

router = APIRouter(prefix="/audit", tags=["audit"])
audit_service = AuditService()
repo = get_repository()

@router.get("", response_model=List[Dict[str, Any]])
def query_audit_events(
    task_id: Optional[str] = None,
    principal: Principal = Depends(get_current_principal)
):
    events = audit_service.list_events(task_id=task_id, tenant_id=principal.tenant_id)

    # If principal is operator, scope to events they initiated
    if "operator" in principal.roles and "supervisor" not in principal.roles and "runtime_admin" not in principal.roles and "auditor" not in principal.roles:
        events = [e for e in events if e.get("principal_id") == principal.principal_id]

    return events

@router.get("/events/{event_id}")
def get_audit_event_by_id(
    event_id: str,
    principal: Principal = Depends(get_current_principal)
):
    event = repo.get("audit_events", event_id)
    if not event:
        raise NotFoundError(f"Audit event '{event_id}' not found")

    if event.get("tenant_id", principal.tenant_id) != principal.tenant_id:
        raise NotFoundError(f"Audit event '{event_id}' not found")

    if "operator" in principal.roles and "supervisor" not in principal.roles and "runtime_admin" not in principal.roles and "auditor" not in principal.roles:
        if event.get("principal_id") != principal.principal_id:
            raise NotFoundError(f"Audit event '{event_id}' not found")

    return event

@router.get("/{trace_id}", response_model=List[Dict[str, Any]])
def get_audit_by_trace_id(
    trace_id: str,
    principal: Principal = Depends(get_current_principal)
):
    events = audit_service.list_events(trace_id=trace_id, tenant_id=principal.tenant_id)

    if "operator" in principal.roles and "supervisor" not in principal.roles and "runtime_admin" not in principal.roles and "auditor" not in principal.roles:
        events = [e for e in events if e.get("principal_id") == principal.principal_id]

    return events
