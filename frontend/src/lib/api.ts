/**
 * LARA Single-Origin API Client
 * Interfaces with FastAPI backend at /api/v1/*
 */

export interface Principal {
  principal_id: string;
  display_name: string;
  roles: string[];
  tenant_id: string;
  department?: string;
  attributes?: Record<string, any>;
  created_at?: string;
}

export interface TaskRecord {
  task_id: string;
  task_intent: string;
  tenant_id: string;
  created_by: string;
  status: 'QUEUED' | 'HIGHWAY_RESOLVED' | 'EXECUTING' | 'AWAITING_APPROVAL' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  current_agent?: string;
  route_id?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  plan?: {
    objective?: string;
    subtasks?: string[];
    proposed_actions?: string[];
  };
  evidence_packages?: Array<{
    source_id: string;
    title: string;
    excerpt: string;
    classification: string;
    revision?: string;
  }>;
  agent_outputs?: Record<string, string>;
  proposed_action?: {
    action_type: string;
    target: string;
    parameters?: Record<string, any>;
    policy_decision?: string;
    requires_approval?: boolean;
    approval_id?: string;
  };
  error_message?: string;
}

export interface ResolvedRoute {
  route_id: string;
  selected_path: string[];
  version: string;
  graph_version: string;
  resolved_at: string;
  score_breakdown: Record<string, number>;
  excluded_candidates: Array<{
    node_id: string;
    reason_code: string;
  }>;
  evidence_summary?: Array<{
    source_id: string;
    title: string;
    classification: string;
    revision?: string;
  }>;
}

export interface AgentRecord {
  agent_id: string;
  name: string;
  role: string;
  active_version: string;
  parent_version?: string;
  skills: string[];
  prompt_template?: string;
  status: string;
}

export interface EvolutionProposal {
  proposal_id: string;
  target_type: string;
  target_id: string;
  parent_version: string;
  candidate_version: string;
  trigger_trace_ids: string[];
  failure_summary: string;
  change_summary: string;
  candidate_content: string;
  content_hash: string;
  evaluation_status: 'PENDING' | 'PASSED' | 'FAILED';
  status: 'CANDIDATE_CREATED' | 'AWAITING_APPROVAL' | 'PROMOTED' | 'REJECTED';
  created_by: string;
  created_at: string;
  approved_by?: string;
  promoted_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  evaluation_evidence?: {
    total_cases: number;
    passed_cases: number;
    pass_rate: number;
    security_passed: boolean;
    details: Array<{
      case_id: string;
      passed: boolean;
      message: string;
    }>;
  };
}

export interface ApprovalRequest {
  approval_id: string;
  task_id: string;
  action_type: string;
  target_resource: string;
  parameters: Record<string, any>;
  risk_score: number;
  policy_reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_by: string;
  requested_at: string;
  decided_by?: string;
  decided_at?: string;
  decision_reason?: string;
}

export interface AuditEvent {
  event_id: string;
  event_type: string;
  timestamp: string;
  principal_id: string;
  trace_id: string;
  task_id?: string;
  action?: string;
  resource_id?: string;
  status: string;
  details?: Record<string, any>;
}

export interface PolicyEvaluationResult {
  decision: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'REDACT';
  reason_code: string;
  policy_id?: string;
  obligations?: string[];
  evaluated_at?: string;
}

const API_BASE = '/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'same-origin',
  });

  if (!res.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await res.json();
      errorDetail = errJson.error?.message || errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = `Status ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export const api = {
  // Auth
  getMe: () => request<Principal>('/auth/me'),
  demoLogin: (principal_id: string) =>
    request<{ principal: Principal; session_id: string }>('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ principal_id }),
    }),
  logout: () => request<{ status: string }>('/auth/logout', { method: 'POST' }),

  // Tasks
  listTasks: () => request<TaskRecord[]>('/tasks'),
  getTask: (task_id: string) => request<TaskRecord>(`/tasks/${task_id}`),
  createTask: (data: { task_intent: string; incident_id?: string; attachments?: string[] }) =>
    request<TaskRecord>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  runTask: (task_id: string) =>
    request<TaskRecord>(`/tasks/${task_id}/run`, {
      method: 'POST',
    }),
  cancelTask: (task_id: string) =>
    request<TaskRecord>(`/tasks/${task_id}/cancel`, {
      method: 'POST',
    }),

  // Information Highways
  resolveRoute: (data: { task_intent: string; incident_id?: string }) =>
    request<ResolvedRoute>('/graph/routes/resolve', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getGraphNodes: () => request<any[]>('/graph/nodes'),

  // Agents
  listAgents: () => request<AgentRecord[]>('/agents'),

  // Evolution
  listProposals: () => request<EvolutionProposal[]>('/evolution/proposals'),
  getProposal: (id: string) => request<EvolutionProposal>(`/evolution/proposals/${id}`),
  createProposal: (data: {
    target_type: string;
    target_id: string;
    trigger_trace_ids: string[];
    failure_summary: string;
    change_summary: string;
    candidate_content: string;
  }) =>
    request<EvolutionProposal>('/evolution/proposals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  evaluateProposal: (id: string) =>
    request<EvolutionProposal>(`/evolution/proposals/${id}/evaluate`, {
      method: 'POST',
    }),
  approveProposal: (id: string) =>
    request<EvolutionProposal>(`/evolution/proposals/${id}/approve`, {
      method: 'POST',
    }),
  rejectProposal: (id: string, reason: string) =>
    request<EvolutionProposal>(`/evolution/proposals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  rollbackVersion: (target_id: string, rollback_to_version: string) =>
    request<{ status: string; target_id: string; active_version: string }>('/evolution/rollback', {
      method: 'POST',
      body: JSON.stringify({ target_id, rollback_to_version }),
    }),

  // Governance
  listPrincipals: () => request<Principal[]>('/governance/principals'),
  simulatePolicy: (data: { action: string; resource_id: string; resource_type: string }) =>
    request<PolicyEvaluationResult>('/policies/evaluate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Approvals
  listApprovals: (status?: string) =>
    request<ApprovalRequest[]>(`/approvals${status ? `?status=${status}` : ''}`),
  decideApproval: (id: string, decision: 'APPROVE' | 'REJECT', rationale: string) =>
    request<ApprovalRequest>(`/approvals/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, rationale }),
    }),

  // Audit
  listAuditEvents: (params?: { trace_id?: string; task_id?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.trace_id) q.set('trace_id', params.trace_id);
    if (params?.task_id) q.set('task_id', params.task_id);
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return request<AuditEvent[]>(`/audit/events${qs ? `?${qs}` : ''}`);
  },

  // Health
  checkHealth: () => request<any>('/health'),
};
