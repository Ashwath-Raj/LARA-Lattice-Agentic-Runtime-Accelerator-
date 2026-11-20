export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type State = 'Investigating' | 'Awaiting approval' | 'Resolved' | 'In review' | 'Blocked' | 'Active' | 'Healthy' | 'Candidate' | 'Promoted';

export const investigations = [
  { id: 'INC-204', asset: 'Compressor P-204', site: 'Plant North · Line 2', severity: 'Critical' as Severity, owner: 'Maya Chen', status: 'Awaiting approval' as State, updated: '8 min ago' },
  { id: 'INC-198', asset: 'Cooling loop CL-08', site: 'Plant East · Utilities', severity: 'High' as Severity, owner: 'Arjun Rao', status: 'Investigating' as State, updated: '24 min ago' },
  { id: 'INC-189', asset: 'Turbine T-12', site: 'Plant North · Powerhouse', severity: 'Medium' as Severity, owner: 'Maya Chen', status: 'In review' as State, updated: '1 hr ago' },
  { id: 'INC-176', asset: 'Conveyor CV-31', site: 'Plant South · Packaging', severity: 'Low' as Severity, owner: 'Nila Das', status: 'Resolved' as State, updated: 'Yesterday' },
  { id: 'INC-164', asset: 'Boiler B-03', site: 'Plant East · Utilities', severity: 'High' as Severity, owner: 'Arjun Rao', status: 'Blocked' as State, updated: 'Yesterday' },
];

export const evidence = [
  { source: 'Maintenance work order', id: 'WO-7842', timestamp: '09:42:18', revision: 'Rev 4', freshness: 'Current', access: 'Internal', verification: 'Verified' },
  { source: 'Vibration telemetry', id: 'TEL-P204-0918', timestamp: '09:18:02', revision: 'Live stream', freshness: 'Current', access: 'Operational', verification: 'Verified' },
  { source: 'Maintenance SOP', id: 'SOP-MNT-014', timestamp: '08:55:41', revision: 'Rev 3.2', freshness: 'Current', access: 'Controlled', verification: 'Verified' },
  { source: 'Vendor inspection report', id: 'VIR-2207', timestamp: 'Yesterday', revision: 'Rev 2', freshness: 'Stale', access: 'Restricted', verification: 'Needs review' },
];

export const agents = [
  { name: 'Research Agent', scope: 'Evidence retrieval & source linking', version: '1.4.2', state: 'Active' as State, lastRun: '2 min ago', runs: '1,284' },
  { name: 'Analysis Agent', scope: 'Cross-record analysis & hypotheses', version: '1.2.0', state: 'Active' as State, lastRun: '8 min ago', runs: '946' },
  { name: 'Verification Agent', scope: 'Claim validation & discrepancy checks', version: '1.1.6', state: 'Healthy' as State, lastRun: '8 min ago', runs: '901' },
  { name: 'Policy Agent', scope: 'Policy evaluation & action boundaries', version: '1.0.8', state: 'Healthy' as State, lastRun: '11 min ago', runs: '816' },
];

export const approvals = [
  { id: 'APR-031', action: 'Dispatch maintenance team to P-204', requester: 'Maya Chen', risk: 'High', age: '8 min', status: 'Awaiting approval', detail: 'Bearing inspection and controlled shutdown recommended after vibration anomaly.' },
  { id: 'APR-029', action: 'Request vendor inspection report', requester: 'Arjun Rao', risk: 'Medium', age: '42 min', status: 'Awaiting approval', detail: 'External inspection record required to resolve conflicting maintenance history.' },
  { id: 'APR-024', action: 'Promote verification prompt candidate', requester: 'LARA Runtime', risk: 'High', age: '2 hr', status: 'In review', detail: 'Candidate adds mandatory SOP revision validation to the verification stage.' },
];

export const auditEvents = [
  { time: '10:42:18', type: 'POLICY_DECISION', actor: 'policy-engine', target: 'APR-031', outcome: 'REQUIRE_APPROVAL', trace: 'trc_8f14e45f' },
  { time: '10:41:56', type: 'CLAIM_VERIFIED', actor: 'verification-agent', target: 'INC-204', outcome: 'PARTIAL', trace: 'trc_8f14e45f' },
  { time: '10:41:22', type: 'EVIDENCE_LINKED', actor: 'research-agent', target: 'SOP-MNT-014', outcome: 'SUCCESS', trace: 'trc_8f14e45f' },
  { time: '10:40:47', type: 'ROUTE_RESOLVED', actor: 'highways-engine', target: 'INC-204', outcome: 'SUCCESS', trace: 'trc_8f14e45f' },
  { time: '10:39:05', type: 'TASK_CREATED', actor: 'maya.chen', target: 'INC-204', outcome: 'SUCCESS', trace: 'trc_8f14e45f' },
  { time: '09:58:31', type: 'APPROVAL_GRANTED', actor: 'ravi.supervisor', target: 'APR-027', outcome: 'SUCCESS', trace: 'trc_3ac22b19' },
];

export const principals = [
  { name: 'Maya Chen', email: 'maya.chen@lara.demo', role: 'Operator', dept: 'Plant Operations', clearance: 'Internal', active: true },
  { name: 'Ravi Kumar', email: 'ravi.kumar@lara.demo', role: 'Supervisor', dept: 'Maintenance', clearance: 'Restricted', active: true },
  { name: 'LARA Administrator', email: 'admin@lara.demo', role: 'Administrator', dept: 'Platform', clearance: 'Privileged', active: true },
  { name: 'Nila Das', email: 'nila.das@lara.demo', role: 'Auditor', dept: 'Compliance', clearance: 'Controlled', active: false },
];
