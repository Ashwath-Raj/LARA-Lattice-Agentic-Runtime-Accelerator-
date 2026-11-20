# LARA Frontend-to-Backend Integration Handoff

**To**: Ashwath Raj (Backend & Runtime Workstream Owner)  
**From**: Praneeth (Frontend, UX, & Browser Test Owner)  
**Date**: November 20, 2026  
**Reference Commit (Backend)**: `origin/feat/ashwath-runtime-goboxd-integration` (`d4abdc5`)  
**Reference Commit (Frontend)**: `origin/feature/praneeth-frontend` (`bf6077c`)  

---

## 1. Context & Objectives

The frontend UI components and visual refinements (Phase 6/6.1) are complete and tested. We are now replacing mock fallbacks with real API integrations. The frontend client has been aligned with your schemas in `backend/app/schemas/api.py`.

To complete the full end-to-end investigation scenario on live services, we request confirmation or implementation of the following **6 backend capabilities**.

---

## 2. Specific Backend Endpoint Requests

### 1. `GET /api/v1/tasks` (List Recent Investigations)
- **Current State**: `tasks.py` implements `POST /tasks` and `GET /tasks/{task_id}`, but no list endpoint.
- **Requested Endpoint**: `GET /api/v1/tasks?limit=20&status={status}`
- **Desired Response Model**: `List[TaskSummaryResponse]` containing:
  - `task_id: str`
  - `title: Optional[str]`
  - `incident_id: Optional[str]`
  - `status: str`
  - `created_at: str`
  - `created_by: str`
  - `trace_id: str`
- **Frontend Impact**: Required to populate the Overview "Recent investigations" table with live operational data.

### 2. `GET /api/v1/approvals` (List Pending Approvals)
- **Current State**: `approvals.py` implements `POST /approvals/{approval_id}/decision`, but no queue listing route.
- **Requested Endpoint**: `GET /api/v1/approvals?status=PENDING`
- **Desired Response Model**: `List[ApprovalItemResponse]` containing:
  - `approval_id: str`
  - `task_id: str`
  - `action: str`
  - `requested_by: str`
  - `status: str`
  - `policy_reason: Optional[str]`
  - `created_at: str`
- **Frontend Impact**: Required to power the live Approvals queue without relying on client-side state.

### 3. Read-Only Graph Topology Endpoint (`GET /api/v1/graph/topology`)
- **Current State**: `graph.py` provides route resolution via `HighwayResolver`, but node and edge topology is encapsulated in the NetworkX graph.
- **Requested Endpoint**: `GET /api/v1/graph/topology`
- **Desired Response Model**:
  - `nodes: List[{ id: str, label: str, kind: str, classification: str }]`
  - `edges: List[{ from: str, to: str, condition?: str }]`
  - `graph_version: int`
- **Frontend Impact**: Enables live graph topology rendering rather than relying on static fallback layouts.

### 4. Read-Only Agent Registry (`GET /api/v1/agents`)
- **Current State**: No agent metadata or version routes exist in backend.
- **Requested Endpoint**: `GET /api/v1/agents`
- **Desired Response Model**: `List[{ agent_id: str, name: str, role: str, status: str, active_version: str }]`
- **Frontend Impact**: Allows live fleet status display in the Agents view.

### 5. Evolution Promotion Reason & Rollback Endpoint
- **Current State**: `POST /evolution/proposals/{proposal_id}/approve` accepts no body; `EvolutionService.rollback()` exists in Python but has no FastAPI route.
- **Requested Updates**:
  1. Add optional `{ reason: str }` to `POST /evolution/proposals/{proposal_id}/approve` so audit trail records the justification.
  2. Expose `POST /evolution/proposals/{proposal_id}/rollback` with `{ reason: str }` to support operational rollback.

### 6. Clarification on Task Result Structure & Execution Model
- **Observation**: `orchestrator.create_task` runs synchronously during POST `/tasks` and embeds results in a generic `result: Optional[Dict[str, Any]]`.
- **Questions for Joint Resolution**:
  1. What canonical keys are returned in `result`? (e.g. `evidence: list`, `verification: dict`, `proposed_action: dict`).
  2. Does task execution remain synchronous for the MVP, or will long-running executions use polling / SSE? (Frontend will avoid fake streaming and use actual polling if asynchronous).

---

## 3. Next Steps & Timeline

- **Frontend Action**: Implementing centralized typed transport (`frontend/src/api/transport.ts`), explicit response adapters (`frontend/src/api/adapters.ts`), and an explicit `VITE_LARA_DATA_MODE=api|mock` toggle.
- **Coordination**: When you are ready to update the contract and routes on `feat/ashwath-runtime-goboxd-integration`, please share the commit SHA so we can verify the live end-to-end flow.
