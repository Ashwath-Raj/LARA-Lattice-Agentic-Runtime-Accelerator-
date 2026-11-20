from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, status
from backend.app.schemas.api import (
    ProposalCreateRequest,
    EvolutionProposalResponse,
    ProposalRejectRequest,
    RollbackRequest
)
from backend.app.services.evolution import EvolutionService
from backend.app.core.dependencies import get_current_principal
from backend.app.domain.models import Principal
from backend.app.core.errors import NotFoundError

router = APIRouter(prefix="/evolution", tags=["evolution"])
evolution_svc = EvolutionService()

def _to_response(p: Dict[str, Any]) -> EvolutionProposalResponse:
    return EvolutionProposalResponse(
        proposal_id=p["proposal_id"],
        target_type=p["target_type"],
        target_id=p["target_id"],
        parent_version=p["parent_version"],
        candidate_version=p["candidate_version"],
        trigger_trace_ids=p["trigger_trace_ids"],
        failure_summary=p["failure_summary"],
        change_summary=p["change_summary"],
        content_hash=p["content_hash"],
        evaluation_status=p["evaluation_status"],
        status=p["status"],
        created_by=p["created_by"],
        created_at=p["created_at"],
        evaluation_evidence=p.get("evaluation_evidence"),
        approved_by=p.get("approved_by"),
        promoted_at=p.get("promoted_at"),
        rejected_by=p.get("rejected_by"),
        rejected_at=p.get("rejected_at"),
        rejection_reason=p.get("rejection_reason")
    )

@router.get("/proposals", response_model=List[EvolutionProposalResponse])
def list_proposals(principal: Principal = Depends(get_current_principal)):
    proposals = evolution_svc.list_proposals(tenant_id=principal.tenant_id)
    return [_to_response(p) for p in proposals]

@router.get("/proposals/{proposal_id}", response_model=EvolutionProposalResponse)
def get_proposal(proposal_id: str, principal: Principal = Depends(get_current_principal)):
    p = evolution_svc.get_proposal(proposal_id)
    if not p:
        raise NotFoundError(f"Proposal '{proposal_id}' not found")
    return _to_response(p)

@router.post("/proposals", response_model=EvolutionProposalResponse, status_code=status.HTTP_201_CREATED)
def create_proposal(req: ProposalCreateRequest, principal: Principal = Depends(get_current_principal)):
    p = evolution_svc.create_proposal(
        principal=principal,
        target_type=req.target_type,
        target_id=req.target_id,
        trigger_trace_ids=req.trigger_trace_ids,
        failure_summary=req.failure_summary,
        change_summary=req.change_summary,
        candidate_content=req.candidate_content
    )
    return _to_response(p)

@router.post("/proposals/{proposal_id}/evaluate", response_model=EvolutionProposalResponse)
def evaluate_proposal(proposal_id: str, principal: Principal = Depends(get_current_principal)):
    p = evolution_svc.evaluate_candidate(proposal_id, principal)
    return _to_response(p)

@router.post("/proposals/{proposal_id}/approve", response_model=EvolutionProposalResponse)
def approve_proposal(proposal_id: str, principal: Principal = Depends(get_current_principal)):
    p = evolution_svc.approve_and_promote(proposal_id, principal)
    return _to_response(p)

@router.post("/proposals/{proposal_id}/reject", response_model=EvolutionProposalResponse)
def reject_proposal(
    proposal_id: str,
    req: Optional[ProposalRejectRequest] = None,
    principal: Principal = Depends(get_current_principal)
):
    reason = req.reason if req else None
    p = evolution_svc.reject_proposal(proposal_id, principal, reason=reason)
    return _to_response(p)

@router.post("/versions/{version_id}/rollback")
def rollback_version(
    version_id: str,
    req: RollbackRequest,
    principal: Principal = Depends(get_current_principal)
) -> Dict[str, Any]:
    return evolution_svc.rollback(
        target_id=req.target_id,
        rollback_to_version=req.rollback_to_version,
        principal=principal
    )
