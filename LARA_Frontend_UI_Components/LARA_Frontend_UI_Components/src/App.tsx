import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { AppShell, PageId } from './components/layout/AppShell';
import { Button, Drawer, IconButton } from './components/ui';
import {
  ApprovalQueuePage, AuditTrailPage, AgentFleetPage, EvolutionLabPage, GovernancePage,
  HighwaysPage, InvestigationListPage, InvestigationWorkspace, NewInvestigationDialog, OverviewPage
} from './features/Pages';

export default function App() {
  const [page,setPage]=useState<PageId>('overview');
  const [role,setRole]=useState('Operator');
  const [newOpen,setNewOpen]=useState(false);
  const [selectedInvestigation,setSelectedInvestigation]=useState('');
  const [toast,setToast]=useState('');
  const notify=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(''),3200);};
  const createInvestigation=(title:string,asset:string)=>{notify(`Investigation created: ${title} · ${asset}`);setPage('investigations');setSelectedInvestigation('');};
  const content=()=>{
    if(page==='overview') return <OverviewPage onNavigate={setPage} onStart={()=>setNewOpen(true)} onSelectInvestigation={id=>{setSelectedInvestigation(id);setPage('investigations');}}/>;
    if(page==='investigations') return selectedInvestigation
      ? <InvestigationWorkspace id={selectedInvestigation} onBack={()=>setSelectedInvestigation('')} onApprove={()=>setPage('approvals')}/>
      : <InvestigationListPage onSelect={setSelectedInvestigation} onStart={()=>setNewOpen(true)}/>;
    if(page==='highways') return <HighwaysPage/>;
    if(page==='agents') return <AgentFleetPage/>;
    if(page==='evolution') return <EvolutionLabPage/>;
    if(page==='approvals') return <ApprovalQueuePage/>;
    if(page==='governance') return <GovernancePage/>;
    return <AuditTrailPage/>;
  };
  return <AppShell page={page} onNavigate={id=>{setPage(id);setSelectedInvestigation('');}} role={role} onRoleChange={setRole}>
    {content()}
    <NewInvestigationDialog open={newOpen} onClose={()=>setNewOpen(false)} onCreate={createInvestigation}/>
    {toast && <div className="toast"><CheckCircle2 size={17}/><span>{toast}</span><IconButton label="Dismiss notification" onClick={()=>setToast('')}><X size={15}/></IconButton></div>}
  </AppShell>;
}
