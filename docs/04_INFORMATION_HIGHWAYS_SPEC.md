# 04 — Dynamic Information Highways Specification

## 1. Definition

Dynamic Information Highways are LARA's task-time routing layer across **information and capabilities**. They connect data sources, agents, skills, tools and workflow dependencies. The graph is not a document-only knowledge graph and not a static architecture illustration.

The Firestore documents are canonical. The backend creates a bounded adjacency index for traversal. Firestore is not described as a native graph database; the route algorithm is implemented by LARA.

## 2. Node types

| Type | Meaning | Example |
|---|---|---|
| `source` | A data source or resource | incident log, asset registry, SOP repository |
| `agent` | A specialist executor | Research Agent |
| `skill` | Reusable capability/instruction | evidence synthesis, SOP revision check |
| `tool` | Executable operation | safe calculator, simulated request creation |
| `workflow` | Workflow or sub-process | incident investigation |
| `memory` | Scoped memory record/index | task history, approved case note |

Required node fields:

```json
{
  "node_id":"source:incident-log",
  "tenant_id":"demo-enterprise",
  "type":"source",
  "name":"Incident Log",
  "description":"Synthetic incident records",
  "status":"ACTIVE",
  "classification":"INTERNAL",
  "allowed_roles":["operator","supervisor","auditor"],
  "required_attributes":{"department":"operations"},
  "purposes":["incident_investigation"],
  "source_uri":"gs://lara-demo-assets/demo-enterprise/sources/incidents.json",
  "freshness_at":"2026-11-20T00:00:00Z",
  "trust_score":0.98,
  "capabilities":["incident.read"],
  "version":1
}
```

Never store full protected content in graph metadata. Graph metadata is also access-controlled.

## 3. Edge types

- `provides_context`: source provides context to agent/workflow.
- `can_delegate_to`: orchestrator/agent can delegate to another agent.
- `uses_skill`: agent uses a skill.
- `can_invoke`: agent/workflow may request a tool (still subject to policy).
- `depends_on`: workflow capability dependency.
- `related_to`: non-executable semantic relationship.

Required edge fields:

```json
{
  "edge_id":"edge:incident-research",
  "tenant_id":"demo-enterprise",
  "source_node":"source:incident-log",
  "target_node":"agent:research",
  "relationship":"provides_context",
  "status":"ACTIVE",
  "allowed_roles":["operator","supervisor"],
  "required_attributes":{"department":"operations"},
  "purposes":["incident_investigation"],
  "classification":"INTERNAL",
  "trust_score":0.97,
  "freshness_ttl_seconds":86400,
  "latency_cost":1,
  "enabled":true,
  "version":1
}
```

## 4. Route resolution algorithm

Input: `principal`, `task_intent`, `required_capabilities`, `tenant_id`, `purpose`, current graph version.

1. Validate principal and tenant context.
2. Parse/normalise task intent. LLM may suggest required capabilities, but backend validates them against registry.
3. Load active graph snapshot from Firestore or valid cache.
4. Find candidate nodes/edges connected to required capabilities.
5. Apply tenant boundary filter.
6. Apply RBAC and ABAC to nodes and edges **before disclosing metadata or reading source content**.
7. Remove disabled, stale or unavailable nodes/edges.
8. Build candidate paths with bounded maximum depth 5 and maximum candidate paths 50.
9. Rank permitted paths using deterministic weighted scoring.
10. Return selected route, alternatives, excluded candidates with safe reason codes, score components and graph version.
11. Context assembler reads only the selected authorised source references, rechecking access at read time.

Suggested score (weights are configurable constants, not model output):

`score = 0.35 * relevance + 0.25 * trust + 0.20 * freshness + 0.10 * availability + 0.10 * cost_efficiency`

All components normalised 0–1. Security is a hard filter, never a ranking bonus. An unauthorised route must not be selectable even if its relevance score is highest.

## 5. Identity-sensitive behaviour

The same task should resolve differently for Operator and Supervisor:
- Operator can access incident log, asset registry and approved SOP.
- Operator cannot discover/read restricted vendor contract metadata or content.
- Supervisor can access the restricted vendor record if their attributes and policy allow it.
- Auditor can inspect permitted audit events but cannot invoke operational tools.

A frontend filter is not enough. The API route must compute the permitted graph based on the server-resolved principal.

## 6. Cache and consistency

- Firestore `graph_meta/current.version` increments after authorised graph mutation.
- In-memory adjacency cache stores loaded version and timestamp.
- If version changes or TTL expires, reload bounded graph from Firestore.
- If Firestore reload fails, fail closed with `ROUTE_RESOLUTION_UNAVAILABLE`.
- Do not silently use stale cached graph for security decisions after a known version mismatch.
- Security-sensitive policy data is fetched/evaluated separately; do not rely only on graph edge role arrays.

## 7. Explainability output

```json
{
  "route_id":"route_01J...",
  "task_id":"task_01J...",
  "principal_id":"usr_operator_01",
  "graph_version":3,
  "selected_path":["workflow:incident-investigation","agent:research","source:incident-log","source:asset-registry","agent:analysis","agent:verification"],
  "selected_sources":["source:incident-log","source:asset-registry","source:sop-repository"],
  "excluded_candidates":[{"node_id":"source:vendor-contract","reason_code":"POLICY_DENIED"}],
  "score_components":{"relevance":0.92,"trust":0.96,"freshness":0.94,"availability":1.0,"cost_efficiency":0.9},
  "policy_decision_ids":["pdec_001","pdec_002"],
  "resolved_at":"..."
}
```

Do not reveal sensitive names or metadata to a principal who is not permitted to discover them. For Operator UI, show a generic `restricted source excluded` reason rather than restricted source title if metadata itself is confidential. Auditor/admin view may reveal more if authorised.

## 8. Route baseline tests

- Same task, Operator vs Supervisor: different permitted source set.
- Operator cannot discover restricted vendor metadata.
- Auditor route excludes action tools.
- Stale SOP source is ranked below current SOP or excluded based on TTL.
- Disabled agent/tool cannot be routed.
- Graph version change invalidates cache.
- Firestore failure does not allow cached permissions to bypass policy.
- Route output always contains graph version and policy decision references.
