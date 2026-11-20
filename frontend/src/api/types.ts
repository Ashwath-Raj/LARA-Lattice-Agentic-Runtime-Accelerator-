/**
 * LARA API Types matching contracts/openapi.yaml and technical specifications.
 */

export interface PrincipalAttributes {
  department: string;
  clearance: 'internal' | 'confidential' | 'restricted' | string;
  project?: string;
  employment_status?: string;
  [key: string]: unknown;
}

export interface Principal {
  principal_id: string;
  display_name: string;
  roles: string[];
  attributes: PrincipalAttributes;
}

export interface TaskCreate {
  title?: string;
  prompt: string;
  incident_id?: string | null;
  attachment_ids?: string[];
}

export interface TaskAccepted {
  task_id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'AWAITING_APPROVAL' | 'CANCELLED';
  trace_id: string;
  created_at: string;
}

export interface TaskEvidence {
  source_id: string;
  name: string;
  classification: string;
  revision: string;
  effective_date: string;
  status: 'CURRENT' | 'OBSOLETE' | 'RESTRICTED';
  summary: string;
  uri?: string;
  verified: boolean;
}

export interface AgentOutput {
  agent_id: string;
  agent_name: string;
  version: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  summary: string;
  findings: string[];
  confidence_score: number;
  duration_ms: number;
}

export interface VerificationFinding {
  claim: string;
  status: 'VERIFIED' | 'DISCREPANCY' | 'UNSUPPORTED';
  source_reference: string;
  notes: string;
}

export interface ProposedAction {
  action_id: string;
  tool_id: string;
  tool_name: string;
  description: string;
  parameters: Record<string, unknown>;
  policy_decision: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'REDACT';
  reason_code: string;
  simulated: boolean;
  approval_id?: string;
}

export interface Task {
  task_id: string;
  title: string;
  prompt: string;
  incident_id?: string | null;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'AWAITING_APPROVAL' | 'CANCELLED';
  trace_id: string;
  created_at: string;
  updated_at: string;
  principal_id: string;
  current_stage: 'INTAKE' | 'HIGHWAY_RESOLUTION' | 'RESEARCH' | 'ANALYSIS' | 'VERIFICATION' | 'POLICY_EVALUATION' | 'ACTION_GATEWAY' | 'COMPLETED';
  active_agent?: string;
  route_id?: string;
  selected_path?: string[];
  evidence: TaskEvidence[];
  agent_outputs: AgentOutput[];
  verification_findings: VerificationFinding[];
  proposed_action?: ProposedAction;
}

export interface TaskEvent {
  event_id: string;
  task_id: string;
  trace_id: string;
  type: string;
  stage: string;
  agent_id?: string;
  timestamp: string;
  summary: string;
  details?: Record<string, unknown>;
}

export interface ExcludedCandidate {
  node_id?: string;
  reason_code: string;
  display: string;
}

export interface ScoreComponents {
  relevance: number;
  trust: number;
  freshness: number;
  availability: number;
  cost_efficiency: number;
}

export interface RouteResult {
  route_id: string;
  task_id: string;
  principal_id: string;
  graph_version: number;
  selected_path: string[];
  selected_sources: string[];
  excluded_candidates: ExcludedCandidate[];
  score_components: ScoreComponents;
}

export interface GraphNode {
  node_id: string;
  tenant_id: string;
  type: 'workflow' | 'source' | 'agent' | 'skill' | 'tool' | 'memory';
  name: string;
  classification: string;
  allowed_roles: string[];
  purposes: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'DEPRECATED';
  synthetic: boolean;
  trust_score: number;
  description?: string;
  source_uri?: string;
  capabilities?: string[];
}

export interface GraphEdge {
  edge_id: string;
  tenant_id: string;
  source_node: string;
  target_node: string;
  relationship: 'provides_context' | 'can_delegate_to' | 'uses_skill' | 'can_invoke' | 'depends_on' | 'related_to';
  status: string;
  allowed_roles: string[];
  classification: string;
  trust_score: number;
}

export interface AgentSkill {
  skill_id: string;
  name: string;
  version: string;
  description: string;
}

export interface AgentVersion {
  version: string;
  created_at: string;
  parent_version?: string;
  content_hash: string;
  status: 'PROMOTED' | 'EVALUATING' | 'REJECTED' | 'ROLLED_BACK';
  change_summary: string;
}

export interface Agent {
  agent_id: string;
  name: string;
  role: string;
  purpose: string;
  active_version: string;
  status: 'HEALTHY' | 'UPDATING' | 'DEGRADED';
  skills: AgentSkill[];
  allowed_capabilities: string[];
  versions: AgentVersion[];
}

export interface EvaluationCaseResult {
  case_id: string;
  input: string;
  expected: string;
  actual: string;
  status: 'PASSED' | 'FAILED';
  category: 'functional' | 'security' | 'regression';
}

export interface EvolutionProposal {
  proposal_id: string;
  target_type: 'agent_prompt' | 'skill' | 'routing_preference';
  target_id: string;
  parent_version: string;
  candidate_version: string;
  trigger_trace_ids: string[];
  failure_summary: string;
  change_summary: string;
  parent_content: string;
  candidate_content: string;
  content_hash: string;
  evaluation_status: 'NOT_RUN' | 'EVALUATING' | 'PASSED' | 'FAILED';
  status: 'OBSERVED' | 'DIAGNOSED' | 'CANDIDATE_CREATED' | 'EVALUATING' | 'AWAITING_APPROVAL' | 'PROMOTED' | 'REJECTED' | 'ROLLED_BACK';
  created_by: string;
  created_at: string;
  approved_by?: string | null;
  evaluation_results: EvaluationCaseResult[];
}

export interface PolicyRequest {
  action: string;
  resource_id: string;
  purpose: string;
}

export interface PolicyDecision {
  decision: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'REDACT';
  reason_code: string;
  policy_id: string;
  evaluated_at: string;
  details?: Record<string, unknown>;
}

export interface ApprovalDecision {
  decision: 'APPROVE' | 'REJECT';
  reason: string;
}

export interface ApprovalItem {
  approval_id: string;
  task_id: string;
  trace_id: string;
  requester_id: string;
  requester_name: string;
  action: string;
  tool_name: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidence_summary: string;
  policy_reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  decided_at?: string;
  decided_by?: string;
  decision_reason?: string;
}

export interface AuditEvent {
  event_id: string;
  timestamp: string;
  principal_id: string;
  task_id?: string;
  trace_id: string;
  event_type: 'TASK_CREATED' | 'ROUTE_RESOLVED' | 'SOURCE_READ' | 'AGENT_DELEGATED' | 'MODEL_CALLED' | 'POLICY_DECISION' | 'APPROVAL_GRANTED' | 'APPROVAL_REJECTED' | 'TOOL_EXECUTED' | 'EVOLUTION_PROMOTED' | 'SECURITY_BLOCKED';
  action: string;
  status: 'SUCCESS' | 'DENIED' | 'REQUIRES_ACTION';
  details: Record<string, unknown>;
}

export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'ERROR';
  firestore: 'CONNECTED' | 'DISCONNECTED';
  vertex_ai: 'READY' | 'UNAVAILABLE';
  session_principal: Principal | null;
  version: string;
}
