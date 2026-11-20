import { describe, it, expect } from 'vitest';
import { api } from '../api/client';

describe('Evolution Engine & Governance Logic', () => {
  it('runs evaluation suite and verifies all test cases pass', async () => {
    const proposals = await api.getEvolutionProposals();
    expect(proposals.length).toBeGreaterThan(0);

    const evaluated = await api.evaluateCandidate(proposals[0].proposal_id);
    expect(evaluated.evaluation_status).toBe('PASSED');
    expect(evaluated.evaluation_results.length).toBe(6);
    expect(evaluated.evaluation_results.every((r) => r.status === 'PASSED')).toBe(true);
  });

  it('enforces separation of duties on action approvals', async () => {
    // Switch to Operator
    await api.demoLogin('usr_operator_01');

    const approvals = await api.getApprovals();
    const pending = approvals.find((a) => a.status === 'PENDING');
    expect(pending).toBeDefined();

    // Operator cannot approve
    await expect(
      api.decideApproval(pending!.approval_id, {
        decision: 'APPROVE',
        reason: 'Operator trying to self-approve',
      })
    ).rejects.toThrow(/Access Denied/i);

    // Switch to Supervisor
    await api.demoLogin('usr_supervisor_01');
    const decided = await api.decideApproval(pending!.approval_id, {
      decision: 'APPROVE',
      reason: 'Supervisor approved after reviewing SOP-MNT-014 Rev 3.2',
    });
    expect(decided.status).toBe('APPROVED');
  });

  it('enforces that only Runtime Admin can promote evolution candidates', async () => {
    const proposals = await api.getEvolutionProposals();
    const target = proposals[0];

    // Operator cannot promote
    await api.demoLogin('usr_operator_01');
    await expect(
      api.approveCandidate(target.proposal_id, 'Should fail as operator')
    ).rejects.toThrow(/Access Denied/i);

    // Supervisor cannot promote
    await api.demoLogin('usr_supervisor_01');
    await expect(
      api.approveCandidate(target.proposal_id, 'Should fail as supervisor')
    ).rejects.toThrow(/Access Denied/i);

    // Runtime Admin can promote
    await api.demoLogin('usr_admin_01');
    const promoted = await api.approveCandidate(
      target.proposal_id,
      'Administrator verified all test cases pass'
    );
    expect(promoted.status).toBe('PROMOTED');
  });
});
