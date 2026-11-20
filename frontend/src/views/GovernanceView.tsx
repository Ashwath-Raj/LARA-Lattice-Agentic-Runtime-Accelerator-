import React, { useState, useEffect } from 'react';
import { api, Principal, PolicyEvaluationResult } from '../lib/api';
import { ShieldCheck, ShieldAlert, Lock, Play, UserCheck, AlertTriangle } from 'lucide-react';

interface GovernanceViewProps {
  currentPrincipal: Principal | null;
}

export const GovernanceView: React.FC<GovernanceViewProps> = ({ currentPrincipal }) => {
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [action, setAction] = useState('task.create');
  const [resourceId, setResourceId] = useState('sop:restricted');
  const [resourceType, setResourceType] = useState('document');
  const [simResult, setSimResult] = useState<PolicyEvaluationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    const fetchPrincipals = async () => {
      try {
        const data = await api.listPrincipals();
        setPrincipals(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPrincipals();
  }, []);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const res = await api.simulatePolicy({
        action,
        resource_id: resourceId,
        resource_type: resourceType,
      });
      setSimResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
      <div className="lara-panel lara-panel--pink" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 22, margin: 0 }}>Governance & Policy Authority</h2>
            <span className="lara-badge lara-badge--authority" style={{ fontSize: 10 }}>
              RBAC + ABAC + CONSTITUTION
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', color: 'var(--lara-ink)', fontSize: 13 }}>
            All operations undergo unified policy gate evaluation combining tenant boundary, role matrix, and fine-grained attributes.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: 24 }}>
        {/* Left Column: Principals Directory */}
        <div className="lara-panel">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Enterprise Principals & Attributes</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="lara-table">
              <thead>
                <tr>
                  <th>Principal</th>
                  <th>Roles</th>
                  <th>Department</th>
                  <th>Clearance</th>
                  <th>Tenant Boundary</th>
                </tr>
              </thead>
              <tbody>
                {principals.map((p) => {
                  const isCurrent = p.principal_id === currentPrincipal?.principal_id;
                  return (
                    <tr key={p.principal_id} style={{ background: isCurrent ? '#FFF5FC' : undefined }}>
                      <td>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {p.display_name}
                          {isCurrent && <span className="lara-badge lara-badge--authority" style={{ fontSize: 9 }}>ACTIVE</span>}
                        </div>
                        <div style={{ fontFamily: 'var(--lara-mono)', fontSize: 11, color: 'var(--lara-muted)' }}>
                          {p.principal_id}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {p.roles.map((r) => (
                            <span key={r} className="lara-badge" style={{ fontSize: 10 }}>{r}</span>
                          ))}
                        </div>
                      </td>
                      <td>{p.department || 'Operations'}</td>
                      <td>
                        <span className="lara-badge" style={{ background: '#E8E7FF', color: 'var(--lara-blue)', fontSize: 10 }}>
                          {p.attributes?.clearance || 'standard'}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: 11 }}>{p.tenant_id}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Policy Decision Simulator */}
        <div className="lara-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={18} color="var(--lara-magenta)" /> Policy Simulator
          </h3>
          <p style={{ fontSize: 12, color: 'var(--lara-muted)', margin: 0 }}>
            Simulate how the runtime policy engine evaluates permissions for the currently authenticated principal:
          </p>

          <form onSubmit={handleSimulate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--lara-muted)', marginBottom: 4 }}>
                ACTION TO EVALUATE
              </label>
              <select className="lara-select" value={action} onChange={(e) => setAction(e.target.value)}>
                <option value="task.create">task.create</option>
                <option value="file.read">file.read</option>
                <option value="approval.decide">approval.decide</option>
                <option value="evolution.propose">evolution.propose</option>
                <option value="evolution.promote">evolution.promote</option>
                <option value="tool.execute">tool.execute</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--lara-muted)', marginBottom: 4 }}>
                TARGET RESOURCE ID
              </label>
              <input
                type="text"
                className="lara-input"
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--lara-muted)', marginBottom: 4 }}>
                RESOURCE TYPE
              </label>
              <input
                type="text"
                className="lara-input"
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
              />
            </div>

            <button type="submit" disabled={simulating} className="lara-button lara-button--primary" style={{ width: '100%' }}>
              <Play size={14} /> {simulating ? 'Evaluating...' : 'Simulate Engine Decision'}
            </button>
          </form>

          {/* Simulator Result */}
          {simResult && (
            <div
              style={{
                marginTop: 8,
                padding: 14,
                borderRadius: 12,
                border: '1.5px solid',
                borderColor: simResult.decision === 'ALLOW' ? 'var(--lara-green)' : simResult.decision === 'REQUIRE_APPROVAL' ? 'var(--lara-orange)' : '#D92D20',
                background: simResult.decision === 'ALLOW' ? '#FAFFF5' : simResult.decision === 'REQUIRE_APPROVAL' ? '#FFFBF7' : '#FFF5F5',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--lara-muted)' }}>ENGINE DECISION</span>
                <span
                  className="lara-badge"
                  style={{
                    background: simResult.decision === 'ALLOW' ? '#DDF8E8' : simResult.decision === 'REQUIRE_APPROVAL' ? '#FFE3D5' : '#FEE4E2',
                    color: simResult.decision === 'ALLOW' ? '#0E623B' : simResult.decision === 'REQUIRE_APPROVAL' ? '#9A3412' : '#B42318',
                    fontWeight: 800,
                  }}
                >
                  {simResult.decision}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--lara-ink)', fontWeight: 600 }}>
                Reason Code: <code>{simResult.reason_code}</code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
