# LARA — Integration API Contract Matrix

**Branch:** `integrate/lara-gcp-staging`  
**Base Contract:** `docs/09_API_CONTRACT.md` & `contracts/openapi.yaml`  
**FastAPI OpenAPI Endpoints:** 42 routes mounted under `/api/v1` and root  

---

## 1. Screen-by-Screen API Mapping

| Screen / Feature | UI Function | Backend Endpoint | HTTP Method | Request Model | Response Model | Frontend Adapter | Auth & Role Requirements | Status | Test Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Global / Shell** | `demoLogin` | `/api/v1/auth/demo-login` | `POST` | `DemoLoginRequest` (`principal_id`, `password`) | `DemoLoginResponse` | `adaptPrincipalResponse` | Public for demo identities; sets HttpOnly cookie | **IMPLEMENTED** | `test_demo_login_and_me_flow` |
| **Global / Shell** | `getMe` | `/api/v1/auth/me` | `GET` | None | `PrincipalResponse` | `adaptPrincipalResponse` | Session cookie required | **IMPLEMENTED** | `test_demo_login_and_me_flow` |
| **Global / Shell** | `logout` | `/api/v1/auth/logout` | `POST` | None | 204 No Content | Clears session state | Session cookie required | **IMPLEMENTED** | `test_demo_login_and_me_flow` |
| **Global / Shell** | `getHealth` | `/api/v1/health/ready` | `GET` | None | `{"status": "ready"}` | `adaptHealthResponse` | None (public probe) | **IMPLEMENTED** | `test_health_endpoints` |
| **Global / Shell** | Liveness Probe | `/api/v1/health/live` | `GET` | None | `{"status": "alive"}` | Public probe | None | **IMPLEMENTED** | `test_health_endpoints` |
| **Overview & Investigations** | `getRecentTasks` | `/api/v1/tasks` | `GET` | None | `List[TaskResponse]` | `adaptTaskResponse` | Scoped to tenant; operators limited to own tasks; supervisors/admins see all tenant tasks | **IMPLEMENTED** | `test_list_tasks_tenant_and_role_scoping` |
| **Investigations** | `createTask` | `/api/v1/tasks` | `POST` | `TaskCreate` (`prompt`, `title`, `incident_id`) | `TaskAccepted` (202) | `adaptTaskAccepted` | Authenticated principal; prompt validated (10–4000 chars) | **IMPLEMENTED** | `test_task_creation_and_highway_resolution` |
| **Investigations** | `getTask` | `/api/v1/tasks/{id}` | `GET` | None | `TaskResponse` | `adaptTaskResponse` | Cross-tenant 404; operator limited to own task | **IMPLEMENTED** | `test_task_creation_and_highway_resolution` |
| **Investigations** | `getTaskEvents` | `/api/v1/tasks/{id}/events` | `GET` | None | `List[Dict[str, Any]]` | `adaptTaskEvents` | Scoped to task creator, supervisor, or auditor | **IMPLEMENTED** | `test_task_events_timeline` |
| **Investigations** | `runTask` | `/api/v1/tasks/{id}/run` | `POST` | None | `TaskResponse` | `adaptTaskResponse` | Task creator or runtime admin; rejects terminal tasks (409) | **IMPLEMENTED** | `test_task_run_lifecycle_and_conflict` |
| **Investigations** | `cancelTask` | `/api/v1/tasks/{id}/cancel` | `POST` | None | `TaskResponse` | `adaptTaskResponse` | Task creator or admin; rejects terminal tasks (409) | **IMPLEMENTED** | `test_task_cancel_lifecycle` |
| **Information Highways** | `getGraphSummary` | `/api/v1/graph/summary` | `GET` | None | `GraphSummaryResponse` | Direct mapping | Tenant-scoped summary | **IMPLEMENTED** | `test_graph_summary` |
| **Information Highways** | `getGraphNodes` | `/api/v1/graph/nodes` | `GET` | Query param `type` | `List[Dict[str, Any]]` | `adaptGraphNode` | Policy-evaluated: confidential nodes omitted for unauthorized roles | **IMPLEMENTED** | `test_graph_nodes_filter` |
| **Information Highways** | `getGraphEdges` | `/api/v1/graph/edges` | `GET` | None | `List[Dict[str, Any]]` | `adaptGraphEdge` | Connects only nodes authorized for principal clearance | **IMPLEMENTED** | `test_graph_edges` |
| **Information Highways** | `resolveRoute` | `/api/v1/graph/routes/resolve` | `GET` | Query param `task_id` | `RouteResolveResponse` | `adaptRouteResolveResponse` | Dynamic resolution based on principal clearance and task intent | **IMPLEMENTED** | `test_highway_resolution_operator` |
| **Information Highways** | `previewRoute` | `/api/v1/graph/routes/preview` | `POST` | `RoutePreviewRequest` | `Dict[str, Any]` | Direct mapping | Evaluates capabilities for session principal | **IMPLEMENTED** | `test_graph_routes_preview` |
| **Information Highways** | `getGraphVersion` | `/api/v1/graph/version` | `GET` | None | `Dict[str, Any]` | Direct mapping | Tenant-scoped graph version | **IMPLEMENTED** | `test_graph_version` |
| **Agent Fleet** | `getAgents` | `/api/v1/agents` | `GET` | None | `List[Dict[str, Any]]` | `adaptAgentResponse` | Authenticated principal | **IMPLEMENTED** | `test_list_agents` |
| **Agent Fleet** | `getAgent` | `/api/v1/agents/{id}` | `GET` | None | `Dict[str, Any]` | `adaptAgentResponse` | 404 on nonexistent agent | **IMPLEMENTED** | `test_get_agent_by_id` |
| **Agent Fleet** | `getAgentVersions` | `/api/v1/agents/{id}/versions`| `GET` | None | `List[Dict[str, Any]]` | Direct mapping | Visible prompt versions | **IMPLEMENTED** | `test_get_agent_versions` |
| **Agent Fleet** | `getAgentSkills` | `/api/v1/agents/{id}/skills` | `GET` | None | `List[Dict[str, Any]]` | Direct mapping | Visible skill definitions | **IMPLEMENTED** | `test_get_agent_skills` |
| **Evolution Lab** | `getEvolutionProposals` | `/api/v1/evolution/proposals` | `GET` | None | `List[EvolutionProposalResponse]` | `adaptEvolutionProposal` | Tenant-scoped proposals | **IMPLEMENTED** | `test_evolution_get_proposal` |
| **Evolution Lab** | `evaluateCandidate` | `/api/v1/evolution/proposals/{id}/evaluate` | `POST` | None | `EvolutionProposalResponse` | `adaptEvolutionProposal` | Runs 2 functional cases & 4 security invariants | **IMPLEMENTED** | `test_evolution_proposal_and_evaluation_lifecycle` |
| **Evolution Lab** | `approveCandidate` | `/api/v1/evolution/proposals/{id}/approve` | `POST` | Query/Body `reason` | `EvolutionProposalResponse` | `adaptEvolutionProposal` | `runtime_admin` role strictly required | **IMPLEMENTED** | `test_operator_cannot_promote_evolution` |
| **Evolution Lab** | `rejectCandidate` | `/api/v1/evolution/proposals/{id}/reject` | `POST` | `ProposalRejectRequest` | `EvolutionProposalResponse` | `adaptEvolutionProposal` | `runtime_admin` role strictly required | **IMPLEMENTED** | `test_evolution_rejection_flow` |
| **Evolution Lab** | `rollbackCandidate`| `/api/v1/evolution/versions/{id}/rollback` | `POST` | `RollbackRequest` (`target_id`, `rollback_to_version`) | `Dict[str, Any]` | `adaptEvolutionProposal` | `runtime_admin` role strictly required | **IMPLEMENTED** | `test_evolution_rollback_flow` |
| **Governance & Policy** | `evaluatePolicy` | `/api/v1/policies/evaluate` | `POST` | `PolicyEvaluationRequest` | `PolicyDecisionResponse` | `adaptPolicyDecisionResponse` | Evaluates action, resource, purpose; enforces hard equipment boundaries | **IMPLEMENTED** | `test_equipment_control_strictly_denied` |
| **Governance & Policy** | `getPrincipals` | `/api/v1/governance/principals` | `GET` | None | `List[Dict[str, Any]]` | Sanitized principal directory | `runtime_admin` role strictly required (403 for other roles) | **IMPLEMENTED** | `test_governance_principals_admin_only` |
| **Governance & Policy** | `getDecisions` | `/api/v1/governance/decisions` | `GET` | Optional `task_id` | `List[Dict[str, Any]]` | Audit decision log | Tenant and role scoped | **IMPLEMENTED** | `test_governance_decisions_scoping` |
| **Approval Queue** | `getApprovals` | `/api/v1/approvals` | `GET` | None | `List[ApprovalResponse]` | `adaptApprovalResponse` | Operators see only own requests; supervisors see all tenant requests | **IMPLEMENTED** | `test_approvals_role_scoping` |
| **Approval Queue** | `decideApproval` | `/api/v1/approvals/{id}/decision` | `POST` | `ApprovalDecisionRequest` (`decision`, `reason`) | `ApprovalResponse` | `adaptApprovalResponse` | Requires reason >= 8 chars; enforces Separation of Duties (prevents self-approval) | **IMPLEMENTED** | `test_separation_of_duties_prevents_self_approval` |
| **Audit Trail** | `queryAuditEvents` | `/api/v1/audit` | `GET` | Optional `task_id` | `List[Dict[str, Any]]` | `adaptAuditEvent` | Tenant scoped; operators see only own events | **IMPLEMENTED** | `test_audit_role_scoping` |
| **Audit Trail** | `getAuditByTrace` | `/api/v1/audit/{trace_id}` | `GET` | None | `List[Dict[str, Any]]` | `adaptAuditEvent` | Scoped to tenant | **IMPLEMENTED** | `test_audit_events_and_trace_query` |
| **Audit Trail** | `getAuditEvent` | `/api/v1/audit/events/{id}` | `GET` | None | `Dict[str, Any]` | `adaptAuditEvent` | Immutable audit log record | **IMPLEMENTED** | `test_audit_events_and_trace_query` |
| **Governed Sandbox** | `runSandbox` | `/api/v1/tools/sandbox/run` | `POST` | `SandboxRunRequest` | `SandboxRunResponse` | Direct mapping | Validates compiler flags, path traversal, language allowlist; forwards to goboxd VM | **IMPLEMENTED** (Local Mock Verified; Live VM Skipped) | `test_sandbox_execution_success` |
| **File Management** | `uploadFile` | `/api/v1/files/upload` | `POST` | Multipart Form | `Dict[str, Any]` (file metadata) | Direct mapping | Validates MIME, size (<10MB), tenant scope; writes to private GCS | **IMPLEMENTED** | `test_file_upload_and_download` |
| **File Management** | `downloadFile` | `/api/v1/files/{id}/download` | `GET` | None | Binary stream / redirect | Direct mapping | Enforces cross-tenant denial (404) | **IMPLEMENTED** | `test_file_download_cross_tenant_isolation` |

---

## 2. Parity Status

- **Contract Coverage:** 100% of defined `docs/09_API_CONTRACT.md` routes are implemented in FastAPI.
- **Mock Fallback Rule:** In API mode (`DATA_MODE=api`), zero fallback to local mock arrays or demo fixtures is permitted. Any server failure returns explicit error states (`toast-error`, empty state, or alert).
