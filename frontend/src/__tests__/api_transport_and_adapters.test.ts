import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LaraApiError,
  isLaraApiError,
  isAuthError,
  isPolicyDenied,
  isNotFoundError,
  isConflictError,
  isValidationError,
  isSandboxUnavailable,
} from '../api/errors';
import {
  httpFetch,
  getDataMode,
  setDataMode,
  isMockMode,
} from '../api/transport';
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
} from '../api/adapters';

describe('LARA API Errors & Predicates', () => {
  it('constructs LaraApiError with all attributes', () => {
    const err = new LaraApiError(
      'Access Denied: Separation of Duties violation',
      403,
      'SEPARATION_OF_DUTIES_VIOLATION',
      'req_123',
      'trc_456',
      { attempted_action: 'approve_task' }
    );

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(LaraApiError);
    expect(isLaraApiError(err)).toBe(true);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('SEPARATION_OF_DUTIES_VIOLATION');
    expect(err.requestId).toBe('req_123');
    expect(err.traceId).toBe('trc_456');
    expect(err.details).toEqual({ attempted_action: 'approve_task' });
  });

  it('correctly classifies error predicates', () => {
    const authErr = new LaraApiError('Unauthorized', 401, 'UNAUTHENTICATED');
    expect(isAuthError(authErr)).toBe(true);
    expect(isPolicyDenied(authErr)).toBe(false);

    const forbiddenErr = new LaraApiError('Forbidden', 403, 'POLICY_DENIED');
    expect(isPolicyDenied(forbiddenErr)).toBe(true);
    expect(isAuthError(forbiddenErr)).toBe(false);

    const notFoundErr = new LaraApiError('Task not found', 404, 'NOT_FOUND');
    expect(isNotFoundError(notFoundErr)).toBe(true);

    const conflictErr = new LaraApiError('Conflict', 409, 'CONFLICT');
    expect(isConflictError(conflictErr)).toBe(true);

    const validationErr = new LaraApiError('Validation', 422, 'VALIDATION_ERROR');
    expect(isValidationError(validationErr)).toBe(true);

    const sandboxErr = new LaraApiError('Sandbox Down', 503, 'SANDBOX_UNAVAILABLE');
    expect(isSandboxUnavailable(sandboxErr)).toBe(true);

    expect(isLaraApiError(new Error('plain error'))).toBe(false);
  });
});

describe('LARA HTTP Transport & Data Modes', () => {
  beforeEach(() => {
    setDataMode('api');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('supports toggling data mode between api and mock', () => {
    setDataMode('mock');
    expect(getDataMode()).toBe('mock');
    expect(isMockMode()).toBe(true);

    setDataMode('api');
    expect(getDataMode()).toBe('api');
    expect(isMockMode()).toBe(false);
  });

  it('handles 204 No Content as null', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 204, statusText: 'No Content' })
    );

    const result = await httpFetch<void>('/auth/logout', { method: 'POST' });
    expect(result).toBeNull();
  });

  it('parses standardized backend error envelopes', async () => {
    const errorPayload = {
      error: {
        code: 'SEPARATION_OF_DUTIES_VIOLATION',
        message: 'Requester cannot approve their own action item',
        request_id: 'req_test_01',
        trace_id: 'trc_test_01',
        details: { requester_id: 'usr_operator_01' },
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(errorPayload), {
        status: 403,
        statusText: 'Forbidden',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    try {
      await httpFetch('/approvals/appr_123/decision', { method: 'POST' });
      expect.fail('Expected httpFetch to throw LaraApiError');
    } catch (e) {
      expect(isLaraApiError(e)).toBe(true);
      const apiErr = e as LaraApiError;
      expect(apiErr.statusCode).toBe(403);
      expect(apiErr.code).toBe('SEPARATION_OF_DUTIES_VIOLATION');
      expect(apiErr.message).toBe('Requester cannot approve their own action item');
      expect(apiErr.requestId).toBe('req_test_01');
      expect(apiErr.traceId).toBe('trc_test_01');
      expect(apiErr.details).toEqual({ requester_id: 'usr_operator_01' });
    }
  });

  it('handles network failure with NETWORK_ERROR code', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));

    await expect(httpFetch('/health')).rejects.toThrow(/Network error/);
  });
});

describe('LARA Response Adapters', () => {
  it('adapts Principal response correctly', () => {
    const rawBackendPrincipal = {
      principal_id: 'usr_ravi_01',
      display_name: 'Ravi Supervisor',
      roles: ['supervisor', 'operator'],
      attributes: {
        department: 'Operations',
        clearance: 'confidential',
      },
    };

    const adapted = adaptPrincipalResponse(rawBackendPrincipal);
    expect(adapted.principal_id).toBe('usr_ravi_01');
    expect(adapted.display_name).toBe('Ravi Supervisor');
    expect(adapted.roles).toEqual(['supervisor', 'operator']);
    expect(adapted.attributes.clearance).toBe('confidential');
  });

  it('adapts TaskAccepted response correctly', () => {
    const raw = {
      task_id: 'task_abc_123',
      status: 'AWAITING_APPROVAL',
      trace_id: 'trc_abc_123',
      created_at: '2026-11-20T12:00:00Z',
    };
    const adapted = adaptTaskAccepted(raw);
    expect(adapted.task_id).toBe('task_abc_123');
    expect(adapted.status).toBe('AWAITING_APPROVAL');
    expect(adapted.trace_id).toBe('trc_abc_123');
  });

  it('unpacks nested result payload in TaskResponse without fabricating data', () => {
    const rawTaskResponse = {
      task_id: 'task_inc204',
      title: 'Investigate Compressor P-204',
      prompt: 'Check vibration anomaly and maintenance records',
      incident_id: 'INC-204',
      status: 'AWAITING_APPROVAL',
      trace_id: 'trc_inc204',
      created_at: '2026-11-20T10:00:00Z',
      updated_at: '2026-11-20T10:05:00Z',
      principal_id: 'usr_operator_01',
      result: {
        selected_path: ['workflow:investigation', 'agent:research', 'source:telemetry'],
        evidence: [
          {
            source_id: 'src_tel_01',
            name: 'P-204 Telemetry',
            classification: 'INTERNAL',
            revision: 'Live',
            effective_date: '2026-11-20',
            status: 'CURRENT',
            summary: 'Vibration reached 8.4 mm/s',
            verified: true,
          },
        ],
        agent_outputs: [
          {
            agent_id: 'agent:research',
            agent_name: 'Research Agent',
            version: '1.4.2',
            status: 'SUCCESS',
            summary: 'Retrieved telemetry and SOP',
            findings: ['Vibration spike confirmed'],
            confidence_score: 0.98,
            duration_ms: 1100,
          },
        ],
        verification_findings: [
          {
            claim: 'Bearing anomaly exceeds safe operational threshold',
            status: 'VERIFIED',
            source_reference: 'SOP-MNT-014',
            notes: 'Verified against Rev 3.2',
          },
        ],
        proposed_action: {
          action_id: 'act_01',
          tool_id: 'tool:maintenance',
          tool_name: 'Maintenance Dispatcher',
          description: 'Schedule inspection',
          parameters: { asset: 'P-204' },
          policy_decision: 'REQUIRE_APPROVAL',
          reason_code: 'SUPERVISOR_APPROVAL_REQUIRED',
          simulated: true,
          approval_id: 'appr_01',
        },
      },
    };

    const task = adaptTaskResponse(rawTaskResponse);
    expect(task.task_id).toBe('task_inc204');
    expect(task.status).toBe('AWAITING_APPROVAL');
    expect(task.current_stage).toBe('ACTION_GATEWAY');
    expect(task.evidence.length).toBe(1);
    expect(task.evidence[0].source_id).toBe('src_tel_01');
    expect(task.agent_outputs.length).toBe(1);
    expect(task.agent_outputs[0].confidence_score).toBe(0.98);
    expect(task.verification_findings.length).toBe(1);
    expect(task.proposed_action?.tool_id).toBe('tool:maintenance');
    expect(task.selected_path).toEqual(['workflow:investigation', 'agent:research', 'source:telemetry']);
  });

  it('adapts RouteResult and derives selected_sources', () => {
    const rawRoute = {
      task_id: 'task_001',
      principal_id: 'usr_operator_01',
      graph_version: 4,
      selected_path: [
        'workflow:investigation',
        'agent:research',
        'source:incident-log',
        'source:asset-registry',
        'agent:analysis',
      ],
      excluded_candidates: [
        {
          node_id: 'source:vendor-contract',
          reason_code: 'POLICY_DENIED',
          display: 'Confidential clearance required',
        },
      ],
      score_components: {
        relevance: 0.95,
        trust: 0.99,
        freshness: 0.96,
        availability: 1.0,
        cost_efficiency: 0.91,
      },
    };

    const route = adaptRouteResolveResponse(rawRoute);
    expect(route.task_id).toBe('task_001');
    expect(route.selected_path.length).toBe(5);
    expect(route.selected_sources).toEqual(['source:incident-log', 'source:asset-registry']);
    expect(route.excluded_candidates[0].reason_code).toBe('POLICY_DENIED');
  });

  it('adapts EvolutionProposal correctly', () => {
    const raw = {
      proposal_id: 'prop_01',
      target_type: 'agent_prompt',
      target_id: 'agent:verification',
      parent_version: '1.1.6',
      candidate_version: '1.2.0-rc1',
      failure_summary: 'Missed outdated SOP revision',
      change_summary: 'Mandate SOP revision check',
      content_hash: 'sha256:abc',
      evaluation_status: 'PASSED',
      status: 'AWAITING_APPROVAL',
      created_by: 'runtime_evolution_service',
      created_at: '2026-11-20T08:00:00Z',
      evaluation_results: [
        {
          case_id: 'case_01',
          input: 'Test obsolete SOP',
          expected: 'DISCREPANCY',
          actual: 'DISCREPANCY',
          status: 'PASSED',
          category: 'functional',
        },
      ],
    };

    const adapted = adaptEvolutionProposal(raw);
    expect(adapted.proposal_id).toBe('prop_01');
    expect(adapted.evaluation_status).toBe('PASSED');
    expect(adapted.evaluation_results.length).toBe(1);
    expect(adapted.evaluation_results[0].status).toBe('PASSED');
  });
});
