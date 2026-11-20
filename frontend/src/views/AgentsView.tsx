import React, { useState, useEffect } from 'react';
import { api, AgentRecord, Principal } from '../lib/api';
import { Bot, CheckCircle, Shield, Code, Cpu } from 'lucide-react';

interface AgentsViewProps {
  currentPrincipal: Principal | null;
  onNavigateToTab: (tab: string) => void;
}

export const AgentsView: React.FC<AgentsViewProps> = ({ currentPrincipal, onNavigateToTab }) => {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const data = await api.listAgents();
        setAgents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="lara-panel lara-panel--lilac" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 22, margin: 0 }}>Specialist Agent Fleet</h2>
            <span className="lara-badge" style={{ background: '#101014', color: '#FFFFFF', fontSize: 10 }}>
              TASK-DECOUPLED
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', color: 'var(--lara-ink)', fontSize: 13 }}>
            LARA employs narrow, specialized agents orchestrated via Information Highways rather than monolithic mega-prompts.
          </p>
        </div>
        <button
          className="lara-button lara-button--outline"
          onClick={() => onNavigateToTab('evolution')}
        >
          Inspect Evolution Lab
        </button>
      </div>

      {/* Agents Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        {agents.map((agent) => (
          <div key={agent.agent_id} className="lara-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Bot size={20} color="var(--lara-violet)" />
                  <span style={{ fontSize: 16, fontWeight: 800 }}>{agent.name}</span>
                </div>
                <div style={{ fontFamily: 'var(--lara-mono)', fontSize: 12, color: 'var(--lara-muted)' }}>
                  {agent.agent_id}
                </div>
              </div>
              <span className="lara-badge lara-badge--allow">
                <CheckCircle size={10} /> {agent.status}
              </span>
            </div>

            <p style={{ fontSize: 13, color: 'var(--lara-ink)', margin: 0 }}>
              {agent.role}
            </p>

            <div style={{ background: '#FAFFF5', padding: 12, borderRadius: 12, border: '1px solid var(--lara-line)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lara-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                ACTIVE VERSION & PARENT
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="lara-badge" style={{ background: '#E8E7FF', color: 'var(--lara-blue)', fontWeight: 800 }}>
                  Active: v{agent.active_version}
                </span>
                {agent.parent_version && (
                  <span style={{ fontSize: 11, color: 'var(--lara-muted)' }}>
                    Parent: v{agent.parent_version}
                  </span>
                )}
              </div>
            </div>

            {/* Allowed Skills */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lara-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                PERMITTED SKILLS & CAPABILITIES
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {agent.skills.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      background: 'var(--lara-white)',
                      border: '1px solid var(--lara-line)',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontFamily: 'var(--lara-mono)',
                      color: 'var(--lara-ink)',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Prompt Template Snippet */}
            {agent.prompt_template && (
              <div style={{ marginTop: 'auto' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lara-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  PROMPT DIRECTIVE HEAD
                </div>
                <div
                  style={{
                    background: '#F9F9FB',
                    border: '1px solid #E8E8EE',
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 11,
                    fontFamily: 'var(--lara-mono)',
                    color: '#333340',
                    maxHeight: 90,
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {agent.prompt_template}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
