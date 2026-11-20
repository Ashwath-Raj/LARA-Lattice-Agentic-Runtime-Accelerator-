import React, { useState, useEffect } from 'react';
import { api, EvolutionProposal, Principal } from '../lib/api';
import { GitFork, CheckCircle, XCircle, AlertTriangle, Play, RotateCcw, ShieldCheck, ShieldAlert, FileText } from 'lucide-react';

interface EvolutionViewProps {
  currentPrincipal: Principal | null;
}

export const EvolutionView: React.FC<EvolutionViewProps> = ({ currentPrincipal }) => {
  const [proposals, setProposals] = useState<EvolutionProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<EvolutionProposal | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [acting, setActing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadProposals = async () => {
    try {
      const list = await api.listProposals();
      setProposals(list);
      if (list.length > 0 && !selectedProposal) {
        setSelectedProposal(list[0]);
      } else if (selectedProposal) {
        const updated = list.find((p) => p.proposal_id === selectedProposal.proposal_id);
        if (updated) setSelectedProposal(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  const handleRunEvaluation = async (proposalId: string) => {
    setEvaluating(true);
    setMessage(null);
    try {
      const res = await api.evaluateProposal(proposalId);
      setSelectedProposal(res);
      await loadProposals();
      setMessage({ text: 'Deterministic evaluation suite completed successfully.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Evaluation failed', type: 'error' });
    } finally {
      setEvaluating(false);
    }
  };

  const handleApprove = async (proposalId: string) => {
    setActing(true);
    setMessage(null);
    try {
      const res = await api.approveProposal(proposalId);
      setSelectedProposal(res);
      await loadProposals();
      setMessage({ text: `Candidate promoted to active runtime version! (Version: ${res.candidate_version})`, type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Approval denied by policy', type: 'error' });
    } finally {
      setActing(false);
    }
  };

  const handleReject = async (proposalId: string) => {
    if (!rejectReason.trim()) {
      setMessage({ text: 'Please enter a rejection reason.', type: 'error' });
      return;
    }
    setActing(true);
    setMessage(null);
    try {
      const res = await api.rejectProposal(proposalId, rejectReason);
      setSelectedProposal(res);
      await loadProposals();
      setMessage({ text: 'Proposal rejected.', type: 'success' });
      setRejectReason('');
    } catch (err: any) {
      setMessage({ text: err.message || 'Rejection denied', type: 'error' });
    } finally {
      setActing(false);
    }
  };

  const handleRollback = async () => {
    if (!selectedProposal) return;
    setActing(true);
    setMessage(null);
    try {
      await api.rollbackVersion(selectedProposal.target_id, selectedProposal.parent_version);
      await loadProposals();
      setMessage({ text: `Successfully rolled back to version ${selectedProposal.parent_version}`, type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Rollback failed', type: 'error' });
    } finally {
      setActing(false);
    }
  };

  const isAdmin = currentPrincipal?.roles.includes('runtime_admin');

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
      <div className="lara-panel" style={{ background: '#F4EFFF', border: '1.5px solid var(--lara-violet)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 22, margin: 0 }}>Evolution Engine & Controlled Adaptation</h2>
            <span className="lara-badge" style={{ background: 'var(--lara-violet)', color: '#FFFFFF', fontSize: 10 }}>
              CONSTITUTIONAL GATES
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', color: 'var(--lara-ink)', fontSize: 13 }}>
            Continuous learning without drift: Runtime self-reflection generates candidate prompt revisions, gates them through regression suites, and requires administrator promotion.
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
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Grid: Proposals List & Selected Proposal Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24 }}>
        {/* Left Column: Proposals List */}
        <div className="lara-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, margin: 0 }}>Evolution Proposals</h3>
            <span style={{ fontSize: 11, color: 'var(--lara-muted)' }}>{proposals.length} total</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 600, overflowY: 'auto' }}>
            {proposals.map((p) => {
              const isSelected = selectedProposal?.proposal_id === p.proposal_id;
              return (
                <div
                  key={p.proposal_id}
                  onClick={() => setSelectedProposal(p)}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: '1.5px solid',
                    borderColor: isSelected ? 'var(--lara-violet)' : 'var(--lara-line)',
                    background: isSelected ? '#FAF7FF' : 'var(--lara-white)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--lara-mono)', fontSize: 12, fontWeight: 700 }}>
                      {p.proposal_id}
                    </span>
                    <span
                      className="lara-badge"
                      style={{
                        fontSize: 10,
                        background: p.status === 'PROMOTED' ? '#DDF8E8' : p.status === 'REJECTED' ? '#FEE4E2' : '#FFE3D5',
                        color: p.status === 'PROMOTED' ? '#0E623B' : p.status === 'REJECTED' ? '#B42318' : '#9A3412',
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{p.change_summary}</div>
                  <div style={{ fontSize: 11, color: 'var(--lara-muted)' }}>
                    Target: {p.target_id} • Version: {p.candidate_version}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Proposal Studio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {selectedProposal ? (
            <>
              {/* Proposal Header */}
              <div className="lara-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--lara-mono)', fontSize: 16, fontWeight: 800 }}>
                        {selectedProposal.proposal_id}
                      </span>
                      <span className="lara-badge" style={{ background: '#EEE8FF', color: 'var(--lara-violet)' }}>
                        CANDIDATE: {selectedProposal.candidate_version}
                      </span>
                      <span className="lara-badge" style={{ background: '#F0F0F4' }}>
                        PARENT: {selectedProposal.parent_version}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedProposal.change_summary}</div>
                  </div>

                  {/* Promotion Controls */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {selectedProposal.status === 'CANDIDATE_CREATED' && (
                      <button
                        className="lara-button lara-button--action"
                        onClick={() => handleRunEvaluation(selectedProposal.proposal_id)}
                        disabled={evaluating}
                      >
                        <Play size={14} /> {evaluating ? 'Running Gate...' : 'Run Eval Suite'}
                      </button>
                    )}

                    {selectedProposal.status === 'AWAITING_APPROVAL' && (
                      <button
                        className="lara-button lara-button--success"
                        disabled={acting || !isAdmin}
                        onClick={() => handleApprove(selectedProposal.proposal_id)}
                        title={!isAdmin ? 'Only Runtime Admin can promote evolution' : ''}
                      >
                        <CheckCircle size={14} /> Approve & Promote
                      </button>
                    )}

                    {selectedProposal.status === 'PROMOTED' && (
                      <button
                        className="lara-button lara-button--outline"
                        disabled={acting || !isAdmin}
                        onClick={handleRollback}
                      >
                        <RotateCcw size={14} /> Rollback to v{selectedProposal.parent_version}
                      </button>
                    )}
                  </div>
                </div>

                {!isAdmin && (
                  <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFF7E6', borderRadius: 8, fontSize: 11, color: '#9A3412', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldAlert size={14} /> Note: Administrator clearance is required to promote or rollback candidates. Switch to Marcus Brody (Admin) to approve.
                  </div>
                )}
              </div>

              {/* Trigger & Failure Analysis */}
              <div className="lara-panel">
                <h4 style={{ fontSize: 14, marginBottom: 10 }}>Triggering Failure Analysis</h4>
                <div style={{ background: '#FAFFF5', padding: 12, borderRadius: 10, border: '1px solid var(--lara-line)', fontSize: 13, marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, color: '#B42318' }}>Failure Trace: </span>
                  {selectedProposal.failure_summary}
                </div>
                <div style={{ fontSize: 11, color: 'var(--lara-muted)', fontFamily: 'var(--lara-mono)' }}>
                  Trigger Traces: {selectedProposal.trigger_trace_ids.join(', ')}
                </div>
              </div>

              {/* Candidate Content Diff */}
              <div className="lara-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 14, margin: 0 }}>Candidate Prompt Specification</h4>
                  <span style={{ fontFamily: 'var(--lara-mono)', fontSize: 11, color: 'var(--lara-muted)' }}>
                    {selectedProposal.content_hash}
                  </span>
                </div>
                <div style={{ background: '#101014', color: '#E4FF88', padding: 16, borderRadius: 10, fontFamily: 'var(--lara-mono)', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {selectedProposal.candidate_content}
                </div>
              </div>

              {/* Evaluation Evidence Suite */}
              {selectedProposal.evaluation_evidence && (
                <div className="lara-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h4 style={{ fontSize: 14, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShieldCheck size={16} color="var(--lara-green)" /> Deterministic Evaluation Gate Results
                    </h4>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span className="lara-badge lara-badge--allow">
                        PASS RATE: {(selectedProposal.evaluation_evidence.pass_rate * 100).toFixed(0)}%
                      </span>
                      <span
                        className="lara-badge"
                        style={{
                          background: selectedProposal.evaluation_evidence.security_passed ? '#DDF8E8' : '#FEE4E2',
                          color: selectedProposal.evaluation_evidence.security_passed ? '#0E623B' : '#B42318',
                        }}
                      >
                        {selectedProposal.evaluation_evidence.security_passed ? 'SECURITY INVARIANTS: PASS' : 'SECURITY REGRESSION'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedProposal.evaluation_evidence.details.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          background: c.passed ? '#FAFFF5' : '#FFF5F5',
                          border: `1px solid ${c.passed ? '#DDF8E8' : '#FDA29B'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {c.passed ? <CheckCircle size={14} color="var(--lara-green)" /> : <XCircle size={14} color="#D92D20" />}
                          <span style={{ fontFamily: 'var(--lara-mono)', fontWeight: 700 }}>{c.case_id}</span>
                          <span style={{ color: 'var(--lara-ink)' }}>{c.message}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: c.passed ? '#0E623B' : '#B42318' }}>
                          {c.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection Control */}
              {selectedProposal.status === 'AWAITING_APPROVAL' && isAdmin && (
                <div className="lara-panel" style={{ border: '1px solid #FDA29B', background: '#FFFBFB' }}>
                  <h4 style={{ fontSize: 13, marginBottom: 8, color: '#B42318' }}>Administrative Rejection</h4>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      type="text"
                      className="lara-input"
                      placeholder="Provide mandatory rationale for rejecting candidate..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <button
                      className="lara-button lara-button--danger"
                      onClick={() => handleReject(selectedProposal.proposal_id)}
                      disabled={acting}
                    >
                      Reject Candidate
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="lara-panel" style={{ textAlign: 'center', padding: 48, color: 'var(--lara-muted)' }}>
              Select a proposal to view evaluation history and version diff.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
