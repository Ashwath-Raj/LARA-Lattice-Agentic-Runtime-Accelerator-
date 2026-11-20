import React, { useState, useEffect } from 'react';
import { api, ResolvedRoute, Principal } from '../lib/api';
import { Route as RouteIcon, Shield, Layers, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface HighwaysViewProps {
  currentPrincipal: Principal | null;
}

export const HighwaysView: React.FC<HighwaysViewProps> = ({ currentPrincipal }) => {
  const [route, setRoute] = useState<ResolvedRoute | null>(null);
  const [taskIntent, setTaskIntent] = useState('Investigate pump P-102 vibration anomaly and check SOP');
  const [incidentId, setIncidentId] = useState('inc_2026_014');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveHighway = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.resolveRoute({
        task_intent: taskIntent,
        incident_id: incidentId || undefined,
      });
      setRoute(res);
    } catch (err: any) {
      setError(err.message || 'Failed to resolve Information Highway');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    resolveHighway();
  }, [currentPrincipal]);

  // Topology node representations
  const topologyNodes = [
    { id: 'principal', label: currentPrincipal?.display_name || 'Principal', type: 'authority', x: 80, y: 150 },
    { id: 'intent', label: 'Task Intent & Context', type: 'context', x: 280, y: 150 },
    { id: 'source:incident-log', label: 'Incident Log (inc_2026_014)', type: 'knowledge', x: 500, y: 70 },
    { id: 'source:sop-current', label: 'SOP-MNT-014 (Rev 3.2)', type: 'knowledge', x: 500, y: 150 },
    { id: 'source:sop-obsolete', label: 'SOP-MNT-014 (Rev 2.4 - Obsolete)', type: 'excluded', x: 500, y: 230 },
    { id: 'source:vendor-contract', label: 'Vendor Contract (Restricted)', type: 'knowledge', x: 500, y: 310 },
    { id: 'agent:research', label: 'Research Specialist', type: 'agent', x: 740, y: 100 },
    { id: 'agent:analysis', label: 'Analysis Specialist', type: 'agent', x: 740, y: 200 },
    { id: 'agent:verification', label: 'Verification Specialist', type: 'agent', x: 940, y: 150 },
  ];

  const isNodeSelected = (nodeId: string) => {
    if (!route) return false;
    if (nodeId === 'principal' || nodeId === 'intent') return true;
    return route.selected_path.some((p) => p.includes(nodeId) || nodeId.includes(p));
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Panel */}
      <div className="lara-panel lara-panel--lime" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 22, margin: 0 }}>Information Highways Console</h2>
            <span className="lara-badge" style={{ background: '#101014', color: '#FFFFFF', fontSize: 10 }}>
              DYNAMIC ACCESS GRAPHS
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', color: 'var(--lara-ink)', fontSize: 13, fontWeight: 500 }}>
            Instead of loose full-database indexing, LARA synthesizes a deterministic, authorized subgraph per identity and task.
          </p>
        </div>
        <button
          className="lara-button lara-button--primary"
          onClick={resolveHighway}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Resolving...' : 'Re-resolve for Identity'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#FEE4E2', border: '1px solid #FDA29B', padding: '12px 16px', borderRadius: 12, color: '#B42318', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Main Grid: Visual Graph Canvas & Route Metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 24 }}>
        {/* Left: SVG Highway Graph Canvas */}
        <div className="lara-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 15, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={16} /> Active Highway Topology Map
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="lara-badge" style={{ background: '#D2F5FE', color: '#00759E' }}>CYAN = SELECTED PATH</span>
              <span className="lara-badge lara-badge--deny">RED/GREY = PRUNED / EXCLUDED</span>
            </div>
          </div>

          {/* SVG Canvas */}
          <div style={{ background: '#FAFFF5', border: '1.5px solid var(--lara-line)', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
            <svg viewBox="0 0 1100 380" style={{ width: '100%', height: 'auto', display: 'block' }}>
              {/* Grid pattern */}
              <defs>
                <pattern id="lattice" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E4EBD8" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#lattice)" />

              {/* Edge connectors */}
              <line x1="160" y1="150" x2="280" y2="150" stroke="#4B43F5" strokeWidth="4" />
              <line x1="380" y1="150" x2="500" y2="70" stroke="#00B9E8" strokeWidth="3" />
              <line x1="380" y1="150" x2="500" y2="150" stroke="#00B9E8" strokeWidth="4" />
              <line x1="380" y1="150" x2="500" y2="230" stroke="#D8E0CE" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="380" y1="150" x2="500" y2="310" stroke={currentPrincipal?.roles.includes('supervisor') || currentPrincipal?.roles.includes('runtime_admin') ? '#00B9E8' : '#D8E0CE'} strokeWidth="2" strokeDasharray={currentPrincipal?.roles.includes('supervisor') ? '0' : '4 4'} />

              <line x1="620" y1="70" x2="740" y2="100" stroke="#00B9E8" strokeWidth="3" />
              <line x1="620" y1="150" x2="740" y2="100" stroke="#00B9E8" strokeWidth="4" />
              <line x1="620" y1="150" x2="740" y2="200" stroke="#00B9E8" strokeWidth="3" />
              <line x1="840" y1="100" x2="940" y2="150" stroke="#8B4DFA" strokeWidth="3" />
              <line x1="840" y1="200" x2="940" y2="150" stroke="#8B4DFA" strokeWidth="3" />

              {/* Render nodes */}
              {topologyNodes.map((n) => {
                const selected = isNodeSelected(n.id);
                const isExcluded = n.type === 'excluded' || (!selected && n.type === 'knowledge');

                let fillColor = '#FFFFFF';
                let strokeColor = '#D8E0CE';
                let textColor = '#101014';

                if (n.type === 'authority') {
                  fillColor = '#FFE0F8';
                  strokeColor = 'var(--lara-magenta)';
                } else if (n.type === 'context') {
                  fillColor = 'var(--lara-lime)';
                  strokeColor = '#101014';
                } else if (n.type === 'agent') {
                  fillColor = '#EEE8FF';
                  strokeColor = 'var(--lara-violet)';
                } else if (selected) {
                  fillColor = '#DDF8E8';
                  strokeColor = 'var(--lara-green)';
                } else if (isExcluded) {
                  fillColor = '#F2F2F5';
                  strokeColor = '#C8C8D0';
                  textColor = '#888894';
                }

                return (
                  <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                    <rect
                      x="-70"
                      y="-22"
                      width="140"
                      height="44"
                      rx="12"
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={selected ? '3' : '1.5'}
                    />
                    <text
                      textAnchor="middle"
                      y="4"
                      fill={textColor}
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="Inter, sans-serif"
                    >
                      {n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Node Legend */}
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--lara-muted)', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: '#FFE0F8', border: '1.5px solid var(--lara-magenta)' }} />
              Authority Boundary
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--lara-lime)', border: '1.5px solid #101014' }} />
              Task Context
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: '#DDF8E8', border: '1.5px solid var(--lara-green)' }} />
              Authorized Source
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: '#EEE8FF', border: '1.5px solid var(--lara-violet)' }} />
              Specialist Agent
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: '#F2F2F5', border: '1.5px solid #C8C8D0' }} />
              Pruned / Excluded
            </span>
          </div>
        </div>

        {/* Right: Route Details & Policy Pruning Explanation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {route ? (
            <>
              {/* Route Summary Panel */}
              <div className="lara-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 14, margin: 0 }}>Resolved Route Details</h4>
                  <span className="lara-badge lara-badge--allow">AUTHORIZED</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--lara-muted)' }}>Route ID:</span>
                    <span style={{ fontFamily: 'var(--lara-mono)', fontWeight: 700 }}>{route.route_id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--lara-muted)' }}>Graph Version:</span>
                    <span style={{ fontWeight: 700 }}>{route.graph_version || route.version}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--lara-muted)' }}>Principal:</span>
                    <span style={{ fontWeight: 600 }}>{currentPrincipal?.display_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--lara-muted)' }}>Selected Hops:</span>
                    <span style={{ fontWeight: 700, color: 'var(--lara-blue)' }}>{route.selected_path.length} Nodes</span>
                  </div>
                </div>

                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--lara-line)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lara-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    SCORE BREAKDOWN FACTORS
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {Object.entries(route.score_breakdown || {}).map(([factor, score]) => (
                      <div key={factor} style={{ background: '#FAFFF5', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--lara-line)', fontSize: 12 }}>
                        <div style={{ color: 'var(--lara-muted)', fontSize: 10, textTransform: 'uppercase' }}>{factor}</div>
                        <div style={{ fontWeight: 700, color: 'var(--lara-ink)' }}>{score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Excluded Candidates Card */}
              <div className="lara-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Shield size={16} color="var(--lara-magenta)" />
                  <h4 style={{ fontSize: 14, margin: 0 }}>Enforced Pruning & Exclusions</h4>
                </div>
                <p style={{ fontSize: 12, color: 'var(--lara-muted)', marginBottom: 12 }}>
                  LARA strips unauthenticated or obsolete knowledge before LLM context construction:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {route.excluded_candidates && route.excluded_candidates.length > 0 ? (
                    route.excluded_candidates.map((exc, i) => (
                      <div
                        key={i}
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          background: '#FFF9FB',
                          border: '1px solid #FFD4EE',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                        }}
                      >
                        <div style={{ fontFamily: 'var(--lara-mono)', fontSize: 11, fontWeight: 700, color: 'var(--lara-magenta)' }}>
                          {exc.node_id}
                        </div>
                        <div style={{ fontSize: 11, color: '#960087', fontWeight: 600 }}>
                          REASON: {exc.reason_code}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--lara-muted)', textAlign: 'center', padding: 12 }}>
                      No nodes pruned for this context.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="lara-panel" style={{ textAlign: 'center', padding: 32, color: 'var(--lara-muted)' }}>
              Resolving Information Highway...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
