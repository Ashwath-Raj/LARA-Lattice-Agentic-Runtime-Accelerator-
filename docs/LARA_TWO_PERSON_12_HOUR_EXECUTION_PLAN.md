# LARA — Two-Person, 12-Hour Build Execution Plan

**Project:** LARA — Lattice Agentic Runtime Accelerator  
**Build window:** 20 November 2026, 11:30 IST to 23:30 IST (12 hours)  
**Team size:** 2 people  
**Status:** Execution plan derived from `LARA_PROTOTYPE_SCOPE_AND_TECHNICAL_SPEC.md` v1.0  
**Primary objective:** Finish one reliable, cloud-hosted, end-to-end prototype in 12 hours without concurrent edits, incompatible APIs, merge conflicts or last-minute architecture changes.

---

## 0. Read this first — what “done in 12 hours” means

The full LARA architecture is larger than a 12-hour, two-person build. This plan does **not** claim that two people can deliver a production enterprise runtime in 12 hours.

At H+12, the team must have a **bounded but genuine working prototype** that demonstrates all three defining differentiators:

1. **Dynamic Information Highways:** backend-resolved graph routes connecting information sources, agents, skills and tools; the route changes when identity/context changes.
2. **Controlled self-evolution:** a reproducible failure produces a versioned prompt/skill candidate; a fixed evaluation suite runs; an authorised administrator approves or rejects it; rollback is available.
3. **Identity-aware governance:** backend RBAC + ABAC checks apply before protected reads, graph disclosure, agent delegation and tool execution.

The prototype also needs one task workflow, three specialist-agent roles, a Workbench, a Runtime Console, a persistent trace, a cloud deployment and a repeatable demo reset.

### H+12 definition of done

- [ ] A public HTTPS Cloud Run URL serves the LARA frontend and API.
- [ ] Seeded demo login is server-validated; changing identity changes backend permissions.
- [ ] The same investigation task resolves different permitted routes for Operator and Supervisor.
- [ ] Neo4j is actually used by the backend route resolver, or the graph fallback is explicitly disclosed and tested.
- [ ] Research, Analysis and Verification agents complete one bounded investigation workflow.
- [ ] Gemini is called only through a provider adapter; model output never directly executes tools.
- [ ] A known seeded agent failure can be reproduced.
- [ ] The evolution engine creates an immutable candidate, evaluates it, requires admin approval and can roll back.
- [ ] A restricted source/action is denied before protected content is retrieved or action is executed.
- [ ] A simulated controlled action can be approved by a different authorised principal.
- [ ] The trace records identity, route, agents, versions, policy decisions, tools, approval and outcome.
- [ ] Frontend and backend tests pass; no secret is exposed to the browser or committed.
- [ ] A three-minute demo and a screen recording/fallback are ready.

**Do not expand the scope after H+1.** A smaller working runtime is better than a large, partly simulated platform.

---

# 1. Team split and ownership

Use exactly two implementation owners. These assignments are intentionally separated by source tree so both people can work at the same time without editing the same files.

## Person A — Runtime / Backend / Cloud Owner

**Suggested owner:** Ashwath (technical lead)

**Owns:** all backend code, runtime logic, API contracts, graph integration, security enforcement, cloud configuration and backend tests.

### Responsibilities

1. Repository inspection and backend scaffold.
2. FastAPI application, settings and health checks.
3. Seeded demo authentication and server-side principal resolution.
4. RBAC + ABAC policy decision point and fail-closed behaviour.
5. Neo4j Aura connection, graph schema and demo graph seeding.
6. Dynamic Information Highway discovery, permission filtering, route ranking and route explanation.
7. Task state machine and orchestrator.
8. Gemini provider adapter and schema-validated model calls.
9. Research, Analysis and Verification agent contracts/implementations.
10. Context assembly and source provenance.
11. Tool registry/gateway, bounded calculation and simulated maintenance action.
12. Approval service and separation-of-duties enforcement.
13. Evolution service, immutable candidate versions, evaluation runner, promotion and rollback.
14. Firestore/GCS persistence and audit event service.
15. Backend unit, integration and security tests.
16. Cloud Run deployment, environment configuration and release tag.

### Person A file ownership

Person A is the only person who edits these paths during the 12-hour window:

```text
backend/**
contracts/openapi.yaml
contracts/examples/**
scripts/seed_demo.py
scripts/deploy.sh
infra/**
tests/backend/**
tests/integration/**
Dockerfile
pyproject.toml
requirements*.txt
.env.example
```

Person A also owns root-level backend/deployment configuration. Person B must not modify these files.

### Person A must deliver

- Running API locally and in Cloud Run.
- `openapi.yaml` and example payloads frozen by H+0:30.
- Demo seed script.
- A short backend status note at each checkpoint.
- Test output and deployment URL.
- No unlabelled mocks: any mock connector must say `SIMULATED`.

---

## Person B — Frontend / Product Experience / Browser-Test Owner

**Suggested owner:** Praneeth

**Owns:** the entire frontend source tree, visual language integration, browser-side API client, UI fixtures and frontend tests. Person B consumes the agreed API contract; they do not invent a separate backend.

### Responsibilities

1. Inspect the supplied Bright Lattice Design Kit and integrate its CSS tokens, SVGs and visual language.
2. Build the app shell and navigation.
3. Build Workbench task submission and result view.
4. Build Runtime Overview.
5. Build the Information Highways graph using React Flow and backend graph data.
6. Build agent/skill registry view.
7. Build Evolution Lab: diagnosis, prompt/skill diff, evaluation results, approve/reject and rollback controls.
8. Build Governance/Approvals view.
9. Build Audit/Trace timeline.
10. Build seeded identity switcher by calling the real demo-auth API; never fake a role change only in React state.
11. Build a single typed API client and matching mock fixtures for parallel frontend work.
12. Add loading, empty, error, denied and approval-required states.
13. Write frontend component/browser tests and verify responsive layout.
14. Prepare demo runbook, screenshots and a fallback recording.

### Person B file ownership

Person B is the only person who edits these paths during the 12-hour window:

```text
frontend/**
tests/frontend/**
docs/DEMO_RUNBOOK.md
docs/FRONTEND_STATUS.md
```

Person B must not edit backend modules, OpenAPI contracts, root deployment files, `.env.example`, or cloud settings.

### Person B must deliver

- Working frontend served through Vite locally and the deployed app in Cloud Run.
- One API client file used by all components.
- Mock fixtures that match the frozen OpenAPI contract exactly.
- No direct Gemini, Neo4j, Firestore or GCS calls from the browser.
- No fake route/evaluation counters presented as live data.
- A demo runbook and fallback recording.

---

# 2. Non-negotiable concurrency rules

These rules are more important than working quickly. Most two-person build failures come from changing shared contracts and root files at the same time.

## 2.1 One owner per path

| Path | Owner | Other person's rule |
|---|---|---|
| `backend/**` | Person A | Read-only; report bugs, do not patch |
| `contracts/**` | Person A | Read-only after H+0:30; request a contract change |
| `frontend/**` | Person B | Read-only; report bugs, do not patch |
| `tests/backend/**` | Person A | No edits by Person B |
| `tests/frontend/**` | Person B | No edits by Person A |
| `tests/integration/**` | Person A | Person B can run and report failures |
| `scripts/seed_demo.py` | Person A | Person B uses the agreed fixture data only |
| `docs/DEMO_RUNBOOK.md` | Person B | Person A supplies backend facts/URLs |
| Root config / Docker / deployment | Person A | Person B does not edit |

Do not have two people or two Antigravity agents edit the same file concurrently.

## 2.2 Branch strategy

Create these branches before implementation:

```text
main
work/runtime-backend
work/frontend-console
```

**Critical: use separate working directories.** Do not have both people open and edit the same checkout/folder at the same time. Use separate machines/clones, or Git worktrees from one clone. Example when both developers share one development machine:

```bash
git worktree add ../lara-runtime work/runtime-backend
git worktree add ../lara-frontend work/frontend-console
```

Person A works only inside `../lara-runtime`; Person B works only inside `../lara-frontend`. If they use separate machines, each should clone the repository and check out their assigned branch.

Rules:

- Person A commits only to `work/runtime-backend`.
- Person B commits only to `work/frontend-console`.
- Neither person commits directly to `main` during parallel development.
- Never share a single VS Code/Antigravity workspace for concurrent edits.
- Keep commits small and descriptive.
- Merge at planned checkpoints, not on every file save.
- Only Person A performs the final integration/deployment merge after both owners confirm their branch is ready.
- If a cherry-pick or merge conflict occurs, stop and resolve it deliberately. Never overwrite the other person's work with a bulk copy.

Suggested commit prefixes:

```text
backend: add server-side demo principal resolution
backend: implement policy decision service
backend: add neo4j route resolver
frontend: add workbench shell
frontend: render route graph from api data
frontend: add evolution review panel
```

## 2.3 Freeze the API contract before parallel coding

At H+0:30, Person A publishes:

```text
contracts/openapi.yaml
contracts/examples/login-success.json
contracts/examples/task-created.json
contracts/examples/highway-graph.json
contracts/examples/route-resolution.json
contracts/examples/evolution-proposal.json
contracts/examples/evaluation-result.json
contracts/examples/audit-trace.json
```

Person B builds against these exact shapes using MSW or local fixtures.

After H+0:30:

- No breaking field rename.
- No changing enum spelling/capitalisation.
- No changing response envelope.
- No endpoint renaming.
- No new required request field without agreement.
- Optional fields may be added only if the UI safely ignores missing fields.

### API change protocol

If a change is unavoidable, send this exact message in the team chat:

```text
API CHANGE REQUEST
Endpoint:
Current contract:
Proposed change:
Reason:
Backend impact:
Frontend impact:
Tests affected:
```

Both people agree first. Person A edits the contract and backend. Person B then adjusts the frontend client/fixtures. Do not make a silent local change.

## 2.4 Frontend uses mocks until the backend is ready

Person B should implement a single API client and MSW fixtures from the OpenAPI examples.

```text
React component
    -> frontend/src/lib/api.ts
        -> real HTTP API OR MSW fixture
```

Switch to the real backend with one environment flag:

```dotenv
VITE_USE_MOCKS=false
VITE_API_BASE_URL=/api/v1
```

The final Cloud Run build must have mocks disabled. Mock data must never be mistaken for live runtime evidence.

## 2.5 Integration checkpoints

Only integrate at these times:

- H+0:30 — API contract freeze.
- H+2:00 — local app shell and API health.
- H+4:30 — identity, graph and route endpoint contract test.
- H+6:30 — first complete task path.
- H+8:00 — evolution proposal/evaluation API.
- H+9:30 — approval, tools and trace.
- H+10:30 — feature freeze and full E2E.
- H+11:30 — release candidate.
- H+12:00 — tag and archive.

Between checkpoints, work only inside owned paths.

---

# 3. Shared interface contract

The detailed API remains defined in the master specification. This section freezes the minimum endpoints required for the 12-hour build.

## 3.1 Required API endpoints

| Method | Endpoint | Owner | Frontend consumer |
|---|---|---|---|
| `POST` | `/api/v1/auth/demo-login` | A | Identity switcher |
| `POST` | `/api/v1/auth/logout` | A | Logout |
| `GET` | `/api/v1/auth/me` | A | Session/profile |
| `POST` | `/api/v1/tasks` | A | Workbench submit |
| `GET` | `/api/v1/tasks/{task_id}` | A | Task status/result |
| `GET` | `/api/v1/tasks/{task_id}/events` | A | Progress timeline; poll every 2 seconds |
| `GET` | `/api/v1/tasks/{task_id}/trace` | A | Trace panel |
| `GET` | `/api/v1/highways/graph` | A | Graph canvas |
| `POST` | `/api/v1/highways/resolve` | A | Resolve/compare route |
| `GET` | `/api/v1/agents` | A | Agent registry |
| `GET` | `/api/v1/evolution/proposals` | A | Evolution list |
| `POST` | `/api/v1/evolution/proposals` | A | Create proposal |
| `POST` | `/api/v1/evolution/proposals/{id}/evaluate` | A | Run evaluation |
| `POST` | `/api/v1/evolution/proposals/{id}/approve` | A | Promote approved candidate |
| `POST` | `/api/v1/evolution/proposals/{id}/reject` | A | Reject candidate |
| `POST` | `/api/v1/agents/{id}/rollback` | A | Rollback |
| `GET` | `/api/v1/approvals` | A | Approval queue |
| `POST` | `/api/v1/approvals/{id}/decision` | A | Approve/reject action |
| `GET` | `/api/v1/audit/traces/{trace_id}` | A | Audit timeline |
| `POST` | `/api/v1/tools/{tool_id}/invoke` | A | Tool action if exposed in demo |

The 12-hour build may omit less important list/detail endpoints if the minimum demo still works. Do not create frontend-only substitutes for security-relevant endpoints.

## 3.2 Standard response envelope

Success:

```json
{
  "data": {},
  "meta": {
    "request_id": "req-demo-001",
    "trace_id": "trace-demo-001"
  }
}
```

Error:

```json
{
  "error": {
    "code": "POLICY_DENIED",
    "message": "The requested operation is not permitted.",
    "safe_details": {},
    "request_id": "req-demo-001"
  }
}
```

## 3.3 Canonical enums

Use these spellings everywhere:

```text
TaskStatus:
RECEIVED | NORMALISED | PLANNING | ROUTE_RESOLUTION | CONTEXT_ASSEMBLY |
EXECUTING | VERIFYING | AWAITING_APPROVAL | COMPLETED | FAILED | DENIED |
CANCELLED | NEEDS_INPUT | NO_PERMITTED_ROUTE

PolicyDecision:
ALLOW | DENY | REQUIRE_APPROVAL | REDACT

EvolutionStatus:
DRAFT | PENDING_EVALUATION | EVALUATED | AWAITING_APPROVAL |
APPROVED | PROMOTED | REJECTED | ROLLED_BACK

NodeType:
DATA_SOURCE | DOCUMENT | AGENT | SKILL | TOOL | WORKFLOW | CAPABILITY

PrincipalRole:
OPERATOR | SUPERVISOR | RUNTIME_ADMINISTRATOR | AUDITOR
```

## 3.4 Highway graph response minimum

```json
{
  "data": {
    "nodes": [
      {
        "id": "incident-register",
        "type": "DATA_SOURCE",
        "label": "Incident Register",
        "status": "AVAILABLE",
        "classification": "INTERNAL"
      },
      {
        "id": "research-agent",
        "type": "AGENT",
        "label": "Research Agent",
        "status": "ACTIVE"
      }
    ],
    "edges": [
      {
        "id": "edge-01",
        "source": "incident-register",
        "target": "research-agent",
        "relationship": "PROVIDES_CONTEXT",
        "status": "AVAILABLE"
      }
    ]
  },
  "meta": {"request_id": "req-graph-001"}
}
```

Only return nodes and metadata the current principal is permitted to discover.

## 3.5 Route resolution response minimum

```json
{
  "data": {
    "route_id": "route-operator-001",
    "task_id": "task-001",
    "principal_id": "operator.alex",
    "selected_nodes": ["incident-register", "research-agent", "sop-repository", "analysis-agent", "verification-agent"],
    "selected_edges": ["edge-01", "edge-02"],
    "excluded_count": 1,
    "score": 0.87,
    "score_components": {
      "relevance": 0.92,
      "freshness": 0.90,
      "trust": 0.95,
      "availability": 1.0,
      "latency_penalty": 0.05,
      "cost_penalty": 0.02,
      "hop_penalty": 0.08
    },
    "explanation": ["Selected current SOP source", "Excluded a resource not authorised for this principal"]
  },
  "meta": {"request_id": "req-route-001", "trace_id": "trace-001"}
}
```

For ordinary users, do not identify a hidden restricted node by name. The UI may show a generic “1 restricted candidate excluded” message. An authorised Runtime Administrator may see more detail.

## 3.6 Task and event response minimum

The task response must include:

```text
task_id, title, status, initiating_principal_id, purpose,
selected_route_id, created_at, updated_at, trace_id,
result (when completed), limitations (when applicable)
```

Progress event response minimum:

```text
event_id, sequence, event_type, timestamp, status, safe_summary
```

Use polling every 2 seconds for the prototype. Do not introduce WebSockets/SSE unless both people agree there is already working infrastructure for it.

## 3.7 Evolution response minimum

A proposal must expose:

```text
proposal_id, agent_id, artifact_type, parent_version,
candidate_version, change_summary, diff, status,
evaluation_id, created_at, created_by
```

An evaluation result must expose actual computed values:

```text
evaluation_id, suite_version, parent_results, candidate_results,
security_regressions, passed, failures, evaluated_at
```

Do not hardcode a passing evaluation result. The backend must calculate it by running the agreed fixture suite.

---

# 4. Work breakdown by person

## 4.1 Person A — backend task board

| ID | Task | Output | Priority | Depends on |
|---|---|---|---|---|
| A01 | Inspect repo and create backend scaffold | FastAPI app, config, health/readiness | P0 | None |
| A02 | Publish OpenAPI contract/examples | Frozen contract pack | P0 | A01 |
| A03 | Implement seeded identity and session | `/auth/demo-login`, `/auth/me`, logout | P0 | A01 |
| A04 | Implement RBAC/ABAC policy evaluator | Deterministic policy service + tests | P0 | A03 |
| A05 | Connect Neo4j Aura and seed graph | Connection check + seed command | P0 | A01 |
| A06 | Implement permission-aware route resolver | Resolve + explain + compare | P0 | A04, A05 |
| A07 | Implement task state and orchestrator | Create task, progress, completion | P0 | A03, A04, A06 |
| A08 | Implement Gemini adapter and agent contracts | Structured model interface + 3 specialists | P0 | A07 |
| A09 | Implement context/source access | Policy-before-read and provenance | P0 | A04, A06 |
| A10 | Implement controlled evolution | Diagnosis, candidate, eval, approval, promote, rollback | P0 | A08, audit |
| A11 | Implement tool gateway and simulated action | Allowlisted tools and approval path | P0 | A04, approvals |
| A12 | Implement trace/audit and Firestore state | Persistent events and trace API | P0 | A03, A07 |
| A13 | Implement backend tests | Unit, graph, security, evolution tests | P0 | Relevant modules |
| A14 | Deploy and seed cloud demo | Cloud Run URL and verified services | P0 | A01–A12 |

### Person A build rules

- Do not over-engineer a generic plugin system.
- Implement only the seeded tenant and demo identities.
- Implement one task purpose and one end-to-end workflow.
- Keep the route resolver deterministic and explainable.
- Make agent orchestration sequential for the MVP if parallel execution threatens the schedule.
- Use fixed, versioned benchmark fixtures; never invent evaluation scores.
- Implement the actual Gemini call through the adapter, but allow deterministic test doubles in automated tests.
- Use seeded/mock enterprise connectors and label them `SIMULATED`.
- Deploy early; do not wait until H+10 to discover a Cloud Run configuration issue.

## 4.2 Person B — frontend task board

| ID | Task | Output | Priority | Depends on |
|---|---|---|---|---|
| B01 | Inspect design kit and frontend scaffold | Vite/React app, theme tokens, app shell | P0 | None |
| B02 | Implement typed API client and MSW | One API layer and fixtures matching OpenAPI | P0 | A02 |
| B03 | Implement demo identity switcher | Uses real backend demo-auth endpoint | P0 | A02 |
| B04 | Implement Workbench | Task submit, status, findings, evidence and output | P0 | B02 |
| B05 | Implement Information Highways screen | React Flow graph, selected route, route compare | P0 | B02 |
| B06 | Implement Runtime Overview and Agents | Real counts/statuses and agent versions | P1 | B02 |
| B07 | Implement Evolution Lab | Diagnosis, diff, evaluation and admin actions | P0 | B02 |
| B08 | Implement Governance and Approvals | Policy decision, request and approval UI | P0 | B02 |
| B09 | Implement Audit/Trace timeline | Ordered events and event details | P0 | B02 |
| B10 | Implement loading/error/empty/denied states | No misleading empty or fake-success states | P0 | B04–B09 |
| B11 | Frontend tests and responsive pass | Component/API-state tests | P0 | B04–B10 |
| B12 | Demo runbook and fallback recording | Rehearsed three-minute demo | P0 | Integrated build |

### Person B build rules

- Use the supplied `LARA_Design_Kit`; do not invent a new palette or visual system during the sprint.
- Use one central `api.ts` client and typed API response definitions.
- Use MSW fixtures only during isolated UI development.
- Do not create front-end-only policy decisions or evolution results.
- Role switcher must call the backend; a local React state change is not sufficient.
- The graph must render backend data; do not label a static SVG as a live runtime graph.
- The UI must show `SIMULATED` for the maintenance connector.
- Do not add decorative buttons that have no working action.
- Prioritise Workbench, Highways, Evolution, Governance and Trace. Combine or omit secondary pages if necessary.

---

# 5. Twelve-hour schedule (11:30–23:30 IST)

This schedule includes the event lunch and tea breaks. It assumes both developers have repository access, Google Cloud access, Gemini credentials and the Neo4j Aura URI/credentials available at H+0. If those credentials are not ready, the relevant connection task must be tested immediately; do not postpone it.

| Time | Person A — Runtime/backend | Person B — Frontend/product | Joint checkpoint / exit condition |
|---|---|---|---|
| 11:30–12:00 | Inspect repo, identify working code, publish endpoint/schema/status contract and owners | Inspect design ZIP, extract assets, inspect repo, confirm frontend path and API contract | Contract v1 frozen; branches created; no shared file ownership ambiguity |
| 12:00–13:30 | FastAPI scaffold, config, health route, Cloud/Neo4j/Firestore connectivity probes, seed identity/policy skeleton | Vite app shell, routing/navigation, design tokens, reusable layout, API client + MSW fixtures | Local UI opens; backend `/health` and `/ready` work; frontend mocks match contract |
| 13:30–14:30 | **Lunch break** | **Lunch break** | No coding; keep the break bounded |
| 14:30–16:00 | Demo login, principal resolution, RBAC/ABAC, Neo4j graph seed and repository | Workbench layout, identity switcher UI, Runtime Overview, Highways graph canvas using fixtures | Operator/Supervisor identity and policy tests pass; graph UI renders API-shaped data |
| 16:00–16:15 | **Tea break** | **Tea break** | — |
| 16:15–18:00 | Highway route resolver, permission pre-filter, ranking/explanation, route endpoint, initial task orchestration | Replace graph fixture with real API when available; selected/excluded route rendering; route comparison and node inspector | **6:00 PM checkpoint:** actual backend route changes under operator vs supervisor; no static route hardcoding |
| 18:00–19:15 | Complete orchestrator, Gemini adapter, Research/Analysis/Verification sequence, context and provenance | Workbench task submit, progress polling, task result, findings and evidence panels | One task completes end-to-end through real backend; UI displays actual result/status |
| 19:15–20:15 | Evolution diagnosis, candidate generation, immutable version, deterministic benchmark runner | Evolution Lab: diagnosis panel, candidate diff, evaluation results, status lifecycle and admin controls | Candidate exists and evaluation endpoint returns computed results, not hardcoded values |
| 20:15–21:15 | Approval service, tool gateway, simulated maintenance action, audit/trace persistence, deny equipment-control tool | Governance/Approvals view, denial state, approval action, audit timeline and event details | Operator denial + supervisor approval + visible trace work end-to-end |
| 21:15–22:00 | Fix backend integration failures; execute backend/security/evolution tests | Fix UI/API mismatches; execute frontend tests; check error/loading/empty states | Full primary scenario passes once with real cloud services |
| 22:00–22:45 | Cloud Run deploy, secrets check, seed/reset verification, smoke/security tests | Production build, responsive/layout pass, demo reset and UI smoke test | Release candidate deployed; frontend mocks disabled; no secrets in bundle |
| 22:45–23:15 | Support final smoke tests; document known backend limits | Prepare README/demo runbook, record fallback demo, capture screenshots | Three-minute demo rehearsed; implementation status accurately labelled |
| 23:15–23:30 | Tag release, archive logs/test evidence, verify URL and backend health | Freeze frontend, verify final URL and all links; no last-minute UI change | `v0.1.0-buildathon` release candidate frozen; completion checklist signed off |

## 5.1 Critical event constraints

- The Day 1 venue build phase wraps at 6:00 PM. The schedule above aims to have the first core route/governance demonstration ready by then.
- After 6:00 PM, focus on integration, evolution, approval, audit, deployment and submission readiness.
- Submission opens at 11:00 PM. Do not wait for the submission portal to open before preparing the artefacts.
- The Day 2 submission closes at 9:00 AM. The 12-hour plan ends with a release candidate, not permission to postpone submission.

---

# 6. Integration protocol — how to avoid implementation collisions

## 6.1 Integration order

1. Person A merges/publishes API contract.
2. Person B builds UI against the contract using MSW fixtures.
3. Person A implements backend endpoints and tests them through Swagger/curl/pytest.
4. At the checkpoint, Person B switches one frontend feature from mock to real API.
5. Both test the feature and freeze it before moving to the next integration slice.
6. Repeat for graph, task, evolution, approvals and trace.

Do not switch every UI page to the live backend at once. Integrate one vertical slice at a time.

## 6.2 CORS and local development

Recommended local ports:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8000
```

Use a Vite `/api` proxy to the backend during local development. In Cloud Run, serve the built frontend and API from the same origin. This avoids unnecessary cross-origin cookie complexity.

If demo login uses an HttpOnly cookie:

- Configure `credentials: "include"` in the API client.
- Configure the Vite proxy for `/api`.
- Do not use wildcard CORS with credentials.
- Use secure cookie settings in Cloud Run.

Person A owns auth/session behaviour; Person B only consumes it.

## 6.3 API client rule

All frontend HTTP requests must go through:

```text
frontend/src/lib/api.ts
```

No `fetch()` calls inside page components. This prevents inconsistent headers, error handling, cookies, timeouts and response parsing.

## 6.4 Backend service rule

API route handlers must call services. Do not put graph queries, policy logic, Gemini calls or Firestore writes directly in route handlers.

## 6.5 Shared naming rule

Use the exact enum values from `contracts/openapi.yaml`. Never create frontend variants such as `approved`, `APPROVAL_PENDING`, `needs-approval` for the same backend state.

## 6.6 Integration bug reporting

Use one shared issue format:

```text
INTEGRATION BUG
ID:
Observed at:
Screen / endpoint:
Expected contract:
Actual response / behaviour:
Steps to reproduce:
Owner:
Severity: BLOCKER | HIGH | MEDIUM | LOW
```

Only the owner fixes the file. The other person supplies reproduction steps and evidence.

---

# 7. Integration test scenarios

These tests must be run against the real backend at least once before the final demo.

| Test ID | Actor | Action | Expected result |
|---|---|---|---|
| T01 | Operator | Submit incident task | Task created with operator principal derived server-side |
| T02 | Operator | Resolve route | Internal permitted route returned; restricted metadata hidden |
| T03 | Supervisor | Resolve same task | Permitted route differs because backend policy context differs |
| T04 | Operator | Attempt restricted vendor read | DENY before source content is retrieved or passed to Gemini |
| T05 | Research Agent | Invoke non-allowlisted submit tool | DENY; no tool side effect |
| T06 | Operator | Initiate controlled maintenance request | REQUIRE_APPROVAL; action remains pending |
| T07 | Operator | Approve own request | DENY due to separation of duties |
| T08 | Supervisor | Approve exact pending request | Approval recorded; only that action may resume |
| T09 | Runtime Administrator | Generate evolution candidate | New immutable candidate; active version unchanged |
| T10 | Runtime Administrator | Evaluate candidate | Actual functional/security results recorded |
| T11 | Runtime Administrator | Promote passing candidate | Active version pointer changes; prior version retained |
| T12 | Runtime Administrator | Roll back | Prior version reactivated; rollback event recorded |
| T13 | Any principal | Trigger policy service unavailable test | Protected resource/action fails closed |
| T14 | Auditor | Open trace | Permitted event timeline shown; mutation controls absent |
| T15 | Browser | Refresh completed task | Task status/result are loaded from backend persistence |

---

# 8. Risk register and cut lines

## 8.1 Risks most likely to consume the 12-hour window

| Risk | Impact | Mitigation / cut line |
|---|---|---|
| Neo4j Aura connection/configuration issue | Blocks highways | Probe at H+0:30. If blocked beyond 45 minutes, use adapter-compatible in-memory graph for a clearly disclosed fallback; do not claim Neo4j is live |
| Gemini quota/model configuration issue | Blocks live agents/evolution | Test one structured call before UI integration; keep deterministic test doubles for unit tests; do not present test doubles as live inference |
| Firestore IAM/configuration issue | Blocks persistence | Test read/write immediately; fallback only to a clearly disclosed in-memory demo mode if required, with no persistence claim |
| Frontend schema drift | Integration failure | Freeze OpenAPI contract at H+0:30; MSW fixture parity; one API client |
| Too many UI pages | Incomplete screens | Combine Runtime Overview + Agents; prioritise Workbench, Highways, Evolution, Governance/Trace |
| Full dynamic planning too complex | Hardcoded workflow risk | Use model-proposed structured plan validated against a bounded capability registry; sequential specialist execution is acceptable |
| Evolution too broad | No working adaptation | Implement one failure type, one candidate artifact type (system prompt or skill), one deterministic suite, approval and rollback |
| Real sandbox takes too long | Security risk | Use fixed calculation functions; do not run arbitrary Python/shell |
| Cloud deployment late | Demo unavailable | Deploy skeleton by H+2; deploy after each integrated milestone |
| UI polish consumes runtime time | Weak proof | Freeze styling by H+9; no new animations or pages after H+9 |

## 8.2 Feature cut order

If behind schedule, cut in this order:

1. Runtime Overview metrics/widgets beyond basic live counts.
2. Advanced graph editing and admin graph mutations.
3. Full agent/skill detail pages; show compact registry panels.
4. Streaming/SSE; use 2-second polling.
5. Arbitrary multi-hop workflow templates; keep one seeded investigation template.
6. Advanced model-routing UI; retain the provider adapter in backend.
7. General-purpose code sandbox; retain deterministic bounded calculations.

**Never cut:** backend policy enforcement, identity-aware route resolution, controlled evolution approval, audit trace, or explicit mock/simulation labelling.

## 8.3 If the 12-hour window is slipping

At H+8, if the complete workflow is not working, stop adding functionality. Move to the minimum credible demo:

- One seeded task.
- Two identities.
- One graph route comparison.
- One policy denial.
- One agent candidate evolution cycle with actual evaluation.
- One approval decision.
- One audit trace.

Do not add more agents, connectors, models or screens.

---

# 9. Definition of a clean handoff

Every checkpoint ends with a written status from each owner.

Person A format:

```text
BACKEND CHECKPOINT
Commit:
Endpoints available:
Services complete:
Tests passed / failed:
Cloud status:
Known backend issue:
Next backend task:
```

Person B format:

```text
FRONTEND CHECKPOINT
Commit:
Screens complete:
Endpoints integrated:
Mock-only areas remaining:
Tests passed / failed:
Known UI/API issue:
Next frontend task:
```

Do not say “done” without the commit hash and test result.

---

# 10. Final release gate

Before tagging the build:

### Runtime and backend — Person A

- [ ] `GET /health` and `/ready` pass in Cloud Run.
- [ ] Neo4j/Firestore/GCS/Gemini connectivity is verified or any fallback is disclosed.
- [ ] Demo users resolve server-side.
- [ ] Policy tests pass, including deny and fail-closed cases.
- [ ] Route comparison is backend-derived.
- [ ] Three agents complete the task with validated schemas.
- [ ] Candidate evaluation computes actual results.
- [ ] Approval/promotion/rollback work.
- [ ] Tool action is simulated and approval-gated.
- [ ] Audit events are persisted and queryable.
- [ ] No secrets appear in frontend assets, logs or Git history.

### Frontend and demo — Person B

- [ ] All screens use the central API client.
- [ ] Production build has mocks disabled.
- [ ] Identity switcher calls the real backend.
- [ ] Graph renders backend nodes/edges and highlights resolved paths.
- [ ] Candidate diff/evaluation comes from backend response.
- [ ] Approve/reject controls call real endpoints.
- [ ] Trace displays actual backend events.
- [ ] Denied/failed/loading/empty states are clear.
- [ ] Responsive layout is checked at the demo display size.
- [ ] No buttons are inert and no fake success state remains.
- [ ] Demo runbook and fallback recording exist.

### Joint sign-off

- [ ] One complete demo completed without manual database edits.
- [ ] Same task under Operator and Supervisor changes the actual permitted route.
- [ ] Restricted information is not retrieved before denial.
- [ ] Evolution candidate is not active before approval.
- [ ] Rollback is demonstrated or tested.
- [ ] Every simulated component is visibly labelled.
- [ ] Release commit/tag recorded.
- [ ] Final URL and submission files independently verified.

---

# 11. Demo sequence (3 minutes)

| Time | Presenter action | What the jury should understand |
|---|---|---|
| 0:00–0:15 | State LARA's product thesis | This is a runtime/control layer, not another chatbot |
| 0:15–0:50 | Submit incident task as Operator; show the resolved graph path | Routes are discovered at runtime across sources, agents, skills and tools |
| 0:50–1:20 | Switch to Supervisor and resolve the same task | Identity and ABAC change permitted routes; restricted content is excluded before retrieval |
| 1:20–2:10 | Open known agent failure, generate candidate, evaluate, approve and show active version change | Agent behaviour can evolve through evidence, tests, approval and versioning |
| 2:10–2:40 | Attempt restricted action as Operator, then show supervisor approval path | LARA controls execution and people retain authority |
| 2:40–3:00 | Open trace | Every important route, delegation, model, tool and policy decision is inspectable |

### Presenter closing line

> Models provide intelligence. Agents provide capability. LARA provides the adaptive, interconnected and governed runtime that coordinates them.

---

# 12. Final operating rules

1. Build the smallest implementation that proves the locked product thesis.
2. Keep Person A and Person B inside their owned paths.
3. Freeze API contracts before frontend/backend parallel work.
4. Use matching MSW fixtures; switch to real APIs one feature at a time.
5. Integrate only at checkpoints.
6. Do not make last-minute schema or dependency changes.
7. Deploy early and keep a known-good Cloud Run revision.
8. Label all simulations and fallbacks honestly.
9. Prefer deterministic tests and visible evidence over impressive but unverifiable UI.
10. At H+12, stop feature development. Freeze, test, record, package and submit.

**The goal is not to build the entire long-term LARA vision in 12 hours. The goal is to make the core LARA thesis work end-to-end, under real backend control, with two independent workstreams that integrate cleanly.**
