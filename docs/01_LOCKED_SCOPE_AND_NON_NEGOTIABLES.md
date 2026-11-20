# 01 — Locked Scope and Non-Negotiables

## 1. Decisions locked for this build

| ID | Decision | Locked value |
|---|---|---|
| L-01 | Name | LARA — Lattice Agentic Runtime Accelerator |
| L-02 | Product category | Adaptive, model-independent enterprise agentic runtime |
| L-03 | Demo workload | Enterprise incident investigation and response |
| L-04 | Runtime architecture | Modular monolith: one FastAPI backend, one React frontend, one Cloud Run service |
| L-05 | Graph | Firestore canonical nodes/edges; bounded backend adjacency index |
| L-06 | Model | Gemini through Vertex AI, behind provider adapter |
| L-07 | Persistence | Firestore Native mode |
| L-08 | Files | Private Cloud Storage bucket |
| L-09 | Hosting | Cloud Run only for application runtime and UI |
| L-10 | Build/release | Cloud Build + Artifact Registry |
| L-11 | Identity | Seeded demo identities; server-side principal resolution |
| L-12 | Authorisation | RBAC + ABAC; explicit delegated authority; fail closed |
| L-13 | Agents | Orchestrator + Research, Analysis and Verification agents |
| L-14 | Evolution | Prompt, skill, planning and routing candidates; evaluation; admin approval; rollback |
| L-15 | Product surfaces | Enterprise Workbench + Runtime/Authority Console |
| L-16 | Tool execution | Read-only sources, bounded calculations, simulated enterprise action |
| L-17 | Audit | Persistent append-only application event records |
| L-18 | Deployment | All deployed runtime and data services on Google Cloud |

## 2. Hard Google Cloud rule

Every runtime dependency must be a Google Cloud service or execute inside the Cloud Run container. A coding agent must not add an external hosted service because it is convenient.

### Allowed

- Cloud Run
- Vertex AI (Gemini)
- Firestore Native mode
- Cloud Storage
- Secret Manager
- Cloud IAM / service accounts
- Artifact Registry
- Cloud Build
- Cloud Logging
- Cloud Monitoring

### Prohibited for this prototype

- Neo4j Aura or any external graph SaaS
- Supabase, Neon, MongoDB Atlas, Redis Cloud, Pinecone, Qdrant Cloud or other external managed data services
- OpenAI, Anthropic or other external model APIs
- Gemini Developer API key path for deployed inference; use Vertex AI auth
- Vercel, Netlify, Render, Railway, Fly.io or external hosting
- Local Ollama, local Gemma, local inference or developer-machine services as demo dependencies
- GKE, Kubernetes, microservices or Pub/Sub unless the founder explicitly revises scope (not expected in 12 hours)

Open-source libraries may be packaged inside the Cloud Run application. That does not make them external runtime services. NetworkX may be used as an in-process graph algorithm library; it is not the graph source of truth.

## 3. Must-build capabilities

### A. Dynamic Information Highways
- Firestore stores nodes and edges as separate documents.
- Node types: `source`, `agent`, `skill`, `tool`, `workflow`, `memory`.
- Edge types: `provides_context`, `can_delegate_to`, `uses_skill`, `can_invoke`, `depends_on`, `related_to`.
- Route resolver computes paths per task, identity and context.
- Candidate edges are permission-filtered before protected source access.
- Route output includes chosen path, rejected paths/reasons, score factors and source provenance.

### B. Controlled self-evolution
- Collect failure and feedback evidence.
- Generate candidate prompt/skill/planning/routing version.
- Store immutable version and parent hash.
- Run fixed functional and security evaluation fixtures.
- Require Administrator approval before promotion.
- Support reject and rollback.
- Never evolve policy, roles, tenant boundaries, credentials or approval rules.

### C. Identity-aware governance
- Seed Operator, Supervisor, Runtime Administrator and Auditor.
- Role and attributes resolved server-side.
- RBAC + ABAC checks for graph discovery, source read, memory, delegation, tool calls, approvals and evolution actions.
- Fail closed on missing identity, policy error or missing attributes.
- No agent receives broad service credentials.

### D. Orchestration
- Task intake and normalisation.
- Capability requirement extraction.
- Route resolution.
- Delegation to Research, Analysis and Verification.
- Context assembly with provenance.
- Gemini calls via adapter.
- Output verification.
- Controlled tool gateway and trace.

## 4. Explicitly out of scope

- Production enterprise SSO / SCIM / identity federation.
- Real ERP, CMMS, SCADA, PLC or industrial equipment integration.
- Production writes or physical actuation.
- Fine-tuning foundation model weights or continuous online learning.
- Fully autonomous promotion of evolved prompts.
- Autonomous changes to governance/security policy.
- Multi-provider compatibility proof; only the Gemini adapter must be implemented.
- Multi-tenant commercial isolation claims.
- Production SLA, high availability, disaster recovery or penetration-test certification.
- Dynamic graph topology mutation by untrusted agents.
- Arbitrary code execution, unrestricted shell or unrestricted Python tool.
- Kubernetes, GKE, distributed microservices or event streaming.

## 5. Capability truth labels

All UI labels, docs and demo narration must distinguish:
- `IMPLEMENTED`: working backend path, persisted state, test evidence.
- `SIMULATED`: deterministic mock connector/action, visibly marked.
- `PLANNED`: not implemented; roadmap only.
- `UNSUPPORTED`: deliberately denied.

Never call a simulated action a real enterprise integration.

## 6. Change control

No coding agent or teammate may independently change a locked decision. A change requires:
1. State the exact decision ID affected.
2. Explain why the current choice blocks a required acceptance test.
3. State cost, risk and schedule impact.
4. Obtain Ashwath's explicit approval.
5. Update this file and dependent API/UX docs before implementation.

If ambiguous, choose the smallest implementation consistent with this document. Do not invent new product capabilities.
