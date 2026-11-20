# LARA Enterprise UI Component Catalog

**Design Inspiration**: Google Ads Enterprise Console (Information Density & Data Surfaces) & Google Workspace Security Architecture (Clarity, Calm White Space, Restrained Split Compositions)  
**Package Origin**: `LARA_Frontend_UI_Components/`  
**Target Environment**: `frontend/src/components/ui/index.tsx`, `frontend/src/components/layout/AppShell.tsx`, `frontend/src/features/Pages.tsx`  
**Design Tokens**: `frontend/src/styles/tokens.css`

---

## 1. Application Shell & Navigation

### 1.1 `AppShell`
- **Location**: `src/components/layout/AppShell.tsx`
- **Role**: Primary responsive shell integrating the 68px primary icon rail, 236px collapsible context sidebar, 64px global header, and fluid content viewport.
- **Visual Reference**: Google Ads Overview left rail and expandable campaign navigation tree.
- **Props**:
  - `page`: Active page ID (`'overview' | 'investigations' | 'highways' | 'agents' | 'evolution' | 'approvals' | 'governance' | 'audit'`)
  - `onNavigate`: Callback `(p: PageId) => void`
  - `role?`: Optional role override
  - `onRoleChange?`: Optional role callback
  - `children`: ReactNode content
- **Accessibility**:
  - `aria-label="LARA home"` on brand rail icon
  - Semantic `<aside>` for rails and sidebar, `<main>` for primary area, `<nav>` for hierarchical menus
  - Keyboard focus rings (`--lara-focus-ring`) on all buttons and interactive items
  - `aria-label="Switch demo principal"` and `role="menu"` on principal switcher
- **Tokens Used**: `--lara-rail-w`, `--lara-sidebar-w`, `--lara-header-h`, `--lara-surface`, `--lara-border`

---

## 2. Shared Atomic UI Components (`src/components/ui/index.tsx`)

### 2.1 Buttons & Action Triggers

#### `Button`
- **Variants**: `'primary' | 'secondary' | 'subtle' | 'danger' | 'success'`
- **Sizes**: `'sm' | 'md' | 'lg'`
- **Tokens**: `--lara-primary`, `--lara-primary-hover`, `--lara-text`, `--lara-border`
- **A11y**: Standard `<button>` semantics, native disabled states, visible `:focus-visible` offset ring.

#### `IconButton`
- **Role**: Compact icon button for toolbars, modals, and rail actions.
- **Props**: `label` (mandatory accessible name), `active`, `onClick`.
- **A11y**: Enforces `aria-label` and `title`.

#### `CopyButton`
- **Role**: One-click clipboard copy utility with animated feedback.
- **State**: Transitions from copy icon to checkmark with "Copied" text for 1200ms.

---

### 2.2 Status, Identity & Badges

#### `Badge`
- **Tones**: `'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal'`
- **Props**: `dot` (boolean indicator dot)
- **Contrast**: Compliant with WCAG AAA for text against badge surfaces.

#### `StatusBadge`
- **Role**: Domain-specific badge mapping runtime states (`Active`, `Investigating`, `Critical`, `Awaiting approval`, `Blocked`, `Approved`, `Verified`).
- **Logic**: Automatic tone assignment based on status keywords.

#### `EnvironmentBadge`
- **Role**: High-visibility enterprise warning badge.
- **Output**: `<span className="environment-badge"><span/> SYNTHETIC DEMO ENVIRONMENT</span>`

#### `Avatar` & `AvatarGroup`
- **Role**: User and agent identity presentation with automatic uppercase initial generation.
- **A11y**: `aria-label` containing the full user/agent name.

---

### 2.3 Form & Input Controls

#### `TextField` & `TextArea`
- **Tokens**: `--lara-input-bg`, `--lara-input-border`, `--lara-input-focus`
- **Props**: `label`, `value`, `onChange`, `placeholder`, `hint`, `type`
- **A11y**: Explicit `<label>` wrapping with `.field-label` and `<small>` hint text.

#### `SearchField`
- **Role**: Filter bar and search input with instant clear button.
- **A11y**: `aria-label="Clear search"`.

#### `SelectField` & `Combobox`
- **Role**: Form selection with native `<select>` and accessible `<datalist>`.

#### `FilterChip`
- **Role**: Page-level query filter with active badge indicator.

#### `Tabs`
- **Role**: Tab bar navigation.
- **A11y**: `role="tablist"` with `role="tab"` and `aria-selected`.

---

### 2.4 Data Display, Tables & Containers

#### `Panel`
- **Role**: Card container with standardized header (`title`, `subtitle`, `action`) and content area.
- **Tokens**: `--lara-surface`, `--lara-border`, `--lara-radius-md`, `--lara-shadow-sm`

#### `PageHeader`
- **Role**: Top-of-page contextual title area.
- **Elements**: Uppercase category eyebrow, large page title, explanatory subtitle, right-aligned primary actions.

#### `MetricCard`
- **Role**: Concise KPI summary card inspired by Google Ads metric widgets.
- **Props**: `label`, `value`, `change`, `icon`, `tone` (`'blue' | 'green' | 'amber' | 'purple'`)

#### `DataTable`
- **Role**: Full-featured enterprise tabular view.
- **Features**: Generic typed rows `T`, column width control, custom `render` callbacks, sorting by column header with ascending/descending indicators, clickable row styling, empty state handling.
- **A11y**: Semantic `<table>`, `<thead>`, `<th>`, `<tbody>`, `<tr>`, `<td>`.

#### `Timeline`
- **Role**: Chronological runtime event stream with status badges, timestamps, and connecting lines.

#### `JsonViewer`
- **Role**: Read-only structured payload viewer with embedded copy button.

#### `ProgressBar` & `Sparkline`
- **Role**: Data density micro-visualizations for reliability metrics and trends.

---

### 2.5 Feedback & Modals

#### `InlineAlert` & `Callout`
- **Tones**: `'info' | 'warning' | 'danger' | 'success'`
- **Role**: Inline contextual alerts explaining policy constraints or approval needs.

#### `Modal` & `ConfirmDialog`
- **Role**: Center-screen dialog with backdrop click dismiss, keyboard escape, focus trap, and action footers.
- **A11y**: `role="dialog"`, `aria-modal="true"`, `aria-label`.

#### `Drawer`
- **Role**: Slide-out right panel for deep inspector contexts.

#### `EmptyState` & `ErrorState`
- **Role**: Clear zero-data and failure explanations with suggested recovery action.

---

## 3. Product Feature Pages (`src/features/Pages.tsx`)

| Page Component | Product Surface | Key Sub-Components | Backend Service Integration |
|---|---|---|---|
| `OverviewPage` | Enterprise Incident Workbench | `WelcomePanel`, `SystemHealthStrip`, `KpiSummaryRow`, `ChartPanel`, `RecentInvestigationsTable`, `AttentionQueue` | `api.getMe()`, `api.getRecentTasks()` |
| `InvestigationListPage` | Incident Directory | `SearchField`, `SelectField` filters, `DataTable` | `api.getRecentTasks()`, `api.createTask()` |
| `InvestigationWorkspace` | Operational Case Analysis | `StageBar`, `IncidentSummary`, `EvidenceLedger`, `ClaimVerificationTable`, `Timeline`, `AgentWorkSummary`, `ProposedActionPanel` | `api.getTask()`, `api.resolveRoute()` |
| `HighwaysPage` | Dynamic Task Routing | `HighwaySummary`, `RouteBanner`, SVG Graph Canvas, Node Inspector, `ExcludedCandidatesList` | `api.resolveRoute()`, `useAuth().principal` |
| `AgentFleetPage` | Specialist Agent Fleet | `MetricGrid`, `AgentRegistryTable`, `AgentDetailView`, `CapabilityMatrix` | `api.getAgents()` |
| `EvolutionLabPage` | Prompt & Skill Evolution Engine | `FailureSignalPanel`, `CandidateComparisonDiff`, `EvaluationSuiteRunner`, `PromotionGateway` | `api.getEvolutionProposals()`, `api.evaluateCandidate()`, `api.approveCandidate()` |
| `GovernancePage` | RBAC & ABAC Policy Authority | `PrincipalDirectoryTable`, `PolicySimulator` | `api.evaluatePolicy()`, `api.getCurrentPrincipal()` |
| `ApprovalQueuePage` | Human-in-the-Loop Gateway | `ApprovalQueueCards`, `RequestDetailPanel`, `EvidenceReferences`, `ApprovalDecisionBar` | `api.getApprovals()`, `api.decideApproval()` |
| `AuditTrailPage` | Cryptographic Audit & Provenance | `AuditEventTable`, `TraceExplorer`, `EventPayloadJson` | `api.getAuditEvents()` |
