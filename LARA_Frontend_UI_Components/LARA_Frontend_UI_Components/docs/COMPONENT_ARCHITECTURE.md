# LARA Frontend — Component Architecture & Visual Specification

**Purpose:** Replace the current LARA frontend component presentation with a cohesive, enterprise-grade application UI inspired by the supplied Google Ads console and Google Workspace security-page references. The references are layout and interaction inspiration only. Do not copy Google's logo, brand identity, wording, illustrations, or proprietary assets.

## 1. Design direction

### Product character
- Calm, precise, trustworthy enterprise software.
- A practical operations console, not a marketing landing page and not a futuristic AI concept page.
- White/light surfaces, restrained blue actions, neutral typography, clean navigation, dense-but-readable data presentation.
- Use generous whitespace in overview and detail headers; use efficient density in evidence tables, audit logs, policy lists, and graph inspectors.

### Reference translation

**Google Ads console reference:**
- Slim primary icon rail on the far left.
- Expandable contextual navigation beside the rail.
- Global search and utility actions in a fixed top app bar.
- Page-level filters, selection controls, date range and primary action above the data area.
- A clear hierarchy from page title to KPI strip, chart/visualization, then detailed tables.

**Google Workspace security page reference:**
- Strong, legible product typography.
- A spacious split layout for the overview/empty states: product visual on one side, plain-language explanation and actions on the other.
- Restrained illustration, clear hierarchy, short supporting points, and generous whitespace.
- Use this pattern selectively; do not turn every product screen into a marketing hero.

### Visual system proposal

Use the existing design direction only as functional/product context. Do not carry forward the previous neon-lime canvas, oversized rounded cards, rainbow semantic palette, or decorative lattice background if those are present in the current UI.

| Token | Proposed value | Use |
|---|---|---|
| `--lara-bg` | `#F7F9FC` | App workspace background |
| `--lara-surface` | `#FFFFFF` | Cards, menus, drawers, tables |
| `--lara-surface-muted` | `#F1F4F8` | Hover, selected, and recessed surfaces |
| `--lara-text` | `#202124` | Primary text |
| `--lara-text-secondary` | `#5F6368` | Secondary text |
| `--lara-border` | `#DADFE7` | Dividers, outlines, table borders |
| `--lara-primary` | `#1A73E8` | Primary action, active navigation, links |
| `--lara-primary-hover` | `#1765CC` | Primary hover |
| `--lara-info` | `#0B7FAB` | Information / routing state |
| `--lara-success` | `#188038` | Passed / healthy / approved |
| `--lara-warning` | `#B06000` | Pending / attention |
| `--lara-danger` | `#D93025` | Blocked / failed / critical |
| `--lara-evolution` | `#6B4EFF` | Candidate / evolution-only accent |

Use these as a starting proposal, not a demand to blindly overwrite every existing token. Inspect the current theme and consolidate into one canonical token source. Validate all foreground/background pairs to WCAG AA. Use semantic tokens rather than hard-coded colors in feature components.

### Typography and density
- Prefer the project's existing font if it is legible and consistent. Otherwise use a neutral UI sans such as Inter or Geist with system fallbacks; use a monospace family only for IDs, trace IDs, hashes, code and raw payloads.
- Body text: 14–16px; dense table text: 13–14px; page title: 24–28px; section title: 16–20px.
- Avoid giant landing-page display typography inside the operational console.
- Use a consistent spacing scale (4/8/12/16/20/24/32px), 8–12px control radius, and 10–14px panel radius. Avoid 24–30px rounding on every control.
- Borders and subtle elevation should define surfaces. Avoid heavy shadows, glassmorphism, gradient fills and glowing borders.

## 2. Brand assets to generate as editable source

Create original, simple SVG assets. Do not use Google's G, shield, multicolor mark, or copy any logo from the references.

Required assets:
- `lara-mark.svg`: standalone app symbol, usable at 20/24/32/48px.
- `lara-wordmark.svg`: mark plus LARA wordmark, horizontal.
- `lara-wordmark-mono.svg`: single-color variant for dark or light surfaces.
- `favicon.svg`: simplified 32x32 symbol.
- Optional `lara-app-icon.svg`: square app tile for demos/installable shell.

**Concept direction:** a distinctive geometric route/lattice mark built from three or four connected points and a path that subtly suggests an L/A or a routed signal. It must stay recognizable at 16px. Use one main blue with dark neutral; no rainbow dots. Provide SVG source with clean `viewBox`, explicit fills/strokes and accessible title where appropriate. If the current repository already contains a locked/approved LARA logo, inspect it first and do not replace it without strong reason; create the new assets as a visual refinement or ask for approval if identity conflict is material.

## 3. App shell and navigation

### Shell components

| Component | Responsibility |
|---|---|
| `AppShell` | Overall responsive frame; owns rail, sidebar, top bar and route outlet. |
| `PrimaryRail` | Narrow icon-only primary navigation with active indicator and tooltips. |
| `ContextSidebar` | Expandable section navigation with grouped labels and optional count badges. |
| `WorkspaceHeader` | Global search, breadcrumbs/context, environment status, help, notifications and user menu. |
| `GlobalSearch` | Search investigations, assets, agents and audit events; keyboard accessible. |
| `CommandPalette` | Optional keyboard command surface if route/action model supports it. |
| `Breadcrumbs` | Hierarchical location and back-navigation context. |
| `IdentityMenu` | Current signed-in principal and permitted demo persona switcher. |
| `EnvironmentIndicator` | Quiet `DEMO / SYNTHETIC DATA` notice, not a neon banner. |
| `PageHeader` | Title, subtitle, breadcrumbs and page-level actions. |
| `PageToolbar` | Date range, search, filters, sort, view controls and primary action. |

### Navigation model

Use the current route map as source of truth. Target grouping, subject to existing routes:

- **Overview**
- **Workbench**
  - Investigations
  - New investigation
- **Intelligence**
  - Information Highways
  - Agent Fleet
- **Governance**
  - Approvals
  - Policies & Principals
  - Evolution Lab
- **Observability**
  - Audit Trail

Do not add navigation entries for features that do not exist. Keep current route paths and access rules unless the repo/API contract explicitly requires a change.

## 4. Shared UI component library

### Foundations
- `Button` (primary, secondary, subtle, danger, icon-only; loading/disabled/focus states)
- `IconButton`
- `TextField`, `SearchField`, `TextArea`, `Select`, `Combobox`
- `Checkbox`, `RadioGroup`, `Switch`
- `Tabs`, `SegmentedControl`
- `FilterChip`, `FilterPopover`, `DateRangePicker`
- `StatusBadge`, `RoleBadge`, `CountBadge`, `EnvironmentBadge`
- `Tooltip`, `Popover`, `DropdownMenu`
- `Modal`, `Drawer`, `ConfirmDialog`
- `Toast`, `InlineAlert`, `Callout`
- `Avatar`, `AvatarGroup`
- `Skeleton`, `LoadingState`, `EmptyState`, `ErrorState`
- `DataTable` with sorting, row selection, pagination, sticky header and responsive overflow
- `MetricCard`, `Sparkline`, `TrendIndicator`
- `Timeline`, `Stepper`, `ProgressIndicator`
- `CodeBlock`, `JsonViewer`, `CopyButton`

### Layout rules
- Use one icon family across the application; inspect dependencies first. Do not mix icon libraries or draw ad hoc icons by hand.
- Shared components own their interaction and accessibility behavior. Avoid duplicated one-off CSS in feature pages.
- All buttons, links, filters, menus and table actions must work. No decorative controls that imply functionality but do nothing.

## 5. Feature page component map

### A. Overview / Workbench home

| Component | Purpose |
|---|---|
| `OverviewPage` | First screen after sign-in. |
| `OverviewWelcomePanel` | Compact split layout: clear welcome/context on one side and a custom LARA route/evidence illustration on the other. |
| `SystemHealthStrip` | Runtime, data connector, model provider and policy-engine status; clearly label simulated values. |
| `KpiSummaryRow` | Open investigations, pending approvals, active agents, unresolved evidence gaps. |
| `InvestigationTrendChart` | Real or fixture-backed activity trend with clear axes and accessible data fallback. |
| `RecentInvestigationsTable` | Investigation ID, asset, severity, owner, status, updated time. |
| `AttentionQueue` | Next actions requiring the active user's attention. |
| `RecentActivityFeed` | Meaningful recent events, not decorative activity. |
| `NewInvestigationDialog` | Validated intake flow using the existing API contract and incident fixtures. |

### B. Investigation workbench

| Component | Purpose |
|---|---|
| `InvestigationListPage` | Searchable/filterable investigation table. |
| `InvestigationWorkspace` | Responsive multi-panel workspace for one incident. |
| `InvestigationStageBar` | Intake → route resolution → evidence collection → analysis → verification → policy review → proposed action. Use actual backend states if they differ. |
| `IncidentSummaryPanel` | Asset, location, time window, severity, owner and current state. |
| `EvidenceLedger` | Source, record ID, timestamp, revision, freshness, access classification and verification state. |
| `EvidenceGapPanel` | Missing, stale, conflicting or inaccessible records with reason and requested follow-up. |
| `EventTimeline` | Correlated events on a single time axis, with filtering and source references. |
| `AgentWorkPanel` | Agent activity, task state, output summary, duration and errors. |
| `FindingCard` | Finding, confidence/uncertainty, evidence citations and counter-evidence. |
| `ClaimVerificationTable` | Claim-by-claim verification, supporting sources and discrepancy state. |
| `ProposedActionPanel` | Proposed operation, policy decision, required approval and execution status. |

### C. Dynamic Information Highways

| Component | Purpose |
|---|---|
| `HighwaysPage` | Route overview, filters and graph/table mode switch. |
| `HighwayGraphCanvas` | Existing React Flow graph or current graph implementation; source → workflow → agent → tool, as supported by actual model. |
| `HighwayNode` | Typed nodes for source, workflow, agent and tool. |
| `HighwayEdge` | Active, candidate, denied and unavailable route states. |
| `RouteInspector` | Selected route, permissions, freshness, relevance, source lineage and outcome. |
| `ExcludedRouteList` | Blocked candidate and deterministic reason code. |
| `RouteTableFallback` | Accessible non-canvas representation of graph nodes and links. |

### D. Specialist Agent Fleet

| Component | Purpose |
|---|---|
| `AgentFleetPage` | Agent registry and health. |
| `AgentRegistryTable` | Agent name, capability, status, version, last run and grants. |
| `AgentDetailDrawer` | Purpose, inputs, outputs, prompt/config version and capability scope. |
| `CapabilityMatrix` | Capability versus resource/action grants. |
| `AgentVersionHistory` | Immutable version lineage and deployment state. |
| `AgentRunHistory` | Recent runs, latency, result, failure and trace link. |

### E. Controlled Evolution Lab

| Component | Purpose |
|---|---|
| `EvolutionLabPage` | Candidate improvements and release state. |
| `FailureSignalPanel` | Source trace, observed failure and evidence. |
| `CandidateComparison` | Baseline-versus-candidate configuration diff. |
| `EvaluationSuiteRunner` | Functional tests and protected invariants, with progress and result details. |
| `EvaluationResultsTable` | Test case, expected, actual, outcome and trace. |
| `PromotionApprovalPanel` | Required approver, justification, policy result and promote/reject state. |
| `VersionLineage` | Parent/candidate/promoted version chain and rollback context. |

### F. Governance and approvals

| Component | Purpose |
|---|---|
| `GovernancePage` | Principals, policy rules and governance overview. |
| `PrincipalDirectory` | Users, roles, departments, clearance and active session. |
| `PolicySimulator` | Action/resource/purpose evaluation using the backend policy engine. |
| `PolicyDecisionPanel` | Allow/deny/require-approval, reason codes and matched policy. |
| `ApprovalQueuePage` | Master-detail approval workflow. |
| `ApprovalQueueTable` | Pending action, requester, risk, age and state. |
| `ApprovalDetailPanel` | Evidence, proposed action, policy explanation and context. |
| `ApprovalDecisionBar` | Approve/reject with mandatory justification and SoD safeguards. |

### G. Audit Trail

| Component | Purpose |
|---|---|
| `AuditTrailPage` | Filterable, searchable event timeline/table. |
| `AuditEventTable` | Event type, actor, target, timestamp, outcome and trace ID. |
| `AuditEventDrawer` | Structured metadata, related records and request/response payload. |
| `TraceExplorer` | Navigate linked events for a single trace/request. |
| `JsonPayloadViewer` | Safe, collapsible and copyable JSON display. |
| `AuditExportAction` | Export only if supported by current product/API. |

## 6. Interaction and state requirements

- Navigation supports active, hover, focus, collapsed and mobile-drawer states.
- Global search supports keyboard focus, clear, empty, loading and result states.
- Filters visibly show applied state and provide clear-all/reset.
- Tables support sorting, loading, empty, error, selected-row and pagination states.
- Details open in drawers where the user should preserve list context; route to full detail for complex investigations.
- Graph nodes and routes expose keyboard/table alternatives.
- Destructive or high-impact actions require confirmation and clear consequence text.
- Approval requires justification and must preserve separation-of-duties behavior.
- Demo/synthetic values are labeled; never display fixture metrics as live system telemetry.
- Support light mode first; add dark mode only if existing product requirements and scope support it.

## 7. Responsive behavior

- Desktop (1440+): 64–72px icon rail, 220–248px contextual sidebar, 64px top bar, fluid content region.
- Laptop (1024–1439): allow contextual sidebar collapse; maintain clear content gutters.
- Tablet (768–1023): convert left navigation into a drawer; detail inspectors become drawers or stacked panels.
- Mobile (390px baseline): single-column content, compact header, table-to-card or horizontal-scroll behavior, full-width forms, touch targets at least 44px.
- Never let the graph canvas, table, modal or drawer overflow the viewport horizontally.

## 8. Quality gate

- Run existing lint, typecheck, build and test scripts. Do not invent package scripts; inspect `package.json` first.
- Run visual review at 1440×900, 1280×800, 768×1024 and 390×844.
- Test navigation, filters, search, modals, drawers, graph/table fallback, role switch, approval actions, keyboard focus and error/empty/loading states.
- Validate accessible names, keyboard operation, focus visibility, reduced motion and WCAG AA contrast.
- Use real browser screenshots and fix the visual issues found. Do not claim QA passed without test output.

## 9. Design references

- [Figma Design Basics](https://www.figma.com/resource-library/design-basics/) — use for user-centred design, typography, color, design-token consistency, component states and UX validation.
- [Figma Top Web Design Trends for 2026](https://www.figma.com/resource-library/web-design-trends/) — review trends selectively; subtle motion and accessibility are relevant, while maximalist and immersive effects should not dictate a data-heavy operations console.
- [Optional Pinterest search: enterprise SaaS dashboard UI](https://www.pinterest.com/search/pins/?q=enterprise%20saas%20dashboard%20ui%20design) — optional visual research only, not a source to copy.

The final design should be judged against LARA's users and workflows, not by trend compliance.
