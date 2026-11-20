# 13 — Antigravity / Coding-Agent Execution Rules

## Role

You are implementing LARA — Lattice Agentic Runtime Accelerator. This documentation pack is the authoritative scope. You are not authorised to redesign the product, replace core decisions, silently reduce the runtime to RAG, or add new infrastructure providers.

## Before coding

1. Inspect the existing repository and report its actual structure, current branch, uncommitted changes and existing working features.
2. Read this entire documentation pack, especially locked scope, GCP architecture, backend workflow, Information Highways, Evolution, Identity, API, UX and two-person ownership.
3. Produce a gap report mapping each required feature to existing files, missing files and tests.
4. Do not overwrite working code until the gap report is reviewed.
5. Identify which files belong to Person 1 (Ashwath) and Person 2 (Praneeth). Do not edit files owned by the other person.

## Non-negotiable architecture rules

- All deployed runtime, model inference and persistent state must be on Google Cloud.
- Deploy one React + FastAPI application to Cloud Run.
- Use Vertex AI Gemini via `google-genai` in Vertex mode and Cloud Run service identity/ADC.
- Use Firestore Native mode for all canonical graph and application state.
- Use private Cloud Storage for files.
- Use Cloud Build + Artifact Registry for build/deploy.
- Use Cloud Logging for diagnostics.
- Do not use Neo4j Aura, Supabase, external DBs, external model APIs, external hosting or local inference.
- Firestore graph nodes/edges are canonical. NetworkX may be used only as an in-process graph algorithm helper/cache.
- The backend is the authority for identity, route resolution, access decisions, evolution promotion and tool execution.

## Implementation constraints

- Modular monolith; no microservices.
- Pydantic schemas for all request/response/model outputs.
- Model outputs are untrusted proposals.
- Policy check before protected source read, memory access, delegation and tool execution.
- Fail closed.
- Agents receive scoped data and no cloud credentials.
- Evolution candidates are immutable and inactive until admin approval.
- Security policy, roles, tenant boundaries, credential scopes and evaluation harness cannot be evolved.
- Tool gateway only; no arbitrary shell, `eval`, `exec` or unrestricted Python.
- Simulated connector must be labelled `SIMULATED`.
- No production write or equipment control.

## API and parallel-work rules

- Treat `docs/09_API_CONTRACT.md` and `contracts/openapi.yaml` as frozen.
- Person 1 owns backend, contracts, data, scripts, infra, Dockerfile and Cloud Build.
- Person 2 owns frontend and design assets.
- Frontend uses a single API client and mock fixtures matching the contract until integration.
- Do not edit the other owner's source tree.
- Do not rename response fields without explicit approval and coordinated update.

## Build order

1. Cloud project/config and health endpoints.
2. Firestore repositories, seed data and auth.
3. RBAC/ABAC policy engine.
4. Graph node/edge store and route resolver.
5. Vertex AI adapter.
6. Orchestrator and three specialist agents.
7. Evolution candidate/evaluator/approval/promotion/rollback.
8. Tool gateway and audit.
9. UI integration and polish.
10. Cloud Run deployment and acceptance tests.

## Do not do

- Do not add a new database because graph traversal is inconvenient.
- Do not use the browser to query Firestore directly.
- Do not put a Gemini API key in frontend or deployed environment if Vertex AI service identity is used.
- Do not let Gemini decide access rights.
- Do not show restricted source names to unauthorised users.
- Do not fake evaluation results, route metrics or deployment status.
- Do not claim production readiness.
- Do not create a feature just because it appears visually impressive.

## Required coding-agent output after each phase

- Files created/modified.
- Behaviours implemented.
- Tests executed and exact results.
- GCP services touched.
- Known limitations.
- Next phase and blockers.

If a requirement cannot be implemented in the timebox, mark it `NOT IMPLEMENTED` and state the impact. Do not silently simulate it.
