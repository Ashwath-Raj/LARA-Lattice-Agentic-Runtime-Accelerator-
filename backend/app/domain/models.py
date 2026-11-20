from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

class ClassificationLevel(str, Enum):
    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    CONFIDENTIAL = "CONFIDENTIAL"
    RESTRICTED = "RESTRICTED"

class RoleEnum(str, Enum):
    OPERATOR = "operator"
    SUPERVISOR = "supervisor"
    RUNTIME_ADMIN = "runtime_admin"
    AUDITOR = "auditor"

class PolicyDecisionEnum(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"
    REQUIRE_APPROVAL = "REQUIRE_APPROVAL"
    REDACT = "REDACT"

class ApprovalDecisionEnum(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"

class TaskStatusEnum(str, Enum):
    QUEUED = "QUEUED"
    PLANNING = "PLANNING"
    ROUTING = "ROUTING"
    DELEGATING = "DELEGATING"
    VERIFYING = "VERIFYING"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    EXECUTING = "EXECUTING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    BLOCKED_POLICY = "BLOCKED_POLICY"
    NEEDS_INPUT = "NEEDS_INPUT"

class EvolutionStatusEnum(str, Enum):
    OBSERVED = "OBSERVED"
    DIAGNOSED = "DIAGNOSED"
    CANDIDATE_CREATED = "CANDIDATE_CREATED"
    EVALUATING = "EVALUATING"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    PROMOTED = "PROMOTED"
    REJECTED = "REJECTED"
    ROLLED_BACK = "ROLLED_BACK"

class Principal(BaseModel):
    principal_id: str
    display_name: str
    roles: List[str]
    attributes: Dict[str, Any] = Field(default_factory=dict)
    tenant_id: str = "demo-enterprise"

class Session(BaseModel):
    session_id: str
    principal_id: str
    tenant_id: str
    created_at: str
    expires_at: str

class PolicyDecision(BaseModel):
    decision: PolicyDecisionEnum
    reason_code: str
    policy_id: str
    evaluated_at: str
    principal_id: Optional[str] = None
    resource_id: Optional[str] = None
    action: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class DelegationScope(BaseModel):
    delegation_id: str
    parent_delegation_id: Optional[str] = None
    originating_principal_id: str
    task_id: str
    tenant_id: str
    purpose: str
    allowed_sources: List[str] = Field(default_factory=list)
    allowed_tools: List[str] = Field(default_factory=list)
    max_risk_level: ClassificationLevel = ClassificationLevel.INTERNAL
    expires_at: str
    agent_id: str
    agent_version: str

class AuditEvent(BaseModel):
    event_id: str
    timestamp: str
    request_id: Optional[str] = None
    trace_id: Optional[str] = None
    task_id: Optional[str] = None
    principal_id: Optional[str] = None
    tenant_id: str = "demo-enterprise"
    event_type: str
    action: Optional[str] = None
    resource_id: Optional[str] = None
    policy_decision: Optional[str] = None
    reason_code: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)

class ResearchEvidence(BaseModel):

    source_id: str
    claim: str
    confidence: float = Field(ge=0.0, le=1.0)

class ResearchAgentOutput(BaseModel):
    agent: str = "research_agent"
    evidence: List[ResearchEvidence] = Field(default_factory=list)
    unresolved_questions: List[str] = Field(default_factory=list)

class AnalysisAgentOutput(BaseModel):
    agent: str = "analysis_agent"
    root_cause: Optional[str] = None
    hypotheses: List[str] = Field(default_factory=list)
    recommendation: Optional[str] = None

class VerificationAgentOutput(BaseModel):
    agent: str = "verification_agent"
    coverage_valid: bool
    unsupported_claims: List[str] = Field(default_factory=list)
    sop_revision_checked: bool
    sop_reference: str
    verification_status: str
