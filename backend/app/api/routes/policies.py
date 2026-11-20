from fastapi import APIRouter, Depends
from backend.app.schemas.api import PolicyRequest, PolicyDecisionResponse
from backend.app.services.policy import PolicyEngine
from backend.app.core.dependencies import get_current_principal
from backend.app.domain.models import Principal

router = APIRouter(prefix="/policies", tags=["policies"])
policy_engine = PolicyEngine()

@router.post("/evaluate", response_model=PolicyDecisionResponse)
def evaluate_policy(req: PolicyRequest, principal: Principal = Depends(get_current_principal)):
    decision = policy_engine.evaluate(
        principal=principal,
        action=req.action,
        resource_id=req.resource_id,
        purpose=req.purpose
    )
    return PolicyDecisionResponse(
        decision=decision.decision,
        reason_code=decision.reason_code,
        policy_id=decision.policy_id,
        evaluated_at=decision.evaluated_at
    )
