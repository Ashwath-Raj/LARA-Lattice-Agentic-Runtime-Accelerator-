from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from backend.app.domain.models import Principal, PolicyDecisionEnum, ApprovalDecisionEnum, TaskStatusEnum

class ErrorDetail(BaseModel):
    code: str
    message: str
    request_id: str
    trace_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    error: ErrorDetail

from pydantic import BaseModel, Field, AliasChoices

class DemoLoginRequest(BaseModel):
    principal_id: str
    password: Optional[str] = Field(default=None, validation_alias=AliasChoices("password", "demo_password"))

class PrincipalResponse(BaseModel):
    principal_id: str
    display_name: str
    roles: List[str]
    attributes: Dict[str, Any]

class DemoLoginResponse(BaseModel):
    principal: PrincipalResponse
    session_expires_at: str
    # Top-level fields for backwards compatibility
    principal_id: Optional[str] = None
    display_name: Optional[str] = None
    roles: Optional[List[str]] = None
    attributes: Optional[Dict[str, Any]] = None

class TaskCreate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=120)
    prompt: str = Field(validation_alias=AliasChoices("prompt", "task_intent"), min_length=10, max_length=4000)
    incident_id: Optional[str] = None
    attachment_ids: Optional[List[str]] = Field(default_factory=list, max_length=5)

class ToolExecuteRequest(BaseModel):
    tool_id: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    task_id: Optional[str] = None


class TaskAccepted(BaseModel):
    task_id: str
    status: str
    trace_id: str
    created_at: str

class TaskResponse(BaseModel):
    task_id: str
    title: Optional[str] = None
    prompt: str
    status: str
    trace_id: str
    created_at: str
    updated_at: str
    created_by: str
    result: Optional[Dict[str, Any]] = None
    approvals: Optional[List[Any]] = None


class PolicyRequest(BaseModel):
    action: str
    resource_id: str
    purpose: str

class PolicyDecisionResponse(BaseModel):
    decision: PolicyDecisionEnum
    reason_code: str
    policy_id: str
    evaluated_at: str

class ApprovalDecisionRequest(BaseModel):
    decision: ApprovalDecisionEnum
    reason: str = Field(validation_alias=AliasChoices("reason", "rationale"), min_length=8, max_length=500)


class ApprovalResponse(BaseModel):
    approval_id: str
    task_id: str
    action: str
    requested_by: str
    status: str
    decision: Optional[str] = None
    reason: Optional[str] = None
    decided_by: Optional[str] = None
    decided_at: Optional[str] = None

class RouteResolveResponse(BaseModel):
    route_id: Optional[str] = None
    task_id: str
    principal_id: str
    permitted_sources: List[str]
    permitted_tools: List[str]
    selected_path: List[str]
    alternative_paths: List[List[str]] = Field(default_factory=list)
    excluded_candidates: List[Dict[str, Any]] = Field(default_factory=list)
    score_components: Dict[str, float] = Field(default_factory=dict)
    graph_version: int

class RoutePreviewRequest(BaseModel):
    intent: str = Field(min_length=3, max_length=500)
    required_capabilities: Optional[List[str]] = None

class GraphSummaryResponse(BaseModel):
    node_count: int
    edge_count: int
    node_types: Dict[str, int]
    version: int
    tenant_id: str

class ProposalCreateRequest(BaseModel):
    target_type: str = Field(default="agent_prompt")
    target_id: str = Field(default="agent:research")
    trigger_trace_ids: List[str]
    failure_summary: str
    change_summary: str
    candidate_content: str

class EvolutionProposalResponse(BaseModel):
    proposal_id: str
    target_type: str
    target_id: str
    parent_version: str
    candidate_version: str
    trigger_trace_ids: List[str]
    failure_summary: str
    change_summary: str
    content_hash: str
    evaluation_status: str
    status: str
    created_by: str
    created_at: str
    evaluation_evidence: Optional[Dict[str, Any]] = None
    approved_by: Optional[str] = None
    promoted_at: Optional[str] = None
    rejected_by: Optional[str] = None
    rejected_at: Optional[str] = None
    rejection_reason: Optional[str] = None

class ProposalRejectRequest(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=500)

class RollbackRequest(BaseModel):
    target_id: str
    rollback_to_version: str

class SandboxRunRequest(BaseModel):
    language: str
    source: str
    source_filename: Optional[str] = None
    artifact_filename: Optional[str] = None
    flags: Optional[List[str]] = None
    tests: List[Dict[str, str]] = Field(default_factory=list)
    task_id: str

class SandboxRunResponse(BaseModel):
    status: str
    build: Optional[Dict[str, Any]] = None
    tests: List[Dict[str, Any]] = Field(default_factory=list)
    content_hash: str
    execution_time_ms: int
