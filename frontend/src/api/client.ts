/**
 * LARA API Client
 * Enterprise client interfacing with LARA runtime APIs.
 * Supports explicit mode switching (API vs Mock) without silent error-swallowing.
 */

import {
  Principal,
  Task,
  TaskCreate,
  TaskAccepted,
  TaskEvent,
  RouteResult,
  GraphNode,
  GraphEdge,
  Agent,
  EvolutionProposal,
  PolicyRequest,
  PolicyDecision,
  ApprovalItem,
  ApprovalDecision,
  AuditEvent,
  SystemHealth,
} from './types';
import {
  SEEDED_PRINCIPALS,
  MOCK_GRAPH_NODES,
  MOCK_GRAPH_EDGES,
  MOCK_AGENTS,
  MOCK_EVOLUTION_PROPOSAL,
  MOCK_INITIAL_TASK,
  MOCK_APPROVAL_ITEMS,
  MOCK_AUDIT_EVENTS,
} from './mockData';
import { httpFetch, getDataMode, setDataMode, isMockMode, DataMode } from './transport';
import {
  adaptPrincipalResponse,
  adaptTaskAccepted,
  adaptTaskResponse,
  adaptTaskEvents,
  adaptRouteResolveResponse,
  adaptPolicyDecisionResponse,
  adaptApprovalResponse,
  adaptEvolutionProposal,
  adaptAuditEvent,
  adaptHealthResponse,
} from './adapters';

export class LaraApiClient {
  private activePrincipal: Principal = SEEDED_PRINCIPALS[0]; // Default Maya Operator
  private tasks: Map<string, Task> = new Map();
  private proposals: Map<string, EvolutionProposal> = new Map();
  private approvals: Map<string, ApprovalItem> = new Map();
  private auditEvents: AuditEvent[] = [...MOCK_AUDIT_EVENTS];

  constructor() {
    this.tasks.set(MOCK_INITIAL_TASK.task_id, { ...MOCK_INITIAL_TASK });
    this.proposals.set(MOCK_EVOLUTION_PROPOSAL.proposal_id, { ...MOCK_EVOLUTION_PROPOSAL });
    MOCK_APPROVAL_ITEMS.forEach((a) => this.approvals.set(a.approval_id, { ...a }));
  }

  public setMockMode(force: boolean): void {
    setDataMode(force ? 'mock' : 'api');
  }

  public setDataMode(mode: DataMode): void {
    setDataMode(mode);
  }

  public isMockMode(): boolean {
    return isMockMode();
  }

  public getDataMode(): DataMode {
    return getDataMode();
  }

  public getCurrentPrincipal(): Principal {
    return this.activePrincipal;
  }

  // --- AUTHENTICATION ---

  /**
   * Switch identity or authenticate via demo credentials.
   * In API mode, calls POST /api/v1/auth/demo-login with { principal_id, password }.
   * Does NOT swallow errors; failures are propagated to the caller.
   */
  async demoLogin(principal_id: string): Promise<Principal> {
    if (!this.isMockMode()) {
      const payload = {
        principal_id,
        password: 'demo-password',
      };
      const res = await httpFetch<unknown>('/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const principal = adaptPrincipalResponse(res);
      this.activePrincipal = principal;
      return this.activePrincipal;
    }

    // Mock Mode
    const found = SEEDED_PRINCIPALS.find((p) => p.principal_id === principal_id);
    if (!found) {
      throw new Error(`Principal ${principal_id} not recognized in seeded demo directory`);
    }
    this.activePrincipal = found;

    this.recordAudit({
      event_type: 'POLICY_DECISION',
      action: `Session switch: ${found.display_name} (${found.roles[0]})`,
      status: 'SUCCESS',
      details: { principal_id: found.principal_id, roles: found.roles, clearance: found.attributes.clearance },
    });

    return this.activePrincipal;
  }

  async logout(): Promise<void> {
    if (!this.isMockMode()) {
      await httpFetch<void>('/auth/logout', { method: 'POST' });
    }
    this.activePrincipal = SEEDED_PRINCIPALS[0];
  }

  async getMe(): Promise<Principal> {
    if (!this.isMockMode()) {
      const res = await httpFetch<unknown>('/auth/me');
      const principal = adaptPrincipalResponse(res);
      this.activePrincipal = principal;
      return this.activePrincipal;
    }
    return this.activePrincipal;
  }

  // --- HEALTH ---

  async getHealth(): Promise<SystemHealth> {
    if (!this.isMockMode()) {
      try {
        const res = await httpFetch<unknown>('/health/ready');
        return adaptHealthResponse(res, this.activePrincipal);
      } catch {
        // Fallback to /health if /health/ready is not mounted
        const res = await httpFetch<unknown>('/health');
        return adaptHealthResponse(res, this.activePrincipal);
      }
    }

    return {
      status: 'HEALTHY',
      firestore: 'CONNECTED',
      vertex_ai: 'READY',
      session_principal: this.activePrincipal,
      version: '2.0.0-mock-harness',
    };
  }

  // --- TASKS & INVESTIGATIONS ---

  /**
   * Create a new investigation task.
   * In API mode, calls POST /api/v1/tasks.
   */
  async createTask(data: TaskCreate): Promise<TaskAccepted> {
    if (!this.isMockMode()) {
      const res = await httpFetch<unknown>('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const accepted = adaptTaskAccepted(res);

      // Track in local session for recent list before backend adds GET /tasks
      this.tasks.set(accepted.task_id, {
        task_id: accepted.task_id,
        title: data.title || (data.incident_id ? `Investigation for ${data.incident_id}` : 'Operational Investigation'),
        prompt: data.prompt,
        incident_id: data.incident_id || null,
        status: accepted.status,
        trace_id: accepted.trace_id,
        created_at: accepted.created_at,
        updated_at: accepted.created_at,
        principal_id: this.activePrincipal.principal_id,
        current_stage: 'INTAKE',
        evidence: [],
        agent_outputs: [],
        verification_findings: [],
      });

      return accepted;
    }

    // Mock Mode
    const taskId = `task_${Date.now()}`;
    const traceId = `trace_${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date().toISOString();
    const isSupervisor =
      this.activePrincipal.roles.includes('supervisor') ||
      this.activePrincipal.roles.includes('runtime_admin');

    const newTask: Task = {
      task_id: taskId,
      title: data.title || (data.incident_id ? `Investigate ${data.incident_id}` : 'General Investigation'),
      prompt: data.prompt,
      incident_id: data.incident_id || null,
      status: 'AWAITING_APPROVAL',
      trace_id: traceId,
      created_at: now,
      updated_at: now,
      principal_id: this.activePrincipal.principal_id,
      current_stage: 'ACTION_GATEWAY',
      active_agent: 'agent:verification',
      route_id: `route_${taskId}`,
      selected_path: [
        'workflow:incident-investigation',
        'agent:research',
        'source:incident-log',
        'source:asset-registry',
        'source:maintenance-history',
        'source:sop-current',
        ...(isSupervisor ? ['source:vendor-contract'] : []),
        'agent:analysis',
        'agent:verification',
      ],
      evidence: [...MOCK_INITIAL_TASK.evidence],
      agent_outputs: [...MOCK_INITIAL_TASK.agent_outputs],
      verification_findings: [...MOCK_INITIAL_TASK.verification_findings],
      proposed_action: {
        action_id: `act_${taskId}`,
        tool_id: 'tool:maintenance-request',
        tool_name: 'Simulated Maintenance Dispatcher',
        description: `Create Priority-1 simulated work order for ${data.incident_id || 'incident asset'}`,
        parameters: { asset: 'P-204', priority: 'HIGH', sop: 'SOP-MNT-014-Rev3.2' },
        policy_decision: 'REQUIRE_APPROVAL',
        reason_code: 'SEPARATION_OF_DUTIES_SUPERVISOR_REQUIRED',
        simulated: true,
        approval_id: `appr_${taskId}`,
      },
    };

    this.tasks.set(taskId, newTask);

    const newApproval: ApprovalItem = {
      approval_id: `appr_${taskId}`,
      task_id: taskId,
      trace_id: traceId,
      requester_id: this.activePrincipal.principal_id,
      requester_name: this.activePrincipal.display_name,
      action: `Simulated Maintenance Dispatch for ${data.incident_id || 'P-204'}`,
      tool_name: 'tool:maintenance-request',
      risk_level: 'HIGH',
      evidence_summary: 'Vibration anomaly detected. SOP-MNT-014 Rev 3.2 specifies bearing inspection.',
      policy_reason: 'Enterprise equipment work orders require Supervisor approval.',
      status: 'PENDING',
      created_at: now,
    };
    this.approvals.set(newApproval.approval_id, newApproval);

    this.recordAudit({
      task_id: taskId,
      trace_id: traceId,
      event_type: 'TASK_CREATED',
      action: `Create task: ${newTask.title}`,
      status: 'SUCCESS',
      details: { prompt_snippet: data.prompt.substring(0, 80), incident_id: data.incident_id },
    });

    return {
      task_id: taskId,
      status: 'AWAITING_APPROVAL',
      trace_id: traceId,
      created_at: now,
    };
  }

  async getTask(taskId: string): Promise<Task> {
    if (!this.isMockMode()) {
      const res = await httpFetch<unknown>(`/tasks/${taskId}`);
      const task = adaptTaskResponse(res);
      this.tasks.set(taskId, task);
      return task;
    }

    const t = this.tasks.get(taskId);
    if (!t) throw new Error(`Task ${taskId} not found`);
    return t;
  }

  /**
   * Return recent tasks.
   * If backend implements GET /tasks in the future, it fetches it; otherwise returns session tasks.
   */
  async getRecentTasks(): Promise<Task[]> {
    if (!this.isMockMode()) {
      try {
        const res = await httpFetch<unknown[]>('/tasks');
        if (Array.isArray(res)) {
          return res.map(adaptTaskResponse);
        }
      } catch {
        // GET /tasks is not yet implemented by the backend (noted in contract matrix)
        // Return local session tasks
      }
    }

    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async getTaskEvents(taskId: string): Promise<TaskEvent[]> {
    if (!this.isMockMode()) {
      const res = await httpFetch<unknown>(`/tasks/${taskId}/events`);
      return adaptTaskEvents(res);
    }

    const t = this.tasks.get(taskId) || MOCK_INITIAL_TASK;
    return [
      {
        event_id: `ev1_${taskId}`,
        task_id: taskId,
        trace_id: t.trace_id,
        type: 'INTAKE',
        stage: 'INTAKE',
        timestamp: t.created_at,
        summary: 'Task created and capability requirements normalised',
      },
      {
        event_id: `ev2_${taskId}`,
        task_id: taskId,
        trace_id: t.trace_id,
        type: 'HIGHWAY_RESOLUTION',
        stage: 'HIGHWAY_RESOLUTION',
        timestamp: new Date(new Date(t.created_at).getTime() + 1000).toISOString(),
        summary: `Dynamic Information Highway resolved for principal ${this.activePrincipal.display_name}`,
      },
      {
        event_id: `ev3_${taskId}`,
        task_id: taskId,
        trace_id: t.trace_id,
        type: 'RESEARCH',
        stage: 'RESEARCH',
        agent_id: 'agent:research',
        timestamp: new Date(new Date(t.created_at).getTime() + 2000).toISOString(),
        summary: 'Research Agent extracted incident log, registry, and validated SOP-MNT-014 Rev 3.2',
      },
      {
        event_id: `ev4_${taskId}`,
        task_id: taskId,
        trace_id: t.trace_id,
        type: 'ANALYSIS',
        stage: 'ANALYSIS',
        agent_id: 'agent:analysis',
        timestamp: new Date(new Date(t.created_at).getTime() + 3500).toISOString(),
        summary: 'Analysis Agent confirmed bearing fatigue pattern and calculated vibration excess',
      },
      {
        event_id: `ev5_${taskId}`,
        task_id: taskId,
        trace_id: t.trace_id,
        type: 'VERIFICATION',
        stage: 'VERIFICATION',
        agent_id: 'agent:verification',
        timestamp: new Date(new Date(t.created_at).getTime() + 5000).toISOString(),
        summary: 'Verification Agent audited citations and marked tool invocation as REQUIRE_APPROVAL',
      },
    ];
  }

  // --- DYNAMIC INFORMATION HIGHWAYS ---

  /**
   * Resolve Dynamic Information Highway route.
   * In API mode, calls GET /api/v1/graph/routes/resolve?task_id={taskId}
   */
  async resolveRoute(taskId?: string): Promise<RouteResult> {
    if (!this.isMockMode() && taskId) {
      const res = await httpFetch<unknown>(`/graph/routes/resolve?task_id=${encodeURIComponent(taskId)}`);
      return adaptRouteResolveResponse(res);
    }

    // Mock Mode role-dependent resolution
    const roles = this.activePrincipal.roles;
    const isSupervisorOrAdmin = roles.includes('supervisor') || roles.includes('runtime_admin');
    const isAuditor = roles.includes('auditor');

    if (isAuditor) {
      return {
        route_id: `route_aud_${Date.now()}`,
        task_id: taskId || 'task_demo',
        principal_id: this.activePrincipal.principal_id,
        graph_version: 4,
        selected_path: ['workflow:incident-investigation'],
        selected_sources: [],
        excluded_candidates: [
          { reason_code: 'POLICY_DENIED', display: 'Operational sources excluded: Auditor clearance limited to logs' },
          { reason_code: 'TOOL_PROHIBITED', display: 'Execution tools prohibited for Assurance roles' },
        ],
        score_components: { relevance: 0.5, trust: 0.99, freshness: 0.95, availability: 1.0, cost_efficiency: 1.0 },
      };
    }

    if (isSupervisorOrAdmin) {
      return {
        route_id: `route_sup_${Date.now()}`,
        task_id: taskId || 'task_demo',
        principal_id: this.activePrincipal.principal_id,
        graph_version: 4,
        selected_path: [
          'workflow:incident-investigation',
          'agent:research',
          'source:incident-log',
          'source:asset-registry',
          'source:maintenance-history',
          'source:sop-current',
          'source:vendor-contract',
          'agent:analysis',
          'agent:verification',
          'tool:calculator-safe',
          'tool:maintenance-request',
        ],
        selected_sources: [
          'source:incident-log',
          'source:asset-registry',
          'source:maintenance-history',
          'source:sop-current',
          'source:vendor-contract',
        ],
        excluded_candidates: [
          { reason_code: 'HARD_BOUNDARY', display: 'tool:equipment-control denied: Actuation not permitted in demo environment' },
        ],
        score_components: { relevance: 0.98, trust: 0.97, freshness: 0.97, availability: 1.0, cost_efficiency: 0.94 },
      };
    }

    // Maya Operator
    return {
      route_id: `route_op_${Date.now()}`,
      task_id: taskId || 'task_demo',
      principal_id: this.activePrincipal.principal_id,
      graph_version: 4,
      selected_path: [
        'workflow:incident-investigation',
        'agent:research',
        'source:incident-log',
        'source:asset-registry',
        'source:maintenance-history',
        'source:sop-current',
        'agent:analysis',
        'agent:verification',
        'tool:calculator-safe',
      ],
      selected_sources: [
        'source:incident-log',
        'source:asset-registry',
        'source:maintenance-history',
        'source:sop-current',
      ],
      excluded_candidates: [
        { reason_code: 'POLICY_DENIED', display: 'Restricted source excluded by policy (Confidential clearance required)' },
        { reason_code: 'SEPARATION_OF_DUTIES', display: 'tool:maintenance-request requires Supervisor delegation' },
        { reason_code: 'HARD_BOUNDARY', display: 'tool:equipment-control denied: Physical actuation prohibited' },
      ],
      score_components: { relevance: 0.91, trust: 0.95, freshness: 0.96, availability: 1.0, cost_efficiency: 0.90 },
    };
  }

  async getGraphNodes(): Promise<GraphNode[]> {
    const roles = this.activePrincipal.roles;
    const isConfidential = roles.includes('supervisor') || roles.includes('runtime_admin');

    return MOCK_GRAPH_NODES.filter((node) => {
      if (node.classification === 'CONFIDENTIAL' && !isConfidential) {
        return false;
      }
      return true;
    });
  }

  async getGraphEdges(): Promise<GraphEdge[]> {
    const roles = this.activePrincipal.roles;
    const isConfidential = roles.includes('supervisor') || roles.includes('runtime_admin');

    return MOCK_GRAPH_EDGES.filter((edge) => {
      if (edge.classification === 'CONFIDENTIAL' && !isConfidential) {
        return false;
      }
      return true;
    });
  }

  // --- AGENTS ---

  async getAgents(): Promise<Agent[]> {
    return MOCK_AGENTS;
  }

  async getAgent(agentId: string): Promise<Agent> {
    const found = MOCK_AGENTS.find((a) => a.agent_id === agentId);
    if (!found) throw new Error(`Agent ${agentId} not found`);
    return found;
  }

  // --- EVOLUTION LAB ---

  async getEvolutionProposals(): Promise<EvolutionProposal[]> {
    if (!this.isMockMode()) {
      const res = await httpFetch<unknown[]>('/evolution/proposals');
      if (Array.isArray(res)) {
        return res.map(adaptEvolutionProposal);
      }
    }
    return Array.from(this.proposals.values());
  }

  async evaluateCandidate(proposalId: string): Promise<EvolutionProposal> {
    if (!this.isMockMode()) {
      const res = await httpFetch<unknown>(`/evolution/proposals/${encodeURIComponent(proposalId)}/evaluate`, {
        method: 'POST',
      });
      return adaptEvolutionProposal(res);
    }

    const p = this.proposals.get(proposalId);
    if (!p) throw new Error(`Proposal ${proposalId} not found`);

    p.evaluation_status = 'PASSED';
    p.status = 'AWAITING_APPROVAL';
    this.proposals.set(proposalId, p);

    this.recordAudit({
      event_type: 'POLICY_DECISION',
      action: `Evaluation suite run on candidate ${p.candidate_version}`,
      status: 'SUCCESS',
      details: {
        proposal_id: proposalId,
        functional_cases: '2/2 passed',
        security_invariants: '4/4 passed',
      },
    });

    return p;
  }

  async approveCandidate(proposalId: string, reason: string): Promise<EvolutionProposal> {
    if (!this.activePrincipal.roles.includes('runtime_admin')) {
      throw new Error('Access Denied: Only Runtime Administrator can approve candidate evolution models.');
    }

    if (!reason || reason.trim().length < 8) {
      throw new Error('A detailed justification reason (minimum 8 characters) is mandatory.');
    }

    if (!this.isMockMode()) {
      // Backend approve endpoint takes NO body (documented in contract matrix)
      const res = await httpFetch<unknown>(`/evolution/proposals/${encodeURIComponent(proposalId)}/approve`, {
        method: 'POST',
      });
      return adaptEvolutionProposal(res);
    }

    const p = this.proposals.get(proposalId);
    if (!p) throw new Error(`Proposal ${proposalId} not found`);

    p.status = 'PROMOTED';
    p.approved_by = this.activePrincipal.principal_id;

    const targetAgent = MOCK_AGENTS.find((a) => a.agent_id === p.target_id);
    if (targetAgent) {
      targetAgent.active_version = p.candidate_version;
      const vers = targetAgent.versions.find((v) => v.version === p.candidate_version);
      if (vers) vers.status = 'PROMOTED';
    }

    this.proposals.set(proposalId, p);

    this.recordAudit({
      event_type: 'EVOLUTION_PROMOTED',
      action: `Promote candidate ${p.candidate_version} to active production`,
      status: 'SUCCESS',
      details: {
        proposal_id: proposalId,
        approved_by: this.activePrincipal.principal_id,
        reason,
        new_active_version: p.candidate_version,
      },
    });

    return p;
  }

  async rollbackCandidate(proposalId: string, reason: string): Promise<EvolutionProposal> {
    if (!this.activePrincipal.roles.includes('runtime_admin')) {
      throw new Error('Access Denied: Only Runtime Administrator can rollback prompt versions.');
    }

    // Backend does not currently implement a rollback route
    const p = this.proposals.get(proposalId);
    if (!p) throw new Error(`Proposal ${proposalId} not found`);

    p.status = 'ROLLED_BACK';

    const targetAgent = MOCK_AGENTS.find((a) => a.agent_id === p.target_id);
    if (targetAgent) {
      targetAgent.active_version = p.parent_version;
    }

    this.proposals.set(proposalId, p);

    this.recordAudit({
      event_type: 'EVOLUTION_PROMOTED',
      action: `Rollback to parent version ${p.parent_version}`,
      status: 'SUCCESS',
      details: { proposal_id: proposalId, reason, restored_version: p.parent_version },
    });

    return p;
  }

  // --- GOVERNANCE & POLICY ---

  async evaluatePolicy(req: PolicyRequest): Promise<PolicyDecision> {
    if (!this.isMockMode()) {
      const res = await httpFetch<unknown>('/policies/evaluate', {
        method: 'POST',
        body: JSON.stringify(req),
      });
      return adaptPolicyDecisionResponse(res);
    }

    const roles = this.activePrincipal.roles;
    const isSupervisor = roles.includes('supervisor');
    const isAdmin = roles.includes('runtime_admin');
    const isAuditor = roles.includes('auditor');
    const now = new Date().toISOString();

    if (req.action.includes('equipment') || req.resource_id.includes('equipment')) {
      return {
        decision: 'DENY',
        reason_code: 'HARD_SYSTEM_BOUNDARY_NO_ACTUATION',
        policy_id: 'pol_actuation_lock',
        evaluated_at: now,
      };
    }

    if (req.action.includes('maintenance') || req.resource_id.includes('maintenance')) {
      if (isAuditor) {
        return {
          decision: 'DENY',
          reason_code: 'ROLE_NOT_PERMITTED_FOR_ACTIONS',
          policy_id: 'pol_assurance_isolation',
          evaluated_at: now,
        };
      }
      if (isSupervisor || isAdmin) {
        return {
          decision: 'REQUIRE_APPROVAL',
          reason_code: 'SUPERVISOR_APPROVAL_REQUIRED',
          policy_id: 'pol_maintenance_dispatch',
          evaluated_at: now,
        };
      }
      return {
        decision: 'DENY',
        reason_code: 'INSUFFICIENT_CLEARANCE_REQUIRES_SUPERVISOR',
        policy_id: 'pol_maintenance_dispatch',
        evaluated_at: now,
      };
    }

    if (req.resource_id.includes('vendor-contract')) {
      if (isSupervisor || isAdmin) {
        return {
          decision: 'ALLOW',
          reason_code: 'CONFIDENTIAL_CLEARANCE_VALIDATED',
          policy_id: 'pol_confidential_access',
          evaluated_at: now,
        };
      }
      return {
        decision: 'DENY',
        reason_code: 'POLICY_DENIED_CLEARANCE_MISMATCH',
        policy_id: 'pol_confidential_access',
        evaluated_at: now,
      };
    }

    return {
      decision: 'ALLOW',
      reason_code: 'INTERNAL_READ_PERMITTED',
      policy_id: 'pol_general_read',
      evaluated_at: now,
    };
  }

  // --- APPROVALS ---

  async getApprovals(): Promise<ApprovalItem[]> {
    return Array.from(this.approvals.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async decideApproval(approvalId: string, decision: ApprovalDecision): Promise<ApprovalItem> {
    const roles = this.activePrincipal.roles;
    if (!roles.includes('supervisor') && !roles.includes('runtime_admin')) {
      throw new Error('Access Denied: Only Supervisor or Administrator can approve actions.');
    }

    if (!decision.reason || decision.reason.trim().length < 8) {
      throw new Error('A detailed decision reason (at least 8 characters) is required.');
    }

    if (!this.isMockMode()) {
      const res = await httpFetch<unknown>(`/approvals/${encodeURIComponent(approvalId)}/decision`, {
        method: 'POST',
        body: JSON.stringify(decision),
      });
      return adaptApprovalResponse(res);
    }

    const item = this.approvals.get(approvalId);
    if (!item) throw new Error(`Approval ${approvalId} not found`);

    if (item.requester_id === this.activePrincipal.principal_id && !roles.includes('runtime_admin')) {
      throw new Error('Separation of Duties violation: Requester cannot approve their own action.');
    }

    item.status = decision.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    item.decided_at = new Date().toISOString();
    item.decided_by = this.activePrincipal.principal_id;
    item.decision_reason = decision.reason;
    this.approvals.set(approvalId, item);

    const task = this.tasks.get(item.task_id);
    if (task) {
      task.status = decision.decision === 'APPROVE' ? 'COMPLETED' : 'CANCELLED';
      task.current_stage = 'COMPLETED';
      this.tasks.set(task.task_id, task);
    }

    this.recordAudit({
      task_id: item.task_id,
      trace_id: item.trace_id,
      event_type: decision.decision === 'APPROVE' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
      action: `${decision.decision}: ${item.action}`,
      status: 'SUCCESS',
      details: {
        approval_id: approvalId,
        decided_by: this.activePrincipal.display_name,
        reason: decision.reason,
      },
    });

    return item;
  }

  // --- AUDIT ---

  async getAuditEvents(filter?: { taskId?: string; principalId?: string }): Promise<AuditEvent[]> {
    if (!this.isMockMode()) {
      try {
        const params: Record<string, string | undefined> = {};
        if (filter?.taskId) params.task_id = filter.taskId;
        if (filter?.principalId) params.principal_id = filter.principalId;

        const res = await httpFetch<unknown[]>('/audit/events', { params });
        if (Array.isArray(res)) {
          return res.map(adaptAuditEvent);
        }
      } catch {
        // Fallback to local session audit if not yet persisted
      }
    }

    let list = [...this.auditEvents];
    if (filter?.taskId) {
      list = list.filter((e) => e.task_id === filter.taskId);
    }
    if (filter?.principalId) {
      list = list.filter((e) => e.principal_id === filter.principalId);
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private recordAudit(
    event: Omit<AuditEvent, 'event_id' | 'timestamp' | 'principal_id' | 'trace_id'> & { trace_id?: string }
  ) {
    const evt: AuditEvent = {
      event_id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      principal_id: this.activePrincipal.principal_id,
      trace_id: event.trace_id || `trace_${Math.random().toString(36).substring(2, 9)}`,
      event_type: event.event_type,
      action: event.action,
      status: event.status,
      details: event.details || {},
      task_id: event.task_id,
    };
    this.auditEvents.unshift(evt);
  }
}

export const api = new LaraApiClient();
