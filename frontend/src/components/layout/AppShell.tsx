import React, { useEffect, useState } from 'react';
import laraMark from '../../assets/logos/lara-mark.svg';
import laraWordmark from '../../assets/logos/lara-wordmark.svg';
import {
  Activity, Bell, BookOpen, ChevronDown, CircleHelp, FileClock,
  GitBranch, LayoutDashboard, ListChecks, Menu, Network, Search, Settings, ShieldCheck,
  Users, Workflow, X
} from 'lucide-react';
import { EnvironmentBadge, IconButton } from '../ui';
import { useAuth } from '../../features/auth/AuthContext';

export type PageId = 'overview'|'investigations'|'highways'|'agents'|'evolution'|'approvals'|'governance'|'audit';
export const pageNames: Record<PageId, string> = {
  overview: 'Overview',
  investigations: 'Investigations',
  highways: 'Information Highways',
  agents: 'Agents',
  evolution: 'Evolution Lab',
  approvals: 'Approvals',
  governance: 'Governance',
  audit: 'Audit Trail'
};

const nav = [
  { group: 'Workspace', items: [{ id: 'overview' as PageId, label: 'Overview', icon: LayoutDashboard }, { id: 'investigations' as PageId, label: 'Investigations', icon: ListChecks, badge: '12' }] },
  { group: 'Intelligence', items: [{ id: 'highways' as PageId, label: 'Information Highways', icon: Network }, { id: 'agents' as PageId, label: 'Agents', icon: Workflow }] },
  { group: 'Policy & Control', items: [{ id: 'approvals' as PageId, label: 'Approvals', icon: ShieldCheck, badge: '3' }, { id: 'governance' as PageId, label: 'Governance', icon: Users }, { id: 'evolution' as PageId, label: 'Evolution Lab', icon: GitBranch }] },
  { group: 'Observability', items: [{ id: 'audit' as PageId, label: 'Audit Trail', icon: FileClock }] }
];

export function AppShell({ page, onNavigate, children, role, onRoleChange }: React.PropsWithChildren<{ page: PageId; onNavigate: (p: PageId) => void; role?: string; onRoleChange?: (r: string) => void }>) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [globalQuery, setGlobalQuery] = useState('');
  const [notifications, setNotifications] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [help, setHelp] = useState(false);

  const { principal, allPrincipals, switchIdentity } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenu(false);
        setUserMenu(false);
        setNotifications(false);
        setHelp(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filtered = nav.map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(search.toLowerCase())) })).filter(g => g.items.length);
  const go = (id: PageId) => { onNavigate(id); setMobileMenu(false); };

  const activeName = principal?.display_name || 'Maya Operator';
  const activeRole = principal?.roles?.[0] ? (principal.roles[0].charAt(0).toUpperCase() + principal.roles[0].slice(1)) : (role || 'Operator');
  const initials = activeName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      <aside className="primary-rail">
        <button className="rail-brand" aria-label="LARA home" onClick={() => go('overview')}>
          <img src={laraMark} alt="LARA" />
          <span className="brand-text">LARA</span>
        </button>
        <div className="rail-main">
          <button className={`rail-item ${page === 'overview' ? 'active' : ''}`} onClick={() => go('overview')} title="Overview"><LayoutDashboard size={19} /><span>Home</span></button>
          <button className={`rail-item ${['investigations', 'highways'].includes(page) ? 'active' : ''}`} onClick={() => go('investigations')} title="Workbench"><Activity size={19} /><span>Work</span></button>
          <button className={`rail-item ${['agents', 'evolution'].includes(page) ? 'active' : ''}`} onClick={() => go('agents')} title="Intelligence"><Network size={19} /><span>Intel</span></button>
          <button className={`rail-item ${['approvals', 'governance'].includes(page) ? 'active' : ''}`} onClick={() => go('approvals')} title="Governance"><ShieldCheck size={19} /><span>Govern</span></button>
          <button className={`rail-item ${page === 'audit' ? 'active' : ''}`} onClick={() => go('audit')} title="Audit"><FileClock size={19} /><span>Audit</span></button>
        </div>
        <div className="rail-bottom">
          <button className="rail-item" title="Settings"><Settings size={18} /><span>Settings</span></button>
          <div className="rail-avatar" title={activeName}>{initials}</div>
        </div>
      </aside>

      <aside className={`context-sidebar ${mobileMenu ? 'mobile-visible' : ''}`}>
        <div className="sidebar-head">
          <img src={laraWordmark} alt="LARA Agentic Runtime" />
          <div className="sidebar-head-actions">
            <IconButton label="Close navigation drawer" className="mobile-close-btn" onClick={() => setMobileMenu(false)}><X size={18} /></IconButton>
            <IconButton label="Collapse navigation" className="desktop-collapse-btn" onClick={() => setSidebarOpen(false)}><Menu size={17} /></IconButton>
          </div>
        </div>
        <div className="workspace-select">
          <div className="workspace-mark">N</div>
          <div><strong>North Plant</strong><small>Operations workspace</small></div>
          <ChevronDown size={15} />
        </div>
        <div className="sidebar-search">
          <Search size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter navigation" aria-label="Filter navigation" />
          {search && <button onClick={() => setSearch('')} aria-label="Clear navigation filter"><X size={13} /></button>}
        </div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {filtered.map(group => (
            <div className="nav-group" key={group.group}>
              <div className="nav-group-title">{group.group}</div>
              {group.items.map(item => (
                <button key={item.id} className={`nav-link ${page === item.id ? 'active' : ''}`} onClick={() => go(item.id)}>
                  <item.icon size={17} />
                  <span>{item.label}</span>
                  {item.badge && <b>{item.badge}</b>}
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && <p className="nav-empty">No navigation matches</p>}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footer-icon"><BookOpen size={16} /></div>
          <div><strong>Runtime status</strong><small><span className="status-pulse" /> All systems operational</small></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="workspace-header">
          {!sidebarOpen && <IconButton label="Expand navigation" onClick={() => setSidebarOpen(true)}><Menu size={18} /></IconButton>}
          <button className="mobile-menu-button" aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileMenu} onClick={() => setMobileMenu(v => !v)}><Menu size={19} /></button>
          <div className="global-search">
            <Search size={17} />
            <input
              aria-label="Search LARA"
              value={globalQuery}
              onChange={e => setGlobalQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && globalQuery.trim()) {
                  const q = globalQuery.toLowerCase();
                  go(q.includes('agent') ? 'agents' : q.includes('route') || q.includes('highway') ? 'highways' : q.includes('audit') || q.includes('trace') ? 'audit' : q.includes('approval') ? 'approvals' : 'investigations');
                  setGlobalQuery('');
                }
              }}
              placeholder="Search investigations, agents, evidence…"
            />
            <kbd>Enter</kbd>
          </div>
          <div className="header-actions">
            <EnvironmentBadge />
            <div className="header-pop-wrap">
              <IconButton label="Help and documentation" onClick={() => setHelp(v => !v)}><CircleHelp size={18} /></IconButton>
              {help && (
                <div className="popover-menu">
                  <strong>Need help?</strong>
                  <p>Explore the LARA runtime guide and workflow documentation.</p>
                  <button onClick={() => setHelp(false)}>Got it</button>
                </div>
              )}
            </div>
            <div className="header-pop-wrap">
              <IconButton label="Notifications" active={notifications} onClick={() => setNotifications(v => !v)}><Bell size={18} /></IconButton>
              {notifications && (
                <div className="popover-menu notification-menu">
                  <strong>Notifications</strong>
                  <p><span className="notification-dot" /> 3 approvals need attention</p>
                  <p><span className="notification-dot muted" /> Verification completed for INC-204</p>
                  <button onClick={() => { setNotifications(false); go('approvals'); }}>View approvals</button>
                </div>
              )}
            </div>
            <div className="header-pop-wrap">
              <button className="identity-button" aria-label="Switch demo principal" onClick={() => setUserMenu(v => !v)}>
                <span className="identity-avatar">{initials}</span>
                <span className="identity-copy">
                  <b>{activeName}</b>
                  <small>{activeRole}</small>
                </span>
                <ChevronDown size={14} />
              </button>
              {userMenu && (
                <div className="popover-menu identity-menu" role="menu">
                  <strong>Switch demo identity</strong>
                  {allPrincipals.map(p => (
                    <button
                      key={p.principal_id}
                      className={principal?.principal_id === p.principal_id ? 'current' : ''}
                      onClick={async () => {
                        await switchIdentity(p.principal_id);
                        onRoleChange?.(p.roles[0]);
                        setUserMenu(false);
                      }}
                    >
                      {p.display_name}
                      {principal?.principal_id === p.principal_id ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="environment-line"><span /> DEMO WORKSPACE <span className="line-separator">·</span> Sample industrial operations data</div>
        <div className="page-content">{children}</div>
        <footer className="app-footer"><span>© 2026 LARA Runtime</span><span>Workspace: North Plant <i /> Runtime v0.8.4-demo</span></footer>
      </main>
      {mobileMenu && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
    </div>
  );
}
