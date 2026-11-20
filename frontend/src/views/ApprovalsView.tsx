import React, { useState, useEffect } from 'react';
import { api, ApprovalRequest, Principal } from '../lib/api';
import { CheckSquare, ShieldCheck, XCircle, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface ApprovalsViewProps {
  currentPrincipal: Principal | null;
  onNavigateToTab: (tab: string) => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({ currentPrincipal, onNavigateToTab }) => {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [rationale, setRationale] = useState('');
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadApprovals = async () => {
    try {
      const data = await api.listApprovals();
      setApprovals(data);
      if (data.length > 0 && !selectedApproval) {
        setSelectedApproval(data[0]);
      } else if (selectedApproval) {
        const updated = data.find((a) => a.approval_id === selectedApproval.approval_id);
        if (updated) setSelectedApproval(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadApprovals();
    const interval = setInterval(loadApprovals, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleDecision = async (decision: 'APPROVE' | 'REJECT') => {
    if (!selectedApproval) return;
    if (!rationale.trim()) {
      setMessage({ text: 'A mandatory review rationale is required.', type: 'error' });
      return;
    }

    setActing(true);
    setMessage(null);
    try {
      const updated = await api.decideApproval(selectedApproval.approval_id, decision, rationale);
      setSelectedApproval(updated);
      await loadApprovals();
      setMessage({
        text: `Approval ${decision === 'APPROVE' ? 'granted' : 'rejected'}. State and audit trace updated.`,
        type: 'success',
      });
      setRationale('');
    } catch (err: any) {
      setMessage({ text: err.message || 'Approval decision rejected by policy', type: 'error' });
    } finally {
      setActing(false);
    }
  };

  const isSupervisor = currentPrincipal?.roles.includes('supervisor') || currentPrincipal?.roles.includes('runtime_admin');
  const isRequester = selectedApproval?.requested_by === currentPrincipal?.principal_id;

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
      <div className="lara-panel lara-panel--orange" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 22, margin: 0 }}>Human-in-the-Loop Governance & Approvals</h2>
            <span className="lara-badge" style={{ background: '#FF7138', color: '#101014', fontSize: 10, fontWeight: 800 }}>
              DUAL-AUTHORIZATION
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', color: 'var(--lara-ink)', fontSize: 13 }}>
            All high-impact operational tools require cryptographic human approval and enforce constitutional separation of duties.
          </p>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: message.type === 'success' ? '#DDF8E8' : '#FEE4E2',
            color: message.type === 'success' ? '#0E623B' : '#B42318',
            border: `1px solid ${message.type === 'success' ? '#A3ECC3' : '#FDA29B'}`,
          }}
        >
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 24 }}>
        {/* Left Column: Approvals List */}
        <div className="lara-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, margin: 0 }}>Pending Checkpoints</h3>
            <span style={{ fontSize: 11, color: 'var(--lara-muted)' }}>{approvals.length} total</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 600, overflowY: 'auto' }}>
            {approvals.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--lara-muted)', fontSize: 13 }}>
                No active approval requests in queue.
              </div>
            ) : (
              approvals.map((a) => {
                const isSelected = selectedApproval?.approval_id === a.approval_id;
                return (
                  <div
                    key={a.approval_id}
                    onClick={() => setSelectedApproval(a)}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: '1.5px solid',
                      borderColor: isSelected ? 'var(--lara-orange)' : 'var(--lara-line)',
                      background: isSelected ? '#FFF8F5' : 'var(--lara-white)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--lara-mono)', fontSize: 12, fontWeight: 700 }}>
                        {a.approval_id}
                      </span>
                      <span
                        className="lara-badge"
                        style={{
                          fontSize: 10,
                          background: a.status === 'APPROVED' ? '#DDF8E8' : a.status === 'REJECTED' ? '#FEE4E2' : '#FFE3D5',
                          color: a.status === 'APPROVED' ? '#0E623B' : a.status === 'REJECTED' ? '#B42318' : '#9A3412',
                        }}
                      >
                        {a.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{a.action_type}</div>
                    <div style={{ fontSize: 11, color: 'var(--lara-muted)' }}>
                      Target: {a.target_resource} • Risk: {a.risk_score}/10
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Approval Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {selectedApproval ? (
            <>
              <div className="lara-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--lara-mono)', fontSize: 16, fontWeight: 800 }}>
                        {selectedApproval.approval_id}
                      </span>
                      <span className="lara-badge lara-badge--review">
                        STATUS: {selectedApproval.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>
                      Action: {selectedApproval.action_type}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--lara-muted)' }}>RISK SCORE</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--lara-orange)' }}>
                      {selectedApproval.risk_score} / 10
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, background: '#FAFFF5', padding: 12, borderRadius: 10, border: '1px solid var(--lara-line)' }}>
                  <div>
                    <span style={{ color: 'var(--lara-muted)' }}>Requested By: </span>
                    <strong>{selectedApproval.requested_by}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--lara-muted)' }}>Target Resource: </span>
                    <code style={{ fontSize: 11 }}>{selectedApproval.target_resource}</code>
                  </div>
                  <div>
                    <span style={{ color: 'var(--lara-muted)' }}>Task ID: </span>
                    <strong style={{ fontFamily: 'var(--lara-mono)' }}>{selectedApproval.task_id}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--lara-muted)' }}>Policy Gate: </span>
                    <span>{selectedApproval.policy_reason}</span>
                  </div>
                </div>

                {selectedApproval.parameters && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lara-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                      ACTION PARAMETERS
                    </div>
                    <pre style={{ background: '#101014', color: '#FFFFFF', padding: 12, borderRadius: 8, fontSize: 12, margin: 0, overflowX: 'auto' }}>
                      {JSON.stringify(selectedApproval.parameters, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Action Box */}
              {selectedApproval.status === 'PENDING' ? (
                <div className="lara-panel" style={{ border: '1.5px solid var(--lara-orange)' }}>
                  <h4 style={{ fontSize: 14, marginBottom: 10 }}>Supervisor Decision Gate</h4>

                  {isRequester && (
                    <div style={{ padding: '8px 12px', background: '#FEE4E2', borderRadius: 8, color: '#B42318', fontSize: 12, marginBottom: 12 }}>
                      Separation of duties violation: You created this request ({selectedApproval.requested_by}) and cannot approve your own action. Switch to Sarah Chen (Supervisor).
                    </div>
                  )}

                  {!isSupervisor && !isRequester && (
                    <div style={{ padding: '8px 12px', background: '#FFF7E6', borderRadius: 8, color: '#9A3412', fontSize: 12, marginBottom: 12 }}>
                      Requires Supervisor clearance to authorize. Switch to Sarah Chen (Supervisor).
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--lara-muted)', marginBottom: 4 }}>
                        MANDATORY DECISION RATIONALE
                      </label>
                      <input
                        type="text"
                        className="lara-input"
                        placeholder="State reason for authorization or denial..."
                        value={rationale}
                        onChange={(e) => setRationale(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button
                        className="lara-button lara-button--danger"
                        disabled={acting || !isSupervisor || isRequester}
                        onClick={() => handleDecision('REJECT')}
                      >
                        <XCircle size={14} /> Reject Request
                      </button>
                      <button
                        className="lara-button lara-button--success"
                        disabled={acting || !isSupervisor || isRequester}
                        onClick={() => handleDecision('APPROVE')}
                      >
                        <ShieldCheck size={14} /> Authorize & Execute
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="lara-panel" style={{ background: '#FAFFF5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0E623B', fontWeight: 700 }}>
                    <CheckCircle size={16} /> Decision Finalized: {selectedApproval.status} by {selectedApproval.decided_by}
                  </div>
                  {selectedApproval.decision_reason && (
                    <p style={{ margin: '6px 0 0 0', fontSize: 12, color: 'var(--lara-muted)' }}>
                      Rationale: {selectedApproval.decision_reason}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="lara-panel" style={{ textAlign: 'center', padding: 48, color: 'var(--lara-muted)' }}>
              Select an approval request to inspect policy and risk details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
