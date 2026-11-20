# 09 — API Contract

Base path: `/api/v1`. All JSON is UTF-8. All protected endpoints require a valid server-side session cookie. The backend derives principal/roles from the session; clients must not send authoritative roles.

## 1. Authentication

### `POST /auth/demo-login`
Request:
```json
{"principal_id":"usr_operator_01","demo_password":"<seeded-secret>"}
```
Response:
```json
{"principal":{"principal_id":"usr_operator_01","display_name":"Maya Operator","roles":["operator"],"attributes":{"department":"operations","clearance":"internal"}},"session_expires_at":"..."}
```
Sets Secure, HttpOnly, SameSite cookie in deployed HTTPS. Do not return session secret in JSON.

### `POST /auth/logout`
Invalidates session and clears cookie.

### `GET /auth/me`
Returns server-resolved principal and visible navigation capabilities.

## 2. Health

- `GET /health/live` — process alive.
- `GET /health/ready` — readiness; verifies required configuration and Firestore access, not an expensive model call.

## 3. Tasks

### `POST /tasks`
Request:
```json
{
  "title":"Investigate incident INC-204",
  "prompt":"Investigate the repeated vibration and temperature anomaly for P-204. Prepare an evidence-backed response and a simulated maintenance request if justified.",
  "incident_id":"INC-204",
  "attachment_ids":[]
}
```
Response `202`:
```json
{"task_id":"task_...","status":"QUEUED","trace_id":"trace_...","created_at":"..."}
```

- `GET /tasks/{task_id}` — task summary and current state.
- `GET /tasks/{task_id}/events` — task event timeline.
- `POST /tasks/{task_id}/run` — start or resume only if state allows; idempotency key required.
- `POST /tasks/{task_id}/cancel` — cancel if not terminal.

## 4. Information Highways

- `GET /graph/summary` — authorised graph summary only.
- `GET /graph/nodes` — authorised nodes, filters by type.
- `GET /graph/routes/resolve?task_id=...` — backend route resolution for task/current principal.
- `POST /graph/routes/preview` — preview with task intent and capability requirements; uses current session principal, never arbitrary principal ID.
- `GET /graph/version` — current graph version.

Route response:
```json
{
  "route_id":"route_...",
  "task_id":"task_...",
  "principal_id":"usr_operator_01",
  "graph_version":4,
  "selected_path":["workflow:incident-investigation","agent:research","source:incident-log","source:asset-registry","agent:analysis","agent:verification"],
  "selected_sources":["source:incident-log","source:asset-registry","source:sop-current"],
  "excluded_candidates":[{"reason_code":"POLICY_DENIED","display":"Restricted source excluded by policy"}],
  "score_components":{"relevance":0.9,"trust":0.95,"freshness":0.96,"availability":1.0,"cost_efficiency":0.9}
}
```

## 5. Agents

- `GET /agents` — visible agent registry.
- `GET /agents/{agent_id}` — agent metadata.
- `GET /agents/{agent_id}/versions` — versions visible to current principal.
- `GET /agents/{agent_id}/skills` — skill metadata.

## 6. Evolution

- `GET /evolution/proposals`
- `GET /evolution/proposals/{proposal_id}`
- `POST /evolution/proposals` — create from evidence/trace; admin or allowed feedback flow.
- `POST /evolution/proposals/{proposal_id}/evaluate`
- `POST /evolution/proposals/{proposal_id}/approve`
- `POST /evolution/proposals/{proposal_id}/reject`
- `POST /evolution/versions/{version_id}/rollback`

Approval request requires reason:
```json
{"decision":"APPROVE","reason":"Candidate passed the required functional and security suite."}
```

## 7. Governance and policy

- `POST /policies/evaluate` — evaluate current session principal against action/resource/purpose.
- `GET /governance/principals` — admin only.
- `GET /governance/decisions?task_id=...` — scoped decisions.
- No public policy mutation endpoint in MVP.

Policy request:
```json
{"action":"source.read","resource_id":"source:vendor-contract","purpose":"incident_investigation"}
```

## 8. Approvals

- `GET /approvals` — queue filtered by principal role and scope.
- `GET /approvals/{approval_id}`
- `POST /approvals/{approval_id}/decision`

Decision:
```json
{"decision":"APPROVE","reason":"Reviewed the evidence and supporting procedure."}
```

## 9. Audit

- `GET /audit?task_id=...`
- `GET /audit/{trace_id}`
- `GET /audit/events/{event_id}`

No update/delete endpoint.

## 10. Uploads

- `POST /files/upload` — multipart; backend validates MIME, size, filename and principal scope, stores privately in GCS, records metadata in Firestore.
- `GET /files/{file_id}/download` — authorised backend-mediated download or short-lived signed URL if correctly configured; do not expose bucket publicly.

## 11. Common response envelope

Error:
```json
{"error":{"code":"POLICY_DENIED","message":"The requested operation is not permitted.","request_id":"req_...","trace_id":"trace_..."}}
```

Success responses include IDs and timestamps. Use Pydantic models for every request/response. Generate OpenAPI from FastAPI and compare it to `contracts/openapi.yaml` at integration checkpoint. If there is a mismatch, the frozen contract in this file wins unless Ashwath approves a change.

## 12. API implementation rules

- All route handlers are thin; business logic lives in service modules.
- Use idempotency keys for task start, approval decision and simulated action execution.
- Enforce request size and upload limits.
- Validate every model-generated object with Pydantic.
- Never trust frontend-supplied `principal_id`, `roles`, `clearance`, `tenant_id` or `approval_status`.
- Do not return protected node metadata on denied requests.
- Use stable error codes and trace IDs.
