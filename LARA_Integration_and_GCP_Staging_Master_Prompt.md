# LARA — Integration Branch, End-to-End Validation & Google Cloud Staging Master Prompt

**Purpose:** Bring the two existing LARA implementation branches together into one working application, preserve both original branches, integrate the actual Praneeth frontend with the Ashwath FastAPI runtime, and deploy a verified staging environment in the authenticated user's own Google Cloud project.

**Execution environment:** Google Antigravity with access to the complete local repository, Git, Docker, `gcloud`, and the user's authenticated Google Cloud account. This prompt must be executed inside the repository workspace, not by independently deploying either feature branch.

**Target integration branch:** `integrate/lara-gcp-staging`

**Repository:** `Ashwath-Raj/LARA-Lattice-Agentic-Runtime-Accelerator-`

---

## 0. Mission and non-negotiable outcomes

You are the integration and staging deployment engineer for LARA (Lattice Agentic Runtime Accelerator). Your job is to create one integrated, testable application from the current backend/runtime implementation and the actual Praneeth React frontend.

The required end state is:

1. Both existing implementation branches remain intact and unchanged.
2. A new integration branch contains the FastAPI backend/runtime and the Praneeth frontend, with deliberate conflict resolutions.
3. The deployed FastAPI service serves the Praneeth React application and `/api/v1/*` from one Cloud Run origin, following the existing single-origin architecture unless a documented technical blocker requires an approved change.
4. Real backend responses—not demo fixtures—populate the UI wherever APIs exist.
5. Missing or unsupported functionality is visibly labelled, reported, and not fabricated.
6. Persistent application data uses the user's Firestore Native database; files use the user's private Cloud Storage bucket; model inference uses the user's Vertex AI project; secrets use Secret Manager.
7. goboxd/nsjail runs as a separate hardened Linux VM with private authenticated communication. Never run nsjail inside the ordinary Cloud Run application container.
8. Staging acceptance is based on genuine application, cloud-service, security and sandbox tests. A green frontend build or a running Cloud Run revision alone is not acceptance.
9. The final report gives exact commit SHA, branch, URLs, Cloud Build link/status, test outputs, service validation, sandbox status, blockers and resource/cost summary.

Do not claim production readiness. This delivery is a controlled staging deployment with synthetic/demo data and simulated operational actions unless explicitly validated otherwise.

## 1. Current remote baseline — verified before execution

The latest remote branch heads observed during the handoff review were:

| Ref | SHA | Relationship to `main` |
|---|---|---|
| `main` | `39b4a3773f43f2a2f777356b3549820fabca36dd` | baseline |
| `feat/ashwath-runtime-goboxd-integration` | `9047f3ae11f28e5c8ce82a74ca116e8f9b88f30a` | 3 commits ahead, 0 behind |
| `feature/praneeth-frontend` | `1e10bcc012296ff121bf1edefc822d104983ed94` | 11 commits ahead, 3 behind |

Both feature branches have diverged. Do not treat either as a replacement for the other and do not merge blindly. A GitHub compare previously returned 172 changed paths for backend vs `main`, and up to 300 changed paths for frontend vs `main` (the comparison response was capped). The frontend branch includes a large collection of local/editor agent skills and settings, checked-in `frontend/node_modules`, and `frontend/dist` output. The backend branch includes its own, older frontend source and compiled UI assets under `backend/app/static`.

These are remote baseline observations, not a substitute for a fresh fetch. **Before changing anything, fetch and verify the exact current heads again. If any SHA differs, recompute all comparisons and use the current heads.**

### Ownership and preservation

- Preserve `feat/ashwath-runtime-goboxd-integration` and `feature/praneeth-frontend` unchanged.
- Perform all integration work on `integrate/lara-gcp-staging` only.
- Do not push to `main` or modify either original feature branch.
- The existing two-person ownership model remains important: Ashwath owns backend/runtime, data, security semantics, contracts and infrastructure; Praneeth owns the React frontend, UI and design assets. The handoff authorizes integration and deployment, but does not authorize casually changing backend security semantics or changing the frozen contract without review.
- Backend/business-logic or security-policy changes must have tests and be clearly itemized for Ashwath's review. If an access-control, tenant-isolation, data-model, or policy-semantics change is required and its intended behavior is unclear, stop that change and record a precise review request instead of guessing.

## 2. Required documentation — read before implementation

Read these files from the latest backend branch, not from an old local checkout:

1. `docs/13_ANTIGRAVITY_EXECUTION_RULES.md`
2. `docs/09_API_CONTRACT.md`
3. `docs/08_UX_FLOW_AND_SCREEN_SPEC.md`
4. `docs/10_TWO_PERSON_12_HOUR_PLAN.md`
5. `docs/DEPLOYMENT_HANDOFF.md`
6. `docs/IMPLEMENTATION_STATUS_PROMPT_2A.md`
7. `docs/GAP_REPORT_AND_CONFLICT_REGISTER.md`
8. `docs/SANDBOX_VM_RUNBOOK.md`
9. `contracts/openapi.yaml` and `contracts/openapi.json`
10. `README.md`, `.env.example`, `Dockerfile`, `cloudbuild.yaml`, `requirements.txt`

Also inspect the full current frontend branch, especially:

- `frontend/src/App.tsx`
- `frontend/src/features/**`
- `frontend/src/components/**`
- `frontend/src/api/**`
- `frontend/src/data/**`
- `frontend/src/styles/**`
- `frontend/package.json` and its actual lockfile
- `frontend/vite.config.ts`
- `frontend/docs/**`
- the Phase 6/6.1 design review and accessibility artifacts

Do not treat `frontend/docs/FINAL_INTEGRATION_TRUTH_AUDIT.md` as current truth without rechecking it. Its earlier report was based on an older backend commit. Since that audit was written, the backend added `GET /approvals`, `GET /graph/nodes`, the agent registry routes and evolution rollback. Re-audit everything against the current backend code and current API contract.

## 3. Phase 0 — repository safety, fresh fetch and branch preparation

Run and record:

```bash
git status --short --branch
git branch --show-current
git remote -v
git fetch --all --prune
git status --short --branch
git log --oneline --decorate --graph --all -30
git rev-parse origin/main
git rev-parse origin/feat/ashwath-runtime-goboxd-integration
git rev-parse origin/feature/praneeth-frontend
git diff --check
```

Before continuing:

- Confirm the working tree is clean or safely preserve every existing local modification in a documented backup/worktree. Do not discard user changes.
- Confirm the three branch heads and compare backend/frontend feature branches against `main` and each other.
- Inspect merge bases and commit histories. Identify common files, shared docs, duplicate design assets, frontend implementations, generated bundles, and dependency differences.
- If the remote branches have changed since the verified SHAs above, use the new heads and update this baseline report.
- Confirm the authenticated Git account has permission to create and push the new integration branch.

Create a **separate worktree or clean clone** for integration where possible. Create `integrate/lara-gcp-staging` from the latest `origin/feat/ashwath-runtime-goboxd-integration` commit, because this contains the backend/runtime, contracts, tests and deployment scaffolding. Do not merge the UI branch wholesale into this branch. Bring the Praneeth-owned frontend source and relevant design/docs selectively in the following phases.

Do not cherry-pick or merge the entire frontend branch before classifying its files. Do not rebase or rewrite either original branch.

## 4. Phase 1 — merge architecture and file selection

The backend branch already contains a separate React frontend under `frontend/` and an older compiled frontend under `backend/app/static/`. The Praneeth branch contains the intended newer React 19, TypeScript and Vite UI. The final application must use the Praneeth UI, not the older Ashwath starter UI.

### Include selectively from `feature/praneeth-frontend`

Bring across the actual application source, tests and design assets needed to run the Praneeth app. Include relevant source such as:

- React application, pages, features, components, layouts, auth context and UI primitives.
- API client, transport, types, adapters and API tests.
- Bright Lattice / Phase 6.1 CSS, design tokens and required public assets.
- package manifest and the correct committed lockfile.
- essential frontend documentation that describes the actual UI and integration.

Reconcile versions deliberately. Do not downgrade the Praneeth React/Vite/TypeScript toolchain just to match the old starter UI without a tested reason.

### Do not bulk-import these from the frontend feature branch

- `frontend/node_modules/**`
- `frontend/dist/**` (generated files; build them from source on the integration branch)
- `.agent/**`, `.claude/**`, `.codex/**`, `.cursor/**`, `.dsh/**`, `.gemini/**`, `.impeccable/**`, `.taste-skill/**` and other personal/local AI tooling settings or skills
- local editor state, cache, secrets, user-specific settings and unrelated machine configuration
- old generated screenshots, test captures or ZIP artifacts unless they are specifically required as release evidence and are intentionally selected

Preserve these in the original feature branch and any user's local environment; do not delete them there. Do not run broad `git clean`, `git rm -r`, or destructive cleanup commands.

### Conflict-resolution policy

For each overlapping path, record:

- path;
- backend branch version;
- frontend branch version;
- chosen version or combined result;
- reason;
- tests proving the result.

Preserve backend routes, schemas, security checks, domain models, repositories and runtime logic unless a specific defect blocks the requested integration. Preserve the Praneeth interface and visual language. Reconcile root deployment docs/config carefully; do not keep the Ashwath project or bucket names.

Create `docs/INTEGRATION_CONFLICT_RESOLUTION.md` and maintain it as conflicts are handled. Do not auto-resolve all conflicts using `ours` or `theirs`.

## 5. Phase 2 — lock the actual API contract against backend code

The authoritative intended API contract is `docs/09_API_CONTRACT.md`; verify it against current route handlers, Pydantic schemas, service behavior and generated FastAPI OpenAPI. The current backend route set is more complete than the earlier frontend gap report.

### Routes observed in the current backend branch

- Auth: `POST /auth/demo-login`, `GET /auth/me`, `POST /auth/logout`.
- Health: `GET /health/live`, `GET /health/ready` (also mounted under `/api/v1/health/...`).
- Tasks: `POST /tasks`, `GET /tasks/{task_id}`, `GET /tasks/{task_id}/events`, `POST /tasks/{task_id}/run`, `POST /tasks/{task_id}/cancel`.
- Highways: `GET /graph/summary`, `GET /graph/nodes`, `GET /graph/routes/resolve?task_id=...`, `POST /graph/routes/preview`, `GET /graph/version`.
- Agents: `GET /agents`, `GET /agents/{agent_id}`, `GET /agents/{agent_id}/versions`, `GET /agents/{agent_id}/skills`.
- Evolution: `GET /evolution/proposals`, `GET /evolution/proposals/{proposal_id}`, `POST /evolution/proposals`, `POST /evolution/proposals/{proposal_id}/evaluate`, `/approve`, `/reject`, and `POST /evolution/versions/{version_id}/rollback`.
- Governance/policy: `POST /policies/evaluate`, `GET /governance/principals`, `GET /governance/decisions`.
- Approvals: `GET /approvals`, `GET /approvals/{approval_id}`, `POST /approvals/{approval_id}/decision`.
- Audit: `GET /audit`, `GET /audit/{trace_id}`, `GET /audit/events/{event_id}`.
- Files: `POST /files/upload`, `GET /files/{file_id}/download`.
- Tools: `POST /tools/sandbox/run`.

### Confirmed gaps or mismatches to resolve

1. **No `GET /tasks` route was present in the inspected current `tasks.py`.** The Overview and Investigations lists therefore cannot show a durable cross-session task history from this backend yet. Implement a tenant- and role-scoped list endpoint only after reviewing the existing task access rules and adding backend tests. Update the contract and generated OpenAPI under backend ownership. Until then, show current-session tasks as “This session only” and show an empty/unavailable state; never merge in seed demo tasks in API mode.
2. **No graph edges/topology edge route was present.** `GET /graph/nodes`, `/graph/summary`, route resolution and graph version exist. Use actual permitted nodes and actual selected paths. Do not invent edges. Either add a tenant/policy-filtered graph edges endpoint with Ashwath's review and security tests, or present the topology as a route/path view using only actual backend path data. Any decorative/static graph must be clearly labelled “illustrative”, not live topology.
3. **Agent routes now exist.** Connect the UI to `/agents`, detail, versions and skills. Review registry visibility/tenant/role scope in `AgentRegistry` and route handlers; require authorization tests before exposing privileged metadata. Do not display fabricated run counts, deployment health or execution totals if the backend does not return them.
4. **Approval listing now exists.** Connect `getApprovals()` to `GET /approvals`; remove local array/default demo approval fallbacks in API mode. Respect server-side visibility and decision errors. Approval decisions require `decision` plus a reason of at least 8 characters; the server enforces separation of duties and policy.
5. **Evolution rollback now exists.** The actual route is `POST /evolution/versions/{version_id}/rollback`, with a `RollbackRequest` body containing `target_id` and `rollback_to_version`. The frontend's older simulated rollback or different endpoint must be replaced by the exact backend route and adapter. Do not send a body to the approval endpoint if the current backend contract requires none; verify the current schema before implementation.
6. **Task creation behavior is synchronous in the current service.** `OrchestratorService.create_task()` writes an initial queued record, calls `execute_task_pipeline()` synchronously, and then returns the original `task_record` object. The route returns `TaskAccepted` with a potentially stale initial status. Do not make a second `/run` call automatically without verifying the current state machine; that could execute the same work twice. Fetch `GET /tasks/{task_id}` after acceptance to show the persisted current state. Measure request latency with the live model. If the synchronous design causes Cloud Run/proxy timeout risk, propose a tested job/queue or truly asynchronous task design through Ashwath; do not fake asynchronous behavior.
7. **Health readiness is narrower than a full dependency health dashboard.** Current `/health/ready` checks repository/Firestore access and mandatory configuration. It does not prove Vertex AI inference, GCS uploads, or goboxd readiness. Display only checks that the backend actually performs. Add separately authenticated/timeout-bounded diagnostics if needed; do not infer all services are healthy from HTTP 200.
8. Compare all current request/response shapes, error envelopes, enum values, cookie behavior, filters, pagination and status transitions. Do not assume older frontend adapters remain compatible.

### Required contract deliverables

Create/update:

- `docs/INTEGRATION_API_MATRIX.md`
- `docs/INTEGRATION_CONFLICT_RESOLUTION.md`

The matrix must show each frontend function, screen, actual backend route, method, request type, response type, adapter, auth requirement, tenant/role enforcement, status and test evidence. Explicitly separate `IMPLEMENTED`, `NOT IMPLEMENTED`, `INCOMPATIBLE`, `MOCK ONLY`, and `NOT TESTED`.

Generate the FastAPI OpenAPI document from the integrated backend and compare it with `contracts/openapi.yaml` and `contracts/openapi.json`. If drift exists, coordinate updates with the backend owner and add a test that detects drift. The frozen contract wins unless an approved change is recorded.

## 6. Phase 3 — frontend integration and truthful data provenance

Preserve the Praneeth UI and Bright Lattice design direction from `docs/08_UX_FLOW_AND_SCREEN_SPEC.md`. Avoid another visual redesign. Integrate the current backend response shapes through one typed API transport and typed adapters.

### Authentication and identity

- Use the server-side `lara_session` HttpOnly cookie; all protected requests must use credentials correctly.
- At app startup, show a loading state while `GET /auth/me` is checked. Do not initialize the production UI as an authenticated seeded principal.
- If there is no valid session, show the unauthenticated/login state. Do not silently swallow a 401 and continue as a default operator.
- Demo identity choices are only selectable through the login screen and `POST /auth/demo-login`; the backend is authoritative for role, department, clearance and tenant. Never trust frontend role claims.
- `POST /auth/demo-login` accepts `password` or `demo_password` (per Pydantic aliases) and returns nested `principal` plus compatibility top-level fields. Confirm the current API contract before adapting.
- Do not embed a real password, reusable secret or privileged credential in Vite environment variables or the browser bundle. Treat the seeded demo password as a secret. Restrict staging access at the Cloud Run/IAP/network edge; do not publish an unrestricted public demo login for sensitive staging.
- Login, logout, identity switch failures and expired sessions must have explicit UI feedback. Do not silently catch and ignore them.

### Required repairs in the current Praneeth frontend

Review and correct the concrete issues previously observed in `feature/praneeth-frontend`:

- `frontend/src/App.tsx`: `createInvestigation()` currently catches a failed `api.createTask()` but still announces “Investigation created” and selects a demo task. This is false success. Replace it with explicit failure feedback and remain on the form/list when backend submission fails.
- `frontend/src/features/auth/AuthContext.tsx`: currently starts from `api.getCurrentPrincipal()` (a seeded in-memory principal), calls `GET /auth/me` and ignores failure. Replace with explicit `loading | unauthenticated | authenticated` state for API mode. The API response must establish the identity.
- `frontend/src/api/client.ts`: `getHealth()` tries nonexistent `/health` if `/health/ready` fails. Remove this invalid fallback and surface the original failure.
- `getRecentTasks()` currently tries `/tasks` and on any error silently returns session tasks. Distinguish 404/unimplemented from transient failure and never make API-mode output look like historical backend data. Until `GET /tasks` exists, clearly label current session history only.
- `getGraphNodes()` and `getGraphEdges()` currently return fixtures even in API mode. Fetch `/graph/nodes`; use authorized returned nodes. Do not fabricate graph edges. Use route path or a clearly labelled illustrative fallback.
- `getAgents()` and `getAgent()` currently return `MOCK_AGENTS` even in API mode. Fetch the backend registry/detail/version/skills routes and adapt actual response fields. Missing metrics must display “Not reported”, not invented counts.
- `getEvolutionProposals()` must return an actual empty array when the backend returns `[]`; do not fall through to the seeded proposal when no server proposal exists. Candidate content/diff must be absent or “Not supplied” if backend does not return it.
- `getApprovals()` currently reads the local in-memory map only. Connect it to `GET /approvals`; remove mock defaults in API mode.
- `getAuditEvents()` currently falls back to `/audit/events` and then local events on error. Use documented `/audit` filters and trace/event detail routes. Surface failures; do not mix session-only and server events without labelling each provenance.
- Investigation detail components currently catch task/evidence/event failures and render sample timelines/evidence/agent outputs. In API mode, show loading/empty/unavailable/error states instead of sample records.
- Overview currently includes fixed KPIs, a hardcoded activity chart, sample timeline events, “4 sources connected” and similar status copy. Remove these from API-mode production views or label them explicitly as illustrative/demo data. No demo metric may be presented as a live runtime metric.
- Governance principal directory and counts are currently static. Call `GET /governance/principals` only when the backend permits the current role; handle 403 as an authorization state. Do not provide policy mutation UI because the MVP contract has no policy mutation route.
- Approval Queue currently renders a demo approval when no real approval exists. Remove this for API mode; show a genuine empty queue.
- Audit metrics, trace sample timeline and sample JSON payload are hardcoded. Replace with actual audit and trace data or clearly label the selected sample as a demo fixture.
- Any chart, graph, route or animated data path must represent an actual returned value or be explicitly labelled as illustrative.

### Screen acceptance

- Overview: actual health, actual task/approval list where implemented; no false KPIs.
- Investigations: task creation, task status, evidence, agent outputs, verification results and events are from server responses; if the backend does not return a field, show a neutral unavailable state.
- Highways: actual authorised route, graph version, permitted sources/tools, excluded candidates; nodes from `/graph/nodes`; no fabricated edges.
- Agents: actual registry, detail, versions and skill metadata; no invented run counts.
- Evolution: actual proposals, server evaluation evidence, server approve/reject/rollback; no fake diffs or test results.
- Governance: real policy decisions and permitted principal directory; no client-side authorization authority.
- Approvals: real queue and server-authoritative decisions with mandatory reason; refresh actual server state after decisions.
- Audit: actual server events, trace IDs and filters; never append fabricated events to the real audit stream.

Use explicit UI data modes only for development/test. Production build must default to API mode and fail closed if API access fails. Add tests that verify API mode never falls back to fixtures after 401, 403, 404, 5xx, network failure or empty responses.

## 7. Phase 4 — build the Praneeth frontend into the FastAPI static application

The documented product architecture is a single-origin FastAPI + React Cloud Run service. The backend branch's current Dockerfile copies `backend/` and `data/` but does not build the new Praneeth frontend from source. The Praneeth frontend Vite config currently defaults to `frontend/dist`; that is not automatically the directory FastAPI serves (`backend/app/static`).

Implement a reproducible multi-stage container build (or an equally deterministic Cloud Build pipeline) that:

1. Uses a supported Node release compatible with the selected Vite/React/TypeScript toolchain.
2. Installs frontend dependencies from the committed lockfile using a frozen/locked install (`npm ci`, `pnpm --frozen-lockfile`, or Bun frozen lock as appropriate). Do not use an unlocked install in CI.
3. Runs frontend type-check, test and production build.
4. Places the generated UI in `backend/app/static/` (or another deliberately configured directory that `backend/app/main.py` actually mounts).
5. Builds the Python runtime with `requirements.txt`, copies backend, data and built static assets, runs as non-root, listens on `$PORT`, and excludes node_modules, `.git`, caches, local `.env`, credentials and test artifacts.
6. Confirms `GET /` returns the Praneeth UI and the static JS/CSS assets, while `/api/v1/health/live`, `/api/v1/health/ready` and the API routes continue to function.

Inspect Vite's resolved output path and FastAPI's `static_dir` before editing either. Remove/replace the stale compiled Ashwath UI bundle only on the new integration branch, and only after the Praneeth build reproducibly generates the correct replacement. Do not commit a local `dist` build as the source of truth.

Update `.dockerignore` and `.gitignore` carefully. Exclude `node_modules`, generated `dist`, `.env*` except `.env.example`, service-account JSON, test caches, local editor/AI state and secrets. Preserve relevant public frontend files and the backend synthetic data required for the demo.

## 8. Phase 5 — goboxd/nsjail separate deployment

The LARA adapter communicates with goboxd using a bearer token and expects `/readyz`, `/info` and `/run`. The sandbox is a separate service, not a library embedded into Cloud Run.

1. Inspect `docs/SANDBOX_VM_RUNBOOK.md`, the current LARA goboxd adapter and the exact current `Praneeth0910/goboxd` repository/branch/API.
2. Provision a dedicated hardened Linux Compute Engine VM in the user's own GCP project, in a subnet reachable from Cloud Run through a private route.
3. Do not assign a public IP unless a documented, approved bootstrap need exists; if temporary bootstrap ingress is used, remove it before acceptance.
4. Configure Cloud Run VPC egress. Prefer Direct VPC egress where supported for the chosen service/region/network; use a Serverless VPC Access connector only if direct egress cannot meet the network requirement. Restrict firewall ingress to the Cloud Run egress subnet/revision network tag and goboxd port only.
5. Use a private VM address in `GOBOXD_BASE_URL`. Require TLS or another documented authenticated private transport appropriate to the threat model; use a strong random bearer token from Secret Manager, not a checked-in `.env` value.
6. Apply Linux security hardening, nsjail, cgroup v2, bounded workers/queues, wall-clock, memory, process and output limits, and network isolation. Confirm non-root operation where compatible with nsjail's required kernel features; document any necessary privileged host setup.
7. The sandbox must not receive LARA's Firestore, GCS or Vertex credentials. It must not access Cloud metadata credentials. Block outbound internet and lateral VPC movement unless an explicit allowlist is required and tested.
8. Keep `GOBOXD_KILL_SWITCH=true` until VM health, private connectivity, authentication, isolation and live tests pass. When unavailable, LARA must fail closed and must not execute untrusted code locally or in Cloud Run.
9. Run both live skipped tests against the provisioned VM:
   - `tests/integration/test_live_goboxd_vm.py::test_live_vm_goboxd_execution`
   - `tests/integration/test_live_goboxd_vm.py::test_live_vm_nsjail_network_isolation_blocked`
10. Also test unauthorized token, no token, wrong VM endpoint, readiness failure, timeout, resource exhaustion, oversize output, disallowed language, network denial and kill-switch behavior.

### goboxd licence

The `Praneeth0910/goboxd` repository's README identifies GNU GPL v3.0 and its LICENSE is GPL-3.0. Keep goboxd independently deployed as a service and do not copy its source into the LARA codebase/container as part of this task. If any source is vendored, modified, redistributed or linked into a combined distributed work, stop and obtain a GPL-3.0 compliance/legal review first. Preserve notices and source-offer/reciprocal obligations where they apply. Record the exact goboxd commit SHA and licence evidence in the handoff.

## 9. Phase 6 — Google Cloud project discovery and safety gate

The handoff explicitly requires using the authenticated user's **own** Google Cloud project and billing account, not Ashwath's development project. The backend docs currently contain the old project/bucket identifiers `lara-runtime-ashwath-2026` and `lara-runtime-ashwath-2026-assets`; these are not approved for this deployment. Replace those values with user-project placeholders or runtime substitutions in the integration branch. Never copy Ashwath's project ID, bucket, service accounts, secrets or billing resources into this staging deployment.

Run these read-only checks first:

```bash
gcloud auth list
gcloud config list --format='text(core.account,core.project,compute.region,run.region)'
gcloud projects describe "$(gcloud config get-value project)"
gcloud billing projects describe "$(gcloud config get-value project)"
gcloud services list --enabled --project="$(gcloud config get-value project)"
```

Safety gates:

- Confirm the active account belongs to the user and is the intended deployment identity.
- Confirm an explicitly selected project ID exists and has billing enabled.
- Confirm the project ID is **not** `lara-runtime-ashwath-2026` and no deployment resource is being created in Ashwath's project.
- Confirm the user has the necessary permissions to enable APIs, create IAM service accounts, configure Firestore, create buckets, Artifact Registry, Secret Manager secrets, Cloud Build triggers and Cloud Run services.
- Do not create a project, attach billing, enable paid APIs, provision a VM or create billable resources if the intended project/account is ambiguous or absent. Stop and ask the user to select/connect their own project. Do not guess a project ID.
- Record project ID, project number, authenticated principal, billing status and chosen region. Never print tokens, secrets or JSON key contents.

Use a project/region configuration file or substitutions that refer only to the chosen user project. Suggested default region: `asia-south1` for a Chennai/India deployment, subject to actual availability for each required service and the selected Vertex model. Keep Firestore, Cloud Run, storage and the VM region aligned where practical, while respecting service availability and data residency requirements.

## 10. Phase 7 — provision staging services in the user's project

First create an infrastructure plan and a resource inventory. Use Terraform or idempotent `gcloud` scripts checked into `infra/` with no secret values. Tag/name every resource as staging. Apply least privilege.

### Enable only required APIs

At minimum assess and enable, where actually needed:

- Cloud Run Admin API
- Cloud Build API
- Artifact Registry API
- Firestore API
- Cloud Storage API
- Vertex AI API
- Secret Manager API
- Compute Engine API
- Cloud Logging / Monitoring APIs
- Serverless VPC Access API only if a connector is used
- IAM Credentials API only if required by the chosen workload identity setup

Do not enable unrelated APIs.

### Provision services

- Create Firestore in Native mode in the chosen region; use a dedicated database if appropriate and update `FIRESTORE_DATABASE` accordingly.
- Create a private GCS bucket with uniform bucket-level access and public access prevention. Apply lifecycle/retention settings appropriate for temporary attachments and audit data. Do not make the bucket public.
- Create an Artifact Registry Docker repository in the chosen region.
- Create dedicated user-managed service identities:
  - Cloud Run runtime identity.
  - Cloud Build execution identity.
  - Optional VM/goboxd identity only if goboxd itself legitimately needs Google APIs; default is no LARA data/model permissions.
- Grant Cloud Run runtime identity only what the application requires, such as Firestore `roles/datastore.user`, Vertex AI `roles/aiplatform.user`, bucket-scoped Storage Object permissions, Secret Manager Secret Accessor on only the specific required secrets, and log/metric writer roles. Prefer bucket- or secret-level IAM bindings over project-wide grants where supported.
- Grant Cloud Build only the required build, Artifact Registry push, Cloud Run deploy and `iam.serviceAccountUser` permissions on the Cloud Run identity. Do not grant Owner or Editor as a convenience.
- Create secrets in Secret Manager for `SECRET_KEY` (cryptographically random, at least 32 characters), `GOBOXD_INTERNAL_AUTH_TOKEN` (random strong token), and any additional actual sensitive configuration. Do not store secret values in repository files, Cloud Build substitutions, build logs, or browser environment variables.
- Configure Cloud Run to reference secret versions through Secret Manager secret integration. Do not use a service-account JSON key or `GOOGLE_APPLICATION_CREDENTIALS` in Cloud Run; use the Cloud Run service identity / ADC.
- Configure Cloud Logging, structured request/trace IDs, retention and alerting appropriate to staging.

### Environment variables

Set only values that belong to this specific project:

- `APP_ENV=production` (backend also supports `ENVIRONMENT` alias)
- `GOOGLE_CLOUD_PROJECT=<USER_PROJECT_ID>`
- `FIRESTORE_DATABASE=<USER_FIRESTORE_DATABASE>`
- `GCS_BUCKET=<USER_PRIVATE_BUCKET>`
- `VERTEX_AI_LOCATION=<VERIFIED_MODEL_REGION>`
- `VERTEX_AI_MODEL=<CURRENT_SUPPORTED_MODEL>`
- `COOKIE_SECURE=true`
- `COOKIE_SAMESITE=lax` (same-origin UI/API; adjust only if the deployment architecture requires it)
- `CORS_ALLOWED_ORIGINS=<explicit allowed origins>`; with the recommended same-origin frontend, avoid unnecessary cross-origin CORS. For Vite local development, use the development proxy rather than wildcard credentialed CORS.
- `LARA_USE_LIVE_FIRESTORE=true`
- `LARA_USE_LIVE_VERTEX_AI=true`
- `GOBOXD_BASE_URL=<PRIVATE_VM_URL>`
- `GOBOXD_KILL_SWITCH=true` until sandbox validation completes.

Inject `SECRET_KEY` and `GOBOXD_INTERNAL_AUTH_TOKEN` from Secret Manager. Do not copy demo placeholder strings from `.env.example` into staging. Check the settings model's production import-time validation; the backend requires a non-empty strong secret, project ID, GCS bucket and secure cookies in production.

### Vertex model lifecycle gate

The backend docs/config currently default to `gemini-2.5-flash`. Google lists `gemini-2.5-flash` as retired on October 20, 2026; do not deploy the staging environment with that retired model ID. Re-check current Vertex AI model lifecycle, region availability, quotas and provisioned-throughput requirements immediately before deployment. `gemini-3.5-flash` is a documented GA candidate with a published retirement date of May 19, 2027 or later, but regional serving constraints apply in some Asia Pacific regions. Select a supported model only after confirming availability for the user's project and chosen region, then make the change in project config and test a real controlled inference call. Do not assume a model ID works simply because the SDK initializes.

### Cloud Run staging

- Deploy the single-origin LARA container to a staging Cloud Run service (e.g. `lara-runtime-staging`) in the selected region.
- Require authentication at the Cloud Run/IAP or equivalent access boundary for staging; do not expose synthetic demo identities as unrestricted public access.
- Set min instances to zero unless a documented demo responsiveness need justifies cost; set conservative max instances/concurrency initially.
- Ensure the runtime service account is explicitly configured.
- Attach VPC egress to the VM's private subnet for goboxd; use Direct VPC egress where supported and suitable.
- Configure ingress and authentication intentionally; do not make the sandbox public.
- Use same-origin static UI/API session cookies. Confirm `Secure`, `HttpOnly`, SameSite and domain/path settings in browser developer tools without exposing cookie values.
- Validate HTTPS, health checks, startup and readiness, request timeout assumptions, max instances and resource memory/CPU.

## 11. Phase 8 — repair the Cloud Build pipeline and deployment scripts

The existing `cloudbuild.yaml` is incomplete for the current application:

- It runs backend pytest and builds a container, but does not clearly build the Praneeth React source into the static directory used by FastAPI.
- The existing Dockerfile copies backend/data and does not run a frontend build stage.
- Its deploy args set some environment values, but omit multiple required production settings and Secret Manager bindings.
- It hardcodes a region/model location that must be made consistent with the current project configuration.

Update pipeline to:

1. Run frontend frozen dependency installation, type-check, tests, lint and production build.
2. Run Python compilation, full backend unit/integration/security tests and OpenAPI contract checks.
3. Run container build with a commit-SHA immutable tag.
4. Run image/security checks appropriate for staging; do not print secret values.
5. Push to the user's Artifact Registry repository.
6. Deploy a new staging Cloud Run revision with correct runtime service account, secret references, project-scoped config, region, VPC egress and ingress/auth settings.
7. Perform post-deploy health and UI/API smoke tests. If the smoke test fails, stop and roll back the staging revision; do not declare success.
8. Record the Cloud Build build ID, URL, logs, image digest, revision name and deployed commit SHA.

Use a dedicated, least-privilege Cloud Build service account. Cloud Run docs recommend a user-specified build identity rather than relying blindly on the default identity; verify the exact roles required by the chosen build/deploy workflow. Do not elevate to Project Owner/Editor to bypass permission errors.

Keep secret values out of substitutions and build args. Use Secret Manager service configuration for runtime secrets.

## 12. Phase 9 — backend and data integrity verification

Run all backend tests against the integration branch and report the exact output. The backend handoff reports 77 passed, 2 skipped and 0 failures, but treat this as a prior local report only; rerun all tests on the integrated branch.

Verify:

- Firestore Native mode is being used in production; there is no silent in-memory repository fallback.
- Seed data is synthetic, tenant-scoped and safe for staging. Run the seed script only after review and only against the user's new staging database.
- Tenant isolation holds for principals, tasks, graph nodes, approvals, audit events, files, proposals and agent metadata.
- Cross-tenant reads and writes are denied without leaking existence.
- Protected graph nodes are not returned to users without clearance.
- Approval separation of duties, policy gates and role restrictions still work.
- Evolution evaluation and promotion are backend-controlled. The UI cannot alter evaluation results or bypass admin authorization.
- Physical/equipment actuation is denied; simulated maintenance actions remain labelled `SIMULATED`.
- File upload validates MIME, size, filename, tenant access and storage privacy; download requires same-tenant permission.
- Audit events are written for route resolution, source access, agent activity, policy outcomes, approvals, sandbox calls and evolution events as designed.
- The application does not claim Vertex AI, GCS or goboxd are healthy unless each has an actual validated call/probe. Keep readiness semantics honest.

## 13. Phase 10 — end-to-end staging test plan

Test in a real browser against the deployed staging URL and the deployed backend. Use seeded synthetic identities with restricted staging access. Do not use private or real industrial datasets.

### Core workflow

1. Access staging through the configured access boundary.
2. Authenticate using a valid seeded test principal; confirm server cookie and `/auth/me`.
3. Log out; verify server-side session invalidation and protected API 401.
4. Create an investigation; confirm task ID and trace ID from the server.
5. Retrieve current task details and events; show actual status, evidence and agent outputs only.
6. Inspect actual Information Highway route, graph version, permitted sources/tools and excluded candidates for that principal.
7. Switch to a different role through backend login; verify route data is refetched and restricted sources are not disclosed.
8. Evaluate policy for representative ALLOW, DENY and REQUIRE_APPROVAL cases; compare frontend to backend decision.
9. Create/observe a real approval request, confirm queue visibility, attempt requester self-approval and verify backend rejection, then approve/reject with a sufficiently detailed reason using a different authorized principal.
10. Confirm associated task state and audit events update on the backend.
11. Inspect the agent registry, versions and skills from backend responses.
12. Inspect an actual evolution proposal, run the server evaluation, confirm actual case evidence, approve/reject with an administrator and test rollback if a valid version exists.
13. Inspect `/audit`, trace detail and event detail; confirm real trace IDs and event IDs.
14. Upload and download a permitted synthetic file; inspect Firestore metadata and private GCS object existence; verify cross-tenant download is denied.
15. Run one controlled Vertex AI inference request with synthetic, non-sensitive content and verify model ID, region, successful structured response, latency and cost/quota logs.
16. Check `/health/live` and `/health/ready`. Do not treat readiness as proof of every external dependency.
17. Test loading, empty, denied, unauthorized, validation, timeout, error and backend-unavailable UI states. Verify no demo fixtures leak into API mode.

### Browser and UI acceptance

- Desktop: at least 1440×900.
- Tablet: at least 768px wide.
- Mobile: 390×844 and a narrow width.
- Verify responsive navigation, keyboard focus, contrast, labels, accessible names, no clipping and graph/list fallback.
- Run the actual axe-core audit on major pages. Report axe violations and incomplete checks; do not claim WCAG certification from axe alone.
- Ensure no false success toast, fake task selection or demo fallback when API mode is active.

### Sandbox acceptance

Run both previously skipped live VM tests plus the additional negative tests from Phase 5. Only set `GOBOXD_KILL_SWITCH=false` after all mandatory sandbox tests pass. If they fail or the sandbox is unavailable, leave the kill switch enabled and explicitly report sandbox `BLOCKED`; other non-sandbox flows may be staging-tested, but the complete sandbox acceptance is not passed.

## 14. Phase 11 — tests, evidence and final reports

Run all relevant suites from a clean integration checkout. Save command outputs, exit codes, environment (redacted), timestamp and tested commit SHA.

At minimum run:

```bash
# Frontend
cd frontend
npm ci                    # or the correct frozen install command for the committed lockfile
npm run build
npm test -- --run
npm run lint

# Backend (from repository root)
python -m compileall backend
pytest -v

# Contract and diff hygiene
git diff --check
```

Adapt commands only to the actual committed package manager/lockfile and document why. Run the two live goboxd tests separately after the VM exists. Run integration tests against the deployed staging URLs, not just JSDOM mocks.

Create/update:

- `docs/INTEGRATION_CONFLICT_RESOLUTION.md`
- `docs/INTEGRATION_API_MATRIX.md`
- `docs/INTEGRATED_APPLICATION_ARCHITECTURE.md`
- `docs/GCP_STAGING_DEPLOYMENT.md`
- `docs/GCP_STAGING_SECURITY_AND_IAM.md`
- `docs/GCP_STAGING_VALIDATION_REPORT.md`
- `docs/GCP_STAGING_COST_SUMMARY.md`

The deployment docs must use the user's new project ID and resource names only. Do not commit secret values, tokens, service-account keys or credential files.

### Final handoff format

Provide:

1. Integration branch name and exact commit SHA.
2. Original backend and frontend branch SHAs retained unchanged.
3. Summary of merge conflicts and how each was resolved.
4. Files imported from the Praneeth branch and excluded local/generated/tooling files.
5. Frontend/backend architecture and the static build path used by FastAPI.
6. API contract matrix and any unsupported or blocked routes.
7. Frontend build, frontend tests, lint, backend tests, contract tests and live E2E exact results.
8. Staging frontend/application URL and API/health URLs.
9. Google Cloud project ID (not credentials), region, Cloud Run service/revision, Firestore database, GCS bucket, Artifact Registry repo, service accounts and Secret Manager secret names.
10. Cloud Build build ID/link, image digest, deploy logs and smoke-test evidence.
11. Firestore read/write, GCS upload/download, Vertex AI inference and Secret Manager validation evidence.
12. goboxd VM private endpoint (do not expose auth token), exact goboxd SHA/license, nsjail configuration summary, live test results and kill-switch status.
13. Security checks: IAM least privilege, tenant isolation, CORS/cookies, secret scan, public ingress, VM network isolation, sandbox restrictions and simulated action boundaries.
14. Remaining blockers, mocked/session-only components, unverified functionality and disabled features.
15. Resource and cost summary: active resources, region, configured scale limits, observed staging usage and estimated monthly floor/variable charges. Clearly label estimate vs billed actual.
16. A final readiness table with `PASS`, `PARTIAL`, `BLOCKED` or `NOT TESTED` for app integration, backend, Firestore, GCS, Vertex AI, Cloud Build, Cloud Run, authentication, governance, audit and sandbox.

## 15. Stop conditions — do not work around these

Stop and report the exact blocker if:

- Git branch state is dirty and changes cannot safely be preserved.
- The expected source branches are missing or their histories changed unexpectedly.
- Project/account/billing identity is ambiguous or points to Ashwath's project.
- The user does not have permission to create required resources.
- Secret Manager, Firestore, GCS, Vertex AI or Cloud Run cannot be configured securely.
- A change would weaken tenant isolation, policy enforcement, separation of duties, audit integrity or sandbox boundaries.
- A sandbox test fails and there is no safe correction.
- Deployment requires exposing secrets, giving broad Owner/Editor permissions, assigning an unnecessary public VM address, or executing untrusted code outside nsjail.

Never fake or simulate a successful deployment, cloud service check, Vertex inference, sandbox run, API response, CI build or browser test. Do not say “fully integrated” until the full acceptance matrix has actual evidence.

## 16. Final execution principle

Integrate deliberately, build reproducibly, deploy to the user's own staging project, verify real behavior, preserve the original branches, and tell the truth about every limitation. Prefer a clearly documented partial staging result over an unsafe or misleading green status.
