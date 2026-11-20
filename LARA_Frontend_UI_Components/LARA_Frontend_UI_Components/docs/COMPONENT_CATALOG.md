# LARA UI Component Catalog

This catalog maps the original requested architecture to source files in this package.

| Component family | Included source / export |
|---|---|
| App shell and responsive frame | `src/components/layout/AppShell.tsx` — `AppShell`, icon rail, contextual sidebar, workspace header, navigation, identity menu and environment indicator |
| Page header and toolbar | `PageHeader`, `FilterChip`, `SearchField`, `SelectField`, `Tabs` in `src/components/ui/index.tsx` |
| Inputs and controls | `TextField`, `TextArea`, `SelectField`, `Combobox`, `Checkbox`, `RadioGroup`, `Switch`, `SegmentedControl`, `DateRangePicker` |
| Buttons and menus | `Button`, `IconButton`, `DropdownMenu`, `Tooltip`, `Modal`, `ConfirmDialog`, `Drawer` |
| Status and people | `Badge`, `StatusBadge`, `RoleBadge`, `CountBadge`, `EnvironmentBadge`, `Avatar`, `AvatarGroup` |
| Feedback states | `InlineAlert`, `Callout`, `Toast`, `EmptyState`, `Skeleton`, `LoadingState`, `ErrorState`, `ProgressBar` |
| Data presentation | `DataTable` with column sorting and empty state, `Pagination`, `MetricCard`, `Sparkline`, `TrendIndicator`, `Timeline`, `Stepper`, `JsonViewer`, `CodeBlock`, `CopyButton` |
| Overview | `OverviewPage`, `OverviewWelcomePanel`, `SystemHealthStrip`, `KpiSummaryRow`, `RecentInvestigationsTable`, `AttentionQueue`, `NewInvestigationDialog` |
| Investigation workbench | `InvestigationListPage`, `InvestigationWorkspace`, `InvestigationStageBar`, `IncidentSummaryPanel`, `EvidenceLedger`, `EvidenceGapPanel`, `ClaimVerificationTable`, `ProposedActionPanel` |
| Information Highways | `HighwaysPage` with selectable source/workflow/agent/tool graph, graph/table toggle, route inspector, access state and excluded route list |
| Specialist agents | `AgentFleetPage` with registry, detail, grants, run reliability and capability matrix |
| Controlled evolution | `EvolutionLabPage`, `CandidateComparison`, `EvaluationSuiteRunner`, version lineage and promotion gateway |
| Governance and principals | `GovernancePage`, `PrincipalDirectory`, `PolicySimulator` |
| Approval queue | `ApprovalQueuePage`, `ApprovalQueueTable`, `ApprovalDecisionBar` with mandatory justification and disabled short input |
| Audit trail | `AuditTrailPage`, `AuditEventTable`, trace explorer, timeline and JSON payload viewer |

## Logo and illustration assets

- `src/assets/logos/lara-mark.svg`
- `src/assets/logos/lara-wordmark.svg`
- `src/assets/logos/lara-wordmark-mono.svg`
- `src/assets/logos/lara-app-icon.svg`
- `public/favicon.svg`
- `src/assets/illustrations/route-flow.svg`
- `src/assets/illustrations/evidence-file.svg`
- `src/assets/illustrations/approval-path.svg`

All artwork is original SVG source. The supplied product screenshots were used only for general layout hierarchy and interaction inspiration.
