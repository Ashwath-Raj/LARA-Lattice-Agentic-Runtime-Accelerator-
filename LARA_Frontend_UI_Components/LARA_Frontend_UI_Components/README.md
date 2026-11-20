# LARA Frontend UI Components

A runnable React + TypeScript + Vite frontend component package for the LARA operations console. The visual direction translates the supplied Google Ads console and Google Workspace security-page references into an original LARA interface. It does **not** copy Google's logos, wording, icons or illustrations.

## Run locally

Requires Node.js 18+ and npm (Node.js 20+ recommended).

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run typecheck
npm run build
npm run preview
```

## Design direction

- Light enterprise operations console with a narrow icon rail, contextual sidebar and global top bar.
- Search, utility actions, identity switcher and a quiet synthetic-demo indicator.
- Page headers, filters, KPI summaries, charts and dense operational tables.
- Clean white surfaces, subtle borders, restrained blue actions and semantic success/warning/error states.
- Responsive layouts for desktop, laptop, tablet and mobile.
- Original editable SVG LARA logo family and workflow illustrations.

## Included screen modules

| Screen | Included components |
|---|---|
| Overview | Welcome split panel, route-flow illustration, system-health strip, KPI summary, activity chart, recent investigations, attention queue and activity timeline |
| Investigations | Search/filterable list, case workspace, stage bar, incident summary, evidence ledger, evidence gaps, correlated timeline, agent work, claim verification and proposed action |
| Information Highways | Graph/table toggle, selectable graph nodes, route inspector, policy outcome, excluded candidates and route summary |
| Agent Fleet | Registry, agent detail panel, capability grants, reliability progress, activity history and capability matrix |
| Evolution Lab | Failure signal, baseline/candidate comparison, evaluation runner, version lineage and approval gateway |
| Policies & Principals | Principal directory and interactive policy decision simulator |
| Approvals | Master-detail request queue, policy context, evidence references, justification and approve/reject controls with minimum-length guard |
| Audit Trail | Searchable event log, trace explorer, timeline and JSON payload inspector |

All records are clearly **synthetic demo fixtures**. Actions in the prototype update local UI state only; they do not call production APIs or execute operational actions.

## Component inventory

### App shell (`src/components/layout/AppShell.tsx`)
- `AppShell`
- `PrimaryRail` and contextual navigation (composed in AppShell)
- workspace header, global search affordance, notification popover, help popover
- identity menu and `EnvironmentBadge`

### Shared UI (`src/components/ui/index.tsx`)
- `Button`, `IconButton`, `Badge`, `StatusBadge`, `EnvironmentBadge`
- `TextField`, `SearchField`, `SelectField`, `FilterChip`
- `Tabs`, `SegmentedControl`, `Checkbox`, `RadioGroup`, `Switch`
- `Tooltip`, `DropdownMenu`, `Modal`, `Drawer`
- `Panel`, `PageHeader`, `SectionTitle`, `MetricCard`, `TrendIndicator`, `Sparkline`
- `Avatar`, `ProgressBar`, `Stepper`, `Timeline`
- `DataTable` with column sorting, `Pagination`
- `InlineAlert`, `EmptyState`, `Skeleton`, `LoadingState`, `ErrorState`
- `JsonViewer`, `CodeBlock`, `CopyButton`

### Feature exports (`src/features/Pages.tsx`)
- Overview: `OverviewPage`, `OverviewWelcomePanel`, `SystemHealthStrip`, `KpiSummaryRow`, `RecentInvestigationsTable`, `AttentionQueue`, `NewInvestigationDialog`
- Investigation: `InvestigationListPage`, `InvestigationWorkspace`, `InvestigationStageBar`, `IncidentSummaryPanel`, `EvidenceLedger`, `EvidenceGapPanel`, `ClaimVerificationTable`, `ProposedActionPanel`
- Highways: `HighwaysPage`
- Agents: `AgentFleetPage`
- Evolution: `EvolutionLabPage`, `CandidateComparison`, `EvaluationSuiteRunner`
- Governance: `GovernancePage`, `PrincipalDirectory`, `PolicySimulator`
- Approvals: `ApprovalQueuePage`, `ApprovalQueueTable`, `ApprovalDecisionBar`
- Audit: `AuditTrailPage`, `AuditEventTable`

## Brand and visual assets

- `src/assets/logos/lara-mark.svg`
- `src/assets/logos/lara-wordmark.svg`
- `src/assets/logos/lara-wordmark-mono.svg`
- `src/assets/logos/lara-app-icon.svg`
- `public/favicon.svg`
- `src/assets/illustrations/route-flow.svg`
- `src/assets/illustrations/evidence-file.svg`
- `src/assets/illustrations/approval-path.svg`

## Integrating into the existing LARA repository

This ZIP is a standalone UI source package, not a patch against your current checkout. Before copying files into the LARA repo:

1. Create/confirm a clean backup branch or commit.
2. Compare your existing package versions, routes, auth provider, API client, and current component structure.
3. Copy the relevant `src/components`, `src/features`, `src/assets`, and `src/styles` pieces into the actual frontend workspace; merge rather than blindly overwrite existing API/auth modules.
4. Replace synthetic fixtures in `src/data/demo.ts` with typed adapters to the actual backend contracts. Keep the API contract unchanged unless the team jointly approves a change.
5. Keep side-effecting actions disabled until connected to authorized backend endpoints and policy checks.

No backend code, environment secrets, API keys or production credentials are included.

## Current prototype limitations

- Navigation, menus, local search, filters, persona switcher, dialog, table sorting, graph selection, policy simulation, approval validation and demo toast interactions are implemented locally.
- The global top-bar search, some secondary buttons, and table pagination are visual affordances and need wiring to production search/data endpoints when integrated.
- Graph data and trend series are illustrative fixtures, not live telemetry.
- Chart is lightweight SVG; it intentionally avoids adding a heavy chart dependency to the starter.
- External Google Fonts import is optional; system fallbacks are defined if the font endpoint is unavailable.
