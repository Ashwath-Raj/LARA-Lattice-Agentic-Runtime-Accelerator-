# 10 — Two-Person 12-Hour Build Plan and File Ownership

## 1. Goal

At H+12, deliver one integrated Google Cloud-hosted LARA prototype. The plan prioritises three genuine proof points: Dynamic Information Highways, controlled evolution and identity-aware governance. This is a bounded demo, not a production enterprise platform.

## 2. Owners

### Person 1 — Ashwath: Backend, runtime, data, security and Google Cloud

Owns all backend and infrastructure files. No other person edits them.

```text
backend/**
contracts/openapi.yaml
contracts/examples/**
data/**
scripts/seed_demo.py
scripts/deploy.sh
infra/**
tests/backend/**
tests/integration/**
Dockerfile
cloudbuild.yaml
requirements.txt
.env.example
```

Responsibilities:
- FastAPI modular monolith and API contract.
- Firestore data repositories and graph node/edge storage.
- Dynamic Information Highway route resolver.
- Identity, RBAC, ABAC and delegation checks.
- Vertex AI Gemini adapter.
- Orchestrator and three specialist agents.
- Controlled evolution and evaluation runner.
- Tool gateway, approval service and audit.
- Synthetic dataset/SOP seed process.
- Cloud Run deployment, service identity, IAM, Firestore, GCS, Artifact Registry, Cloud Build, logging.
- Backend and integration tests.

### Person 2 — Praneeth: Frontend, UX, visual system and browser tests

Owns frontend and design files. No other person edits them.

```text
frontend/**
design/**
tests/frontend/**
```

Responsibilities:
- React/TypeScript/Vite app shell.
- Bright Lattice design tokens and component system.
- Demo login/identity switcher UI.
- Enterprise Workbench.
- Information Highway graph console.
- Agent registry UI.
- Evolution Lab and diff/evaluation view.
- Governance and approval screens.
- Audit timeline.
- API client based on frozen contract and mock fixtures.
- Browser tests, responsive layout and demo rehearsal.

### Shared files — only Ashwath may edit during build

```text
README.md
package.json (root only if monorepo)
Dockerfile
cloudbuild.yaml
contracts/openapi.yaml
.env.example
```

Praneeth requests changes via a short issue/message; Ashwath updates shared contract and notifies. This prevents concurrent edits.

## 3. Repository structure

```text
lara/
  backend/                 # Person 1
  frontend/                # Person 2
  contracts/               # Person 1 owns frozen contract
  data/                    # Person 1 owns seed data
  design/                  # Person 2 owns design integration
  infra/                   # Person 1 owns GCP configuration
  scripts/                 # Person 1 owns seed/deploy
  tests/
    backend/               # Person 1
    integration/           # Person 1
    frontend/              # Person 2
  docs/                    # Read-only during 12h unless agreed
  Dockerfile               # Person 1
  cloudbuild.yaml          # Person 1
```

## 4. Parallel work without collisions

- Use one Git repository, separate branches: `build/backend-ashwath` and `build/frontend-praneeth`.
- Each developer uses a separate worktree or separate clone. Never share one mutable working directory.
- No one edits the other person's ownership tree.
- Freeze request/response contract at H+0:30. Frontend mocks must match exact JSON examples.
- Backend provides `/health/live`, `/health/ready` and CORS same-origin behavior from the start.
- Frontend uses only `frontend/src/lib/api-client.ts`; no direct fetch scattered through components.
- Backend uses one response envelope and stable error codes.
- Integration only at H+2, H+5, H+8, H+10 and H+11.
- Merge one branch at a time. Run smoke tests after every merge.
- No dependency or architecture change after H+1 without Ashwath's approval.

## 5. 12-hour timeline

| Window | Person 1 — Ashwath | Person 2 — Praneeth | Gate |
|---|---|---|---|
| H+0–0:30 | Confirm GCP project, service region, Firestore/GCS, frozen API schemas | Confirm routes, tokens, component map, mock JSON | Contract signed |
| H+0:30–2 | FastAPI scaffold, auth, Firestore adapter, health endpoints, seed schema | App shell, login, Workbench shell, API client + mocks | Both boot; API contract stable |
| H+2–4 | Firestore graph seed, graph resolver, RBAC/ABAC checks, route endpoint | Highway graph canvas, identity switch, route explanation using mocks | Route response integrated |
| H+4–6 | Vertex adapter, orchestrator, Research/Analysis/Verification agents | Task detail, agent activity timeline, evidence/result panels | One task path runs end-to-end |
| H+6–8 | Evolution trigger, candidate generation, evaluation, approval/promotion | Evolution Lab, prompt diff, evaluation results and admin controls | Evolution lifecycle works |
| H+8–9:30 | Tool gateway, simulated action, approval separation, audit persistence | Governance, approval queue and audit timeline | Governance and trace integrated |
| H+9:30–10:30 | Backend tests, seed reset, cloud build/deploy | Frontend tests, responsive polish, browser smoke test | Deployed app works |
| H+10:30–11:30 | Fix blockers, final Cloud Run revision, verify IAM/data/model | Rehearse demo, capture fallback recording, verify UX labels | Release freeze |
| H+11:30–12 | No features. Final smoke test, evidence and handoff | No features. Demo run and handoff | H+12 acceptance |

The timeline is aggressive. If behind, reduce graph size, agent complexity and visual polish; do not remove policy enforcement, actual backend route resolution or candidate evaluation.

## 6. Checkpoint protocol

At every checkpoint each owner posts:
- Completed files/commit hash.
- Endpoints/components ready.
- Known defects.
- Contract changes requested (none unless approved).
- Next deliverable and ETA.

No one says “done” based only on a screenshot. Done means the flow runs against the deployed backend or the feature is explicitly marked as mock.

## 7. Integration sequence

1. Ashwath merges backend contract and health endpoints.
2. Praneeth merges app shell using same-origin API client.
3. Ashwath merges graph/policy endpoints; Praneeth connects graph UI.
4. Ashwath merges task orchestration; Praneeth connects Workbench task view.
5. Ashwath merges evolution endpoints; Praneeth connects Evolution Lab.
6. Ashwath merges approvals/audit; Praneeth connects those screens.
7. Ashwath builds one container and deploys to Cloud Run.
8. Both run acceptance checklist against public Cloud Run URL.

## 8. Conflict prevention rules

- Do not both edit root README or package manifests.
- Do not change field names independently.
- Do not create a second API client in frontend.
- Do not introduce shared generated types by manually copying and editing; generate from OpenAPI or use frozen examples.
- Do not merge incomplete work directly to release branch.
- No force-push to shared branches.
- Use small commits with prefixes: `backend:`, `frontend:`, `infra:`, `docs:`.
- Keep one integration owner (Ashwath) for release branch.

## 9. Stop-work / cut list

If the build slips:
1. Cut decorative graph animations.
2. Cut extra dashboards and charts.
3. Limit graph to 12–20 nodes and 20–40 edges.
4. Keep one scenario and one seeded failure.
5. Keep one model provider (Vertex AI Gemini).
6. Keep only 3 agents and 4 demo identities.
7. Use simulated connector only.

Never cut:
- backend identity resolution;
- policy check before protected source read;
- dynamic route recomputation by identity;
- versioned candidate and real evaluation test execution;
- admin approval before promotion;
- audit trace;
- Google Cloud deployment.
