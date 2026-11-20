import React, { useState, useEffect } from 'react';
import { api, AuditEvent, Principal } from '../lib/api';
import { FileText, Search, ShieldCheck, Filter, RefreshCw } from 'lucide-react';

interface AuditViewProps {
  currentPrincipal: Principal | null;
}

export const AuditView: React.FC<AuditViewProps> = ({ currentPrincipal }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [traceFilter, setTraceFilter] = useState('');
  const [taskFilter, setTaskFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await api.listAuditEvents({
        trace_id: traceFilter || undefined,
        task_id: taskFilter || undefined,
        limit: 100,
      });
      setEvents(data);
      if (data.length > 0 && !selectedEvent) {
        setSelectedEvent(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [traceFilter, taskFilter]);

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
      <div className="lara-panel" style={{ background: '#E8E7FF', border: '1.5px solid var(--lara-blue)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 22, margin: 0 }}>Immutable Audit Ledger & Traceability</h2>
            <span className="lara-badge" style={{ background: 'var(--lara-blue)', color: '#FFFFFF', fontSize: 10 }}>
              CRYPTOGRAPHIC INTEGRITY
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', color: 'var(--lara-ink)', fontSize: 13 }}>
            Every task, route resolution, model inference, tool execution, and policy evaluation is recorded immutably with SHA-256 payload hashes.
          </p>
        </div>
        <button className="lara-button lara-button--outline" onClick={fetchEvents} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Ledger
        </button>
      </div>

      {/* Filters Bar */}
      <div className="lara-panel" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <Search size={16} color="var(--lara-muted)" />
          <input
            type="text"
            className="lara-input"
            placeholder="Filter by Trace ID (e.g. trc_...)"
            value={traceFilter}
            onChange={(e) => setTraceFilter(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <Filter size={16} color="var(--lara-muted)" />
          <input
            type="text"
            className="lara-input"
            placeholder="Filter by Task ID (e.g. task_...)"
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
          />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--lara-muted)', whiteSpace: 'nowrap' }}>
          {events.length} events logged
        </span>
      </div>

      {/* Ledger Table & Event Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: 24 }}>
        <div className="lara-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', maxHeight: 600 }}>
            <table className="lara-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Timestamp</th>
                  <th>Type</th>
                  <th>Principal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const isSelected = selectedEvent?.event_id === ev.event_id;
                  return (
                    <tr
                      key={ev.event_id}
                      onClick={() => setSelectedEvent(ev)}
                      style={{ cursor: 'pointer', background: isSelected ? '#EFF6FF' : undefined }}
                    >
                      <td>
                        <span style={{ fontFamily: 'var(--lara-mono)', fontWeight: 700 }}>
                          {ev.event_id.slice(0, 14)}...
                        </span>
                      </td>
                      <td style={{ color: 'var(--lara-muted)', fontSize: 11 }}>
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        <span className="lara-badge" style={{ fontSize: 10 }}>
                          {ev.event_type}
                        </span>
                      </td>
                      <td>{ev.principal_id}</td>
                      <td>
                        <span
                          className="lara-badge"
                          style={{
                            fontSize: 10,
                            background: ev.status === 'SUCCESS' ? '#DDF8E8' : '#FFE3D5',
                            color: ev.status === 'SUCCESS' ? '#0E623B' : '#9A3412',
                          }}
                        >
                          {ev.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Event JSON Inspector */}
        <div className="lara-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: 15, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} /> Audit Event Payload
          </h3>

          {selectedEvent ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, background: '#FAFFF5', padding: 12, borderRadius: 8, border: '1px solid var(--lara-line)' }}>
                <div><strong>Event ID:</strong> <code>{selectedEvent.event_id}</code></div>
                <div><strong>Trace ID:</strong> <code>{selectedEvent.trace_id}</code></div>
                {selectedEvent.task_id && <div><strong>Task ID:</strong> <code>{selectedEvent.task_id}</code></div>}
                <div><strong>Action:</strong> <code>{selectedEvent.action || 'system'}</code></div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lara-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  IMMUTABLE DETAILS BLOB
                </div>
                <pre style={{ background: '#101014', color: '#FFFFFF', padding: 14, borderRadius: 8, fontSize: 11, fontFamily: 'var(--lara-mono)', maxHeight: 380, overflowY: 'auto' }}>
                  {JSON.stringify(selectedEvent.details, null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--lara-muted)', fontSize: 13 }}>
              Select an audit event to inspect cryptographic details and trace context.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
