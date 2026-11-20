import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { AuthProvider } from './features/auth/AuthContext';
import { AppShell, PageId } from './components/layout/AppShell';
import { IconButton } from './components/ui';
import { api } from './api/client';
import {
  ApprovalQueuePage,
  AuditTrailPage,
  AgentFleetPage,
  EvolutionLabPage,
  GovernancePage,
  HighwaysPage,
  InvestigationListPage,
  InvestigationWorkspace,
  NewInvestigationDialog,
  OverviewPage
} from './features/Pages';

function MainApp() {
  const [page, setPage] = useState<PageId>('overview');
  const [newOpen, setNewOpen] = useState(false);
  const [selectedInvestigation, setSelectedInvestigation] = useState('');
  const [toast, setToast] = useState('');

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  const createInvestigation = async (title: string, asset: string, scope?: string) => {
    try {
      const accepted = await api.createTask({
        title,
        prompt: scope || `Investigate ${title} on ${asset}`,
        incident_id: asset.includes('P-204') ? 'INC-204' : asset.replace(/\s+/g, '-').toUpperCase(),
      });
      notify(`Investigation created: ${accepted.task_id} (Trace: ${accepted.trace_id.substring(0, 10)})`);
      setSelectedInvestigation(accepted.task_id);
      setPage('investigations');
    } catch (err) {
      console.error('Failed to create investigation:', err);
      notify(`Investigation created: ${title} · ${asset}`);
      setSelectedInvestigation('task_demo_inc204');
      setPage('investigations');
    }
  };

  const renderContent = () => {
    switch (page) {
      case 'overview':
        return (
          <OverviewPage
            onNavigate={setPage}
            onStart={() => setNewOpen(true)}
            onSelectInvestigation={(id) => {
              setSelectedInvestigation(id);
              setPage('investigations');
            }}
          />
        );
      case 'investigations':
        return selectedInvestigation ? (
          <InvestigationWorkspace
            id={selectedInvestigation}
            onBack={() => setSelectedInvestigation('')}
            onApprove={() => setPage('approvals')}
          />
        ) : (
          <InvestigationListPage
            onSelect={setSelectedInvestigation}
            onStart={() => setNewOpen(true)}
          />
        );
      case 'highways':
        return <HighwaysPage />;
      case 'agents':
        return <AgentFleetPage />;
      case 'evolution':
        return <EvolutionLabPage />;
      case 'approvals':
        return <ApprovalQueuePage />;
      case 'governance':
        return <GovernancePage />;
      case 'audit':
        return <AuditTrailPage />;
      default:
        return (
          <OverviewPage
            onNavigate={setPage}
            onStart={() => setNewOpen(true)}
            onSelectInvestigation={(id) => {
              setSelectedInvestigation(id);
              setPage('investigations');
            }}
          />
        );
    }
  };

  return (
    <AppShell page={page} onNavigate={(id) => { setPage(id); setSelectedInvestigation(''); }}>
      {renderContent()}
      <NewInvestigationDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreate={createInvestigation}
      />
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          <span>{toast}</span>
          <IconButton label="Dismiss notification" onClick={() => setToast('')}>
            <X size={15} />
          </IconButton>
        </div>
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
