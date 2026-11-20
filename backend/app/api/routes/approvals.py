from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from backend.app.schemas.api import ApprovalDecisionRequest, ApprovalResponse
from backend.app.repositories.base import get_repository
from backend.app.core.dependencies import get_current_principal
from backend.app.domain.models import Principal, PolicyDecisionEnum
from backend.app.services.policy import PolicyEngine
from backend.app.services.audit import AuditService
from backend.app.core.errors import NotFoundError, PolicyDeniedError, ConflictError

router = APIRouter(prefix="/approvals", tags=["approvals"])
repo = get_repository()
policy_engine = PolicyEngine(repo)
audit_service = AuditService(repo)

@router.post("/{approval_id}/decision", response_model=ApprovalResponse)
def decide_approval(approval_id: str, req: ApprovalDecisionRequest, principal: Principal = Depends(get_current_principal)):
    approval = repo.get("approvals", approval_id)
    if not approval:
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
    task_id = approval.get("task_id")
    if task_id:
        task = repo.get("tasks", task_id)
        if task:
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
