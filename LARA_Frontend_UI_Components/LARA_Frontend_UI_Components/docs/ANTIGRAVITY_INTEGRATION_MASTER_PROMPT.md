# LARA — Antigravity Frontend Redesign & Implementation Master Prompt

> Paste this entire prompt into Google Antigravity with the LARA repository open. Execute in phases, but do not stop after planning: install/verify the skills, inspect the repo, design the system, implement the frontend, run the app, and perform browser QA. Report blockers honestly. Do not modify backend behavior or make Git commits/pushes.

---

## ROLE

Act as LARA's principal product designer, frontend architect and senior React engineer. Your job is to replace the existing frontend's visual system and UI components with a coherent, high-quality enterprise console based on the two supplied references:

1. **Google Ads console screenshot** — primary reference for the application shell: narrow left icon rail, expandable secondary sidebar, global top search/utility bar, page toolbar and filters, structured metric summaries, analytics and data tables.
2. **Google Workspace security-page screenshot** — reference for visual clarity: strong product typography, spacious split compositions, restrained explanatory copy, simple product illustration, clean navigation and generous whitespace.

Use these as interaction/layout inspiration only. Do not reproduce Google's logo, brand assets, exact colors, copy, icons, product names or proprietary visual compositions. LARA must have its own identity.

## NON-NEGOTIABLE PRODUCT CONTEXT

LARA is an enterprise agentic runtime prototype. Existing product surfaces include:
- Enterprise Workbench / investigations
- Dynamic Information Highways
- Specialist Agent Fleet
- Controlled Evolution Lab
- Governance and Human-in-the-Loop Approvals
- Cryptographic Audit Trail

Keep the existing product semantics and backend/API contract. The task is a frontend redesign and implementation, not a product re-architecture. Treat the current repository docs, route definitions, API types and implementation as the source of truth. The earlier component inventory is a target capability checklist, not proof every listed interaction or endpoint already exists.

Current known stack from project context: React 19, TypeScript, Vite, Tailwind CSS, React Flow. Verify this in the current repo before using it. Backend is owned separately by the backend teammate. Do not edit backend source, schemas, migrations, endpoint contracts, environment files or server configuration.

## PHASE 0 — SAFETY, REPO AND BRANCH CHECK

1. Confirm the actual workspace root from the open project. Do not assume old absolute paths from documents.
2. Run and report:
   - `git rev-parse --show-toplevel`
   - `git branch --show-current`
   - `git status --short`
   - `git remote -v`
   - `git fetch origin`
3. Expected frontend branch is `feature/praneeth-frontend`. If not on it, stop before editing and explain. Do not switch branches, reset, rebase, merge, stash, commit or push without explicit authorization.
4. Preserve every pre-existing user change. If the working tree is not clean, inspect and report the changed files before touching them. Never discard or overwrite those changes.
5. Keep all implementation changes inside the existing frontend and frontend-specific docs/assets. Do not cross into backend-owned folders. If ownership is unclear, inspect `AGENTS.md` and the pinned GitHub message board before touching another person's area.
6. Preserve the existing API contract and mock/fixture boundaries. Do not rename endpoints, alter request/response shapes, create new backend routes or change shared schemas.

## PHASE 1 — REINSTALL AND VERIFY UI SKILLS FIRST

**Important:** Agent skills do not belong inside `src/`. They belong in the Antigravity workspace skill directory (normally `<workspace-root>/.agents/skills/<skill-name>/`) or the configured Antigravity global skill directory. Antigravity also supports a legacy `.agent/skills/` location. Do not place skills under `frontend/src`, `src/components` or another compiled application directory.

### 1A. Inspect the current environment

- Check `node --version`, `npm --version`, and the browser available for UI inspection (Chrome, Edge or Chromium).
- Inspect existing `.agents/`, `.agent/`, `.agents/skills/`, `.agent/skills/` and any installed ECC directory before creating or replacing anything.
- Inspect `.gitignore`. Keep local agent tooling and downloaded skill repositories out of application bundles. Do not rewrite unrelated ignore rules.
- Check whether ECC 2.2.3 and its existing frontend-related skills survived. The previously installed tools included `ui-canvas`, `browser-qa`, `click-path-audit`, `e2e-testing` and `a11y-architect`; verify the actual names and contents rather than assuming they are present. Do not reinstall or overwrite ECC if it is intact.

### 1B. Install Impeccable

Run the official installer from the repository root:

```bash
npx impeccable install
```

Choose **project/workspace scope** and Google Antigravity when prompted. Accept the design hook/subagent integration if the installer offers it and it is supported in this environment. Do not install globally unless project installation is impossible and you explain why.

After installation:
- Inspect the install output and the generated folder paths.
- Verify the complete `impeccable` skill folder exists, including its `SKILL.md`, references, scripts and any required assets/engine launcher.
- Ensure Antigravity can discover it. Prefer the current supported workspace skill directory; if the installer targets the supported legacy `.agent/skills/` path, verify Antigravity recognizes it rather than creating duplicate copies.
- Reload/restart Antigravity's skill index as required.
- Invoke `/impeccable init` once (or the exact current init command documented by the installed skill) to initialize project design context. Read `PRODUCT.md`, `DESIGN.md` and existing product context before generating anything. Do not blindly replace existing product/design documents.

### 1C. Install Taste Skill (complementary, not the dashboard design authority)

Install the currently maintained `design-taste-frontend` skill from its public source:

```bash
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend" --agent antigravity --copy --yes
```

Use project scope. Verify that its complete skill directory and `SKILL.md` are available to Antigravity. Its current main skill is aimed primarily at public-facing/landing-page art direction and explicitly says not to apply its landing-page rules indiscriminately to dashboards, data tables or multi-step product UI. Use it only where applicable (brand/visual originality and any public-facing product surface); do not force hero-first layouts, GSAP spectacle, one-section-per-screen rules or marketing-site constraints onto LARA's operational console.

If the environment's Node version, CLI flags or Antigravity target support differs, inspect the current `--help` output and official repository instructions, then use the correct supported command. Do not guess a CLI option. If a skill cannot be installed, report the exact error and continue with the verified skills; do not fabricate a successful install.

### 1D. Validate the installed toolset

- Enumerate installed skills and confirm Antigravity can discover each one.
- Read the full `SKILL.md` for Impeccable and Taste before design work.
- Read the relevant ECC frontend/browser/accessibility skills that actually exist.
- For the main UI redesign, prioritize Impeccable plus the relevant ECC UX/browser/a11y skills. Use Taste selectively as described above.
- Record the installed skill names, versions, exact paths and any manual reload step in the final report.

## PHASE 2 — AUDIT THE CURRENT FRONTEND BEFORE CHANGING IT

Inspect, do not guess:

- `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, `README.md`
- `docs/` including the existing UX flow/screen specification, workflow documentation, design-language documentation and prototype scope
- design tokens and theme CSS
- every current frontend route and its owning page/component
- `frontend/package.json` (or actual frontend package location)
- frontend source tree, state management, auth/identity context, API client, mock fixtures and tests
- current logo/brand assets and any locked identity decisions
- current frontend screenshots, if present

Produce a short audit before changing code:
1. Current framework/dependency versions.
2. Existing routes and page ownership.
3. Components that can be reused versus redesigned/replaced.
4. Existing API types and mock fixture locations.
5. Existing UI problems and broken interactions.
6. Relevant existing design constraints.

Do not delete whole component folders simply because they look old. Map each existing route/feature to the new component architecture and preserve necessary behavior.

## DESIGN REFERENCE LIBRARY (READ BEFORE VISUAL DESIGN)

Study these references before choosing final patterns:

- Figma Design Basics: https://www.figma.com/resource-library/design-basics/
- Figma Top Web Design Trends for 2026: https://www.figma.com/resource-library/web-design-trends/
- Optional Pinterest discovery search (inspiration only): https://www.pinterest.com/search/pins/?q=enterprise%20saas%20dashboard%20ui%20design

Use Figma's fundamentals for user-centred hierarchy, typography, color, design-token consistency, button states and early UX validation. Review current trends selectively: subtle motion, accessible/responsive design and thoughtful personalization may help; bold typography and maximalist/immersive effects are primarily marketing-site patterns and should not be forced into LARA's operations console. Pinterest is optional. Extract useful interaction/layout patterns, never copy a pin or reproduce another product's brand. Treat screenshots and inspiration as hypotheses to test against actual LARA workflows.

## PHASE 3 — DESIGN READ AND VISUAL SYSTEM

Start by stating one design read in the implementation notes:

> Reading this as: a serious enterprise operations console for supervisors, operators, administrators and auditors, with a clean Google Workspace / Google Ads-inspired information architecture, restrained Material-like clarity, and high information legibility.

Use the supplied screenshots as follows:

### Main console shell — from Google Ads reference
- Fixed top app bar across the workspace.
- Far-left narrow primary icon rail.
- Expandable contextual sidebar to its right.
- Global search in the top bar, plus notifications, help, environment indicator and identity menu.
- Main workspace uses page title, contextual filters, date range/actions, then KPI/visual summary, charts, tables and detail panels.
- Keep the main content spacious but efficient. Prefer a responsive 12-column layout and consistent gutters.

### Overview / explanation surfaces — from Google Workspace reference
- Use an occasional two-column split panel with a custom product diagram on the left and concise explanatory text/actions on the right.
- Use strong typography and controlled whitespace.
- Use illustrations that explain LARA's own information routes, evidence records or operational case flow. Avoid generic AI brains, glowing orbs, robot heads and stock imagery.
- Reserve this composition for Overview, empty states, onboarding and relevant feature introductions. Do not repeat it on every route.

### Proposed design tokens

Use a light neutral system as the primary theme:

```css
:root {
  --lara-bg: #F7F9FC;
  --lara-surface: #FFFFFF;
  --lara-surface-muted: #F1F4F8;
  --lara-text: #202124;
  --lara-text-secondary: #5F6368;
  --lara-border: #DADFE7;
  --lara-primary: #1A73E8;
  --lara-primary-hover: #1765CC;
  --lara-info: #0B7FAB;
  --lara-success: #188038;
  --lara-warning: #B06000;
  --lara-danger: #D93025;
  --lara-evolution: #6B4EFF;
}
```

Treat these as proposed values and consolidate them into one canonical token source after checking the existing theme. Keep semantic state colors restrained: blue for primary action/active; green for success; amber for review; red for blocked/failure; teal for routing; purple only for evolution/candidate. Do not revive the old neon-lime canvas, rainbow badge palette, strong gradients, glowing outlines, glassmorphism, decorative grids or giant pill-shaped cards.

Typography: choose a neutral, highly legible product sans and a monospace face for IDs/logs/code. Check font dependencies before adding anything. Prefer locally available/self-hosted fonts or the existing system. Use clear scale and tabular numerals for metrics. Keep page headings 24–28px; body 14–16px; dense tables 13–14px. Use consistent 4/8/12/16/20/24/32 spacing, 8–12px control radius and 10–14px panel radius.

Choose one icon family already installed. If none exists, propose one modest icon package and install only after checking compatibility. No emoji-based navigation, mixed icon families, random inline icon paths or external brand logos.

Use subtle interaction feedback and restrained motion. Respect `prefers-reduced-motion`. Prioritize clarity over novelty.

## PHASE 4 — GENERATE LARA BRAND ASSETS

Inspect the current brand identity first. If no locked logo exists, create an original LARA symbol and wordmark as source SVG files (not raster mockups):

- `lara-mark.svg`
- `lara-wordmark.svg`
- `lara-wordmark-mono.svg`
- `favicon.svg`
- optional `lara-app-icon.svg`

Logo concept: a minimal geometric route/lattice signal formed by a few connected nodes and a continuous path that can subtly suggest an L/A. It must read at 16–24px and work in monochrome. Keep it simple, original and technically clean. Do not imitate Google's G, shield or multicolor identity. Include light/dark-safe variants if required by existing surfaces. Use the source SVG directly in the app, with accessible title/alt treatment where appropriate.

Also create a small set of original functional SVG illustrations (only if they materially clarify a concept):
- information route / source-to-agent flow
- evidence case-file / record linkage
- approval / controlled action path
Keep them consistent with the new token system and do not use them as decorative filler.

## PHASE 5 — BUILD THE SHARED COMPONENT SYSTEM

Create/replace reusable components following the project's actual source structure. Do not copy paths from old docs if the current project structure differs. Maintain separation between layout, primitives, feature components and data adapters.

### 5A. App shell
- `AppShell`
- `PrimaryRail`
- `ContextSidebar`
- `WorkspaceHeader`
- `GlobalSearch`
- `Breadcrumbs`
- `PageHeader`
- `PageToolbar`
- `IdentityMenu`
- `EnvironmentIndicator`
- `NotificationMenu`
- optional `CommandPalette` only if keyboard command support is implemented end-to-end

Navigation groupings should follow the current routes, broadly:
- Overview
- Workbench: Investigations, New Investigation
- Intelligence: Information Highways, Agent Fleet
- Governance: Approvals, Policies & Principals, Evolution Lab
- Observability: Audit Trail

Never create dead navigation links. Only show a navigation entry if its page/route exists and is permitted for the current principal.

### 5B. Shared primitives
- Buttons: primary, secondary, subtle, danger and icon-only; loading, disabled, active and focus-visible states.
- Inputs: text, search, textarea, select, combobox, checkbox, radio and switch.
- Tabs and segmented controls.
- Filter chips, filter popovers and date-range control.
- Status, role, environment and count badges.
- Tooltips, menus, popovers, modal, drawer and confirmation dialog.
- Toasts, inline alerts and callouts.
- Avatar and avatar groups.
- Skeleton, loading, empty and error states.
- Reusable data table with sorting, selection, pagination, sticky header and small-screen fallback.
- Metric cards, sparklines, trend indicators and accessible chart wrapper.
- Timeline, stepper and progress indicator.
- Copy button, code block and safe JSON viewer.

### 5C. Workbench / investigation pages
- `OverviewPage`
- `OverviewWelcomePanel`
- `SystemHealthStrip`
- `KpiSummaryRow`
- `InvestigationTrendChart`
- `RecentInvestigationsTable`
- `AttentionQueue`
- `RecentActivityFeed`
- `NewInvestigationDialog`
- `InvestigationListPage`
- `InvestigationWorkspace`
- `InvestigationStageBar`
- `IncidentSummaryPanel`
- `EvidenceLedger`
- `EvidenceGapPanel`
- `EventTimeline`
- `AgentWorkPanel`
- `FindingCard`
- `ClaimVerificationTable`
- `ProposedActionPanel`

### 5D. Dynamic Information Highways
- `HighwaysPage`
- `HighwayGraphCanvas` (reuse current React Flow graph if installed and appropriate)
- `HighwayNode`
- `HighwayEdge`
- `RouteInspector`
- `ExcludedRouteList`
- `RouteTableFallback`

Graph must show active/candidate/denied/unavailable states clearly. Selecting a node/edge should open a useful inspector. Always provide a keyboard-accessible table/list alternative; graph should not be the only way to inspect routes.

### 5E. Specialist Agent Fleet
- `AgentFleetPage`
- `AgentRegistryTable`
- `AgentDetailDrawer`
- `CapabilityMatrix`
- `AgentVersionHistory`
- `AgentRunHistory`

### 5F. Controlled Evolution Lab
- `EvolutionLabPage`
- `FailureSignalPanel`
- `CandidateComparison`
- `EvaluationSuiteRunner`
- `EvaluationResultsTable`
- `PromotionApprovalPanel`
- `VersionLineage`

### 5G. Governance and approvals
- `GovernancePage`
- `PrincipalDirectory`
- `PolicySimulator`
- `PolicyDecisionPanel`
- `ApprovalQueuePage`
- `ApprovalQueueTable`
- `ApprovalDetailPanel`
- `ApprovalDecisionBar`

Keep the existing separation-of-duties check. Approval/rejection actions must require the existing mandatory justification rules, and UI must reflect the backend's actual allow/deny/require-approval result.

### 5H. Audit trail
- `AuditTrailPage`
- `AuditEventTable`
- `AuditEventDrawer`
- `TraceExplorer`
- `JsonPayloadViewer`
- `AuditExportAction` only when supported by the existing implementation/API

See the companion `LARA_Frontend_Component_Architecture.md` for component responsibilities and the visual direction. If it is not in the repo, create it under docs or use it as the specification in this prompt.

## PHASE 6 — FUNCTIONAL IMPLEMENTATION RULES

1. Every visible control must do what it advertises. Remove inert buttons, fake menus and decorative toggles.
2. Keep all API requests behind the existing frontend API client/service layer. Do not call backend URLs directly from arbitrary components.
3. Preserve backend request/response types exactly. Never silently rename fields or change shared schemas.
4. If an endpoint is unavailable, use the project's existing mock-fixture convention. If no convention exists, create a clearly isolated frontend-only fixture module; never mix mock data into production API types.
5. Clearly mark simulated/demo values. Never show fixture health, metrics or activity as live telemetry.
6. Implement proper loading, empty, error, permission-denied and stale-data states.
7. Keep current authentication and identity-switching behavior. The identity switcher must not bypass backend authorization; it only uses the existing supported demo/test mechanism.
8. Preserve all route guards and role visibility rules.
9. Do not invent new functionality such as automatic tool execution, real industrial control, or autonomous policy editing. Existing product actions remain simulated if that is the current prototype boundary.
10. Avoid new dependencies unless an actual gap requires one. Inspect `package.json` first and state why each dependency is needed.

## PHASE 7 — RESPONSIVE AND ACCESSIBILITY IMPLEMENTATION

Test and tune at:
- 1440×900 desktop
- 1280×800 laptop
- 768×1024 tablet
- 390×844 mobile

Expected behavior:
- Desktop: icon rail + contextual sidebar + top bar.
- Laptop: sidebar can collapse without losing context.
- Tablet/mobile: navigation becomes a drawer; panels stack; tables have a deliberate card or horizontal-scroll behavior; detail inspectors become drawers or full-width sections.
- Minimum 44×44px touch targets on mobile.
- All workflows usable by keyboard; visible focus; labels/accessible names for controls; no color-only status communication.
- WCAG AA contrast for text and interactive states.
- Respect reduced-motion settings.

## PHASE 8 — VISUAL QA AND ITERATION

Use the actual running app in Chrome/Edge. Do not judge from source code alone.

1. Start the existing frontend using the repository's documented dev command.
2. Capture screenshots of every primary route at desktop and at least the responsive widths above.
3. Inspect alignment, hierarchy, density, overflow, color contrast, typography, navigation, table readability, modal/drawer behavior and graph interactions.
4. Run the relevant Impeccable audit/critique/polish commands documented by the installed version. Do not invent command names; read its skill references first.
5. Use ECC's available `ui-canvas`, `browser-qa`, `click-path-audit`, `a11y-architect` and `e2e-testing` skills where present.
6. Fix issues and repeat screenshot/browser checks until there are no major visual defects or broken primary workflows.
7. Run existing lint, typecheck, tests and production build scripts. Inspect `package.json`; do not assume script names.
8. Report actual command output. Never claim a test, build or QA passed unless it was run successfully.

## PHASE 9 — REQUIRED DELIVERABLES

Implement and provide:

### UI and assets
- Complete redesigned app shell and navigation.
- Shared reusable UI component system.
- Reworked primary feature pages listed above, mapped to the current routes.
- Original editable SVG LARA logo assets and favicon.
- Purposeful product illustrations where needed.
- Responsive states and real functional interactions.

### Documentation
- `docs/FRONTEND_COMPONENT_CATALOG.md` — actual components created, exact paths, purpose and states.
- `docs/FRONTEND_DESIGN_SYSTEM.md` — visual direction, tokens, typography, spacing, icon rules, responsive rules and accessibility notes.
- `docs/FRONTEND_IMPLEMENTATION_REPORT.md` — files changed, routes completed, API/fixture usage, dependencies added, screenshots/QA evidence, build/test results, known gaps.
- Update existing token/theme files in place; do not create competing token sources.

### Git and ownership
- Work only on `feature/praneeth-frontend`.
- Do not commit or push. Leave changes in the working tree for review.
- Do not edit backend-owned files or shared API definitions.

## ACCEPTANCE CRITERIA

The frontend is only complete when:

- Antigravity can discover the installed UI skills and their paths are recorded.
- The existing routes and API contracts remain intact.
- The old visual language is replaced by the new coherent LARA system.
- The app shell follows the Google Ads-inspired navigation hierarchy without copying Google's identity.
- Overview/detail compositions use Google Workspace-inspired clarity and whitespace selectively.
- Every feature route has a consistent page header, controls and content hierarchy.
- Brand SVG assets are original, sharp at small sizes and work in light/dark contexts.
- Graphs, tables, filters, menus, modals, drawers and approval flows work.
- Responsive and accessibility checks are performed.
- Lint/typecheck/test/build results are reported honestly.
- No backend files, API schemas, credentials, environment files, unrelated docs or teammate-owned code are changed.

## FINAL REPORT FORMAT

At completion, provide:
1. Installed skills: name, version, path, Antigravity discovery verification.
2. Frontend design direction and token summary.
3. Logo/asset paths.
4. Component catalog and exact paths.
5. Routes completed and major interactions implemented.
6. Dependencies added/removed and why.
7. API contract preserved and mock fixtures used.
8. Screenshots/browser QA performed and resolutions checked.
9. Lint, typecheck, tests and build results.
10. Files changed and any remaining issues.

Begin with **Phase 0 and Phase 1**. Continue through implementation and QA without stopping at a plan-only response. If an external skill install fails, document it and proceed with the verified skills. Do not ask me to repeat information already present in the repository or this prompt.
