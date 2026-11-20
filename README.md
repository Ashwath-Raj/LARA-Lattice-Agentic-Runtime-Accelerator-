# LARA — Google Cloud Build Pack

**LARA — Lattice Agentic Runtime Accelerator**  
**Build target:** 12-hour, two-person, cloud-hosted prototype  
**Architecture rule:** Every runtime component, model invocation, persistent store, build artifact and deployed user interface must be hosted on Google Cloud. No external managed runtime/database/model provider is permitted in this prototype.

## Read this first

1. `docs/00_EXECUTIVE_SUMMARY.md`
2. `docs/01_LOCKED_SCOPE_AND_NON_NEGOTIABLES.md`
3. `docs/02_GCP_TARGET_ARCHITECTURE.md`
4. `docs/03_BACKEND_WORKFLOW_SPEC.md`
5. `docs/04_INFORMATION_HIGHWAYS_SPEC.md`
6. `docs/05_EVOLUTION_ENGINE_SPEC.md`
7. `docs/06_IDENTITY_RBAC_ABAC_SPEC.md`
8. `docs/07_SYNTHETIC_DATA_AND_SOP_SPEC.md`
9. `docs/08_UX_FLOW_AND_SCREEN_SPEC.md`
10. `docs/09_API_CONTRACT.md`
11. `docs/10_TWO_PERSON_12_HOUR_PLAN.md`
12. `docs/11_GCP_DEPLOYMENT_RUNBOOK.md`
13. `docs/12_ACCEPTANCE_CHECKLIST.md`
14. `docs/13_ANTIGRAVITY_EXECUTION_RULES.md`

## Folder map

- `docs/`: authoritative implementation and product documentation.
- `contracts/`: OpenAPI contract and request/response examples.
- `data/synthetic/`: deterministic synthetic enterprise records.
- `data/sops/`: synthetic SOPs and workflow rules used in the demo.
- `data/fixtures/`: route, identity and evolution evaluation fixtures.
- `prompts/`: versioned base instructions for the three specialist agents and evolution engine.
- `scripts/`: seed and deployment scripts.
- `design/`: copied Bright Lattice assets and design-system reference.
- `checklists/`: printable build, release and demo checklists.

## Source of truth and conflict resolution

This pack supersedes earlier LARA buildathon documents wherever they conflict. In particular:

- Product name is **LARA — Lattice Agentic Runtime Accelerator**.
- The product is a general-purpose enterprise agentic runtime, not a local-only runtime or an industrial chatbot.
- **Google Cloud-only deployment is mandatory.**
- Neo4j Aura is removed. It is not a Google Cloud-native service and is not allowed in this build.
- The graph is stored as canonical node/edge documents in **Cloud Firestore**. The backend builds a bounded in-memory adjacency index per process and resolves routes. Firestore remains the source of truth.
- Gemini is called through **Vertex AI** using the Google Gen AI SDK and the Cloud Run service identity / Application Default Credentials. No Gemini Developer API key is required for the runtime path.
- Frontend and backend are built into one deployable application and served by **Cloud Run**. No external frontend hosting.
- Do not add unapproved services, frameworks, providers or architecture changes.

## What “Google Cloud-only” means here

Allowed runtime services: Cloud Run, Vertex AI, Firestore Native mode, Cloud Storage, Secret Manager, Artifact Registry, Cloud Build, Cloud Logging, Cloud Monitoring and Cloud IAM. Google Cloud SDKs and official Google client libraries are used from the backend. The browser reaches only the Cloud Run HTTPS origin.

The developers' laptops may be used as coding terminals. They are not runtime hosts, inference hosts, databases or required demo dependencies. No local model, localhost service, external database, third-party hosted model, Vercel, Netlify, Supabase, Neon, Railway, Render or Neo4j Aura.

## Prototype honesty labels

Every feature must be labelled in code and UI as one of:
- `IMPLEMENTED`: actual backend functionality and persistent state.
- `SIMULATED`: deterministic mock connector/action clearly labelled as simulated.
- `PLANNED`: roadmap only; not shown as functioning.
- `UNSUPPORTED`: explicitly blocked.

Never show seeded sample counts or simulated actions as real customer data or real enterprise integrations.
