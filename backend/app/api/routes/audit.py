from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from backend.app.services.audit import AuditService
from backend.app.core.dependencies import get_current_principal
from backend.app.domain.models import Principal
from backend.app.repositories.base import get_repository

router = APIRouter(prefix="/audit", tags=["audit"])
audit_service = AuditService()

@router.get("", response_model=List[Dict[str, Any]])
def query_audit_events(
    task_id: Optional[str] = None,
    principal: Principal = Depends(get_current_principal)
):
    # Principal scoping
    events = audit_service.list_events(task_id=task_id, tenant_id=principal.tenant_id)

    # If principal is operator, scope to tasks they created
    if "operator" in principal.roles and "supervisor" not in principal.roles and "runtime_admin" not in principal.roles and "auditor" not in principal.roles:
        events = [e for e in events if e.get("principal_id") == principal.principal_id]

    return events
