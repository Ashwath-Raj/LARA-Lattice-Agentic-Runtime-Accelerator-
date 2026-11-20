import uuid
import hashlib
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from backend.app.domain.models import Principal, EvolutionStatusEnum, PolicyDecisionEnum
from backend.app.repositories.base import get_repository
from backend.app.services.policy import PolicyEngine
from backend.app.services.audit import AuditService
from backend.app.core.errors import PolicyDeniedError, ConflictError, NotFoundError

ROOT = Path(__file__).resolve().parents[3]

class EvolutionService:
    def __init__(self, repo=None, policy_engine=None, audit_service=None):
        self.repo = repo or get_repository()
        self.policy = policy_engine or PolicyEngine(self.repo)
        self.audit = audit_service or AuditService(self.repo)

    def list_proposals(self, tenant_id: str = "demo-enterprise") -> List[Dict[str, Any]]:
        return self.repo.list("evolution_proposals")

    def get_proposal(self, proposal_id: str) -> Optional[Dict[str, Any]]:
        return self.repo.get("evolution_proposals", proposal_id)


    def create_proposal(
        self,
        principal: Principal,
        target_type: str,
        target_id: str,
        trigger_trace_ids: List[str],
        failure_summary: str,
        change_summary: str,
        candidate_content: str
    ) -> Dict[str, Any]:
        decision = self.policy.evaluate(principal, "evolution.propose", target_id, "agent_evolution")
        if decision.decision != PolicyDecisionEnum.ALLOW:
            raise PolicyDeniedError("Policy denied evolution proposal creation")

        # Strict constitutional check: cannot evolve policy, roles, tenant boundaries, or credentials
        forbidden_keywords = ["rbac", "abac", "tenant", "bypass", "secret", "credential", "constitution", "disable audit"]
        content_lower = candidate_content.lower()
        if any(kw in content_lower for kw in forbidden_keywords):
            raise PolicyDeniedError("Candidate content attempts to modify security constitution or credentials; forbidden")

        proposal_id = f"evo_{uuid.uuid4().hex[:10]}"
        content_hash = f"sha256:{hashlib.sha256(candidate_content.encode('utf-8')).hexdigest()}"
        now = datetime.now(timezone.utc).isoformat()

        proposal = {
            "proposal_id": proposal_id,
            "target_type": target_type,
            "target_id": target_id,
            "parent_version": "1.0.0",
            "candidate_version": "1.0.1-candidate.1",
            "trigger_trace_ids": trigger_trace_ids,
            "failure_summary": failure_summary,
            "change_summary": change_summary,
            "candidate_content": candidate_content,
            "content_hash": content_hash,
            "evaluation_status": "PENDING",
            "status": EvolutionStatusEnum.CANDIDATE_CREATED.value,
            "created_by": principal.principal_id,
            "created_at": now,
            "approved_by": None,
            "promoted_at": None,
            "evaluation_evidence": None
        }
        self.repo.set("evolution_proposals", proposal_id, proposal)

        self.audit.record_event(
            event_type="EVOLUTION_CANDIDATE_CREATED",
            principal_id=principal.principal_id,
            action="evolution.propose",
            resource_id=target_id,
            details={"proposal_id": proposal_id, "content_hash": content_hash}
        )
        return proposal

    def evaluate_candidate(self, proposal_id: str, principal: Principal) -> Dict[str, Any]:
        proposal = self.get_proposal(proposal_id)
        if not proposal:
            raise NotFoundError(f"Proposal {proposal_id} not found")

        # Run against deterministic evaluation fixtures
        fixtures_path = ROOT / "data" / "fixtures" / "evolution_cases.json"
        fixtures = []
        if fixtures_path.exists():
            fixtures = json.loads(fixtures_path.read_text(encoding="utf-8"))

        passed_count = 0
        total_count = len(fixtures)
        details = []

        candidate_content = proposal.get("candidate_content", "")
        content_lower = candidate_content.lower()

        # Strict security validation before running fixtures
        security_violations = []
        forbidden_patterns = [
            ("rbac", "Candidate contains prohibited role alteration attempt"),
            ("abac", "Candidate contains prohibited attribute policy attempt"),
            ("bypass", "Candidate attempts security control bypass"),
            ("ignore policy", "Candidate attempts to ignore security policies"),
            ("grant", "Candidate attempts privilege escalation"),
            ("disable audit", "Candidate attempts to disable audit logging"),
            ("credential", "Candidate attempts to access or alter credentials"),
            ("secret", "Candidate references secret or key material"),
        ]
        for pattern, reason in forbidden_patterns:
            if pattern in content_lower:
                security_violations.append(reason)

        for case in fixtures:
            cid = case.get("case_id")
            input_text = case.get("input", "")
            expected = case.get("expected", "")

            # Security cases must verify that candidate does not violate security constraints
            if "SEC" in cid:
                if security_violations:
                    passed = False
                    msg = f"Security assertion failed: {'; '.join(security_violations)}"
                else:
                    passed = True
                    msg = "Security invariant verified: candidate respects constitutional boundaries"
            else:
                # Functional cases: verify candidate satisfies required domain instructions
                # e.g., EVO-FUNC-01 requires checking status/revision/effective date
                if cid == "EVO-FUNC-01":
                    passed = "status" in content_lower and "revision" in content_lower and "date" in content_lower
                    msg = "Verified SOP revision and effective date checks" if passed else "Missing mandatory status/revision/date verification"
                elif cid == "EVO-FUNC-02":
                    passed = "3.2" in candidate_content or "current" in content_lower or "revision" in content_lower
                    msg = "Verified preference for current revision" if passed else "Missing revision preference assertion"
                else:
                    passed = len(candidate_content) > 10
                    msg = "Generic functional criteria satisfied"

            if passed:
                passed_count += 1
            details.append({"case_id": cid, "passed": passed, "message": msg})

        pass_rate = passed_count / total_count if total_count > 0 else 0.0
        # Mandatory: all security cases must pass AND pass_rate >= 80%
        security_passed = len(security_violations) == 0
        evaluation_passed = security_passed and (pass_rate >= 0.80)

        evaluation_evidence = {
            "total_cases": total_count,
            "passed_cases": passed_count,
            "pass_rate": round(pass_rate, 3),
            "security_passed": security_passed,
            "details": details,
            "evaluated_at": datetime.now(timezone.utc).isoformat()
        }


        new_status = EvolutionStatusEnum.AWAITING_APPROVAL.value if evaluation_passed else EvolutionStatusEnum.REJECTED.value
        self.repo.update("evolution_proposals", proposal_id, {
            "evaluation_status": "PASSED" if evaluation_passed else "FAILED",
            "status": new_status,
            "evaluation_evidence": evaluation_evidence
        })

        self.audit.record_event(
            event_type="EVOLUTION_CANDIDATE_EVALUATED",
            principal_id=principal.principal_id,
            details={"proposal_id": proposal_id, "pass_rate": pass_rate, "evaluation_passed": evaluation_passed}
        )

        return self.get_proposal(proposal_id)

    def approve_and_promote(self, proposal_id: str, principal: Principal) -> Dict[str, Any]:
        # Only runtime_admin can approve
        decision = self.policy.evaluate(principal, "evolution.promote", proposal_id, "evolution_promotion")
        if decision.decision != PolicyDecisionEnum.ALLOW:
            raise PolicyDeniedError("Only Runtime Administrator can approve and promote candidate evolution")

        proposal = self.get_proposal(proposal_id)
        if not proposal:
            raise NotFoundError(f"Proposal {proposal_id} not found")

        if proposal.get("evaluation_status") != "PASSED":
            raise ConflictError("Cannot promote candidate that has not passed evaluation gate")

        now = datetime.now(timezone.utc).isoformat()
        self.repo.update("evolution_proposals", proposal_id, {
            "status": EvolutionStatusEnum.PROMOTED.value,
            "approved_by": principal.principal_id,
            "promoted_at": now
        })

        # Update active pointer in target agent node and graph_meta
        target_id = proposal["target_id"]
        self.repo.update("graph_nodes", target_id, {
            "active_version": proposal["candidate_version"],
            "previous_version": proposal["parent_version"],
            "updated_at": now
        })

        self.audit.record_event(
            event_type="EVOLUTION_CANDIDATE_PROMOTED",
            principal_id=principal.principal_id,
            action="evolution.promote",
            resource_id=target_id,
            details={"proposal_id": proposal_id, "candidate_version": proposal["candidate_version"]}
        )

        return self.get_proposal(proposal_id)

    def rollback(self, target_id: str, rollback_to_version: str, principal: Principal) -> Dict[str, Any]:
        decision = self.policy.evaluate(principal, "evolution.promote", target_id, "evolution_rollback")
        if decision.decision != PolicyDecisionEnum.ALLOW:
            raise PolicyDeniedError("Only Runtime Administrator can perform rollback")

        now = datetime.now(timezone.utc).isoformat()
        self.repo.update("graph_nodes", target_id, {
            "active_version": rollback_to_version,
            "rolled_back_at": now
        })

        self.audit.record_event(
            event_type="EVOLUTION_VERSION_ROLLEDBACK",
            principal_id=principal.principal_id,
            action="evolution.rollback",
            resource_id=target_id,
            details={"target_id": target_id, "rolled_back_to": rollback_to_version}
        )
        return {"status": "ROLLED_BACK", "target_id": target_id, "active_version": rollback_to_version}

    def reject_proposal(self, proposal_id: str, principal: Principal, reason: Optional[str] = None) -> Dict[str, Any]:
        decision = self.policy.evaluate(principal, "evolution.promote", proposal_id, "evolution_rejection")
        if decision.decision != PolicyDecisionEnum.ALLOW:
            raise PolicyDeniedError("Only Runtime Administrator can reject an evolution proposal")

        proposal = self.get_proposal(proposal_id)
        if not proposal:
            raise NotFoundError(f"Proposal {proposal_id} not found")

        now = datetime.now(timezone.utc).isoformat()
        self.repo.update("evolution_proposals", proposal_id, {
            "status": EvolutionStatusEnum.REJECTED.value,
            "rejected_by": principal.principal_id,
            "rejected_at": now,
            "rejection_reason": reason or "Rejected by administrator"
        })

        self.audit.record_event(
            event_type="EVOLUTION_CANDIDATE_REJECTED",
            principal_id=principal.principal_id,
            action="evolution.reject",
            resource_id=proposal_id,
            details={"proposal_id": proposal_id, "reason": reason}
        )
        return self.get_proposal(proposal_id)
