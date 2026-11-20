from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from backend.app.domain.models import Principal, PolicyDecision, PolicyDecisionEnum, ClassificationLevel
from backend.app.repositories.base import get_repository

CLASSIFICATION_HIERARCHY = {
    ClassificationLevel.PUBLIC: 0,
    ClassificationLevel.INTERNAL: 1,
    ClassificationLevel.CONFIDENTIAL: 2,
    ClassificationLevel.RESTRICTED: 3,
}

CLEARANCE_MAP = {
    "public": 0,
    "internal": 1,
    "confidential": 2,
    "restricted": 3,
}

ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "operator": [
        "task.create",
        "source.read.internal",
        "agent.execute",
        "tool.calculate",
        "sandbox.execute",
        "maintenance_request.request",
        "evolution.propose",
        "audit.read.own"
    ],
    "supervisor": [
        "task.create",
        "source.read.internal",
        "source.read.confidential",
        "agent.execute",
        "tool.calculate",
        "sandbox.execute",
        "maintenance_request.request",
        "maintenance_request.approve",
        "maintenance_request.execute",
        "evolution.propose",
        "audit.read.department"
    ],
    "runtime_admin": [
        "task.create",
        "source.read.internal",
        "source.read.confidential",
        "agent.execute",
        "tool.calculate",
        "sandbox.execute",
        "evolution.propose",
        "evolution.evaluate",
        "evolution.promote",
        "evolution.rollback",
        "graph.configure",
        "audit.read.full"
    ],
    "auditor": [
        "audit.read.full",
        "source.read.internal",  # only by audit scope
    ]
}

class PolicyEngine:
    def __init__(self, repo=None):
        self.repo = repo or get_repository()

    def evaluate(
        self,
        principal: Optional[Principal],
        action: str,
        resource_id: str,
        purpose: str,
        context: Optional[Dict[str, Any]] = None
    ) -> PolicyDecision:
        now = datetime.now(timezone.utc).isoformat()
        context = context or {}

        # 1. Fail closed on missing principal or tenant
        if not principal or not principal.principal_id:
            return PolicyDecision(
                decision=PolicyDecisionEnum.DENY,
                reason_code="PRINCIPAL_MISSING_FAIL_CLOSED",
                policy_id="POL-CORE-FAIL-CLOSED",
                evaluated_at=now,
                resource_id=resource_id,
                action=action
            )

        # 2. Strict constitutional block on equipment control
        if action == "equipment.control" or resource_id == "tool:equipment-control":
            return PolicyDecision(
                decision=PolicyDecisionEnum.DENY,
                reason_code="CONSTITUTIONAL_PROHIBITION_NO_PHYSICAL_ACTUATION",
                policy_id="POL-CONST-001",
                evaluated_at=now,
                principal_id=principal.principal_id,
                resource_id=resource_id,
                action=action
            )

        # 3. Action-specific policies evaluated before node generic role block
        if action in ["maintenance_request.execute", "maintenance_request.create_simulated"]:
            if "auditor" in principal.roles and len(principal.roles) == 1:
                return PolicyDecision(
                    decision=PolicyDecisionEnum.DENY,
                    reason_code="AUDITOR_CANNOT_REQUEST_MAINTENANCE",
                    policy_id="POL-TOOL-MAINT-AUDITOR",
                    evaluated_at=now,
                    principal_id=principal.principal_id,
                    resource_id=resource_id,
                    action=action
                )
            # If not approved, returns REQUIRE_APPROVAL
            if not context.get("approved"):

                return PolicyDecision(
                    decision=PolicyDecisionEnum.REQUIRE_APPROVAL,
                    reason_code="HIGH_RISK_ACTION_REQUIRES_SUPERVISOR_APPROVAL",
                    policy_id="POL-TOOL-MAINT-001",
                    evaluated_at=now,
                    principal_id=principal.principal_id,
                    resource_id=resource_id,
                    action=action
                )
            # Separation of duties: requester cannot be approver
            if context.get("requested_by") == principal.principal_id:
                return PolicyDecision(
                    decision=PolicyDecisionEnum.DENY,
                    reason_code="SEPARATION_OF_DUTIES_VIOLATION_SELF_APPROVAL",
                    policy_id="POL-APPROVAL-SOD",
                    evaluated_at=now,
                    principal_id=principal.principal_id,
                    resource_id=resource_id,
                    action=action
                )
            if "supervisor" not in principal.roles and "runtime_admin" not in principal.roles:
                return PolicyDecision(
                    decision=PolicyDecisionEnum.DENY,
                    reason_code="ONLY_SUPERVISOR_CAN_APPROVE_MAINTENANCE",
                    policy_id="POL-APPROVAL-ROLE",
                    evaluated_at=now,
                    principal_id=principal.principal_id,
                    resource_id=resource_id,
                    action=action
                )
            return PolicyDecision(
                decision=PolicyDecisionEnum.ALLOW,
                reason_code="APPROVED_BY_AUTHORIZED_SUPERVISOR",
                policy_id="POL-TOOL-MAINT-001",
                evaluated_at=now,
                principal_id=principal.principal_id,
                resource_id=resource_id,
                action=action
            )

        # 4. Check node attributes if resource is a graph node
        node = self.repo.get("graph_nodes", resource_id)
        if node:

            # Tenant boundary match
            if node.get("tenant_id") != principal.tenant_id:
                return PolicyDecision(
                    decision=PolicyDecisionEnum.DENY,
                    reason_code="TENANT_BOUNDARY_MISMATCH",
                    policy_id="POL-TENANT-001",
                    evaluated_at=now,
                    principal_id=principal.principal_id,
                    resource_id=resource_id,
                    action=action
                )

            # Node status active
            if node.get("status") != "ACTIVE":
                return PolicyDecision(
                    decision=PolicyDecisionEnum.DENY,
                    reason_code="RESOURCE_NOT_ACTIVE",
                    policy_id="POL-STATUS-001",
                    evaluated_at=now,
                    principal_id=principal.principal_id,
                    resource_id=resource_id,
                    action=action
                )

            # Allowed roles check
            allowed_roles = node.get("allowed_roles", [])
            has_role = any(r in allowed_roles for r in principal.roles)
            if not has_role:
                return PolicyDecision(
                    decision=PolicyDecisionEnum.DENY,
                    reason_code="ROLE_NOT_ENTITLED",
                    policy_id="POL-RBAC-001",
                    evaluated_at=now,
                    principal_id=principal.principal_id,
                    resource_id=resource_id,
                    action=action
                )

            # ABAC Clearance check
            node_classification = node.get("classification", "INTERNAL")
            node_level = CLASSIFICATION_HIERARCHY.get(ClassificationLevel(node_classification), 1)
            user_clearance = principal.attributes.get("clearance", "public").lower()
            user_clearance_level = CLEARANCE_MAP.get(user_clearance, 0)

            if user_clearance_level < node_level:
                return PolicyDecision(
                    decision=PolicyDecisionEnum.DENY,
                    reason_code="INSUFFICIENT_SECURITY_CLEARANCE",
                    policy_id="POL-ABAC-CLEARANCE",
                    evaluated_at=now,
                    principal_id=principal.principal_id,
                    resource_id=resource_id,
                    action=action
                )

            # If action is read/access on node and passes node checks:
            if action in ["source.read", "source.access", "tool.access", "agent.execute", "workflow.access"]:
                return PolicyDecision(
                    decision=PolicyDecisionEnum.ALLOW,
                    reason_code="ROLE_AND_ATTRIBUTES_MATCH",
                    policy_id="POL-NODE-ACCESS-001",
                    evaluated_at=now,
                    principal_id=principal.principal_id,
                    resource_id=resource_id,
                    action=action
                )

        # 4. Action-specific policies
        if action == "task.create":
            if "auditor" in principal.roles and len(principal.roles) == 1:
                return PolicyDecision(
                    decision=PolicyDecisionEnum.DENY,
                    reason_code="AUDITOR_CANNOT_CREATE_TASKS",
                    policy_id="POL-TASK-CREATE-001",
                    evaluated_at=now,
                    principal_id=principal.principal_id,
                    resource_id=resource_id,
                    action=action
                )
            return PolicyDecision(
                decision=PolicyDecisionEnum.ALLOW,
                reason_code="PERMITTED_TASK_CREATION",
                policy_id="POL-TASK-CREATE-001",
                evaluated_at=now,
                principal_id=principal.principal_id,
                resource_id=resource_id,
                action=action
            )

        if action == "maintenance_request.execute":
            # Requires approval if not already approved
            if not context.get("approved"):
                return PolicyDecision(
                    decision=PolicyDecisionEnum.REQUIRE_APPROVAL,
                    reason_code="HIGH_RISK_ACTION_REQUIRES_SUPERVISOR_APPROVAL",
                    policy_id="POL-TOOL-MAINT-001",
                    evaluated_at=now,
                    principal_id=principal.principal_id,
                    resource_id=resource_id,
                    action=action
                )
            # Separation of duties: requester cannot be approver
            if context.get("requested_by") == principal.principal_id:
                return PolicyDecision(
                    decision=PolicyDecisionEnum.DENY,
                    reason_code="SEPARATION_OF_DUTIES_VIOLATION_SELF_APPROVAL",
                    policy_id="POL-APPROVAL-SOD",
                    evaluated_at=now,
                    principal_id=principal.principal_id,
                    resource_id=resource_id,
                    action=action
                )
            if "supervisor" not in principal.roles and "runtime_admin" not in principal.roles:
                return PolicyDecision(
                    decision=PolicyDecisionEnum.DENY,
                    reason_code="ONLY_SUPERVISOR_CAN_APPROVE_MAINTENANCE",
                    policy_id="POL-APPROVAL-ROLE",
                    evaluated_at=now,
                    principal_id=principal.principal_id,
                    resource_id=resource_id,
                    action=action
                )
            return PolicyDecision(
                decision=PolicyDecisionEnum.ALLOW,
                reason_code="APPROVED_BY_AUTHORIZED_SUPERVISOR",
                policy_id="POL-TOOL-MAINT-001",
                evaluated_at=now,
                principal_id=principal.principal_id,
                resource_id=resource_id,
                action=action
            )

        if action == "evolution.promote":
            if "runtime_admin" not in principal.roles:
                return PolicyDecision(
                    decision=PolicyDecisionEnum.DENY,
                    reason_code="ONLY_RUNTIME_ADMIN_CAN_PROMOTE",
                    policy_id="POL-EVO-PROMOTE-001",
                    evaluated_at=now,
                    principal_id=principal.principal_id,
                    resource_id=resource_id,
                    action=action
                )
            return PolicyDecision(
                decision=PolicyDecisionEnum.ALLOW,
                reason_code="ADMIN_PROMOTION_PERMITTED",
                policy_id="POL-EVO-PROMOTE-001",
                evaluated_at=now,
                principal_id=principal.principal_id,
                resource_id=resource_id,
                action=action
            )

        # 5. Generic RBAC check
        user_perms = []
        for r in principal.roles:
            user_perms.extend(ROLE_PERMISSIONS.get(r, []))

        if action in user_perms:
            return PolicyDecision(
                decision=PolicyDecisionEnum.ALLOW,
                reason_code="ROLE_PERMISSION_GRANTED",
                policy_id="POL-RBAC-GENERIC",
                evaluated_at=now,
                principal_id=principal.principal_id,
                resource_id=resource_id,
                action=action
            )

        return PolicyDecision(
            decision=PolicyDecisionEnum.DENY,
            reason_code="NO_MATCHING_ALLOW_RULE_FAIL_CLOSED",
            policy_id="POL-DEFAULT-DENY",
            evaluated_at=now,
            principal_id=principal.principal_id,
            resource_id=resource_id,
            action=action
        )

