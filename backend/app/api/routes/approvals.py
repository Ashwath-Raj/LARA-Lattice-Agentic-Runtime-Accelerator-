from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from backend.app.schemas.api import ApprovalDecisionRequest, ApprovalResponse
from backend.app.repositories.base import get_repository
from backend.app.core.dependencies import get_current_principal
from backend.app.domain.models import Principal, PolicyDecisionEnum
from backend.app.services.policy import PolicyEngine
from backend.app.services.audit import AuditService
from backend.app.core.errors import NotFoundError, PolicyDeniedError, ConflictError

from typing import List

router = APIRouter(prefix="/approvals", tags=["approvals"])
repo = get_repository()
policy_engine = PolicyEngine(repo)
audit_service = AuditService(repo)

@router.get("", response_model=List[ApprovalResponse])
def list_approvals(principal: Principal = Depends(get_current_principal)):
    approvals = repo.list("approvals")
    approvals = [a for a in approvals if a.get("tenant_id", "demo-enterprise") == principal.tenant_id]

    if "operator" in principal.roles and "supervisor" not in principal.roles and "runtime_admin" not in principal.roles and "auditor" not in principal.roles:
        approvals = [a for a in approvals if a.get("requested_by") == principal.principal_id]

    return [
        ApprovalResponse(
            approval_id=a["approval_id"],
            task_id=a["task_id"],
            action=a["action"],
            requested_by=a["requested_by"],
            status=a["status"],
            decision=a.get("decision"),
            reason=a.get("reason"),
            decided_by=a.get("decided_by"),
            decided_at=a.get("decided_at")
        )
        for a in approvals
    ]

@router.get("/{approval_id}", response_model=ApprovalResponse)
def get_approval(approval_id: str, principal: Principal = Depends(get_current_principal)):
    approval = repo.get("approvals", approval_id)
    if not approval:
        raise NotFoundError(f"Approval {approval_id} not found")

    if approval.get("tenant_id", principal.tenant_id) != principal.tenant_id:
        raise NotFoundError(f"Approval {approval_id} not found")

    if "operator" in principal.roles and "supervisor" not in principal.roles and "runtime_admin" not in principal.roles and "auditor" not in principal.roles:
        if approval.get("requested_by") != principal.principal_id:
            raise NotFoundError(f"Approval {approval_id} not found")

    return ApprovalResponse(
        approval_id=approval["approval_id"],
        task_id=approval["task_id"],
        action=approval["action"],
        requested_by=approval["requested_by"],
        status=approval["status"],
        decision=approval.get("decision"),
        reason=approval.get("reason"),
        decided_by=approval.get("decided_by"),
        decided_at=approval.get("decided_at")
    )

@router.post("/{approval_id}/decision", response_model=ApprovalResponse)
def decide_approval(approval_id: str, req: ApprovalDecisionRequest, principal: Principal = Depends(get_current_principal)):
    approval = repo.get("approvals", approval_id)
    if not approval:
        raise NotFoundError(f"Approval {approval_id} not found")

    if approval.get("tenant_id", principal.tenant_id) != principal.tenant_id:
        raise NotFoundError(f"Approval {approval_id} not found")

    if approval.get("status") != "PENDING":

        raise ConflictError(f"Approval is already in {approval.get('status')} state")

    # Separation of duties: Requester cannot approve their own action
    if approval.get("requested_by") == principal.principal_id:
        raise ConflictError("Separation-of-duties violation: Initiating principal cannot approve own action")

    # Policy check for approval role
    action = approval.get("action", "maintenance_request.execute")
    decision = policy_engine.evaluate(
        principal=principal,
        action=action,
        resource_id="tool:maintenance-request",
        purpose="approval",
        context={"approved": True, "requested_by": approval.get("requested_by")}
    )

    if decision.decision != PolicyDecisionEnum.ALLOW:
        raise PolicyDeniedError(f"Not authorised to approve: {decision.reason_code}")

    now = datetime.now(timezone.utc).isoformat()
    new_status = "APPROVED" if req.decision.value == "APPROVE" else "REJECTED"

    repo.update("approvals", approval_id, {
        "status": new_status,
        "decision": req.decision.value,
        "reason": req.reason,
        "decided_by": principal.principal_id,
        "decided_at": now
    })

    # Update associated task if approved
    trace_id = None
    task_id = approval.get("task_id")
    if task_id:
        task = repo.get("tasks", task_id)
        if task:
            trace_id = task.get("trace_id")
            task_result = task.get("result") or {}
            task_result["action_status"] = f"{new_status}_BY_SUPERVISOR"
            task_result["simulated_maintenance_execution"] = {
                "status": "SIMULATED_SUCCESS",
                "label": "SIMULATED",
                "approved_by": principal.principal_id,
                "reason": req.reason,
                "executed_at": now
            }
            repo.update("tasks", task_id, {
                "status": "COMPLETED" if new_status == "APPROVED" else "CANCELLED",
                "result": task_result,
                "updated_at": now
            })

    audit_service.record_event(
        event_type="APPROVAL_DECIDED",
        principal_id=principal.principal_id,
        task_id=task_id,
        trace_id=trace_id,
        action=action,
        policy_decision="ALLOW",
        reason_code=f"ACTION_{new_status}",
        details={"approval_id": approval_id, "decision": req.decision.value, "reason": req.reason}
    )


    updated = repo.get("approvals", approval_id)
    return ApprovalResponse(
        approval_id=updated["approval_id"],
        task_id=updated["task_id"],
        action=updated["action"],
        requested_by=updated["requested_by"],
        status=updated["status"],
        decision=updated.get("decision"),
        reason=updated.get("reason"),
        decided_by=updated.get("decided_by"),
        decided_at=updated.get("decided_at")
    )
