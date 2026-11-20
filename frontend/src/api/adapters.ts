/**
 * LARA API Response Adapters
 * Transform raw backend payloads into typed frontend domain models.
 * Reconciles schema differences between backend implementation and UI requirements.
 */

import {
  Principal,
  Task,
  TaskAccepted,
  TaskEvent,
  TaskEvidence,
  AgentOutput,
  VerificationFinding,
  ProposedAction,
  RouteResult,
  PolicyDecision,
  ApprovalItem,
  EvolutionProposal,
  AuditEvent,
  SystemHealth,
} from './types';

/**
 * Adapt PrincipalResponse from /auth/login, /auth/demo-login, or /auth/me.
 * Backend returns:
 * { "principal_id": "...", "display_name": "...", "roles": [...], "attributes": { "department": "...", "clearance": "..." } }
 */
export function adaptPrincipalResponse(raw: unknown): Principal {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid Principal response payload: expected an object');
  }
  const r = raw as Record<string, unknown>;

  // Handle nested principal wrapper if present
  const data = (r.principal && typeof r.principal === 'object') ? (r.principal as Record<string, unknown>) : r;

  return {
    principal_id: String(data.principal_id || 'unknown'),
    display_name: String(data.display_name || data.principal_id || 'Unknown Principal'),
    roles: Array.isArray(data.roles) ? (data.roles as string[]) : ['operator'],
    attributes: {
      department: String((data.attributes as Record<string, unknown>)?.department || 'Operations'),
      clearance: String((data.attributes as Record<string, unknown>)?.clearance || 'internal'),
      project: (data.attributes as Record<string, unknown>)?.project as string | undefined,
      employment_status: String((data.attributes as Record<string, unknown>)?.employment_status || 'active'),
      ...((data.attributes as Record<string, unknown>) || {}),
    },
  };
}

/**
 * Adapt TaskAccepted response from POST /tasks
 * Backend returns: { "task_id": "...", "status": "...", "trace_id": "...", "created_at": "..." }
 */
export function adaptTaskAccepted(raw: unknown): TaskAccepted {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid TaskAccepted response payload: expected an object');
  }
  const r = raw as Record<string, unknown>;
  return {
    task_id: String(r.task_id || ''),
    status: (r.status as TaskAccepted['status']) || 'QUEUED',
    trace_id: String(r.trace_id || ''),
    created_at: String(r.created_at || new Date().toISOString()),
  };
}

/**
 * Adapt TaskResponse from GET /tasks/{task_id}
 * Unpacks result payload (evidence, agent_outputs, verification_findings, proposed_action, selected_path)
 */
export function adaptTaskResponse(raw: unknown): Task {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid Task response payload: expected an object');
  }
  const r = raw as Record<string, unknown>;
  const result = (r.result && typeof r.result === 'object' ? r.result : {}) as Record<string, unknown>;

  // Map status
  const status = (r.status as Task['status']) || 'QUEUED';

  // Derive current_stage from status if missing
  let currentStage: Task['current_stage'] = 'INTAKE';
  if (r.current_stage && typeof r.current_stage === 'string') {
    currentStage = r.current_stage as Task['current_stage'];
  } else {
    switch (status) {
      case 'AWAITING_APPROVAL':
        currentStage = 'ACTION_GATEWAY';
        break;
      case 'COMPLETED':
        currentStage = 'COMPLETED';
        break;
      case 'RUNNING':
        currentStage = 'ANALYSIS';
        break;
      case 'FAILED':
      case 'CANCELLED':
        currentStage = 'COMPLETED';
        break;
      default:
        currentStage = 'INTAKE';
    }
  }

  // Parse evidence
  const rawEvidence = Array.isArray(r.evidence)
    ? r.evidence
    : Array.isArray(result.evidence)
    ? result.evidence
    : [];
  const evidence: TaskEvidence[] = rawEvidence.map((e: unknown, idx: number) => {
    const item = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>;
    return {
      source_id: String(item.source_id || item.id || `src_${idx}`),
      name: String(item.name || item.title || item.source || 'Evidence source'),
      classification: String(item.classification || 'INTERNAL').toUpperCase(),
      revision: String(item.revision || 'Rev 1.0'),
      effective_date: String(item.effective_date || item.timestamp || new Date().toISOString()),
      status: (item.status as TaskEvidence['status']) || 'CURRENT',
      summary: String(item.summary || item.snippet || item.content || 'Retrieved document reference'),
      uri: item.uri ? String(item.uri) : undefined,
      verified: Boolean(item.verified ?? true),
    };
  });

  // Parse agent_outputs
  const rawOutputs = Array.isArray(r.agent_outputs)
    ? r.agent_outputs
    : Array.isArray(result.agent_outputs)
    ? result.agent_outputs
    : [];
  const agentOutputs: AgentOutput[] = rawOutputs.map((o: unknown, idx: number) => {
    const item = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>;
    return {
      agent_id: String(item.agent_id || `agent_${idx}`),
      agent_name: String(item.agent_name || item.name || 'Specialist Agent'),
      version: String(item.version || '1.0.0'),
      status: (item.status as AgentOutput['status']) || 'SUCCESS',
      summary: String(item.summary || 'Completed execution'),
      findings: Array.isArray(item.findings) ? item.findings.map(String) : [],
      confidence_score: Number(item.confidence_score ?? 0.95),
      duration_ms: Number(item.duration_ms ?? 1200),
    };
  });

  // Parse verification_findings
  const rawFindings = Array.isArray(r.verification_findings)
    ? r.verification_findings
    : Array.isArray(result.verification_findings)
    ? result.verification_findings
    : [];
  const verificationFindings: VerificationFinding[] = rawFindings.map((f: unknown) => {
    const item = (f && typeof f === 'object' ? f : {}) as Record<string, unknown>;
    return {
      claim: String(item.claim || ''),
      status: (item.status as VerificationFinding['status']) || 'VERIFIED',
      source_reference: String(item.source_reference || item.source || ''),
      notes: String(item.notes || ''),
    };
  });

  // Parse proposed_action
  let proposedAction: ProposedAction | undefined;
  const rawAction = r.proposed_action || result.proposed_action;
  if (rawAction && typeof rawAction === 'object') {
    const act = rawAction as Record<string, unknown>;
    proposedAction = {
      action_id: String(act.action_id || `act_${Date.now()}`),
      tool_id: String(act.tool_id || 'tool:action'),
      tool_name: String(act.tool_name || act.tool_id || 'Operational Action Tool'),
      description: String(act.description || ''),
      parameters: (act.parameters && typeof act.parameters === 'object'
        ? act.parameters
        : {}) as Record<string, unknown>,
      policy_decision: (act.policy_decision as ProposedAction['policy_decision']) || 'REQUIRE_APPROVAL',
      reason_code: String(act.reason_code || 'SUPERVISOR_APPROVAL_REQUIRED'),
      simulated: Boolean(act.simulated ?? true),
      approval_id: act.approval_id ? String(act.approval_id) : undefined,
    };
  }

  // Parse selected_path
  const selectedPath = Array.isArray(r.selected_path)
    ? (r.selected_path as string[])
    : Array.isArray(result.selected_path)
    ? (result.selected_path as string[])
    : undefined;

  return {
    task_id: String(r.task_id || ''),
    title: String(r.title || (r.incident_id ? `Investigation for ${r.incident_id}` : 'Operational Task')),
    prompt: String(r.prompt || ''),
    incident_id: r.incident_id ? String(r.incident_id) : null,
    status,
    trace_id: String(r.trace_id || ''),
    created_at: String(r.created_at || new Date().toISOString()),
    updated_at: String(r.updated_at || r.created_at || new Date().toISOString()),
    principal_id: String(r.principal_id || 'system'),
    current_stage: currentStage,
    active_agent: r.active_agent ? String(r.active_agent) : undefined,
    route_id: r.route_id ? String(r.route_id) : undefined,
    selected_path: selectedPath,
    evidence,
    agent_outputs: agentOutputs,
    verification_findings: verificationFindings,
    proposed_action: proposedAction,
  };
}

/**
 * Adapt TaskEvents from GET /tasks/{task_id}/events
 */
export function adaptTaskEvents(raw: unknown): TaskEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: unknown, idx: number) => {
    const r = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      event_id: String(r.event_id || `evt_${idx}`),
      task_id: String(r.task_id || ''),
      trace_id: String(r.trace_id || ''),
      type: String(r.type || 'EXECUTION_STEP'),
      stage: String(r.stage || 'PROCESSING'),
      agent_id: r.agent_id ? String(r.agent_id) : undefined,
      timestamp: String(r.timestamp || new Date().toISOString()),
      summary: String(r.summary || r.message || 'Execution step recorded'),
      details: (r.details && typeof r.details === 'object' ? r.details : {}) as Record<string, unknown>,
    };
  });
}

/**
 * Adapt RouteResult from GET /graph/routes/resolve
 */
export function adaptRouteResolveResponse(raw: unknown): RouteResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid RouteResult response payload: expected an object');
  }
  const r = raw as Record<string, unknown>;
  const selectedPath = Array.isArray(r.selected_path) ? (r.selected_path as string[]) : [];

  // Extract sources from selected_path if selected_sources is not explicitly provided
  const selectedSources = Array.isArray(r.selected_sources)
    ? (r.selected_sources as string[])
    : selectedPath.filter((p) => p.startsWith('source:'));

  const excluded = Array.isArray(r.excluded_candidates)
    ? (r.excluded_candidates as Record<string, unknown>[]).map((ex) => ({
        node_id: ex.node_id ? String(ex.node_id) : undefined,
        reason_code: String(ex.reason_code || 'POLICY_EXCLUDED'),
        display: String(ex.display || ex.reason || 'Candidate excluded by policy boundary'),
      }))
    : [];

  const rawScore = (r.score_components && typeof r.score_components === 'object'
    ? r.score_components
    : {}) as Record<string, unknown>;

  return {
    route_id: String(r.route_id || `route_${r.task_id || Date.now()}`),
    task_id: String(r.task_id || ''),
    principal_id: String(r.principal_id || ''),
    graph_version: Number(r.graph_version ?? 1),
    selected_path: selectedPath,
    selected_sources: selectedSources,
    excluded_candidates: excluded,
    score_components: {
      relevance: Number(rawScore.relevance ?? 0.95),
      trust: Number(rawScore.trust ?? 0.98),
      freshness: Number(rawScore.freshness ?? 0.96),
      availability: Number(rawScore.availability ?? 1.0),
      cost_efficiency: Number(rawScore.cost_efficiency ?? 0.92),
    },
  };
}

/**
 * Adapt PolicyDecision from POST /policies/evaluate
 */
export function adaptPolicyDecisionResponse(raw: unknown): PolicyDecision {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid PolicyDecision response payload: expected an object');
  }
  const r = raw as Record<string, unknown>;
  return {
    decision: (r.decision as PolicyDecision['decision']) || 'REQUIRE_APPROVAL',
    reason_code: String(r.reason_code || 'POLICY_EVALUATED'),
    policy_id: String(r.policy_id || 'pol_default'),
    evaluated_at: String(r.evaluated_at || new Date().toISOString()),
    details: (r.details && typeof r.details === 'object' ? r.details : {}) as Record<string, unknown>,
  };
}

/**
 * Adapt ApprovalItem from backend
 */
export function adaptApprovalResponse(raw: unknown): ApprovalItem {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid ApprovalItem response payload: expected an object');
  }
  const r = raw as Record<string, unknown>;
  return {
    approval_id: String(r.approval_id || `appr_${Date.now()}`),
    task_id: String(r.task_id || ''),
    trace_id: String(r.trace_id || ''),
    requester_id: String(r.requester_id || ''),
    requester_name: String(r.requester_name || r.requester_id || 'Operational Agent'),
    action: String(r.action || 'Operational Action'),
    tool_name: String(r.tool_name || 'Tool Dispatcher'),
    risk_level: (r.risk_level as ApprovalItem['risk_level']) || 'HIGH',
    evidence_summary: String(r.evidence_summary || 'Evidence requires operational sign-off'),
    policy_reason: String(r.policy_reason || 'Supervisor sign-off required'),
    status: (r.status as ApprovalItem['status']) || 'PENDING',
    created_at: String(r.created_at || new Date().toISOString()),
    decided_at: r.decided_at ? String(r.decided_at) : undefined,
    decided_by: r.decided_by ? String(r.decided_by) : undefined,
    decision_reason: r.decision_reason ? String(r.decision_reason) : undefined,
  };
}

/**
 * Adapt EvolutionProposal
 */
export function adaptEvolutionProposal(raw: unknown): EvolutionProposal {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid EvolutionProposal response payload: expected an object');
  }
  const r = raw as Record<string, unknown>;
  return {
    proposal_id: String(r.proposal_id || ''),
    target_type: (r.target_type as EvolutionProposal['target_type']) || 'agent_prompt',
    target_id: String(r.target_id || ''),
    parent_version: String(r.parent_version || '1.0.0'),
    candidate_version: String(r.candidate_version || '1.1.0'),
    trigger_trace_ids: Array.isArray(r.trigger_trace_ids) ? r.trigger_trace_ids.map(String) : [],
    failure_summary: String(r.failure_summary || ''),
    change_summary: String(r.change_summary || ''),
    parent_content: String(r.parent_content || ''),
    candidate_content: String(r.candidate_content || ''),
    content_hash: String(r.content_hash || ''),
    evaluation_status: (r.evaluation_status as EvolutionProposal['evaluation_status']) || 'NOT_RUN',
    status: (r.status as EvolutionProposal['status']) || 'CANDIDATE_CREATED',
    created_by: String(r.created_by || 'system'),
    created_at: String(r.created_at || new Date().toISOString()),
    approved_by: r.approved_by ? String(r.approved_by) : null,
    evaluation_results: Array.isArray(r.evaluation_results)
      ? (r.evaluation_results as Record<string, unknown>[]).map((ev, idx) => ({
          case_id: String(ev.case_id || `case_${idx}`),
          input: String(ev.input || ''),
          expected: String(ev.expected || ''),
          actual: String(ev.actual || ''),
          status: (ev.status as 'PASSED' | 'FAILED') || 'PASSED',
          category: (ev.category as 'functional' | 'security' | 'regression') || 'functional',
        }))
      : [],
  };
}

/**
 * Adapt AuditEvent
 */
export function adaptAuditEvent(raw: unknown): AuditEvent {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid AuditEvent response payload: expected an object');
  }
  const r = raw as Record<string, unknown>;
  return {
    event_id: String(r.event_id || `evt_${Date.now()}`),
    timestamp: String(r.timestamp || new Date().toISOString()),
    principal_id: String(r.principal_id || 'system'),
    task_id: r.task_id ? String(r.task_id) : undefined,
    trace_id: String(r.trace_id || ''),
    event_type: (r.event_type as AuditEvent['event_type']) || 'TASK_CREATED',
    action: String(r.action || ''),
    status: (r.status as AuditEvent['status']) || 'SUCCESS',
    details: (r.details && typeof r.details === 'object' ? r.details : {}) as Record<string, unknown>,
  };
}

/**
 * Adapt SystemHealth
 * Accurately maps backend readiness without inferring unverified cloud dependencies.
 */
export function adaptHealthResponse(raw: unknown, currentPrincipal: Principal | null = null): SystemHealth {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawStatus = String(r.status || 'unknown').toLowerCase();
  const isHealthy = rawStatus === 'ready' || rawStatus === 'alive' || rawStatus === 'ok' || rawStatus === 'healthy';

  return {
    status: isHealthy ? 'HEALTHY' : rawStatus === 'degraded' ? 'DEGRADED' : 'ERROR',
    firestore: r.firestore === 'connected' ? 'CONNECTED' : r.firestore === 'disconnected' ? 'DISCONNECTED' : 'UNCHECKED',
    vertex_ai: r.vertex_ai === 'ready' ? 'READY' : r.vertex_ai === 'unavailable' ? 'UNAVAILABLE' : 'UNCHECKED',
    session_principal: currentPrincipal,
    version: String(r.version || 'unreported by backend /ready'),
  };
}

/**
 * Adapt GraphNode from GET /graph/nodes
 */
export function adaptGraphNode(raw: unknown): import('./types').GraphNode {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    node_id: String(r.node_id || ''),
    tenant_id: String(r.tenant_id || 'demo-enterprise'),
    type: (r.type as import('./types').GraphNode['type']) || 'source',
    name: String(r.label || r.name || r.node_id || ''),
    classification: String(r.classification || 'INTERNAL'),
    allowed_roles: Array.isArray(r.allowed_roles) ? (r.allowed_roles as string[]) : ['operator', 'supervisor', 'runtime_admin', 'auditor'],
    purposes: Array.isArray(r.purposes) ? (r.purposes as string[]) : ['incident_investigation'],
    status: (r.status as import('./types').GraphNode['status']) || 'ACTIVE',
    synthetic: r.synthetic !== false,
    trust_score: typeof r.trust_score === 'number' ? r.trust_score : 0.95,
    description: r.description ? String(r.description) : undefined,
    source_uri: r.source_uri ? String(r.source_uri) : undefined,
    capabilities: Array.isArray(r.capabilities) ? (r.capabilities as string[]) : undefined,
  };
}

/**
 * Adapt GraphEdge from GET /graph/edges
 */
export function adaptGraphEdge(raw: unknown): import('./types').GraphEdge {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    edge_id: String(r.edge_id || `edge_${r.source || r.source_node}_${r.target || r.target_node}`),
    tenant_id: String(r.tenant_id || 'demo-enterprise'),
    source_node: String(r.source || r.source_node || ''),
    target_node: String(r.target || r.target_node || ''),
    relationship: (r.relationship || r.edge_type || 'provides_context') as import('./types').GraphEdge['relationship'],
    status: String(r.status || 'ACTIVE'),
    allowed_roles: Array.isArray(r.allowed_roles) ? (r.allowed_roles as string[]) : ['operator', 'supervisor', 'runtime_admin', 'auditor'],
    classification: String(r.classification || 'INTERNAL'),
    trust_score: typeof r.trust_score === 'number' ? r.trust_score : (typeof r.weight === 'number' ? r.weight : 0.95),
  };
}

/**
 * Adapt Agent from GET /agents
 */
export function adaptAgentResponse(raw: unknown): import('./types').Agent {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawSkills = Array.isArray(r.skills) ? (r.skills as Record<string, unknown>[]) : [];
  const rawVersions = Array.isArray(r.versions) ? (r.versions as Record<string, unknown>[]) : [];

  return {
    agent_id: String(r.agent_id || ''),
    name: String(r.name || r.agent_id || 'Specialist Agent'),
    role: String(r.role || 'Specialist'),
    purpose: String(r.description || r.purpose || ''),
    active_version: String(r.current_version || r.active_version || '1.0.0'),
    status: (r.status === 'ACTIVE' || r.status === 'HEALTHY' ? 'HEALTHY' : 'DEGRADED') as import('./types').Agent['status'],
    allowed_capabilities: Array.isArray(r.capabilities)
      ? (r.capabilities as string[])
      : Array.isArray(r.allowed_capabilities)
        ? (r.allowed_capabilities as string[])
        : [],
    skills: rawSkills.map((s) => ({
      skill_id: String(s.skill_id || ''),
      name: String(s.name || ''),
      version: String(s.version || '1.0.0'),
      description: String(s.description || ''),
    })),
    versions: rawVersions.map((v) => ({
      version: String(v.version || v.version_id || '1.0.0'),
      created_at: String(v.created_at || new Date().toISOString()),
      parent_version: v.parent_version ? String(v.parent_version) : undefined,
      content_hash: String(v.content_hash || 'sha256:default'),
      status: (v.status as import('./types').AgentVersion['status']) || 'PROMOTED',
      change_summary: String(v.description || v.change_summary || 'Agent prompt version'),
    })),
  };
}

