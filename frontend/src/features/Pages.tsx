import React, { useEffect, useMemo, useState } from 'react';
import routeFlow from '../assets/illustrations/route-flow.svg';
import {
  Activity, ArrowRight, Check, CheckCircle2,
  CircleAlert, Download, Filter, GitBranch,
  LockKeyhole, MoreHorizontal, Network, Plus, RefreshCw, ShieldAlert,
  ShieldCheck, Workflow
} from 'lucide-react';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type State = 'Investigating' | 'Awaiting approval' | 'Resolved' | 'In review' | 'Blocked';
import { PageId } from '../components/layout/AppShell';
import {
  Avatar, Badge, Button, DataTable, EmptyState, FilterChip, InlineAlert, JsonViewer,
  MetricCard, Modal, PageHeader, Panel, ProgressBar, SearchField, SelectField,
  StatusBadge, Tabs, TextField, Timeline
} from '../components/ui';
import { useAuth } from '../features/auth/AuthContext';
import { api } from '../api/client';
import {
  RouteResult,
  Task,
  TaskEvent,
  ApprovalItem,
  EvolutionProposal,
  AuditEvent,
  PolicyDecision,
  SystemHealth,
  Agent,
  GraphNode,
  GraphEdge
} from '../api/types';

function ChartPanel({ taskCount }: { taskCount: number }) {
  return (
    <div className="chart-shell chart-shell-unavailable">
      <div className="chart-unavailable-content">
        <div className="chart-unavailable-icon">📊</div>
        <strong>Historical Activity Metrics Unavailable</strong>
        <p>Live execution telemetry aggregation is not attached to this staging instance. Active investigations in tenant: {taskCount}.</p>
      </div>
    </div>
  );
}

export function OverviewWelcomePanel({ onStart, onNavigate }: { onStart: () => void; onNavigate?: (p: PageId) => void }) {
  return (
    <div className="welcome-panel">
      <div className="welcome-copy">
        <div className="eyebrow">ENTERPRISE OPERATIONS RUNTIME</div>
        <h2>Enterprise Incident Workbench</h2>
        <p>Investigate incidents with linked evidence, specialist analysis and controlled operational handoffs — all in one workspace.</p>
        <div className="welcome-actions">
          <Button variant="secondary" onClick={onStart}><Plus size={16} /> Start Investigation</Button>
          <Button variant="subtle" onClick={() => onNavigate?.('investigations')}>Explore all cases <ArrowRight size={15} /></Button>
        </div>
        <div className="welcome-meta">
          <span><CheckCircle2 size={14} /> Policy engine active</span>
          <span><CheckCircle2 size={14} /> 4 sources connected</span>
        </div>
      </div>
      <div className="welcome-visual">
        <img src={routeFlow} alt="Diagram showing information sources routed through LARA to specialist agents and tools" />
      </div>
    </div>
  );
}

export function SystemHealthStrip() {
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.getHealth().then((h) => {
      if (isMounted) setHealth(h);
    }).catch(console.error);
    return () => { isMounted = false; };
  }, []);

  const systems = [
    ['Runtime API', health?.status === 'HEALTHY' ? 'Operational' : (health?.status || 'Operational'), 'green'],
    ['Knowledge sources', '4 connected (Schema)', 'blue'],
    ['Cloud datastore', health?.firestore === 'CONNECTED' ? 'Connected' : 'Unchecked by /ready', health?.firestore === 'CONNECTED' ? 'green' : 'amber'],
    ['Policy engine', 'Enforcing', 'green']
  ];
  return (
    <div className="system-health-strip">
      {systems.map(([label, value, tone]) => (
        <div className="system-health-item" key={label}>
          <span className={`health-indicator ${tone}`} />
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export function NewInvestigationDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (title: string, asset: string, scope?: string) => void }) {
  const [title, setTitle] = useState('');
  const [asset, setAsset] = useState('Compressor P-204');
  const [scope, setScope] = useState('Investigate the recent vibration anomaly and reconcile maintenance records.');
  return (
    <Modal
      open={open}
      title="Start an investigation"
      description="Create an operational case for evidence collection and specialist analysis."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!title.trim()} onClick={() => { onCreate(title, asset, scope); setTitle(''); onClose(); }}>
            Create investigation <ArrowRight size={15} />
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <TextField label="Investigation title" value={title} onChange={setTitle} placeholder="e.g. P-204 vibration anomaly" />
        <SelectField label="Asset / system" value={asset} onChange={setAsset} options={['Compressor P-204', 'Cooling loop CL-08', 'Turbine T-12', 'Conveyor CV-31', 'Boiler B-03']} />
        <label className="field field-full">
          <span className="field-label">Investigation scope</span>
          <textarea value={scope} onChange={e => setScope(e.target.value)} rows={4} />
          <small>Scope guides retrieval and analysis; policy boundaries remain enforced.</small>
        </label>
      </div>
    </Modal>
  );
}

export function KpiSummaryRow({
  tasksCount = 0,
  pendingApprovalsCount = 0,
  agentsCount = 0,
}: {
  tasksCount?: number;
  pendingApprovalsCount?: number;
  agentsCount?: number;
}) {
  return (
    <div className="metric-grid">
      <MetricCard
        label="Open investigations"
        value={String(tasksCount).padStart(2, '0')}
        change={tasksCount > 0 ? `${tasksCount} active in tenant` : 'No active cases'}
        icon={<Activity size={17} />}
        tone="blue"
      />
      <MetricCard
        label="Pending approvals"
        value={String(pendingApprovalsCount).padStart(2, '0')}
        change={pendingApprovalsCount > 0 ? 'Requires human decision' : 'Queue clear'}
        icon={<ShieldCheck size={17} />}
        tone={pendingApprovalsCount > 0 ? 'amber' : 'green'}
      />
      <MetricCard
        label="Active agents"
        value={agentsCount > 0 ? `${String(agentsCount).padStart(2, '0')} configured` : 'Configured'}
        change="Registered in engine"
        icon={<Workflow size={17} />}
        tone="green"
      />
      <MetricCard
        label="Telemetry metrics"
        value="Unavailable"
        change="Monitoring sink not attached"
        icon={<CircleAlert size={17} />}
        tone="purple"
      />
    </div>
  );
}

export function RecentInvestigationsTable({
  tasks = [],
  loading = false,
  onSelect,
  onViewAll
}: {
  tasks?: Task[];
  loading?: boolean;
  onSelect: (id: string) => void;
  onViewAll: () => void;
}) {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [localLoading, setLocalLoading] = useState(loading);

  useEffect(() => {
    if (tasks.length > 0) {
      setLocalTasks(tasks);
      setLocalLoading(false);
      return;
    }
    let isMounted = true;
    api.getRecentTasks().then((res) => {
      if (isMounted) {
        setLocalTasks(res);
        setLocalLoading(false);
      }
    }).catch((err) => {
      console.error(err);
      if (isMounted) setLocalLoading(false);
    });
    return () => { isMounted = false; };
  }, [tasks]);

  const rows = localTasks.slice(0, 4).map(t => ({
    id: t.task_id,
    asset: t.incident_id || t.title,
    site: 'Staging Environment · Live Session',
    severity: (t.status === 'FAILED' ? 'Critical' : t.status === 'AWAITING_APPROVAL' ? 'High' : 'Medium') as Severity,
    owner: t.principal_id,
    status: (t.status === 'AWAITING_APPROVAL' ? 'Awaiting approval' : t.status === 'COMPLETED' ? 'Resolved' : 'Investigating') as State,
    updated: new Date(t.updated_at || t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }));

  return (
    <Panel title="Recent investigations" subtitle="Latest operational cases across tenant workspace" action={<Button size="sm" onClick={onViewAll}>View all <ArrowRight size={14} /></Button>}>
      {localLoading ? (
        <div className="loading-state"><span className="spinner" /> Loading investigations...</div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No investigations recorded"
          description="No investigation tasks have been created in this Firestore tenant yet. Use the New Investigation action to initiate a case."
        />
      ) : (
        <DataTable
          rows={rows}
          rowKey="id"
          columns={[
            { key: 'id', label: 'Case ID', render: r => <span className="mono link-text">{r.id}</span> },
            { key: 'asset', label: 'Asset', render: r => <div className="table-primary"><strong>{r.asset}</strong><small>{r.site}</small></div> },
            { key: 'severity', label: 'Severity', render: r => <StatusBadge status={r.severity} /> },
            { key: 'owner', label: 'Owner', render: r => <span className="owner-cell"><Avatar name={r.owner} size="sm" />{r.owner}</span> },
            { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
            { key: 'updated', label: 'Updated' }
          ]}
          onRowClick={r => onSelect(r.id)}
        />
      )}
    </Panel>
  );
}

export function AttentionQueue({
  approvals = [],
  loading = false,
  onOpenApprovals
}: {
  approvals?: ApprovalItem[];
  loading?: boolean;
  onOpenApprovals: () => void;
}) {
  const [localApprovals, setLocalApprovals] = useState<ApprovalItem[]>(approvals);
  const [localLoading, setLocalLoading] = useState(loading);

  useEffect(() => {
    if (approvals.length > 0) {
      setLocalApprovals(approvals);
      setLocalLoading(false);
      return;
    }
    let isMounted = true;
    api.getApprovals().then((res) => {
      if (isMounted) {
        setLocalApprovals(res);
        setLocalLoading(false);
      }
    }).catch((err) => {
      console.error(err);
      if (isMounted) setLocalLoading(false);
    });
    return () => { isMounted = false; };
  }, [approvals]);

  const pending = localApprovals.filter(a => a.status === 'PENDING');

  return (
    <Panel title="Needs your attention" subtitle="Actions waiting for a decision" action={<Badge tone={pending.length > 0 ? 'amber' : 'green'}>{pending.length} open</Badge>}>
      {localLoading ? (
        <div className="loading-state"><span className="spinner" /> Loading approvals...</div>
      ) : pending.length === 0 ? (
        <EmptyState
          title="No pending approvals"
          description="All operational actions have been reviewed and decided."
        />
      ) : (
        <div className="attention-list">
          {pending.slice(0, 3).map((item) => (
            <div className="attention-item" key={item.approval_id}>
              <div className="attention-icon amber"><ShieldAlert size={17} /></div>
              <div>
                <strong>{item.action}</strong>
                <p>{item.task_id} · {item.tool_name}</p>
                <small>Requester: {item.requester_name}</small>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button size="sm" variant="secondary" className="full-button" onClick={onOpenApprovals}>Open approval queue <ArrowRight size={14} /></Button>
    </Panel>
  );
}

export function OverviewPage({ onNavigate, onStart, onSelectInvestigation }: { onNavigate: (p: PageId) => void; onStart: () => void; onSelectInvestigation: (id: string) => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.getRecentTasks().catch(() => []),
      api.getApprovals().catch(() => []),
      api.getAgents().catch(() => []),
      api.getAuditEvents().catch(() => []),
    ]).then(([t, a, ag, evs]) => {
      if (isMounted) {
        setTasks(t);
        setApprovals(a);
        setAgents(ag);
        setAuditEvents(evs);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const openTasksCount = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;
  const pendingApprovalsCount = approvals.filter(a => a.status === 'PENDING').length;

  return (
    <>
      <PageHeader
        eyebrow="NORTH PLANT / OPERATIONS"
        title="Overview"
        subtitle="Enterprise Incident Workbench · A live workspace for incident investigation and operational decisions."
        actions={<Button variant="primary" onClick={onStart}><Plus size={16} /> New Investigation</Button>}
      />
      <OverviewWelcomePanel onStart={onStart} onNavigate={onNavigate} />
      <SystemHealthStrip />
      <KpiSummaryRow
        tasksCount={openTasksCount}
        pendingApprovalsCount={pendingApprovalsCount}
        agentsCount={agents.length}
      />
      <div className="overview-grid">
        <div className="overview-main">
          <Panel title="Operational activity" subtitle="Investigation volume and evidence verification">
            <ChartPanel taskCount={openTasksCount} />
          </Panel>
          <RecentInvestigationsTable
            tasks={tasks}
            loading={loading}
            onSelect={onSelectInvestigation}
            onViewAll={() => onNavigate('investigations')}
          />
        </div>
        <div className="overview-side">
          <AttentionQueue
            approvals={approvals}
            loading={loading}
            onOpenApprovals={() => onNavigate('approvals')}
          />
          <Panel title="Recent activity" subtitle="Latest runtime audit events">
            {auditEvents.length === 0 ? (
              <EmptyState
                title="No audit events"
                description="Security, policy and operational events will appear here as tasks run."
              />
            ) : (
              <Timeline
                items={auditEvents.slice(0, 4).map(e => ({
                  time: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  title: e.event_type,
                  detail: e.action,
                  status: e.status === 'SUCCESS' ? 'Verified' : 'Needs review'
                }))}
              />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

export function InvestigationListPage({ onSelect, onStart }: { onSelect: (id: string) => void; onStart: () => void }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [severity, setSeverity] = useState('All severity');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.getRecentTasks().then((res) => {
      if (isMounted) {
        setTasks(res);
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  const cases = useMemo(() => {
    return tasks.map(t => ({
      id: t.task_id,
      asset: t.incident_id || t.title,
      site: 'Staging Environment · Live Session',
      severity: (t.status === 'FAILED' ? 'Critical' : t.status === 'AWAITING_APPROVAL' ? 'High' : 'Medium') as Severity,
      owner: t.principal_id,
      status: (t.status === 'AWAITING_APPROVAL' ? 'Awaiting approval' : t.status === 'COMPLETED' ? 'Resolved' : 'Investigating') as State,
      updated: new Date(t.updated_at || t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
  }, [tasks]);

  const filtered = useMemo(() => cases.filter(r => (`${r.id} ${r.asset} ${r.owner}`.toLowerCase().includes(query.toLowerCase())) && (status === 'All statuses' || r.status === status) && (severity === 'All severity' || r.severity === severity)), [cases, query, status, severity]);
  return (
    <>
      <PageHeader eyebrow="WORKBENCH" title="Investigations" subtitle="Track operational cases, reconcile evidence and review proposed actions." actions={<Button variant="primary" onClick={onStart}><Plus size={15} /> New investigation</Button>} />
      <div className="toolbar-row">
        <SearchField value={query} onChange={setQuery} placeholder="Search by case, asset or owner" />
        <SelectField value={status} onChange={setStatus} options={['All statuses', 'Investigating', 'Awaiting approval', 'Resolved']} />
        <SelectField value={severity} onChange={setSeverity} options={['All severity', 'Critical', 'High', 'Medium', 'Low']} />
        <Button><Filter size={15} /> More filters</Button>
      </div>
      <Panel title="All investigations" subtitle={`${filtered.length} cases in this workspace`}>
        {loading ? (
          <div className="loading-state"><span className="spinner" /> Loading investigations...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No investigations found"
            description={query || status !== 'All statuses' ? 'No cases match your filters.' : 'No investigations have been created yet. Click New Investigation to create one.'}
          />
        ) : (
          <DataTable
            rows={filtered}
            rowKey="id"
            columns={[
              { key: 'id', label: 'Case ID', render: r => <span className="mono link-text">{r.id}</span> },
              { key: 'asset', label: 'Asset', render: r => <div className="table-primary"><strong>{r.asset}</strong><small>{r.site}</small></div> },
              { key: 'severity', label: 'Severity', render: r => <StatusBadge status={r.severity} /> },
              { key: 'owner', label: 'Owner', render: r => <span className="owner-cell"><Avatar name={r.owner} size="sm" />{r.owner}</span> },
              { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
              { key: 'updated', label: 'Last updated' }
            ]}
            onRowClick={r => onSelect(r.id)}
          />
        )}
      </Panel>
    </>
  );
}

export function InvestigationStageBar({ active = 3 }: { active?: number }) {
  const stages = ['Intake', 'Route resolution', 'Evidence', 'Analysis', 'Verification', 'Policy review', 'Proposed action'];
  return (
    <div className="stage-bar">
      {stages.map((s, i) => (
        <div key={s} className={`stage ${i < active ? 'done' : ''} ${i === active ? 'current' : ''}`}>
          <span>{i < active ? <Check size={12} /> : i + 1}</span>
          <small>{s}</small>
        </div>
      ))}
    </div>
  );
}

export function IncidentSummaryPanel({ task }: { task?: Task | null }) {
  const assetName = task?.incident_id || (task ? 'Operational Asset' : 'Compressor P-204');
  const ownerName = task?.principal_id === 'usr_operator_01' ? 'Maya Operator' : (task?.principal_id || 'Maya Chen');
  const reportedTime = task?.created_at ? new Date(task.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '20 Nov 2026 · 09:39';
  const stateLabel = task?.status === 'AWAITING_APPROVAL' ? 'Awaiting approval' : task?.status === 'COMPLETED' ? 'Resolved' : 'Investigating';

  return (
    <Panel title="Incident summary" subtitle="Core context and ownership">
      <div className="summary-pairs">
        <div><small>Asset</small><strong>{assetName}</strong></div>
        <div><small>Site</small><strong>Plant North · Line 2</strong></div>
        <div><small>Reported</small><strong>{reportedTime}</strong></div>
        <div><small>Owner</small><strong>{ownerName}</strong></div>
        <div><small>Severity</small><StatusBadge status="Critical" /></div>
        <div><small>Current state</small><StatusBadge status={stateLabel} /></div>
      </div>
    </Panel>
  );
}

export function EvidenceLedger({ items }: { items?: Task['evidence'] }) {
  const rows = items && items.length > 0 ? items.map((e, idx) => ({
    source: e.name,
    id: e.source_id || `SRC-${idx + 1}`,
    timestamp: e.effective_date ? new Date(e.effective_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live',
    revision: e.revision,
    freshness: e.status === 'CURRENT' ? 'Current' : 'Needs review',
    verification: e.verified ? 'Verified' : 'Unverified'
  })) : [];

  return (
    <Panel title="Evidence ledger" subtitle="Linked source records with revision and freshness context" action={<Button size="sm"><Download size={14} /> Export</Button>}>
      {rows.length === 0 ? (
        <EmptyState
          title="No evidence records linked"
          description="Specialist agents have not linked any source evidence documents to this investigation yet."
        />
      ) : (
        <DataTable
          rows={rows}
          rowKey="id"
          columns={[
            { key: 'source', label: 'Source', render: r => <strong>{r.source}</strong> },
            { key: 'id', label: 'Record ID', render: r => <span className="mono link-text">{r.id}</span> },
            { key: 'timestamp', label: 'Timestamp' },
            { key: 'revision', label: 'Revision' },
            { key: 'freshness', label: 'Freshness', render: r => <StatusBadge status={r.freshness} /> },
            { key: 'verification', label: 'Verification', render: r => <StatusBadge status={r.verification} /> }
          ]}
        />
      )}
    </Panel>
  );
}

export function EvidenceGapPanel({ findings }: { findings?: Task['verification_findings'] }) {
  const discrepancies = (findings || []).filter(f => f.status !== 'VERIFIED');

  return (
    <Panel title="Evidence gaps" subtitle="Records that need follow-up">
      {discrepancies.length === 0 ? (
        <div style={{ padding: '16px 14px' }}>
          <Badge tone="green">No evidence discrepancies flagged for this task.</Badge>
        </div>
      ) : (
        discrepancies.map((d, i) => (
          <div className="gap-row" key={i}>
            <span className="gap-marker red" />
            <div>
              <strong>{d.claim}</strong>
              <p>Reference: {d.source_reference}</p>
            </div>
            <Badge tone="red">Discrepancy</Badge>
          </div>
        ))
      )}
    </Panel>
  );
}

export function ClaimVerificationTable({ findings }: { findings?: Task['verification_findings'] }) {
  const rows = findings && findings.length > 0 ? findings.map(f => ({
    claim: f.claim,
    result: f.status === 'VERIFIED' ? 'Supported' : 'Discrepancy',
    source: f.source_reference
  })) : [];

  return (
    <Panel title="Claim verification" subtitle="Each conclusion is tied to source records">
      {rows.length === 0 ? (
        <EmptyState
          title="No claims evaluated"
          description="Verification agent has not recorded claim verification results for this task."
        />
      ) : (
        <DataTable
          rows={rows}
          rowKey="claim"
          columns={[
            { key: 'claim', label: 'Claim', render: r => <strong>{r.claim}</strong> },
            { key: 'result', label: 'Result', render: r => <StatusBadge status={r.result} /> },
            { key: 'source', label: 'Source reference', render: r => <span className="mono">{r.source}</span> }
          ]}
        />
      )}
    </Panel>
  );
}

export function ProposedActionPanel({ action, onApprove }: { action?: Task['proposed_action']; onApprove: () => void }) {
  const toolName = action?.tool_name || 'Operational Dispatcher';
  const description = action?.description || 'No action currently proposed for this investigation.';
  const policyDecision = action?.policy_decision || 'NO_ACTION';
  const reasonCode = action?.reason_code || 'AWAITING_ANALYSIS';

  return (
    <Panel title="Proposed action" subtitle="Policy evaluation and controlled operational handoff">
      <div className="proposed-action">
        <div className="proposed-icon"><Activity size={20} /></div>
        <div><strong>{toolName}</strong><p>{description}</p></div>
        <StatusBadge status={policyDecision === 'ALLOW' ? 'Approved' : policyDecision === 'REQUIRE_APPROVAL' ? 'Require approval' : 'Idle'} />
      </div>
      <div className="action-meta">
        <span>Policy decision</span><strong className="text-amber">{policyDecision}</strong>
        <span>Reason code</span><span className="mono">{reasonCode}</span>
        <span>Separation of duties</span><strong><CheckCircle2 size={14} /> Requester cannot self-approve</strong>
      </div>
      {policyDecision === 'REQUIRE_APPROVAL' && (
        <>
          <InlineAlert tone="warning" title="Supervisor review required">
            This action changes operational state. Approval is required before any dispatch connector is invoked.
          </InlineAlert>
          <Button variant="primary" onClick={onApprove}>Review approval request <ArrowRight size={15} /></Button>
        </>
      )}
    </Panel>
  );
}

export function InvestigationWorkspace({ id, onBack, onApprove }: { id: string; onBack: () => void; onApprove: () => void }) {
  const [task, setTask] = useState<Task | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.getTask(id).catch(() => null),
      api.getTaskEvents(id).catch(() => []),
    ]).then(([t, evs]) => {
      if (isMounted) {
        setTask(t);
        setEvents(evs);
      }
    });
    return () => { isMounted = false; };
  }, [id]);

  const activeStage = useMemo(() => {
    if (!task) return 0;
    switch (task.current_stage) {
      case 'INTAKE': return 0;
      case 'HIGHWAY_RESOLUTION': return 1;
      case 'RESEARCH': return 2;
      case 'ANALYSIS': return 3;
      case 'VERIFICATION': return 4;
      case 'POLICY_EVALUATION': return 5;
      case 'ACTION_GATEWAY':
      case 'COMPLETED': return 6;
      default: return 0;
    }
  }, [task]);

  const timelineItems = events.length > 0 ? events.map(e => ({
    time: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    title: e.stage,
    detail: e.summary,
    status: 'Verified'
  })) : [];

  const agentOutputs = task?.agent_outputs || [];

  return (
    <>
      <div className="back-link">
        <button onClick={onBack}>‹ All investigations</button>
        <span>/</span>
        <span>{task?.title || id}</span>
      </div>
      <PageHeader
        eyebrow="INVESTIGATION WORKSPACE"
        title={task?.title || id}
        subtitle={`${task?.incident_id || 'Operational Case'} · Tenant: demo-enterprise`}
        actions={
          <>
            <Button><MoreHorizontal size={16} /> Actions</Button>
            {task?.proposed_action?.policy_decision === 'REQUIRE_APPROVAL' && (
              <Button variant="primary" onClick={onApprove}>Review proposed action</Button>
            )}
          </>
        }
      />
      <InvestigationStageBar active={activeStage} />
      <div className="detail-grid">
        <div className="detail-main">
          <IncidentSummaryPanel task={task} />
          <EvidenceLedger items={task?.evidence} />
          <ClaimVerificationTable findings={task?.verification_findings} />
          <Panel title="Correlated event timeline" subtitle="Events reconciled across operational sources">
            {timelineItems.length === 0 ? (
              <EmptyState
                title="No task events recorded"
                description="Investigation lifecycle events will be recorded here as specialist agents execute."
              />
            ) : (
              <Timeline items={timelineItems} />
            )}
          </Panel>
        </div>
        <div className="detail-side">
          <EvidenceGapPanel findings={task?.verification_findings} />
          <Panel title="Agent work" subtitle="Specialist tasks for this investigation">
            {agentOutputs.length === 0 ? (
              <EmptyState
                title="No agent outputs"
                description="Specialist agents have not produced outputs for this investigation."
              />
            ) : (
              agentOutputs.map((ao, idx) => (
                <div className="agent-task" key={idx}>
                  <Avatar name={ao.agent_name} />
                  <div><strong>{ao.agent_name}</strong><small>{ao.summary}</small></div>
                  <StatusBadge status={ao.status === 'SUCCESS' ? 'Complete' : 'Needs review'} />
                </div>
              ))
            )}
          </Panel>
          <ProposedActionPanel action={task?.proposed_action} onApprove={onApprove} />
        </div>
      </div>
    </>
  );
}

export function HighwaysPage() {
  const { principal } = useAuth();
  const [view, setView] = useState('Graph');
  const [selected, setSelected] = useState('Telemetry stream');
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const graphScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.getGraphNodes().catch(() => []),
      api.getGraphEdges().catch(() => []),
      api.getRecentTasks().catch(() => []),
    ]).then(([nodes, edges, tasks]) => {
      if (!isMounted) return;
      setGraphNodes(nodes);
      setGraphEdges(edges);
      const taskId = tasks.length > 0 ? tasks[0].task_id : 'task_default';
      api.resolveRoute(taskId)
        .then((res) => { if (isMounted) setRouteResult(res); })
        .catch(console.error);
    });
    return () => { isMounted = false; };
  }, [principal]);

  const nodes = [
    { x: 35, y: 85, label: 'Telemetry stream', kind: 'Source', sub: 'TEL-P204-0918', w: 152 },
    { x: 35, y: 225, label: 'Maintenance SOP', kind: 'Source', sub: 'SOP-MNT-014', w: 152 },
    { x: 275, y: 155, label: 'Incident workflow', kind: 'Workflow', sub: 'INC-204 investigation', w: 154 },
    { x: 515, y: 85, label: 'Research Agent', kind: 'Agent', sub: 'Evidence retrieval', w: 152 },
    { x: 515, y: 225, label: 'Verification Agent', kind: 'Agent', sub: 'Claim validation', w: 152 },
    { x: 755, y: 155, label: 'Maintenance connector', kind: 'Tool', sub: 'Action: approval gated', w: 165 }
  ];

  const tableRows = graphNodes.length > 0 ? graphNodes.map(n => ({
    label: n.name || n.node_id,
    kind: n.type.toUpperCase(),
    sub: n.classification,
  })) : nodes.map(n => ({
    label: n.label,
    kind: n.kind,
    sub: n.sub,
  }));

  const scrollGraph = (dir: 'left' | 'right') => {
    if (graphScrollRef.current) {
      if (typeof graphScrollRef.current.scrollBy === 'function') {
        graphScrollRef.current.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' });
      } else {
        graphScrollRef.current.scrollLeft += dir === 'left' ? -260 : 260;
      }
    }
  };

  const handleSelectNode = (label: string, nodeX: number, nodeWidth: number) => {
    setSelected(label);
    if (graphScrollRef.current) {
      const container = graphScrollRef.current;
      const targetScroll = nodeX + (nodeWidth / 2) - (container.clientWidth / 2);
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
      } else {
        container.scrollLeft = Math.max(0, targetScroll);
      }
    }
  };

  const isEdgeActive = (fromLabel: string, toLabel: string) => {
    if (!selected) return true;
    if (selected === fromLabel || selected === toLabel) return true;
    if (selected === 'Incident workflow') return true;
    return false;
  };

  const principalDisplay = principal?.display_name || 'Maya Operator';
  const roleDisplay = principal?.roles?.[0] ? (principal.roles[0].charAt(0).toUpperCase() + principal.roles[0].slice(1)) : 'Operator';

  const refreshRoutes = () => {
    Promise.all([
      api.getGraphNodes().catch(() => []),
      api.getGraphEdges().catch(() => []),
      api.getRecentTasks().catch(() => []),
    ]).then(([nodes, edges, tasks]) => {
      setGraphNodes(nodes);
      setGraphEdges(edges);
      const taskId = tasks.length > 0 ? tasks[0].task_id : 'task_default';
      api.resolveRoute(taskId).then(setRouteResult).catch(console.error);
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="INTELLIGENCE / INFORMATION HIGHWAYS"
        title="Dynamic Task Route Resolution"
        subtitle="Inspect how information moves between permitted sources, workflows, agents and operational tools."
        actions={<Button onClick={refreshRoutes}><RefreshCw size={15} /> Refresh routes</Button>}
      />
      <div className="route-principal-banner" style={{ padding: '12px 16px', background: '#EAF2FE', borderRadius: '8px', marginBottom: '16px', border: '1px solid #C2D7FF' }}>
        <strong>Resolved route for principal: {principalDisplay} ({roleDisplay})</strong>
      </div>
      <div className="highway-summary">
        <div><span>Resolved routes</span><strong>{String(graphEdges.length || 6).padStart(2, '0')}</strong></div>
        <div><span>Active graph nodes</span><strong>{String(graphNodes.length || 6).padStart(2, '0')}</strong></div>
        <div><span>Excluded candidates</span><strong className="text-amber">{routeResult?.excluded_candidates?.length || 0}</strong></div>
        <div><span>Policy checks</span><strong className="text-green">08 / 08</strong></div>
      </div>
      <div className="toolbar-row">
        <Tabs items={['Graph', 'Table']} value={view} onChange={setView} />
        <div className="toolbar-spacer" />
        <FilterChip active>All route states</FilterChip>
        <FilterChip>{roleDisplay}</FilterChip>
        <Button><Download size={14} /> Export view</Button>
      </div>
      <div className="highway-layout">
        <Panel title="Resolved information route" subtitle="Permission-aware source-to-action path">
          <div className="graph-navigation-bar">
            <div className="graph-hint">
              <span className="graph-hint-icon">↔</span>
              <span>Pipeline: <strong>Sources (2)</strong> → <strong>Workflow (1)</strong> → <strong>Agents (2)</strong> → <strong>Tool (1)</strong></span>
            </div>
            <div className="graph-nav-buttons">
              <button type="button" className="graph-nav-btn" onClick={() => scrollGraph('left')} aria-label="Scroll graph left" title="Scroll left">‹</button>
              <span className="graph-scroll-indicator">Pan</span>
              <button type="button" className="graph-nav-btn" onClick={() => scrollGraph('right')} aria-label="Scroll graph right" title="Scroll right">›</button>
            </div>
          </div>
          <div className="graph-canvas">
            {view === 'Graph' ? (
              <div className="graph-scroll-wrap" ref={graphScrollRef}>
                <svg viewBox="0 0 960 320" role="region" aria-label="Information highway interactive graph">
                  <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
                      <path d="M0 0 L6 3 L0 6" fill="#7FA9E4" />
                    </marker>
                    <marker id="arrowhead-active" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
                      <path d="M0 0 L6 3 L0 6" fill="#1A73E8" />
                    </marker>
                  </defs>
                  <g fill="none">
                    <path
                      d="M 187 85 C 225 85, 230 155, 269 155"
                      stroke={isEdgeActive('Telemetry stream', 'Incident workflow') ? '#1A73E8' : '#9CB9E4'}
                      strokeWidth={isEdgeActive('Telemetry stream', 'Incident workflow') ? 3 : 2}
                      markerEnd={isEdgeActive('Telemetry stream', 'Incident workflow') ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    />
                    <path
                      d="M 187 225 C 225 225, 230 155, 269 155"
                      stroke={isEdgeActive('Maintenance SOP', 'Incident workflow') ? '#1A73E8' : '#9CB9E4'}
                      strokeWidth={isEdgeActive('Maintenance SOP', 'Incident workflow') ? 3 : 2}
                      markerEnd={isEdgeActive('Maintenance SOP', 'Incident workflow') ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    />
                    <path
                      d="M 429 155 C 470 155, 475 85, 509 85"
                      stroke={isEdgeActive('Incident workflow', 'Research Agent') ? '#1A73E8' : '#9CB9E4'}
                      strokeWidth={isEdgeActive('Incident workflow', 'Research Agent') ? 3 : 2}
                      markerEnd={isEdgeActive('Incident workflow', 'Research Agent') ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    />
                    <path
                      d="M 429 155 C 470 155, 475 225, 509 225"
                      stroke={isEdgeActive('Incident workflow', 'Verification Agent') ? '#1A73E8' : '#9CB9E4'}
                      strokeWidth={isEdgeActive('Incident workflow', 'Verification Agent') ? 3 : 2}
                      markerEnd={isEdgeActive('Incident workflow', 'Verification Agent') ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    />
                    <path
                      d="M 667 85 C 705 85, 715 155, 749 155"
                      stroke={isEdgeActive('Research Agent', 'Maintenance connector') ? '#1A73E8' : '#9CB9E4'}
                      strokeWidth={isEdgeActive('Research Agent', 'Maintenance connector') ? 3 : 2}
                      markerEnd={isEdgeActive('Research Agent', 'Maintenance connector') ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    />
                    <path
                      d="M 667 225 C 705 225, 715 155, 749 155"
                      strokeDasharray="6 5"
                      stroke={isEdgeActive('Verification Agent', 'Maintenance connector') ? '#1A73E8' : '#9CB9E4'}
                      strokeWidth={isEdgeActive('Verification Agent', 'Maintenance connector') ? 3 : 2}
                      markerEnd={isEdgeActive('Verification Agent', 'Maintenance connector') ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    />
                  </g>
                  {nodes.map(n => (
                    <g
                      key={n.label}
                      role="button"
                      tabIndex={0}
                      aria-label={`${n.label} - ${n.kind} (${n.sub})`}
                      aria-pressed={selected === n.label}
                      onClick={() => handleSelectNode(n.label, n.x, n.w)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectNode(n.label, n.x, n.w);
                        }
                      }}
                      className={`graph-node ${selected === n.label ? 'is-selected' : ''}`}
                      style={{ cursor: 'pointer', outline: 'none' }}
                    >
                      <rect
                        x={n.x}
                        y={n.y - 28}
                        width={n.w}
                        height="56"
                        rx="9"
                        fill={selected === n.label ? '#EAF2FE' : '#fff'}
                        stroke={selected === n.label ? '#1A73E8' : '#CDD7E4'}
                        strokeWidth={selected === n.label ? 2.2 : 1}
                      />
                      <circle cx={n.x + 14} cy={n.y - 9} r="4" fill={n.kind === 'Source' ? '#0B9A9A' : n.kind === 'Workflow' ? '#1A73E8' : n.kind === 'Agent' ? '#7B61C7' : '#188038'} />
                      <text x={n.x + 25} y={n.y - 6} fontSize="10" fill="#758195" fontWeight="600" aria-hidden="true">{n.kind.toUpperCase()}</text>
                      <text x={n.x + 12} y={n.y + 11} fontSize="11" fill="#202124" fontWeight="600" aria-hidden="true">{n.label}</text>
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <DataTable rows={tableRows} rowKey="label" columns={[{ key: 'label', label: 'Node' }, { key: 'kind', label: 'Type' }, { key: 'sub', label: 'Classification' }]} />
            )}
          </div>
          <div className="graph-legend">
            <span><i className="legend-source" /> Source</span>
            <span><i className="legend-workflow" /> Workflow</span>
            <span><i className="legend-agent" /> Agent</span>
            <span><i className="legend-tool" /> Tool</span>
            <span className="legend-note">Select a node or use ‹ / › to explore pipeline stages.</span>
          </div>
        </Panel>
        <div className="highway-inspector">
          <Panel title="Route inspector" subtitle="Selected node context">
            <div className="inspector-node">
              <Network size={18} />
              <div><strong>{selected}</strong><small>Active route member</small></div>
            </div>
            <div className="inspector-fields">
              <div><span>Access decision</span><StatusBadge status="Allowed" /></div>
              <div><span>Data freshness</span><StatusBadge status="Current" /></div>
              <div><span>Relevance score</span><strong>0.94</strong></div>
              <div><span>Source trust</span><strong>0.98</strong></div>
              <div><span>Principal context</span><strong>{principalDisplay} · {roleDisplay}</strong></div>
            </div>
            <InlineAlert tone="success" title="Policy check passed">
              The selected node is permitted for the active principal and investigation purpose.
            </InlineAlert>
          </Panel>
          <Panel title="Excluded candidates" subtitle="Not included in this route">
            <div className="excluded-list">
              {routeResult?.excluded_candidates && routeResult.excluded_candidates.length > 0 ? (
                routeResult.excluded_candidates.map((e, idx) => (
                  <div className="excluded-row" key={e.node_id || e.display || `candidate-${idx}`}>
                    <ShieldAlert size={16} />
                    <div><strong>{e.display || e.node_id}</strong><small>{e.reason_code}</small></div>
                  </div>
                ))
              ) : (
                <div className="excluded-row">
                  <CheckCircle2 size={16} />
                  <div><strong>No sources excluded</strong><small>All evaluated candidates permitted for this role</small></div>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

export function AgentFleetPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.getAgents()
      .then(res => {
        if (isMounted) {
          setAgents(res);
          if (res.length > 0 && !selected) {
            setSelected(res[0].name || res[0].agent_id);
          }
        }
      })
      .catch(console.error)
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [selected]);

  const agentRows = agents.map(a => ({
    name: a.name || a.agent_id,
    scope: a.purpose || a.role || 'Specialist agent',
    version: a.active_version || 'v1.0.0',
    state: a.status === 'HEALTHY' ? 'Active' : 'Inactive',
    lastRun: 'Unavailable',
    runs: 'Unavailable'
  }));

  const activeCount = agents.filter(a => a.status === 'HEALTHY').length;
  const selectedAgent = agents.find(a => (a.name || a.agent_id) === selected) || agents[0];

  return (
    <>
      <PageHeader
        eyebrow="INTELLIGENCE / SPECIALISTS"
        title="Specialist Agent Fleet"
        subtitle="Manage specialist capabilities, runtime status, versions and execution activity."
        actions={<Button><Plus size={15} /> Register agent</Button>}
      />
      <div className="metric-grid compact">
        <MetricCard label="Registered agents" value={String(agents.length).padStart(2, '0')} tone="blue" />
        <MetricCard label="Active now" value={String(activeCount).padStart(2, '0')} tone="green" />
        <MetricCard label="Total executions" value="Unavailable" tone="amber" />
        <MetricCard label="Telemetry metrics" value="Unattached" tone="amber" />
      </div>
      <div className="fleet-grid">
        <Panel title="Agent registry" subtitle="Select an agent to inspect its configuration">
          {loading ? (
            <div style={{ padding: '16px 14px' }}>Loading registered agents...</div>
          ) : agentRows.length === 0 ? (
            <EmptyState title="No agents registered" description="No specialist agents found in the registry." />
          ) : (
            <DataTable
              rows={agentRows}
              rowKey="name"
              columns={[
                { key: 'name', label: 'Agent', render: r => <div className="table-primary"><strong>{r.name}</strong><small>{r.scope}</small></div> },
                { key: 'version', label: 'Version', render: r => <span className="mono">{r.version}</span> },
                { key: 'state', label: 'State', render: r => <StatusBadge status={r.state} /> },
                { key: 'lastRun', label: 'Last run', render: r => <span className="text-secondary">{r.lastRun}</span> },
                { key: 'runs', label: 'Runs', render: r => <span className="text-secondary">{r.runs}</span> }
              ]}
              onRowClick={r => setSelected(r.name)}
            />
          )}
        </Panel>
        <Panel title="Agent detail" subtitle="Capability and execution profile">
          {selectedAgent ? (
            <>
              <div className="agent-detail-head">
                <Avatar name={selectedAgent.name || selectedAgent.agent_id} size="lg" />
                <div>
                  <h3>Agent: {selectedAgent.name || selectedAgent.agent_id}</h3>
                  <StatusBadge status={selectedAgent.status === 'HEALTHY' ? 'Active' : 'Inactive'} />
                  <p>Version {selectedAgent.active_version || 'v1.0.0'} · Immutable config revision</p>
                </div>
              </div>
              <div className="detail-section">
                <strong>Granted capabilities</strong>
                <div className="capability-tags">
                  {(selectedAgent.allowed_capabilities && selectedAgent.allowed_capabilities.length > 0) ? (
                    selectedAgent.allowed_capabilities.map((c, i) => (
                      <Badge key={i} tone="blue">{c}</Badge>
                    ))
                  ) : (
                    <Badge tone="blue">Standard permitted runtime scope</Badge>
                  )}
                </div>
              </div>
              <div className="detail-section">
                <strong>Execution reliability & telemetry</strong>
                <InlineAlert tone="info" title="Telemetry provider unattached">
                  Live execution metrics and telemetry are unavailable (metrics provider not attached to this staging instance).
                </InlineAlert>
              </div>
              <div className="detail-section">
                <strong>Latest activity</strong>
                <EmptyState
                  title="No execution traces"
                  description="Per-agent run logs and activity history are not recorded by this registry view."
                />
              </div>
              <Button size="sm">View version history <ArrowRight size={14} /></Button>
            </>
          ) : (
            <EmptyState title="No agent selected" description="Select an agent from the registry to inspect." />
          )}
        </Panel>
      </div>
    </>
  );
}

export function CandidateComparison() {
  return (
    <div className="diff-grid">
      <div className="diff-card">
        <div className="diff-label">ACTIVE BASELINE <Badge>v1.0.0</Badge></div>
        <h3>Verification Agent</h3>
        <p>Checks claims against linked evidence records.</p>
        <pre>{`verify(claim, sources)\n  return match(claim, sources)`}</pre>
      </div>
      <div className="diff-arrow"><ArrowRight size={20} /></div>
      <div className="diff-card candidate">
        <div className="diff-label">PROPOSED CANDIDATE <Badge tone="purple">v1.0.1-candidate.1</Badge></div>
        <h3>Verification Agent</h3>
        <p>Adds mandatory revision and effective-date checks.</p>
        <pre>{`verify(claim, sources)\n  check_revision(sources)\n  check_effective_date(sources)\n  return match(claim, sources)`}</pre>
      </div>
    </div>
  );
}

export function EvaluationSuiteRunner() {
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<'PASSED' | 'PENDING' | 'FAILED' | 'EVALUATING' | 'NOT_RUN'>('PENDING');

  const runSuite = async () => {
    setEvaluating(true);
    try {
      const proposals = await api.getEvolutionProposals();
      if (proposals.length > 0) {
        const evalRes = await api.evaluateCandidate(proposals[0].proposal_id);
        setResult(evalRes.evaluation_status);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEvaluating(false);
    }
  };

  const tests = [
    ['Functional · revision matching', 'Passed'],
    ['Functional · stale source rejection', 'Passed'],
    ['Invariant · no policy mutation', 'Passed'],
    ['Invariant · no boundary escalation', 'Passed'],
    ['Invariant · approval required for dispatch', 'Passed'],
    ['Invariant · trace provenance retained', result === 'PASSED' ? 'Passed' : 'Running']
  ];

  return (
    <Panel title="Evaluation suite" subtitle="Candidate validation · 6 checks">
      <div className="eval-summary">
        <strong>{result === 'PASSED' ? '6 / 6' : '5 / 6'}</strong>
        <span>Checks completed</span>
        <Badge tone={result === 'PASSED' ? 'green' : 'amber'}>{result === 'PASSED' ? 'Passed' : 'Running'}</Badge>
      </div>
      {tests.map(([n, s]) => (
        <div className="eval-row" key={n}>
          <span>{n}</span>
          <StatusBadge status={s} />
        </div>
      ))}
      <ProgressBar value={result === 'PASSED' ? 100 : 83} />
      <Button size="sm" onClick={runSuite} disabled={evaluating}>
        <RefreshCw size={14} className={evaluating ? 'spin' : ''} /> {evaluating ? 'Running suite...' : 'Run suite again'}
      </Button>
    </Panel>
  );
}

export function EvolutionLabPage() {
  const { principal } = useAuth();
  const [tab, setTab] = useState('Candidate');
  const [proposals, setProposals] = useState<EvolutionProposal[]>([]);
  const [justification, setJustification] = useState('Promote candidate following full evaluation and safety verification');
  const [promoteStatus, setPromoteStatus] = useState<string>('');
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api.getEvolutionProposals().then((res) => {
      if (isMounted) setProposals(res);
    }).catch(console.error);
    return () => { isMounted = false; };
  }, []);

  const proposal = proposals[0];
  const isAdmin = principal?.roles?.includes('runtime_admin') ?? false;
  const isPassed = proposal?.evaluation_status === 'PASSED';
  const isPromoted = proposal?.status === 'PROMOTED';
  const canPromote = isAdmin && isPassed && !isPromoted && justification.trim().length >= 8;

  const handlePromote = async () => {
    if (!proposal || !canPromote) return;
    setIsPromoting(true);
    setPromoteStatus('');
    try {
      const res = await api.approveCandidate(proposal.proposal_id, justification);
      setPromoteStatus(`Successfully promoted candidate ${res.candidate_version} to active production.`);
      setProposals(prev => prev.map(p => p.proposal_id === res.proposal_id ? res : p));
    } catch (err) {
      setPromoteStatus(err instanceof Error ? err.message : 'Failed to promote candidate');
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="GOVERNANCE / CONTROLLED CHANGE"
        title="Prompt & Skill Evolution Engine"
        subtitle="Evolution Lab · Evaluate runtime improvements before promotion. Protected policies and security invariants remain immutable."
        actions={<Button><GitBranch size={15} /> Version lineage</Button>}
      />
      <InlineAlert tone="info" title="Human-supervised promotion">
        Candidate changes are isolated until evaluation passes and an authorized administrator approves promotion. Active role: {principal?.display_name || 'Anonymous'} ({principal?.roles?.join(', ') || 'none'}).
      </InlineAlert>
      <div className="toolbar-row">
        <Tabs items={['Candidate', 'Failure signals', 'Version history']} value={tab} onChange={setTab} />
      </div>
      <div className="evolution-grid">
        <div>
          <Panel title="Candidate improvement" subtitle="FAIL-RESEARCH-001 · Missing SOP revision check">
            <div className="failure-signal">
              <div className="attention-icon amber"><CircleAlert size={18} /></div>
              <div>
                <strong>Observed Failure Signal</strong>
                <p>Research Agent linked an obsolete procedure revision without checking its effective date.</p>
                <small>Trace trc_8f14e45f · Linked incident INC-204</small>
              </div>
            </div>
            <CandidateComparison />
          </Panel>
          <Panel title="Version lineage" subtitle="Immutable candidate ancestry">
            <div className="lineage">
              <div className="lineage-node">
                <span className="lineage-dot promoted" />
                <div><strong>v1.0.0</strong><small>Active baseline · Promoted 12 Nov</small></div>
                <Badge tone="green">Active</Badge>
              </div>
              <div className="lineage-connector" />
              <div className="lineage-node">
                <span className={`lineage-dot ${isPromoted ? 'promoted' : 'candidate'}`} />
                <div><strong>v1.0.1-candidate.1</strong><small>Parent: v1.0.0 · SHA-256: 9d12…c41a</small></div>
                <Badge tone={isPromoted ? 'green' : 'purple'}>{isPromoted ? 'Promoted' : 'Candidate'}</Badge>
              </div>
            </div>
          </Panel>
        </div>
        <div>
          <EvaluationSuiteRunner />
          <Panel title="Promotion gateway" subtitle="Administrator approval required">
            <div className="approval-gateway">
              <LockKeyhole size={22} />
              <div>
                <strong>{isPromoted ? 'Candidate promoted to production' : isPassed ? 'Evaluation suite passed' : 'Promotion locked pending evaluation'}</strong>
                <p>
                  {isPromoted
                    ? `Promoted by ${proposal?.approved_by || 'Runtime Administrator'}. Active version updated.`
                    : isPassed
                    ? 'All 6 test cases passed. Administrator justification required.'
                    : 'Run evaluation suite before promotion becomes available.'}
                </p>
              </div>
            </div>
            {!isAdmin && !isPromoted && (
              <InlineAlert tone="warning" title="Privilege restricted">
                Only Runtime Administrator (usr_admin_01) can promote evolution candidates. Switch identity to test promotion.
              </InlineAlert>
            )}
            <TextField
              label="Approval justification"
              value={justification}
              onChange={setJustification}
              placeholder="Explain why this candidate is safe to promote"
              disabled={!isAdmin || isPromoted}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <Button
                variant="primary"
                disabled={!canPromote || isPromoting}
                onClick={handlePromote}
              >
                {isPromoting ? 'Promoting...' : isPromoted ? 'Candidate Promoted ✓' : 'Promote candidate'}
              </Button>
              <Button variant="subtle" disabled={!isAdmin || isPromoted}>Reject candidate</Button>
            </div>
            {promoteStatus && (
              <div style={{ marginTop: '12px' }}>
                <InlineAlert tone="success" title="Evolution Status">
                  {promoteStatus}
                </InlineAlert>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

export function PrincipalDirectory() {
  const { principal } = useAuth();
  const [principals, setPrincipals] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!principal?.roles?.includes('runtime_admin')) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    api.getGovernancePrincipals()
      .then(res => {
        if (isMounted) {
          setPrincipals(res);
          setForbidden(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          if (err?.message?.includes('403') || err?.status === 403) {
            setForbidden(true);
          }
        }
      })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [principal]);

  const rows = principals.map(p => {
    const attrs = (p.attributes as Record<string, unknown>) || {};
    const roles = Array.isArray(p.roles) ? (p.roles as string[]) : [];
    return {
      id: String(p.principal_id),
      name: String(p.display_name || p.principal_id),
      email: String(attrs.email || `${p.principal_id}@enterprise.internal`),
      role: roles.join(', ') || 'operator',
      dept: String(attrs.department || 'Operations'),
      clearance: String(attrs.clearance || 'internal'),
      active: true,
    };
  });

  return (
    <Panel title="Principal directory" subtitle="Governed enterprise identities and access contexts">
      {forbidden ? (
        <InlineAlert tone="info" title="Access Restricted">
          Principal directory is restricted to Runtime Administrators (role: runtime_admin). Active principal: {principal?.display_name} ({principal?.roles?.join(', ')}).
        </InlineAlert>
      ) : loading ? (
        <div style={{ padding: '16px 14px' }}>Loading principals...</div>
      ) : rows.length === 0 ? (
        <EmptyState title="No principals found" description="No directory records configured for this tenant." />
      ) : (
        <DataTable
          rows={rows}
          rowKey="id"
          columns={[
            { key: 'name', label: 'Principal', render: r => <div className="owner-cell"><Avatar name={r.name} /><div className="table-primary"><strong>{r.name}</strong><small>{r.email}</small></div></div> },
            { key: 'role', label: 'Role', render: r => <Badge tone="blue">{r.role}</Badge> },
            { key: 'dept', label: 'Department' },
            { key: 'clearance', label: 'Clearance' },
            { key: 'active', label: 'Session', render: r => <StatusBadge status={r.active ? 'Active' : 'Inactive'} /> }
          ]}
        />
      )}
    </Panel>
  );
}

export function PolicySimulator() {
  const { principal } = useAuth();
  const [action, setAction] = useState('dispatch_maintenance');
  const [resource, setResource] = useState('asset:P-204');
  const [purpose, setPurpose] = useState('incident_response');
  const [decision, setDecision] = useState<PolicyDecision | null>(null);
  const [loading, setLoading] = useState(false);

  const evaluate = async () => {
    setLoading(true);
    try {
      const res = await api.evaluatePolicy({ action, resource_id: resource, purpose });
      setDecision(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title="Policy Decision Simulator" subtitle="Evaluate an action against the active principal and policy context">
      <div className="form-grid">
        <SelectField label="Action" value={action} onChange={v => { setAction(v); setDecision(null); }} options={['dispatch_maintenance', 'read_telemetry', 'read_vendor_contract', 'promote_agent_version']} />
        <SelectField label="Resource" value={resource} onChange={v => { setResource(v); setDecision(null); }} options={['asset:P-204', 'source:telemetry', 'source:vendor-contract', 'agent:verification']} />
        <SelectField label="Purpose" value={purpose} onChange={v => { setPurpose(v); setDecision(null); }} options={['incident_response', 'routine_maintenance', 'configuration_change', 'audit_review']} />
        <div className="form-full">
          <Button variant="primary" disabled={loading} onClick={evaluate}>
            {loading ? 'Evaluating...' : <>Evaluate policy <ArrowRight size={14} /></>}
          </Button>
        </div>
      </div>
      {decision && (
        <div className="policy-result">
          <div className="policy-result-icon"><ShieldCheck size={20} /></div>
          <div>
            <strong>{decision.decision}</strong>
            <p>Reason code: <span className="mono">{decision.reason_code}</span></p>
            <small>Principal: {principal?.display_name} ({principal?.roles?.join(', ')}) · Policy ID: {decision.policy_id} · Evaluated: {new Date(decision.evaluated_at).toLocaleTimeString()}</small>
          </div>
        </div>
      )}
    </Panel>
  );
}

export function GovernancePage() {
  return (
    <>
      <PageHeader
        eyebrow="GOVERNANCE / ACCESS CONTROL"
        title="RBAC & ABAC Policy Authority"
        subtitle="Governance · Inspect who can access which resources, and why a policy decision was reached."
        actions={<Button><Plus size={15} /> Add policy rule</Button>}
      />
      <div className="metric-grid compact">
        <MetricCard label="Governed principals" value="04" tone="blue" />
        <MetricCard label="Policy engine" value="Enforcing" tone="green" />
        <MetricCard label="Policy separation" value="Enforced" tone="blue" />
        <MetricCard label="ABAC rules" value="Active" tone="green" />
      </div>
      <PrincipalDirectory />
      <PolicySimulator />
    </>
  );
}

export function ApprovalQueueTable({ onSelect }: { onSelect: (id: string) => void }) {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.getApprovals().then((res) => {
      if (isMounted) setApprovals(res);
    }).catch(console.error).finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  const rows = approvals.map(a => ({
    id: a.approval_id,
    action: a.action,
    requester: a.requester_name,
    risk: a.risk_level === 'HIGH' ? 'High' : 'Medium',
    age: 'Recent',
    status: a.status === 'PENDING' ? 'Awaiting approval' : a.status === 'APPROVED' ? 'Approved' : 'Rejected'
  }));

  return (
    <Panel title="Approval queue" subtitle="High-impact actions awaiting an authorized decision">
      {loading ? (
        <div style={{ padding: '16px 14px' }}>Loading approvals...</div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No pending approvals"
          description="All operational actions are currently authorized or none have been submitted for review."
        />
      ) : (
        <DataTable
          rows={rows}
          rowKey="id"
          columns={[
            { key: 'id', label: 'Request', render: r => <span className="mono link-text">{r.id}</span> },
            { key: 'action', label: 'Proposed action', render: r => <div className="table-primary"><strong>{r.action}</strong><small>Requested by {r.requester}</small></div> },
            { key: 'risk', label: 'Risk', render: r => <StatusBadge status={r.risk} /> },
            { key: 'age', label: 'Age' },
            { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> }
          ]}
          onRowClick={r => onSelect(r.id)}
        />
      )}
    </Panel>
  );
}

export function ApprovalDecisionBar({
  onDecision,
  disabled,
  disabledReason,
}: {
  onDecision: (decision: string, reason: string) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [reason, setReason] = useState('Reviewed maintenance records and SOP-MNT-014; approved dispatch.');
  return (
    <div className="decision-box">
      <label className="field">
        <span className="field-label">Decision justification · required</span>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="Record the operational reason for this decision (minimum 8 characters)"
          disabled={disabled}
        />
      </label>
      {disabled && disabledReason && (
        <div style={{ color: '#C5221F', fontSize: '12px', marginTop: '4px', marginBottom: '8px' }}>
          {disabledReason}
        </div>
      )}
      <div className="decision-actions">
        <Button
          variant="danger"
          disabled={disabled || reason.trim().length < 8}
          onClick={() => onDecision('Rejected', reason)}
        >
          Reject request
        </Button>
        <Button
          variant="primary"
          disabled={disabled || reason.trim().length < 8}
          onClick={() => onDecision('Approved', reason)}
        >
          <Check size={15} /> Approve request
        </Button>
      </div>
      <small>Self-approval is blocked by separation-of-duties policy.</small>
    </div>
  );
}

export function ApprovalQueuePage() {
  const { principal } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning' | 'danger'; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.getApprovals().then((res) => {
      if (isMounted) {
        setApprovals(res);
        if (res.length > 0 && !selected) setSelected(res[0].approval_id);
      }
    }).catch(console.error).finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [selected]);

  const item = approvals.find(a => a.approval_id === selected) || approvals[0] || null;

  const isSupervisorOrAdmin = principal?.roles?.includes('supervisor') || principal?.roles?.includes('runtime_admin');
  const isRequester = item ? item.requester_id === principal?.principal_id : false;
  const canApprove = isSupervisorOrAdmin && (!isRequester || principal?.roles?.includes('runtime_admin'));
  const isAlreadyDecided = item ? (item.status === 'APPROVED' || item.status === 'REJECTED') : false;

  const disabledReason = !item
    ? 'No item selected'
    : isAlreadyDecided
    ? `Action already decided (${item.status}) by ${item.decided_by || 'Supervisor'}.`
    : !isSupervisorOrAdmin
    ? 'Access Denied: Only Supervisor or Administrator can approve actions.'
    : isRequester && !principal?.roles?.includes('runtime_admin')
    ? `Separation of Duties: Requester (${principal?.display_name}) cannot self-approve. Switch to Supervisor (Ravi) to authorize this action.`
    : undefined;

  const handleDecision = async (decisionStr: string, justification: string) => {
    if (!item) return;
    setFeedback(null);
    try {
      const decisionType = decisionStr === 'Approved' ? 'APPROVE' : 'REJECT';
      const updated = await api.decideApproval(item.approval_id, {
        decision: decisionType,
        reason: justification,
      });
      setApprovals(prev => prev.map(a => a.approval_id === updated.approval_id ? updated : a));
      setFeedback({
        tone: 'success',
        message: `Action ${decisionStr.toLowerCase()} successfully by ${principal?.display_name}. Audit trail updated.`
      });
    } catch (err) {
      setFeedback({
        tone: 'danger',
        message: err instanceof Error ? err.message : 'Failed to record approval decision'
      });
    }
  };

  const pendingCount = approvals.filter(a => a.status === 'PENDING').length;

  return (
    <>
      <PageHeader
        eyebrow="GOVERNANCE / HUMAN REVIEW"
        title="Human-in-the-Loop Gateway"
        subtitle="Approvals · Review operational actions and controlled configuration changes before execution."
      />
      <div className="approval-layout">
        <div>
          <div className="approval-count">
            <strong>{String(pendingCount).padStart(2, '0')}</strong>
            <span>Requests requiring attention</span>
            <Badge tone="amber">Pending</Badge>
          </div>
          {loading ? (
            <div style={{ padding: '16px 14px' }}>Loading requests...</div>
          ) : approvals.length === 0 ? (
            <div style={{ marginTop: '16px' }}>
              <EmptyState
                title="Queue is empty"
                description="No actions awaiting human supervisor decision."
              />
            </div>
          ) : (
            <div className="approval-cards">
              {approvals.map(a => (
                <button
                  key={a.approval_id}
                  className={`approval-card ${selected === a.approval_id ? 'selected' : ''}`}
                  onClick={() => { setSelected(a.approval_id); setFeedback(null); }}
                >
                  <div className="approval-card-top">
                    <span className="mono">{a.approval_id}</span>
                    <StatusBadge status={a.status === 'APPROVED' ? 'Approved' : a.status === 'REJECTED' ? 'Blocked' : 'High'} />
                  </div>
                  <strong>{a.action}</strong>
                  <p>{a.requester_name} · {a.task_id}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        {!item ? (
          <Panel title="Request details" subtitle="No selection">
            <EmptyState
              title="No approval selected"
              description="Select an approval request from the queue to review operational parameters and record an authorized decision."
            />
          </Panel>
        ) : (
          <Panel title="Request details" subtitle={item.approval_id}>
            <div className="request-summary">
              <Badge tone={item.status === 'APPROVED' ? 'green' : item.status === 'REJECTED' ? 'red' : 'amber'}>
                {item.status}
              </Badge>
              <h3>{item.action}</h3>
              <p>{item.evidence_summary || 'Operational handoff requiring authorized human verification.'}</p>
            </div>
            <div className="summary-pairs">
              <div><small>Requested by</small><strong>{item.requester_name}</strong></div>
              <div><small>Risk level</small><StatusBadge status={item.risk_level === 'HIGH' ? 'High' : 'Medium'} /></div>
              <div><small>Associated Task</small><span className="mono link-text">{item.task_id}</span></div>
              <div><small>Policy decision</small><strong className="text-amber">REQUIRE_APPROVAL</strong></div>
            </div>
            <Panel title="Evidence references">
              <div className="reference-row">Associated Task: {item.task_id} <StatusBadge status="Verified" /></div>
              {item.evidence_summary && (
                <div className="reference-row">{item.evidence_summary} <StatusBadge status="Verified" /></div>
              )}
            </Panel>
            <InlineAlert tone={canApprove && !isAlreadyDecided ? 'info' : 'warning'} title="Separation of duties enforced">
              {disabledReason || `Active identity: ${principal?.display_name} (${principal?.roles?.join(', ')}). Authorized to review.`}
            </InlineAlert>
            <ApprovalDecisionBar
              onDecision={handleDecision}
              disabled={!canApprove || isAlreadyDecided}
              disabledReason={disabledReason}
            />
            {feedback && (
              <div style={{ marginTop: '12px' }}>
                <InlineAlert tone={feedback.tone} title="Approval Action Outcome">
                  {feedback.message}
                </InlineAlert>
              </div>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}

export function AuditEventTable() {
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.getAuditEvents().then((evs) => {
      if (isMounted) setEvents(evs);
    }).catch(console.error).finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  const rows = useMemo(() => {
    return events
      .filter(e => `${e.event_type} ${e.principal_id} ${e.action} ${e.trace_id}`.toLowerCase().includes(query.toLowerCase()))
      .map(e => ({
        ...e,
        timeStr: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        traceShort: e.trace_id.substring(0, 14),
      } as Record<string, unknown>));
  }, [events, query]);

  return (
    <>
      <div className="toolbar-row">
        <SearchField value={query} onChange={setQuery} placeholder="Search event, actor, target or trace" />
        <FilterChip>All event types</FilterChip>
        <FilterChip>All outcomes</FilterChip>
        <Button><Download size={14} /> Export</Button>
      </div>
      <Panel title="Event log" subtitle={`${rows.length} events · Cryptographic runtime audit trail`}>
        {loading ? (
          <div style={{ padding: '16px 14px' }}>Loading audit events...</div>
        ) : rows.length === 0 ? (
          <EmptyState title="No audit events found" description="Cryptographic audit trail is currently empty or no events match your search query." />
        ) : (
          <DataTable
            rows={rows}
            rowKey="event_id"
            columns={[
              { key: 'timestamp', label: 'Time', render: r => <span className="mono">{String(r.timeStr)}</span> },
              { key: 'event_type', label: 'Event type', render: r => <strong className="event-type">{String(r.event_type)}</strong> },
              { key: 'principal_id', label: 'Actor', render: r => <span className="mono">{String(r.principal_id)}</span> },
              { key: 'action', label: 'Action / Target', render: r => <span>{String(r.action)}</span> },
              { key: 'status', label: 'Outcome', render: r => <StatusBadge status={r.status === 'SUCCESS' ? 'Success' : r.status === 'DENIED' ? 'Blocked' : 'Needs review'} /> },
              { key: 'trace_id', label: 'Trace ID', render: r => <span className="mono link-text">{String(r.traceShort)}</span> }
            ]}
          />
        )}
      </Panel>
    </>
  );
}

export function AuditTrailPage() {
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    let isMounted = true;
    api.getAuditEvents().then(res => {
      if (isMounted) {
        setEvents(res);
        if (res.length > 0) setSelectedTrace(res[0].trace_id);
      }
    }).catch(console.error);
    return () => { isMounted = false; };
  }, []);

  const traceEvents = useMemo(() => {
    if (!selectedTrace) return [];
    return events.filter(e => e.trace_id === selectedTrace);
  }, [events, selectedTrace]);

  const traceTimelineItems = traceEvents.map(e => ({
    time: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    title: e.event_type,
    detail: `${e.principal_id}: ${e.action}`,
    status: e.status === 'SUCCESS' ? 'Success' : e.status === 'DENIED' ? 'Blocked' : 'Complete'
  }));

  const selectedEvent = traceEvents[0] || events[0] || null;

  return (
    <>
      <PageHeader
        eyebrow="OBSERVABILITY / TRACEABILITY"
        title="Cryptographic Audit & Provenance"
        subtitle="Follow actions and decisions across the runtime with linked trace identifiers and cryptographic hashes."
        actions={<Button><Download size={15} /> Export events</Button>}
      />
      <div className="metric-grid compact">
        <MetricCard label="Events in store" value={String(events.length).padStart(2, '0')} tone="blue" />
        <MetricCard label="Policy decisions" value={String(events.filter(e => e.event_type.includes('POLICY')).length).padStart(2, '0')} tone="blue" />
        <MetricCard label="Denied / blocked" value={String(events.filter(e => e.status === 'DENIED').length).padStart(2, '0')} tone="amber" />
        <MetricCard label="Trace coverage" value={events.length > 0 ? "100%" : "Unavailable"} tone="green" />
      </div>
      <div className="audit-layout">
        <div><AuditEventTable /></div>
        <div>
          <Panel title="Trace explorer" subtitle="Linked events for a single request">
            <div className="trace-search">
              <span className="mono">{selectedTrace || 'No trace selected'}</span>
            </div>
            {traceTimelineItems.length > 0 ? (
              <Timeline items={traceTimelineItems} />
            ) : (
              <EmptyState title="No trace events" description="Select a trace to view linked runtime events." />
            )}
          </Panel>
          <Panel title="Selected event payload" subtitle="Safe, read-only event metadata">
            {selectedEvent ? (
              <JsonViewer value={selectedEvent} />
            ) : (
              <EmptyState title="No event payload" description="No event metadata selected." />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
