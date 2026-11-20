import React, { useState, useEffect } from 'react';
import { api, TaskRecord, Principal } from '../lib/api';
import { Play, AlertCircle, CheckCircle2, Clock, ShieldAlert, ArrowRight, Layers, FileSearch } from 'lucide-react';

interface WorkbenchViewProps {
  currentPrincipal: Principal | null;
  onNavigateToTab: (tab: string) => void;
}

export const WorkbenchView: React.FC<WorkbenchViewProps> = ({ currentPrincipal, onNavigateToTab }) => {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [taskIntent, setTaskIntent] = useState(
    'Investigate telemetry anomaly for pump P-102 and evaluate against current maintenance SOP'
  );
  const [incidentId, setIncidentId] = useState('inc_2026_014');
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = async () => {
    try {
      const data = await api.listTasks();
      setTasks(data);
      if (data.length > 0 && !selectedTask) {
        setSelectedTask(data[0]);
      } else if (selectedTask) {
        // Refresh selected task if in list
        const updated = data.find((t) => t.task_id === selectedTask.task_id);
        if (updated) setSelectedTask(updated);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskIntent.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createTask({
        task_intent: taskIntent,
        incident_id: incidentId ? incidentId : undefined,
      });
      setTasks([created, ...tasks]);
      setSelectedTask(created);
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunTask = async (taskId: string) => {
    setRunning(true);
    setError(null);
    try {
      const updated = await api.runTask(taskId);
      setSelectedTask(updated);
      loadTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to run task pipeline');
    } finally {
      setRunning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="lara-badge lara-badge--allow"><CheckCircle2 size={12} /> COMPLETED</span>;
      case 'AWAITING_APPROVAL':
        return <span className="lara-badge lara-badge--review"><ShieldAlert size={12} /> AWAITING APPROVAL</span>;
      case 'EXECUTING':
        return <span className="lara-badge lara-badge--blue"><Clock size={12} /> EXECUTING</span>;
      case 'HIGHWAY_RESOLVED':
        return <span className="lara-badge" style={{ background: '#D2F5FE', color: '#00759E' }}>HIGHWAY RESOLVED</span>;
      case 'FAILED':
        return <span className="lara-badge lara-badge--deny"><AlertCircle size={12} /> FAILED</span>;
      default:
        return <span className="lara-badge">{status}</span>;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overview Card */}
      <div className="lara-panel lara-panel--blue" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, margin: 0 }}>Enterprise Agentic Workbench</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--lara-muted)', fontSize: 13 }}>
            LARA dynamically constructs task-scoped Information Highways, delegates to specialist agents, and enforces strict policy boundaries.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="lara-button lara-button--outline"
            onClick={() => onNavigateToTab('highways')}
          >
            <Layers size={14} /> View Highway Topology
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE4E2', border: '1px solid #FDA29B', padding: '12px 16px', borderRadius: 12, color: '#B42318', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: New Task Form & Task Viewer */}
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 24 }}>
        {/* Left Column: Create Task & Task List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Create Task Form */}
          <div className="lara-panel">
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Submit Investigation Task</h3>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--lara-muted)', marginBottom: 6 }}>
                  TASK INTENT / OBJECTIVE
                </label>
                <textarea
                  className="lara-textarea"
                  rows={3}
                  value={taskIntent}
                  onChange={(e) => setTaskIntent(e.target.value)}
                  placeholder="Describe task objective..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--lara-muted)', marginBottom: 6 }}>
                  SYNTHETIC INCIDENT CONTEXT
                </label>
                <select
                  className="lara-select"
                  value={incidentId}
                  onChange={(e) => setIncidentId(e.target.value)}
                >
                  <option value="inc_2026_014">inc_2026_014 — Pump P-102 High Vibration & Bearing Temp</option>
                  <option value="">None (Generic Context)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="lara-button lara-button--primary"
                style={{ width: '100%' }}
              >
                {submitting ? 'Creating Task...' : 'Dispatch Investigation'}
              </button>
            </form>
          </div>

          {/* Task History */}
          <div className="lara-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, margin: 0 }}>Recent Tasks</h3>
              <span style={{ fontSize: 11, color: 'var(--lara-muted)' }}>{tasks.length} total</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
              {tasks.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--lara-muted)', fontSize: 13 }}>
                  No tasks recorded yet.
                </div>
              ) : (
                tasks.map((t) => {
                  const isSelected = selectedTask?.task_id === t.task_id;
                  return (
                    <div
                      key={t.task_id}
                      onClick={() => setSelectedTask(t)}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        border: '1.5px solid',
                        borderColor: isSelected ? 'var(--lara-blue)' : 'var(--lara-line)',
                        background: isSelected ? '#F0EFFF' : 'var(--lara-white)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontFamily: 'var(--lara-mono)', fontSize: 12, fontWeight: 700 }}>
                          {t.task_id}
                        </span>
                        {getStatusBadge(t.status)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--lara-ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.task_intent}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--lara-muted)', marginTop: 4 }}>
                        Created by {t.created_by} • {new Date(t.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Task Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {selectedTask ? (
            <>
              {/* Task Header Panel */}
              <div className="lara-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--lara-mono)', fontSize: 16, fontWeight: 800 }}>
                        {selectedTask.task_id}
                      </span>
                      {getStatusBadge(selectedTask.status)}
                      {selectedTask.current_agent && (
                        <span className="lara-badge" style={{ background: '#EEE8FF', color: 'var(--lara-violet)' }}>
                          AGENT: {selectedTask.current_agent}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--lara-ink)' }}>
                      {selectedTask.task_intent}
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    {selectedTask.status === 'QUEUED' && (
                      <button
                        className="lara-button lara-button--action"
                        disabled={running}
                        onClick={() => handleRunTask(selectedTask.task_id)}
                      >
                        <Play size={14} /> {running ? 'Executing Pipeline...' : 'Run Pipeline'}
                      </button>
                    )}
                    {selectedTask.status === 'AWAITING_APPROVAL' && (
                      <button
                        className="lara-button lara-button--primary"
                        onClick={() => onNavigateToTab('approvals')}
                      >
                        <ShieldAlert size={14} /> Open Approval Queue
                      </button>
                    )}
                  </div>
                </div>

                {/* Timeline Progress */}
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--lara-line)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lara-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
                    EXECUTION PIPELINE STATE
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {[
                      { key: 'QUEUED', label: '1. Queued' },
                      { key: 'HIGHWAY_RESOLVED', label: '2. Highway Route' },
                      { key: 'EXECUTING', label: '3. Agent Execution' },
                      { key: 'AWAITING_APPROVAL', label: '4. Governance Check' },
                      { key: 'COMPLETED', label: '5. Completed' },
                    ].map((step, idx) => {
                      const stages = ['QUEUED', 'HIGHWAY_RESOLVED', 'EXECUTING', 'AWAITING_APPROVAL', 'COMPLETED'];
                      const currentIdx = stages.indexOf(selectedTask.status);
                      const isPast = currentIdx >= idx;
                      const isCurrent = stages[currentIdx] === step.key;

                      return (
                        <React.Fragment key={step.key}>
                          <div
                            style={{
                              padding: '6px 12px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              background: isCurrent ? 'var(--lara-blue)' : isPast ? '#DDF8E8' : '#F0F0F4',
                              color: isCurrent ? 'var(--lara-white)' : isPast ? '#0E623B' : 'var(--lara-muted)',
                            }}
                          >
                            {step.label}
                          </div>
                          {idx < 4 && <ArrowRight size={14} color="var(--lara-muted)" />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Task Plan Details */}
              {selectedTask.plan && (
                <div className="lara-panel">
                  <h4 style={{ fontSize: 14, marginBottom: 12 }}>Deterministic Execution Plan</h4>
                  <div style={{ background: '#FAFFF5', padding: 14, borderRadius: 12, border: '1px solid var(--lara-line)', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--lara-muted)' }}>OBJECTIVE</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>{selectedTask.plan.objective}</div>
                  </div>
                  {selectedTask.plan.subtasks && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                      {selectedTask.plan.subtasks.map((st, i) => (
                        <div key={i} style={{ padding: 10, background: 'var(--lara-white)', border: '1px solid var(--lara-line)', borderRadius: 8, fontSize: 12 }}>
                          <span style={{ fontWeight: 700, color: 'var(--lara-blue)' }}>Step {i + 1}:</span> {st}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Highway Evidence Packages */}
              {selectedTask.evidence_packages && selectedTask.evidence_packages.length > 0 && (
                <div className="lara-panel">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h4 style={{ fontSize: 14, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileSearch size={16} /> Highway Authorised Evidence Packages
                    </h4>
                    <span className="lara-badge lara-badge--lime">
                      {selectedTask.evidence_packages.length} SOURCES BOUND
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                    {selectedTask.evidence_packages.map((pkg, i) => (
                      <div
                        key={i}
                        style={{
                          padding: 14,
                          background: '#FAFFF5',
                          border: '1px solid var(--lara-line)',
                          borderRadius: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--lara-mono)', fontSize: 11, fontWeight: 700, color: 'var(--lara-blue)' }}>
                            {pkg.source_id}
                          </span>
                          <span className="lara-badge" style={{ fontSize: 10 }}>
                            {pkg.classification}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{pkg.title}</div>
                        {pkg.revision && (
                          <div style={{ fontSize: 11, color: 'var(--lara-muted)' }}>Revision: {pkg.revision}</div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--lara-ink)', background: 'var(--lara-white)', padding: 8, borderRadius: 6, border: '1px solid #E4EBD8', marginTop: 4 }}>
                          {pkg.excerpt}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Specialist Agent Outputs */}
              {selectedTask.agent_outputs && Object.keys(selectedTask.agent_outputs).length > 0 && (
                <div className="lara-panel">
                  <h4 style={{ fontSize: 14, marginBottom: 14 }}>Specialist Agent Outputs</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {Object.entries(selectedTask.agent_outputs).map(([agentName, output]) => (
                      <div
                        key={agentName}
                        style={{
                          border: '1px solid var(--lara-line)',
                          borderRadius: 12,
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ background: '#F5F5FC', padding: '8px 14px', borderBottom: '1px solid var(--lara-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 750, textTransform: 'uppercase', color: 'var(--lara-violet)' }}>
                            {agentName}
                          </span>
                          <span className="lara-badge lara-badge--allow" style={{ fontSize: 10 }}>VERIFIED</span>
                        </div>
                        <div style={{ padding: 14, fontSize: 12, background: 'var(--lara-white)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                          {output}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proposed Action Card */}
              {selectedTask.proposed_action && (
                <div className="lara-panel" style={{ border: '2px solid var(--lara-orange)', background: '#FFFBF7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="lara-badge lara-badge--review">PROPOSED ACTION</span>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>
                        {selectedTask.proposed_action.action_type}
                      </span>
                    </div>
                    <span className="lara-badge lara-badge--review">
                      POLICY: {selectedTask.proposed_action.policy_decision}
                    </span>
                  </div>

                  <p style={{ fontSize: 13, marginBottom: 12 }}>
                    Target Resource: <code style={{ background: '#FFEFE6', padding: '2px 6px', borderRadius: 4 }}>{selectedTask.proposed_action.target}</code>
                  </p>

                  {selectedTask.proposed_action.parameters && (
                    <div style={{ background: 'var(--lara-white)', border: '1px solid #FFD9C6', padding: 12, borderRadius: 8, fontSize: 12, fontFamily: 'var(--lara-mono)' }}>
                      {JSON.stringify(selectedTask.proposed_action.parameters, null, 2)}
                    </div>
                  )}

                  {selectedTask.proposed_action.requires_approval && (
                    <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 12, color: '#9A3412', fontWeight: 600 }}>
                        Requires Supervisor Approval (Approval ID: {selectedTask.proposed_action.approval_id})
                      </div>
                      <button
                        className="lara-button lara-button--action"
                        onClick={() => onNavigateToTab('approvals')}
                      >
                        Inspect in Approval Queue <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="lara-panel" style={{ textAlign: 'center', padding: 48, color: 'var(--lara-muted)' }}>
              Select a task from the left or create a new investigation to view real-time runtime details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
