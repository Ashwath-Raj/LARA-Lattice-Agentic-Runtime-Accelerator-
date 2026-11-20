# 14 — Build Order, Dependency Graph and Cutline

## Critical path

```mermaid
flowchart TD
  GCP[Google Cloud project + IAM] --> DB[Firestore + GCS]
  DB --> AUTH[Seeded identity + policy]
  AUTH --> GRAPH[Graph nodes/edges + route resolver]
  GRAPH --> ORCH[Orchestrator + task state]
  ORCH --> VERTEX[Vertex AI adapter]
  VERTEX --> AGENTS[Research / Analysis / Verification]
  AGENTS --> EVOLVE[Evolution candidate + evaluator]
  AGENTS --> TOOLS[Tool gateway + approvals]
  EVOLVE --> AUDIT[Audit and trace]
  TOOLS --> AUDIT
  UI[Frontend shell + mocks] --> API[API integration]
  GRAPH --> API
  ORCH --> API
  EVOLVE --> API
  TOOLS --> API
  AUDIT --> API
  API --> DEPLOY[Cloud Build → Artifact Registry → Cloud Run]
```

## Feature priority

P0 (must work): GCP deployment, auth, RBAC/ABAC, graph route resolution, route identity difference, Vertex adapter, three bounded agents, evolution evaluation + admin approval, tool gateway, audit trace.

P1 (should work): graph canvas polish, prompt diff, route ranking explanation, GCS evidence upload, rollback UI, basic Cloud Monitoring dashboard.

P2 (cut first): animated graph, advanced analytics, multi-task dashboard, user-configurable graph editor, extra agents, extra model provider, full text search, elaborate onboarding.

## Definition of a true end-to-end pass

A single task must traverse the backend state machine, resolve the graph route for the authenticated principal, read only authorised synthetic data, invoke Gemini via Vertex AI, delegate to three agents, verify output, require approval for the simulated action, write audit events and display the actual results in the frontend.
