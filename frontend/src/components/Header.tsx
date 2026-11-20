import React from 'react';
import { Principal } from '../lib/api';
import {
  ShieldCheck,
  Activity,
  Route,
  Bot,
  GitFork,
  Lock,
  CheckSquare,
  FileText,
  UserCheck
} from 'lucide-react';

interface HeaderProps {
  currentPrincipal: Principal | null;
  onSwitchIdentity: (principalId: string) => Promise<void>;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  systemHealthy: boolean;
}

const SEEDED_IDENTITIES = [
  { id: 'usr_operator_01', name: 'Alex Vance', role: 'Operator', dept: 'Operations', clearance: 'internal' },
  { id: 'usr_supervisor_01', name: 'Sarah Chen', role: 'Supervisor', dept: 'Maintenance', clearance: 'restricted' },
  { id: 'usr_admin_01', name: 'Marcus Brody', role: 'Runtime Admin', dept: 'Platform Eng', clearance: 'restricted' },
  { id: 'usr_auditor_01', name: 'Elena Rostova', role: 'Auditor', dept: 'Compliance', clearance: 'confidential' },
];

export const Header: React.FC<HeaderProps> = ({
  currentPrincipal,
  onSwitchIdentity,
  activeTab,
  onSelectTab,
  systemHealthy,
}) => {
  return (
    <header style={{ borderBottom: '1px solid var(--lara-line)', background: 'var(--lara-white)', position: 'sticky', top: 0, zIndex: 100 }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid var(--lara-border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src="/assets/brand/lara-mark.svg" alt="LARA Mark" style={{ width: 36, height: 36 }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--lara-ink)' }}>LARA</span>
              <span className="lara-badge lara-badge--lime" style={{ fontSize: 10 }}>SYNTHETIC DEMO</span>
              <span className="lara-badge" style={{ background: '#E8E7FF', color: 'var(--lara-blue)', fontSize: 10 }}>RUNTIME ACCELERATOR</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--lara-muted)', marginTop: 2 }}>
              Enterprise Model-Independent Agentic Architecture
            </div>
          </div>
        </div>

        {/* Demo Identity Switcher & System Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--lara-muted)' }}>IDENTITY:</span>
            <select
              className="lara-select"
              style={{ width: 'auto', padding: '6px 12px', fontSize: 13, fontWeight: 600, background: '#F5FFE8', borderColor: '#D8E0CE' }}
              value={currentPrincipal?.principal_id || ''}
              onChange={(e) => onSwitchIdentity(e.target.value)}
            >
              {SEEDED_IDENTITIES.map((id) => (
                <option key={id.id} value={id.id}>
                  {id.name} — {id.role} ({id.clearance})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: systemHealthy ? '#DDF8E8' : '#FFE3D5', borderRadius: 999 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: systemHealthy ? 'var(--lara-green)' : 'var(--lara-orange)' }} />
            <span style={{ fontSize: 12, fontWeight: 750, color: 'var(--lara-ink)' }}>
              {systemHealthy ? 'CORE ACTIVE' : 'CONNECTING'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav style={{ display: 'flex', gap: '8px', padding: '8px 24px', background: '#FAFFF5', overflowX: 'auto' }}>
        {[
          { id: 'workbench', label: 'Workbench', icon: Activity },
          { id: 'highways', label: 'Information Highways', icon: Route },
          { id: 'agents', label: 'Specialist Agents', icon: Bot },
          { id: 'evolution', label: 'Evolution Lab', icon: GitFork },
          { id: 'governance', label: 'Governance & Policy', icon: Lock },
          { id: 'approvals', label: 'Approval Queue', icon: CheckSquare },
          { id: 'audit', label: 'Audit Trail', icon: FileText },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 999,
                border: 'none',
                background: isActive ? 'var(--lara-blue)' : 'transparent',
                color: isActive ? 'var(--lara-white)' : 'var(--lara-ink)',
                fontSize: 13,
                fontWeight: isActive ? 750 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
