import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { WorkbenchView } from './views/WorkbenchView';
import { HighwaysView } from './views/HighwaysView';
import { AgentsView } from './views/AgentsView';
import { EvolutionView } from './views/EvolutionView';
import { GovernanceView } from './views/GovernanceView';
import { ApprovalsView } from './views/ApprovalsView';
import { AuditView } from './views/AuditView';
import { api, Principal } from './lib/api';
import './styles/lara-theme.css';

export const App: React.FC = () => {
  const [currentPrincipal, setCurrentPrincipal] = useState<Principal | null>(null);
  const [activeTab, setActiveTab] = useState<string>('workbench');
  const [systemHealthy, setSystemHealthy] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session and health check
  useEffect(() => {
    const init = async () => {
      try {
        const health = await api.checkHealth();
        setSystemHealthy(health.status === 'ok' || health.status === 'healthy');
      } catch (err) {
        console.warn('Health check warning:', err);
        setSystemHealthy(false);
      }

      try {
        // Try getting active principal
        const me = await api.getMe();
        setCurrentPrincipal(me);
      } catch {
        // Auto-login with default demo operator
        try {
          const res = await api.demoLogin('usr_operator_01');
          setCurrentPrincipal(res.principal);
        } catch (loginErr) {
          console.error('Demo auto-login failed:', loginErr);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleSwitchIdentity = async (principalId: string) => {
    try {
      const res = await api.demoLogin(principalId);
      setCurrentPrincipal(res.principal);
    } catch (err) {
      console.error('Failed to switch demo identity:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lara-canvas)' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/assets/brand/lara-mark.svg" alt="LARA" style={{ width: 64, height: 64, marginBottom: 16 }} />
          <div style={{ fontSize: 18, fontWeight: 800 }}>Initializing LARA Runtime...</div>
          <div style={{ fontSize: 13, color: 'var(--lara-muted)', marginTop: 4 }}>Loading Bright Lattice Agentic Context</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        currentPrincipal={currentPrincipal}
        onSwitchIdentity={handleSwitchIdentity}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        systemHealthy={systemHealthy}
      />

      <main style={{ flex: 1, paddingBottom: 48 }}>
        {activeTab === 'workbench' && (
          <WorkbenchView currentPrincipal={currentPrincipal} onNavigateToTab={setActiveTab} />
        )}
        {activeTab === 'highways' && (
          <HighwaysView currentPrincipal={currentPrincipal} />
        )}
        {activeTab === 'agents' && (
          <AgentsView currentPrincipal={currentPrincipal} onNavigateToTab={setActiveTab} />
        )}
        {activeTab === 'evolution' && (
          <EvolutionView currentPrincipal={currentPrincipal} />
        )}
        {activeTab === 'governance' && (
          <GovernanceView currentPrincipal={currentPrincipal} />
        )}
        {activeTab === 'approvals' && (
          <ApprovalsView currentPrincipal={currentPrincipal} onNavigateToTab={setActiveTab} />
        )}
        {activeTab === 'audit' && (
          <AuditView currentPrincipal={currentPrincipal} />
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--lara-line)', background: 'var(--lara-white)', padding: '16px 24px', textAlign: 'center', fontSize: 12, color: 'var(--lara-muted)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>LARA — Lattice Agentic Runtime Accelerator</strong> • Model-Independent Enterprise Substrate
          </div>
          <div>
            Google Startup Buildathon Prototype • Protected by Unified Policy & Constitutional Guardrails
          </div>
        </div>
      </footer>
    </div>
  );
};
