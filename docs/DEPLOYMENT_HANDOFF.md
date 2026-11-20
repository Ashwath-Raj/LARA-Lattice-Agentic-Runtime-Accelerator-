# LARA — Deployment Handoff Guide

**Target Environment:** Google Cloud Platform (GCP) Staging & Cloud Run
**Repository:** `https://github.com/Ashwath-Raj/LARA-Lattice-Agentic-Runtime-Accelerator-`
**Branch:** `feat/ashwath-runtime-goboxd-integration`
**Base Branch:** `main`
**Author:** Ashwath Raj (Backend, Runtime & Architecture Lead)
**Status:** Locally verified, tested (77 passed, 2 skipped, 0 failed), ready for GCP infrastructure deployment.

---

## 1. Architecture Overview

LARA is an enterprise model-independent agentic runtime accelerator engineered as a Google Cloud modular monolith:

- **Single Container Target:** Cloud Run hosts both FastAPI backend (`/api/v1/*`) and the compiled single-origin React 19 frontend (`/`) served from `backend/app/static`.
- **Primary Database:** Google Cloud Firestore Native mode (isolated with tenant prefix and document mapping replacing colon syntax).
- **Blob Storage:** Google Cloud Storage private bucket for file attachments and diagnostic artifacts.
- **Model Substrate:** Vertex AI Gemini (`gemini-2.5-flash` in `asia-south1` or `us-central1`) invoked via the official `google-genai` SDK using Application Default Credentials (ADC) or Cloud Run Workload Identity.
- **Governed Sandbox:** Separate Compute Engine VM running `goboxd` with `nsjail` and cgroup v2 for zero-trust tool and untrusted code execution.

```
┌─────────────────────────────────────────────────────────────┐
│                 Single Cloud Run Container                  │
│                                                             │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │  React 19 Frontend    │       │    FastAPI Backend    │  │
│  │  (Bright Lattice UI)  │ ────> │       /api/v1/*       │  │
│  │  Static in app/static │       │                       │  │
│  └───────────────────────┘       └───────────┬───────────┘  │
│                                              │              │
│       ┌──────────────────────────────────────┼──────────┐   │
│       ▼                                      ▼          ▼   │
│ ┌───────────────┐                  ┌─────────────┐ ┌──────┐ │
│ │  Information  │                  │  Governed   │ │Audit │ │
│ │   Highways    │                  │Tool Gateway │ │Ledger│ │
│ └───────┬───────┘                  └──────┬──────┘ └──────┘ │
│         │                                 │                 │
│         ▼                                 ▼                 │
│ ┌───────────────┐                  ┌─────────────┐          │
│ │Specialist     │                  │  Goboxd /   │          │
│ │Agent Fleet    │                  │  nsjail VM  │          │
│ └───────────────┘                  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Local Startup Instructions

To start the complete LARA runtime locally with in-memory persistence and offline mocks:

```bash
# 1. Activate virtual environment
source .venv/bin/activate

# 2. Verify backend tests pass (77 passed, 2 skipped)
pytest tests/ -v

# 3. Build single-origin frontend static bundle into backend/app/static/
cd frontend
bun run build
cd ..

# 4. Start single-origin Uvicorn server on port 8080 (or 8000)
uvicorn backend.app.main:app --host 0.0.0.0 --port 8080 --reload
```

Open `http://localhost:8080` in a browser to use the full Bright Lattice UI. All APIs are available at `http://localhost:8080/api/v1/*`.

---

## 3. Environment Variables Reference

| Variable | Local Default | Production Target | Description |
|---|---|---|---|
| `APP_ENV` | `development` | `production` | When set to `production`, server fails closed if Firestore is unreachable. |
| `GOOGLE_CLOUD_PROJECT` | `lara-runtime-ashwath-2026` | `lara-runtime-ashwath-2026` | GCP Project ID. |
| `FIRESTORE_DATABASE` | `(default)` | `(default)` | Firestore database ID. |
| `LARA_USE_LIVE_FIRESTORE` | `false` | `true` | When `true`, uses live `google.cloud.firestore.Client`. |
| `LARA_USE_LIVE_VERTEX_AI` | `false` | `true` | When `true`, calls live Vertex AI inference via `google-genai`. |
| `GCS_BUCKET` | `lara-runtime-ashwath-2026-assets` | `lara-runtime-ashwath-2026-assets` | Target Cloud Storage bucket name. |
| `VERTEX_AI_LOCATION` | `asia-south1` | `asia-south1` | Model region for Vertex AI. |
| `VERTEX_AI_MODEL` | `gemini-2.5-flash` | `gemini-2.5-flash` | Model identifier. |
| `SECRET_KEY` | *(dev placeholder)* | *(generated Secret Manager secret)* | Session signature key (minimum 32 characters). |
| `COOKIE_SECURE` | `false` | `true` | Requires HTTPS cookies in production. |
| `GOBOXD_BASE_URL` | `http://localhost:8081` | `http://10.x.x.x:8081` | Internal VPC IP of the goboxd Compute Engine VM. |
| `GOBOXD_INTERNAL_AUTH_TOKEN` | *(dev token)* | *(Secret Manager token)* | Pre-shared internal token for goboxd authentication. |
| `GOBOXD_KILL_SWITCH` | `false` | `false` | Set to `true` to immediately sever connections to goboxd VM. |

---

## 4. Firestore Configuration & Persistence Assumptions

1. **Native Mode:** Requires Firestore in Native mode (not Datastore mode).
2. **Collection Naming & ID Sanitization:** `FirestoreRepository` replaces colons `:` with double underscores `__` in document IDs (`source:sop-current` $\to$ `source__sop-current`) to adhere to Firestore document path constraints.
3. **Fail-Closed Rule:** In `APP_ENV=production`, `backend/app/repositories/base.py` strictly prevents falling back to in-memory mode. If Firestore cannot initialize or authenticate via ADC, the application halts with an exception.
4. **Synthetic Seed Data:** `scripts/seed_demo.py` is available to populate the Firestore database with initial graph nodes, edges, synthetic incidents, and user principals.

---

## 5. Vertex AI Adapter Configuration

1. **Client Adapter:** `VertexAIClient` in `backend/app/adapters/vertex_ai.py` uses the official `google.genai` SDK in Vertex AI mode (`vertexai=True`).
2. **Authentication:** Authenticates automatically via Google Application Default Credentials (ADC) locally or Cloud Run Service Account identity in production. No API keys should be embedded in source code or container images.
3. **Local Fallback:** When `LARA_USE_LIVE_VERTEX_AI=false`, the client generates deterministic multi-agent outputs for offline tests without making paid network calls.

---

## 6. Cloud Run Deployment Considerations

1. **Non-Root Runtime:** The Dockerfile builds a hardened container running as `appuser` (UID 10001) in group `appgroup` (GID 10001).
2. **Port Handling:** Container exposes port 8080 and listens on `${PORT:-8080}`.
3. **Health Check Probes:**
   - Liveness probe: `GET /health/live` (status 200).
   - Readiness probe: `GET /health/ready` (validates repository and memory state).
   - Root fallback: `GET /` serves static UI or health metadata.
4. **Concurrency & Scaling:** Recommended Cloud Run settings:
   - Max instances: 2 (for staging control).
   - Concurrency: 20–50.
   - Memory: 1GiB to 2GiB.
   - CPU: 1 or 2 vCPUs.

---

## 7. Cloud Build & IAM Service Account Requirements

The `cloudbuild.yaml` file defines a 4-step pipeline:
1. `python:3.12-slim`: Runs `pytest -v` tests. Build aborts if any test fails.
2. `gcr.io/cloud-builders/docker`: Builds the container image with `SHORT_SHA` and `latest` tags.
3. `gcr.io/cloud-builders/docker`: Pushes image to Artifact Registry `asia-south1-docker.pkg.dev/${PROJECT_ID}/lara-build/lara-runtime`.
4. `gcr.io/google.com/cloudsdktool/cloud-sdk`: Deploys image to Cloud Run service `lara-runtime`.

### IAM Permissions Required for Cloud Run Service Account:
- Target SA: `lara-runtime-sa@lara-runtime-ashwath-2026.iam.gserviceaccount.com`
- Roles needed:
  - `roles/datastore.user` (Firestore read/write)
  - `roles/aiplatform.user` (Vertex AI inference)
  - `roles/storage.objectUser` (Cloud Storage read/write on assets bucket)
  - `roles/logging.logWriter` (Cloud Logging)
  - `roles/monitoring.metricWriter` (Cloud Monitoring)

---

## 8. goboxd / nsjail Sandbox Deployment Boundary

1. **Isolated Boundary:** The execution sandbox runs on a dedicated Compute Engine VM (`e2-standard-4`) running Linux kernel 5.15+ with cgroup v2 enabled.
2. **Network Routing:** Cloud Run communicates with the goboxd VM over Serverless VPC Access via the VM's private IP.
3. **Fail-Closed Guarantee:** If the goboxd VM is unreachable, down, or times out, `GoboxdClient` fails closed, returns `SANDBOX_UNAVAILABLE`, and records an audit event.

---

## 9. Security Limitations & Known Caveats

1. **Physical Equipment Control:** Constitutionally blocked at the gateway level. Any agent tool call requesting physical actuation returns a 403 error.
2. **Separation of Duties:** Enforced across all approval flows. An initiator cannot approve their own action.
3. **No Direct Browser Access:** The frontend does not talk to Firestore, Vertex AI, or Cloud Storage directly.

---

## 10. Test Status & Skipped Tests

- **Total Tests:** 79
- **Passed:** 77
- **Skipped:** 2
  - `tests/integration/test_live_goboxd_vm.py::test_live_vm_goboxd_execution`
  - `tests/integration/test_live_goboxd_vm.py::test_live_vm_nsjail_network_isolation_blocked`
  - *Reason for skip:* Live goboxd VM tests require `GOBOXD_BASE_URL` pointing to a live GCE instance and are deliberately skipped during local builds.

---

## 11. Distinction Between Local Verification and Cloud Deployments

| Component | Local Status | Cloud Status |
|---|---|---|
| FastAPI Backend Core | Verified (77 tests passed) | Ready for containerization |
| Information Highways | Verified with deterministic routing | Ready |
| Specialist Agents Fleet | Verified (Research, Analysis, Verification) | Ready |
| Governed Tool Gateway | Verified with safe AST calculator & mock sandbox | Pending live goboxd VPC connection |
| Controlled Evolution | Verified with regression suite & rollback | Ready |
| Identity & RBAC/ABAC | Verified with 4 seeded principals | Ready |
| Dual-Authorization Queue | Verified with separation-of-duties | Ready |
| Immutable Audit Ledger | Verified with SHA-256 event recording | Ready |
| Bright Lattice Frontend | Verified and compiled to `backend/app/static` | Ready |
| Live Firestore Native | Simulated locally with InMemoryRepository | Requires GCP provisioning |
| Live Vertex AI Inference | Simulated with local mock responses | Requires live ADC on Cloud Run |
| Live GCE goboxd VM | Tested with offline mock transport | VM not yet provisioned |
