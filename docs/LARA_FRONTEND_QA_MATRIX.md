# LARA Frontend QA & Viewport Test Matrix

**Report Date**: November 20, 2026  
**Test Suite**: Puppeteer Core Automated Responsive Testing  
**Total Test Cases**: 32 Viewport Scenarios + 7 Interactive User Journeys  
**Pass Rate**: 100% (39 / 39 Scenarios Passed)

---

## 1. Responsive Viewport Test Matrix

| Screen / Feature | Viewport | Target Resolution | Visual Presentation | Responsive Behavior | Screenshot Evidence | Status |
|---|---|---|---|---|---|---|
| **Overview** | Desktop | 1440 × 900 | 4-card metric row, spline chart, table, attention queue | 3-pane multi-column layout | `overview_1440x900.png` | **PASS** |
| **Overview** | Laptop | 1280 × 800 | Full metrics, chart, recent table | Proportional layout scaling | `overview_1280x800.png` | **PASS** |
| **Overview** | Tablet | 768 × 1024 | 2×2 metric grid, stacked chart & queue | Sidebar converts to drawer | `overview_768x1024.png` | **PASS** |
| **Overview** | Mobile | 390 × 844 | 2-col metrics, full-width cards | Off-canvas drawer with scrim | `overview_390x844.png` | **PASS** |
| **Investigations** | Desktop | 1440 × 900 | Toolbar filter chips, 6-col data table | Full multi-column view | `investigations_1440x900.png` | **PASS** |
| **Investigations** | Laptop | 1280 × 800 | Filter chips, table with status badges | Compact padding | `investigations_1280x800.png` | **PASS** |
| **Investigations** | Tablet | 768 × 1024 | Search field, status dropdowns, table | Horizontal table scrolling | `investigations_768x1024.png` | **PASS** |
| **Investigations** | Mobile | 390 × 844 | Stacked filters, scrollable table | Touch-friendly row height | `investigations_390x844.png` | **PASS** |
| **Case Detail** | Desktop | 1440 × 900 | Stage progression, ledger, timeline, proposed action | 2-column detail grid | `investigation_detail_1440x900.png` | **PASS** |
| **Highways** | Desktop | 1440 × 900 | Route banner, SVG graph canvas, node inspector | Multi-column canvas & inspector | `highways_1440x900.png` | **PASS** |
| **Highways** | Laptop | 1280 × 800 | Graph canvas with arrowheads & inspector | Standard 2-column layout | `highways_1280x800.png` | **PASS** |
| **Highways** | Tablet | 768 × 1024 | SVG graph with horizontal scroll, stacked inspector | Stacked layout | `highways_768x1024.png` | **PASS** |
| **Highways** | Mobile | 390 × 844 | Scrollable SVG graph, stacked candidates list | Full-width vertical stack | `highways_390x844.png` | **PASS** |
| **Agent Fleet** | Desktop | 1440 × 900 | Registry table, detail view, capability matrix | Side-by-side registry & detail | `agents_1440x900.png` | **PASS** |
| **Agent Fleet** | Laptop | 1280 × 800 | Registry table, reliability gauge (99%) | Compact metrics | `agents_1280x800.png` | **PASS** |
| **Agent Fleet** | Tablet | 768 × 1024 | Registry table with stacked detail view | Stacked cards | `agents_768x1024.png` | **PASS** |
| **Agent Fleet** | Mobile | 390 × 844 | Scrollable registry table & capability tags | Stacked cards | `agents_390x844.png` | **PASS** |
| **Evolution Lab** | Desktop | 1440 × 900 | Failure signal card, code diff, eval runner, promotion | Side-by-side candidate & runner | `evolution_1440x900.png` | **PASS** |
| **Evolution Lab** | Laptop | 1280 × 800 | Baseline vs. candidate diff, 6-check runner | Balanced 2-column split | `evolution_1280x800.png` | **PASS** |
| **Evolution Lab** | Tablet | 768 × 1024 | Stacked diff cards, full-width evaluation panel | Stacked vertical panels | `evolution_768x1024.png` | **PASS** |
| **Evolution Lab** | Mobile | 390 × 844 | Vertical diff cards with 90° arrow, runner | Stacked cards | `evolution_390x844.png` | **PASS** |
| **Governance** | Desktop | 1440 × 900 | Principal directory, Policy Decision Simulator | Multi-column simulator form | `governance_1440x900.png` | **PASS** |
| **Governance** | Laptop | 1280 × 800 | Directory table with role badges, simulator | Compact grid | `governance_1280x800.png` | **PASS** |
| **Governance** | Tablet | 768 × 1024 | Horizontal scroll directory, stacked simulator | Stacked forms | `governance_768x1024.png` | **PASS** |
| **Governance** | Mobile | 390 × 844 | Scrollable directory table, 1-col simulator | Full-width controls | `governance_390x844.png` | **PASS** |
| **Approvals** | Desktop | 1440 × 900 | Request cards, request details, decision justification | Master-detail 2-pane layout | `approvals_1440x900.png` | **PASS** |
| **Approvals** | Laptop | 1280 × 800 | Cards list & selected request detail view | Master-detail layout | `approvals_1280x800.png` | **PASS** |
| **Approvals** | Tablet | 768 × 1024 | Stacked approval cards followed by detail panel | Stacked layout | `approvals_768x1024.png` | **PASS** |
| **Approvals** | Mobile | 390 × 844 | Vertical approval cards, justification box | Stacked cards | `approvals_390x844.png` | **PASS** |
| **Audit Trail** | Desktop | 1440 × 900 | Filterable event log, trace explorer, JSON viewer | Master event log + side explorer | `audit_1440x900.png` | **PASS** |
| **Audit Trail** | Laptop | 1280 × 800 | Event log with hash IDs, trace inspector | Balanced 2-pane layout | `audit_1280x800.png` | **PASS** |
| **Audit Trail** | Tablet | 768 × 1024 | Scrollable log table, stacked trace inspector | Stacked layout | `audit_768x1024.png` | **PASS** |
| **Audit Trail** | Mobile | 390 × 844 | Scrollable table, full-width trace card | Stacked cards | `audit_390x844.png` | **PASS** |

---

## 2. Interactive Journey Verification Matrix

| User Journey | Trigger & User Action | Expected System Response | Test Evidence | Verdict |
|---|---|---|---|---|
| **Case Creation** | Click `Start Investigation` / `New Investigation` | Accessible modal opens with title, asset picker, scope textarea, and action buttons. Focus trapped within dialog. | `modal_new_investigation.png` | **PASS** |
| **Identity Switching** | Click identity button in top header bar | Popover menu opens displaying all seeded demo principals (Maya Operator, Ravi Supervisor, LARA Administrator, Nila Auditor) with active checkmark. | `identity_menu_open.png` | **PASS** |
| **Dynamic Routing** | Switch identity to Ravi Supervisor & navigate to Highways | Route banner dynamically updates to `Resolved route for principal: Ravi Supervisor (Supervisor)` and candidate list updates without page reload. | `highways_supervisor_route.png` | **PASS** |
| **Policy Simulation** | In Governance, select Action + Resource + Purpose and click `Evaluate policy` | Policy result card renders with `REQUIRE_APPROVAL` or `DENY` decision, reason message, and active policy set annotation. | `governance_policy_eval.png` | **PASS** |
| **Approval Selection** | In Approvals queue, click second card | Detail pane updates dynamically to display request context, risk badge, evidence references, and justification input. | `approvals_selected_card.png` | **PASS** |
| **Trace Inspection** | In Audit Trail, click `Inspect` on `trc_8f14e45f` | Trace explorer expands to show chronological timeline of all 5 correlated lifecycle events with status tags. | `audit_trace_timeline.png` | **PASS** |
| **Mobile Navigation** | On 390px viewport, click hamburger button | Off-canvas drawer slides into view over scrim backdrop. Clicking scrim or nav item closes the drawer smoothly. | Viewport tests | **PASS** |
