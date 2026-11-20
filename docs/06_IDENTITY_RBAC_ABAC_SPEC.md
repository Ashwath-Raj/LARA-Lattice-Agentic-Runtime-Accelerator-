# 06 — Identity, RBAC, ABAC and Delegation Specification

## 1. Demo principals

| Principal ID | Display name | Role | Department | Clearance | Allowed demo scope |
|---|---|---|---|---|---|
| `usr_operator_01` | Maya Operator | `operator` | operations | internal | incident, asset, current SOP reads; initiate tasks |
| `usr_supervisor_01` | Ravi Supervisor | `supervisor` | operations | confidential | operator capabilities + restricted vendor record + approve designated request |
| `usr_admin_01` | LARA Administrator | `runtime_admin` | platform | restricted | manage agent versions, graph configuration, evolution promotion and runtime configuration |
| `usr_auditor_01` | Nila Auditor | `auditor` | assurance | confidential | inspect allowed audit records; no operational tool execution |

Use seeded demo login accounts with fixed demo passwords generated during seed. Store password hashes only. Do not hardcode plaintext passwords in the frontend bundle. Provide a local/demo bootstrap mechanism that seeds hashes. The demo identity switcher must call backend login/logout endpoints; it must not set `role` in localStorage and trust it.

## 2. Principal context

```json
{
  "principal_id":"usr_operator_01",
  "tenant_id":"demo-enterprise",
  "roles":["operator"],
  "attributes":{
    "department":"operations",
    "clearance":"internal",
    "project":"plant-alpha",
    "employment_status":"active"
  },
  "session_id":"sess_..."
}
```

The browser never supplies authoritative roles or clearance. The server derives them from the authenticated session and Firestore principal record.

## 3. RBAC permissions

| Permission | Operator | Supervisor | Runtime Admin | Auditor |
|---|---:|---:|---:|---:|
| `task.create` | Yes | Yes | Yes | No |
| `source.read.internal` | Yes | Yes | Yes | By audit scope only |
| `source.read.confidential` | No | Yes if ABAC passes | Yes if ABAC passes | No by default |
| `agent.execute` | Via orchestrator | Via orchestrator | Via orchestrator | No |
| `tool.calculate` | Yes | Yes | Yes | No |
| `maintenance_request.create_simulated` | Request only | Approve/execute after approval | Admin policy only; no self-approval | No |
| `evolution.propose` | Feedback only | Feedback only | Yes | No |
| `evolution.promote` | No | No | Yes | No |
| `graph.configure` | No | No | Yes | No |
| `audit.read` | Own task subset | Department subset | Full demo scope | Full demo scope |
| `equipment.control` | No | No | No | No |

## 4. ABAC attributes

Evaluate:
- `tenant_id`
- `department`
- `clearance`
- `project`
- `purpose`
- `resource_classification`
- `action_risk`
- `task_owner`
- `delegation_scope`
- `approval_status`

Classification order: `PUBLIC < INTERNAL < CONFIDENTIAL < RESTRICTED`.

A principal may access a resource only if the role grants the permission, tenant matches, clearance is sufficient, purpose is allowed and resource is active. Deny by default.

## 5. Policy decision response

```json
{
  "decision":"ALLOW",
  "reason_code":"ROLE_AND_ATTRIBUTES_MATCH",
  "policy_id":"POL-SOURCE-READ-001",
  "principal_id":"usr_operator_01",
  "resource_id":"source:incident-log",
  "action":"source.read",
  "evaluated_at":"..."
}
```

Supported decisions: `ALLOW`, `DENY`, `REQUIRE_APPROVAL`, `REDACT`.

## 6. Delegation security

Each agent task carries:
- originating principal ID;
- tenant ID;
- task ID and purpose;
- parent delegation ID;
- explicit allowed source IDs;
- explicit allowed tool IDs;
- maximum risk level;
- expiry/deadline;
- agent identity and version.

Delegation can only narrow authority, never broaden it. Agent-to-agent delegation requires the orchestrator to re-resolve the route and policy. A child agent cannot change its principal, tenant or allowed resources. Do not pass Cloud IAM credentials to agents.

## 7. Approval separation of duties

- Operator can request a consequential action but cannot approve it.
- Supervisor can approve a request only if not the initiating principal and policy permits.
- Runtime Admin manages evolution and graph configuration; do not let the same admin approve a simulated maintenance action if the demo policy requires Supervisor separation.
- Auditor cannot approve or execute operational actions.

On approval, re-evaluate the current policy and the request state. Approval is not a permanent bypass token.

## 8. Fail-closed requirements

If identity, tenant, policy attributes, policy engine or Firestore state is unavailable, deny protected operation. Never fall back to a client-supplied role or permissive default.

## 9. Security acceptance tests

- Operator cannot read vendor contract content or metadata.
- Supervisor can read vendor contract only when department/clearance/purpose pass.
- Auditor cannot invoke tools.
- Operator cannot promote evolution candidate.
- Agent cannot access source not in its delegated source list.
- Child agent cannot widen delegated tool list.
- Missing tenant fails closed.
- Policy engine exception fails closed.
- Approval by task initiator is rejected.
- Expired or already-used approval cannot execute action twice.
