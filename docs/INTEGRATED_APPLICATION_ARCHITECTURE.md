# LARA — Integrated Application Architecture

**Service Model:** Single-origin Google Cloud Run Modular Monolith  
**Frontend Framework:** React 19.3.1 + TypeScript 5.7.2 + Vite 8.3.8 (Bright Lattice UI)  
**Backend Framework:** FastAPI 0.165 + Uvicorn 0.54 + Python 3.12 (Pydantic 2.14)  
**Primary Persistence:** Google Cloud Firestore Native Mode  
**Storage Substrate:** Google Cloud Storage (Private Bucket)  
**Model Substrate:** Google Vertex AI Gemini (`google-genai` SDK in Vertex AI mode)  
**Execution Sandbox:** Compute Engine Isolated Linux VM (`goboxd` + `nsjail` + cgroup v2)  

---

## 1. Single-Origin Container Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Google Cloud Run Container                        │
│                                                                        │
│  ┌─────────────────────────────────┐   HTTP Proxy   ┌───────────────┐  │
│  │     React 19 Frontend           │  (Local Dev)   │    FastAPI    │  │
│  │   (Bright Lattice Design)       │ <────────────> │  HTTP Router  │  │
│  │  Compiled in backend/app/static │                │   /api/v1/*   │  │
│  └─────────────────────────────────┘                └───────┬───────┘  │
│                                                             │          │
│       ┌───────────────────────┬─────────────────────────────┼──────┐   │
│       ▼                       ▼                             ▼      ▼   │
│ ┌───────────────┐     ┌───────────────┐             ┌────────────┐ ┌──┐│
│ │  Information  │     │   Multi-Agent │             │  Governed  │ │Au││
│ │   Highways    │     │  Orchestrator │             │Tool Gateway│ │di││
│ │   Resolver    │     │(Res, Ana, Ver)│             │ (AST Calc) │ │t ││
│ └───────┬───────┘     └───────┬───────┘             └──────┬─────┘ └──┘│
└─────────┼─────────────────────┼────────────────────────────┼───────────┘
          │                     │                            │
          ▼                     ▼                            ▼
┌──────────────────┐  ┌──────────────────┐         ┌─────────────────────┐
│ Google Cloud     │  │ Google Cloud     │         │ Compute Engine VM   │
│ Firestore Native │  │ Vertex AI Gemini │         │ (Isolated goboxd /  │
│ (State & Graph)  │  │ (Model Inference)│         │  nsjail Sandbox)    │
└──────────────────┘  └──────────────────┘         └─────────────────────┘
```

### Static Mounting Mechanism
FastAPI mounts the compiled React production bundle at the root path `/` via `fastapi.staticfiles.StaticFiles(html=True)`.
- Client-side navigation assets are served from `/assets/*`.
- Root path `GET /` serves `backend/app/static/index.html`.
- API endpoints are mounted with strict precedence under `/api/v1/*`.
- Standard Cloud Run liveness/readiness probes are mounted under `/health/live` and `/health/ready`.
- Session cookies use `HttpOnly`, `SameSite=Lax`, and `Secure=true` in production, eliminating cross-origin CORS attack surfaces.

---

## 2. Component Subsystems

### 2.1 Information Highways (Deterministic Route Resolver)
- In-process NetworkX graph index seeded from Firestore `graph_nodes` and `graph_edges` collections.
- Evaluates principal clearance (Internal vs Confidential), roles, and task intent before returning selected paths and permitted sources.
- Never discloses confidential sources (`source:vendor-contract`) or execution tools to unauthorized users.

### 2.2 Specialist Agent Fleet
- **Research Agent (`agent:research`):** Scans authorized incident logs, asset registries, and validated active SOPs.
- **Analysis Agent (`agent:analysis`):** Cross-correlates vibration anomalies with bearing wear models and SOP thresholds.
- **Verification Agent (`agent:verification`):** Audits evidence provenance, checks fact-claim citations, and applies constitutional policy guardrails.

### 2.3 Governed Tool Gateway
- **Safe Calculator (`tool:calculator-safe`):** In-process Python AST arithmetic evaluator; strictly blocks builtins, imports, and code execution.
- **Simulated Maintenance Dispatcher (`tool:maintenance-request`):** Emits simulated work orders with mandatory human-in-the-loop approval.
- **Equipment Actuation Boundary (`tool:equipment-control`):** Hard constitutional rejection at the gateway level. Actuation commands return 403 `PolicyDeniedError`.
- **Untrusted Code Execution (`tool:sandbox/run`):** Mediated exclusively over private VPC network to the dedicated `goboxd` VM.

### 2.4 Controlled Evolution Engine
- Evaluates candidate agent prompts against fixed functional test cases and immutable security invariants.
- Requires administrator approval (`runtime_admin`) for promotion.
- Supports instant rollback to parent versions via `POST /api/v1/evolution/versions/{version_id}/rollback`.

### 2.5 Immutable Audit Ledger
- Records append-only audit events for every route resolution, policy check, agent finding, approval decision, tool run, and file upload.
- Filtered by tenant and principal identity to maintain enterprise isolation.
