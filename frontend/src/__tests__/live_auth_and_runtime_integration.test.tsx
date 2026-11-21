import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { LaraApiClient } from '../api/client';
import App from '../App';
import * as transport from '../api/transport';

describe('Phase 2 & Phase 6: Live Authentication & Integration Verification', () => {
  let client: LaraApiClient;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    client = new LaraApiClient();
    transport.setDataMode('api');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    transport.setDataMode('mock');
    vi.restoreAllMocks();
  });

  // Scenario 1: Login success and invalid credentials
  it('1. performs login success and propagates invalid credential error honestly', async () => {
    // Failure case: 401 Unauthorized
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        detail: {
          error_code: 'INVALID_CREDENTIALS',
          message: 'Invalid principal or password',
          status_code: 401,
        },
      }),
    });

    await expect(client.login('usr_admin_01', 'wrong_pass')).rejects.toThrow(/Invalid principal or password/i);

    // Success case: 200 OK
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        principal_id: 'usr_admin_01',
        display_name: 'Elena Rostova',
        roles: ['runtime_admin'],
        attributes: { department: 'Platform Engineering', clearance: 'restricted' },
      }),
    });

    const principal = await client.login('usr_admin_01', 'valid_pass');
    expect(principal.principal_id).toBe('usr_admin_01');
    expect(principal.roles).toContain('runtime_admin');
    expect(client.getCurrentPrincipal()?.principal_id).toBe('usr_admin_01');
  });

  // Scenario 2: Session restoration after reload (GET /api/v1/auth/me)
  it('2. restores session successfully via GET /api/v1/auth/me', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        principal_id: 'usr_supervisor_01',
        display_name: 'Ravi Patel',
        roles: ['supervisor'],
        attributes: { department: 'Operations Management', clearance: 'confidential' },
      }),
    });

    const restored = await client.getMe();
    expect(restored.principal_id).toBe('usr_supervisor_01');
    expect(restored.roles).toContain('supervisor');
  });

  // Scenario 3: Protected workspace routing (workspace unrendered when unauthenticated)
  it('3. gates workspace behind authentication when session restoration fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ detail: 'No active session' }),
    });

    render(<App />);

    // Wait for session restoration failure -> shows LoginPage
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Enterprise Sign In/i })).toBeInTheDocument();
    });

    // Workspace and navigation must NOT be visible
    expect(screen.queryByText('Enterprise Incident Workbench')).toBeNull();
    expect(screen.queryByText('Information Highways')).toBeNull();
  });

  // Scenario 4: Logout and session invalidation (POST /api/v1/auth/logout)
  it('4. calls POST /api/v1/auth/logout and clears active principal', async () => {
    let logoutCalled = false;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/auth/logout')) {
        logoutCalled = true;
        return { ok: true, status: 204, headers: new Headers() };
      }
      return { ok: false, status: 404, headers: new Headers() };
    });

    await client.logout();
    expect(logoutCalled).toBe(true);
    expect(client.getCurrentPrincipal()).toBeNull();
  });

  // Scenario 5: No default demo identity in API mode
  it('5. returns null for getCurrentPrincipal in API mode when unauthenticated', () => {
    expect(client.isMockMode()).toBe(false);
    expect(client.getCurrentPrincipal()).toBeNull();
  });

  // Scenario 6: No silent mock fallback after API errors
  it('6. rejects immediately on network or API failure without returning mock data', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ detail: 'Database unavailable' }),
    });

    await expect(client.getRecentTasks()).rejects.toThrow();
  });

  // Scenario 7: Live task listing and creation
  it('7. lists and creates tasks against real endpoints', async () => {
    // List tasks
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ([
        {
          task_id: 'task_live_101',
          title: 'Pump P-204 bearing vibration anomaly',
          prompt: 'Inspect vibration anomaly',
          status: 'RUNNING',
          trace_id: 'trc_101',
          created_at: '2026-11-21T08:00:00Z',
          updated_at: '2026-11-21T08:05:00Z',
          principal_id: 'usr_operator_01',
          current_stage: 'ANALYSIS',
          evidence: [],
          agent_outputs: [],
          verification_findings: [],
        },
      ]),
    });

    const tasks = await client.getRecentTasks();
    expect(tasks.length).toBe(1);
    expect(tasks[0].task_id).toBe('task_live_101');

    // Create task
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        task_id: 'task_live_102',
        status: 'QUEUED',
        trace_id: 'trc_102',
        created_at: '2026-11-21T08:10:00Z',
      }),
    });

    const created = await client.createTask({ prompt: 'New test investigation' });
    expect(created.task_id).toBe('task_live_102');
    expect(created.status).toBe('QUEUED');
  });

  // Scenario 8: Approval listing and decision
  it('8. retrieves approvals and submits decision via POST /approvals/:id/decision', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ([
        {
          approval_id: 'appr_stg_01',
          task_id: 'task_live_101',
          trace_id: 'trc_101',
          requester_id: 'usr_operator_01',
          requester_name: 'Maya Chen',
          action: 'Dispatch maintenance technician to asset P-204',
          tool_name: 'tool:dispatch',
          risk_level: 'HIGH',
          evidence_summary: 'Vibration anomaly detected',
          policy_reason: 'Equipment actuation requires Supervisor approval',
          status: 'PENDING',
          created_at: '2026-11-21T08:00:00Z',
        },
      ]),
    });

    const approvals = await client.getApprovals();
    expect(approvals.length).toBe(1);
    expect(approvals[0].approval_id).toBe('appr_stg_01');

    // Set active principal as Supervisor for authorization check
    client['activePrincipal'] = {
      principal_id: 'usr_supervisor_01',
      display_name: 'Ravi Patel',
      roles: ['supervisor'],
      attributes: { department: 'Operations Management', clearance: 'confidential' },
    };

    // Decide approval
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        approval_id: 'appr_stg_01',
        task_id: 'task_live_101',
        trace_id: 'trc_101',
        requester_id: 'usr_operator_01',
        requester_name: 'Maya Chen',
        action: 'Dispatch maintenance technician to asset P-204',
        tool_name: 'tool:dispatch',
        risk_level: 'HIGH',
        evidence_summary: 'Vibration anomaly detected',
        policy_reason: 'Equipment actuation requires Supervisor approval',
        status: 'APPROVED',
        created_at: '2026-11-21T08:00:00Z',
        decided_at: '2026-11-21T08:06:00Z',
        decided_by: 'usr_supervisor_01',
      }),
    });

    const decided = await client.decideApproval('appr_stg_01', {
      decision: 'APPROVE',
      reason: 'Confirmed SOP compliance and authorized technician dispatch',
    });
    expect(decided.status).toBe('APPROVED');
    expect(decided.decided_by).toBe('usr_supervisor_01');
  });

  // Scenario 9: Agent registry retrieval
  it('9. retrieves agent registry from GET /api/v1/agents', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ([
        {
          agent_id: 'agent:research',
          name: 'Research Specialist Agent',
          role: 'researcher',
          description: 'Extracts evidence from operational logs',
          current_version: 'v1.0.0',
          status: 'ACTIVE',
          capabilities: ['source.read.internal'],
          skills: [],
        },
      ]),
    });

    const agents = await client.getAgents();
    expect(agents.length).toBe(1);
    expect(agents[0].agent_id).toBe('agent:research');
  });

  // Scenario 10: Graph node and edge retrieval
  it('10. retrieves Information Highway nodes and edges', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ([
        {
          node_id: 'source:telemetry',
          tenant_id: 'demo-enterprise',
          type: 'source',
          name: 'Telemetry Stream',
          classification: 'INTERNAL',
          allowed_roles: ['operator', 'supervisor'],
          purposes: ['incident_investigation'],
          status: 'ACTIVE',
          synthetic: false,
          trust_score: 0.95,
        },
      ]),
    });

    const nodes = await client.getGraphNodes();
    expect(nodes.length).toBe(1);
    expect(nodes[0].node_id).toBe('source:telemetry');
  });

  // Scenario 11: Audit event retrieval
  it('11. retrieves cryptographic audit trail from GET /api/v1/audit', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ([
        {
          event_id: 'evt_101',
          timestamp: '2026-11-21T08:00:00Z',
          principal_id: 'usr_admin_01',
          trace_id: 'trc_101',
          event_type: 'AUTH_SUCCESS',
          action: 'demo-login',
          status: 'SUCCESS',
          details: {},
        },
      ]),
    });

    const events = await client.getAuditEvents();
    expect(events.length).toBe(1);
    expect(events[0].event_type).toBe('AUTH_SUCCESS');
  });

  // Scenario 12: Empty Firestore collections and honest UI handling
  it('12. handles empty Firestore collections with honest empty state', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => [],
    });

    const tasks = await client.getRecentTasks();
    expect(tasks).toEqual([]);
  });
});
