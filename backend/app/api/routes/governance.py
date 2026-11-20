from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from backend.app.core.dependencies import get_current_principal
from backend.app.domain.models import Principal
from backend.app.repositories.base import get_repository
from backend.app.services.audit import AuditService
from backend.app.core.errors import PolicyDeniedError

router = APIRouter(prefix="/governance", tags=["governance"])
repo = get_repository()
audit = AuditService(repo)

@router.get("/principals", response_model=List[Dict[str, Any]])
def list_governance_principals(principal: Principal = Depends(get_current_principal)):
    # Runtime Admin only
    if "runtime_admin" not in principal.roles:
        raise PolicyDeniedError("Only Runtime Administrator can access governance principals")

    principals = repo.list("principals", {"tenant_id": principal.tenant_id})
    # Sanitize password_hash before returning
    sanitized = []
    for p in principals:
        clean = dict(p)
        clean.pop("password_hash", None)
        sanitized.append(clean)
    return sanitized

@router.get("/decisions", response_model=List[Dict[str, Any]])
def list_governance_decisions(
    task_id: Optional[str] = Query(default=None),
    principal: Principal = Depends(get_current_principal)
):
    events = audit.list_events(task_id=task_id, tenant_id=principal.tenant_id)
    # Filter only policy evaluation events
    decisions = [e for e in events if e.get("policy_decision") is not None]

    # Scope for operator
    if "operator" in principal.roles and "supervisor" not in principal.roles and "runtime_admin" not in principal.roles and "auditor" not in principal.roles:
        decisions = [d for d in decisions if d.get("principal_id") == principal.principal_id]

    return decisions
