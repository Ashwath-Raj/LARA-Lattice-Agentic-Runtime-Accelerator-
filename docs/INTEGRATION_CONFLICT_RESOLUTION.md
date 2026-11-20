# LARA — Integration Conflict Resolution Register

**Target Branch:** `integrate/lara-gcp-staging`  
**Base Branches:**  
- Backend: `feat/ashwath-runtime-goboxd-integration` (`9047f3ae11f28e5c8ce82a74ca116e8f9b88f30a`)  
- Frontend: `feature/praneeth-frontend` (`1e10bcc012296ff121bf1edefc822d104983ed94`)  
- Base: `main` (`39b4a3773f43f2a2f777356b3549820fabca36dd`)  
**Integration Strategy:** Selective integration into clean worktree `lara-staging`. Zero blind merges. Preserves both original branches intact.

---

## 1. Summary of Conflicting Paths & Resolutions

| Path | Backend Branch Version | Frontend Branch Version | Chosen Version / Resolution | Architectural Reason | Verification Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `frontend/src/**` | Old starter UI (Ashwath starter components, basic views) | New Bright Lattice UI (Phase 6.1, React 19, TypeScript, tokens, UI primitives) | **Frontend Branch Version** | Master Prompt mandate: The final application must use Praneeth's Bright Lattice UI, not the older Ashwath starter UI. | `npm test` (20 passed), `npm run build` (376ms), `oxlint` (0 errors) |
| `frontend/package.json` | React 19.0.0, Lucide 1.16, Bun/Vite starter dependencies | React 19.3.1, Vitest 5.1.1, Testing Library, Oxlint, Axe-core, Lucide 1.77.0 | **Frontend Branch Version** | Complete enterprise toolchain with automated quality gates and accessibility testing. | `npm ci` resolved cleanly with 0 vulnerabilities; `npm test` 20/20 tests pass. |
| `frontend/package-lock.json` vs `frontend/bun.lock` | `bun.lock` (30KB) | `package-lock.json` (npm frozen lock) | **Frontend Branch Version (`package-lock.json`)**; removed `bun.lock`. | Standardized on npm for deterministic frozen CI installations in Cloud Build. | `npm ci` installs 126 packages deterministically without drift. |
| `frontend/vite.config.ts` | Builds to `../backend/app/static`, dev proxy to `/api` on port 8000 | Defaults to `dist/`, dev proxy to `/api/v1` on port 8000, Vitest JSDOM configuration | **Combined Resolution**: Combined output directory (`outDir: path.resolve(import.meta.dirname, '../backend/app/static')`) with Vitest test runner configuration and `/api/v1` proxy. | Allows single-origin static compilation directly into FastAPI mount directory while retaining unit tests. | `npm run build` generates `backend/app/static/index.html` and assets; `vitest run` passes. |
| `backend/app/static/**` | Stale compiled starter UI bundle | Did not exist in frontend branch (frontend compiled to `frontend/dist`) | **Compiled from Praneeth Source**: Stale bundle replaced by running `npm run build` from Praneeth frontend. | FastAPI serves single-origin static React application from `backend/app/static`. | `FastAPI TestClient` tests confirm `GET /` serves Praneeth index.html and `GET /assets/*` returns compiled JS/CSS. |
| `backend/app/api/routes/tasks.py` | Lacked `GET /tasks` listing route; only supported POST and GET by ID | Frontend expected task listing for Overview and Investigations | **Backend Enhanced**: Added `GET /tasks` with tenant and role scoping (operators see their tasks; supervisors/admins see tenant tasks). | Resolves critical gap without violating backend security boundaries. | `pytest tests/unit/test_tasks_extended.py::test_list_tasks_tenant_and_role_scoping` PASSED. |
| `backend/app/api/routes/graph.py` | Lacked `GET /graph/edges` route; only had `/nodes`, `/summary`, `/version`, `/routes/resolve` | Frontend Highways graph expected topology edges | **Backend Enhanced**: Added `HighwayResolver.get_edges()` and `GET /graph/edges` filtering edges to only connect nodes permitted for the principal's clearance. | Truthful graph topology without inventing edges or exposing classified nodes. | `pytest tests/unit/test_graph_routes.py::test_graph_edges` PASSED. |
| `Dockerfile` | Single-stage python:3.12-slim copying pre-built `backend/` | Frontend had no container build | **Multi-stage Build**: Stage 1 builds frontend (`node:22-alpine`, `npm ci`, `npm test`, `npm run build`); Stage 2 packages hardened non-root Python 3.12 runtime copying compiled assets. | Ensures reproducible, hermetic builds from source without committing compiled artifacts. | Dockerfile syntax validated; local multi-stage pipeline verified. |
| `cloudbuild.yaml` | Hardcoded `lara-runtime-ashwath-2026` project ID; omitted frontend build step | None | **Repaired Pipeline**: Added frontend verification step (`node:22-alpine`), Secret Manager secret integration (`--set-secrets`), and user-project substitutions (`${PROJECT_ID}`). | Never deploy to Ashwath's development project; enforce test gates before deployment. | Verified against Cloud Build schema and Master Prompt requirements. |
| Local AI tooling (`.agent/`, `.claude/`, `.cursor/`, etc.) | None | Contained extensive local editor skills and settings | **Excluded**: Kept in `feature/praneeth-frontend` and local workspaces; strictly excluded from `integrate/lara-gcp-staging`. | Repository hygiene; personal agent settings do not belong in production integration branches. | Branch working tree is clean of editor state. |
| Checked-in `frontend/node_modules/` | None | Accidentally tracked in `feature/praneeth-frontend` | **Excluded**: Never imported into `integrate/lara-gcp-staging`. Installed fresh via `npm ci`. | Prevents repository bloat and binary platform incompatibilities. | Git tracked file list confirmed clean. |

---

## 2. Integrity Verification Post-Resolution

- **Backend Pytest Suite:** 79 passed, 2 skipped (live VM tests) in 9.88s.
- **Frontend Vitest Suite:** 20 passed across 5 test suites in 2.40s.
- **Frontend Linter:** Oxlint passed with 0 errors.
- **Contract Parity:** `contracts/openapi.json` and `openapi.yaml` regenerated from live FastAPI metadata.
