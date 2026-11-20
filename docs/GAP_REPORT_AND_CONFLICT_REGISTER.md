# LARA Runtime Implementation Gap Report & Conflict Register

**Date**: 2026-11-20
**Branch**: `feat/ashwath-runtime-goboxd-integration`
**Base SHA**: `13c40e7` (HEAD of `main`)
**Workstream Owner**: Ashwath Raj (Backend & Runtime Workstream)

---

## 1. Executive Summary & Purpose

This gap report establishes the baseline state of the repository before building the backend and runtime infrastructure for **LARA (Lattice Agentic Runtime Accelerator)**. It maps requirements from the authoritative documents (`docs/00` to `docs/13`, `contracts/openapi.yaml`, and the prompt instructions) against existing assets and identifies architectural, structural, and contractual gaps.

---

## 2. Inventory of Existing Assets

1. **Contracts & Specifications**:
   - `contracts/openapi.yaml`: Defines endpoints for `/health/live`, `/health/ready`, `/auth/demo-login`, `/auth/me`, `/auth/logout`, `/tasks`, `/tasks/{task_id}`, `/tasks/{task_id}/events`, `/graph/routes/resolve`, `/policies/evaluate`, `/approvals/{approval_id}/decision`, `/evolution/proposals`, `/evolution/proposals/{proposal_id}/evaluate`, `/evolution/proposals/{proposal_id}/approve`, `/audit`.
   - `docs/00`–`docs/14`: Authoritative architecture, workflow, data model, security, and execution specs.

2. **Data & Synthetic Fixtures**:
   - `data/synthetic/`: Canonical nodes (`graph_nodes.json`), edges (`graph_edges.json`), seeded principals (`users.json`), incidents, assets, maintenance history, vendor contracts, evolution failure trace.
   - `data/fixtures/`: Deterministic test cases for route evaluation (`route_cases.json`) and evolution functional/security verification (`evolution_cases.json`).
   - `data/sops/`: Current (`SOP-MNT-014-current.md`) and obsolete (`SOP-MNT-014-obsolete.md`) procedures.
   - `prompts/`: Agent system instructions for diagnostician, research, analysis, and verification.

3. **Existing Backend Implementation**:
   - `backend/`: **Completely empty / non-existent** prior to this workstream.
   - Root `requirements.txt`: Specified core packages (`fastapi`, `pydantic`, `google-genai`, `google-cloud-firestore`, `networkx`, `httpx`, `pytest`, `passlib[bcrypt]`).
   - Root `Dockerfile`: Two-stage build targeting Cloud Run serving `uvicorn backend.app.main:app`.

---

## 3. Conflict Register & Resolutions

| Conflict ID | Issue | Location | Authoritative Resolution |
|---|---|---|---|
| **CR-01** | `PRODUCT.md` specified Neo4j Aura and generic Gemini API path. | `PRODUCT.md` line 13-14 | **Resolved**. Updated `PRODUCT.md` to specify Firestore Native mode (canonical nodes/edges) with in-process adjacency traversal and Vertex AI Gemini via the Google Gen AI SDK in Vertex mode. |
| **CR-02** | goboxd deployment topology vs locked "all runtime on Cloud Run". | `docs/01_LOCKED_SCOPE_AND_NON_NEGOTIABLES.md` vs Directive Section 9.2 | **Documented Exception**. nsjail requires Linux user namespaces and cgroup v2 privilege not supported inside standard Cloud Run containers. goboxd runs on a dedicated, hardened GCE VM in an isolated private VPC. LARA Cloud Run connects via Serverless VPC Access / Direct VPC egress and internal service authentication. |
| **CR-03** | goboxd authentication boundary. | Upstream goboxd repository (`Praneeth0910/goboxd`) | goboxd has no built-in HTTP authentication. LARA backend adapter must enforce internal mutual authentication / token-based gateway authorization and never expose goboxd directly to users or the public internet. |
| **CR-04** | Sandbox capability vs Tool Gateway authority. | System architecture | goboxd is strictly an isolated execution provider. LARA's backend Tool Gateway retains absolute policy, quota, language allowlist, and authorization authority. |

---

## 4. Upstream goboxd Inspection Record

- **Repository**: `https://github.com/Praneeth0910/goboxd`
- **Branch**: `team/sudo`
- **Pinned Commit SHA**: `2e8a10dfc6271f33e88571446f319a1c3a7f11da`
- **License**: GNU General Public License v3.0 (GPL-3.0)
- **Provenance & Integration Constraints**:
  - Independent micro-service boundary: goboxd is deployed as an external standalone service; no Go code is vendored or merged into LARA's Python application image.
  - Endpoints verified from source: `POST /run`, `GET /healthz`, `GET /readyz`, `GET /info`.
  - Request schema: `RunRequest { language, source, source_filename, artifact_filename, build, run, tests }`.
  - Response schema: `RunResponse { status, build, tests }`.
  - Built-in status codes: `accepted`, `build_failed`, `wrong_output`, `output_whitespace_mismatch`, `time_exceeded`, `memory_exceeded`, `runtime_error`, `not_executed`, `internal_error`.

---

## 5. Architectural Gap & Implementation Plan

| Domain | Required Capabilities | Target Modules | Status |
|---|---|---|---|
| **Core & Foundation** | FastAPI app, settings, structured logging, error handling, session cookies, health probes | `backend/app/main.py`, `backend/app/core/` | In Progress |
| **Identity & Policy** | Server-side principal resolution, session validation, RBAC, ABAC, delegation scopes, fail-closed enforcement | `backend/app/domain/`, `backend/app/services/identity.py`, `backend/app/services/policy.py` | In Progress |
| **Information Highways** | Firestore node/edge storage, in-process NetworkX adjacency cache, tenant & policy filtering, deterministic scoring | `backend/app/repositories/graph.py`, `backend/app/services/highways.py` | In Progress |
| **Model & Orchestration** | Vertex AI Gemini adapter, task lifecycle state machine, Research/Analysis/Verification agents, structured outputs | `backend/app/adapters/vertex_ai.py`, `backend/app/services/orchestrator.py`, `backend/app/agents/` | In Progress |
| **Controlled Evolution** | Trace failure collector, immutable candidate versioning, functional & security evaluation harness, admin approval gate | `backend/app/services/evolution.py`, `backend/app/api/routes/evolution.py` | In Progress |
| **Tool Gateway & Sandbox** | Tool registry, capability gate, goboxd client adapter, server-side payload building, kill switch, mock test double | `backend/app/tools/`, `backend/app/adapters/goboxd.py` | In Progress |
| **Audit & Observability** | Immutable event persistence, request/trace correlation, sensitive data masking | `backend/app/services/audit.py`, `backend/app/api/routes/audit.py` | In Progress |
| **Testing Suite** | Unit, integration, security regression, and simulated sandbox test suites | `tests/unit/`, `tests/integration/`, `tests/security/` | In Progress |

---

This report provides the basis for executing Ashwath Raj's backend workstream in accordance with all non-negotiables.
