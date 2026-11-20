# LARA workflows

This file translates the supplied SIH26117 proposal workflow concepts into the current LARA prototype direction. The SIH proposal contributes multi-model/multi-agent intelligence, an institutional knowledge fabric, an agentic tool highway, policy-aware execution, verified outputs, traceable institutional memory and the human-governed `Observe → Propose → Evaluate → Approve` evolution cycle. The current buildathon prototype is cloud-hosted and Gemini-backed behind a provider adapter; local inference is not a buildathon dependency.

## 1. Primary task execution lifecycle

`REQUESTED → AUTHENTICATING → CLASSIFYING → PLANNING → ROUTE_RESOLUTION → CONTEXT_ASSEMBLY → DELEGATING → EXECUTING → VERIFYING → AWAITING_APPROVAL (when required) → DELIVERING → COMPLETED`

Failure and exception states: `DENIED`, `NEEDS_CLARIFICATION`, `FAILED_RETRYABLE`, `FAILED_TERMINAL`, `CANCELLED`, `EXPIRED`. State transitions must be validated by the backend. The UI cannot mark a workflow as approved or completed by changing client state.

Required invariants:
- Resolve initiating identity, tenant and purpose before protected information is accessed.
- Apply classification and policy checks before retrieval and graph traversal.
- A model-generated tool call is a proposal, not execution authority.
- Re-authorise every tool invocation at the gateway.
- High-risk operations pause for an authorised human decision.
- Results carry evidence references, assumptions and provenance.
- Close task-scoped environments after completion; revoke temporary grants and preserve the audit trace.

## 2. Dynamic Information Highway resolution

1. Parse the task into information needs and capability needs.
2. Resolve the initiating principal, tenant, role, attributes and stated purpose.
3. Discover candidate nodes: sources, agents, skills and tools.
4. Filter nodes and edges through RBAC + ABAC before protected content is read.
5. Build feasible routes using permitted relationships and dependency constraints.
6. Rank permitted routes by task relevance, freshness, trust/provenance, availability and estimated cost/latency.
7. Select a route and assemble only the minimum context required.
8. Re-check permissions when a route changes, delegation occurs or a tool is invoked.
9. Record selected and rejected route candidates with policy reasons, without leaking protected metadata to the requester.

A visible graph is not enough: the Runtime Console graph must render from actual backend route decisions.

## 3. Agent delegation and context propagation

The orchestrator creates a delegation contract for each specialist agent. It includes the parent execution ID, initiating principal, agent identity, task objective, allowed resources, allowed tools, purpose, data classification, deadline/expiry and required output schema. The agent receives only the minimum context needed.

The three buildathon specialists are:
- **Research Agent:** discover sources, extract facts and return source-linked evidence.
- **Analysis Agent:** synthesise evidence, identify assumptions and prepare a proposed result.
- **Verification Agent:** check evidence coverage, consistency, constraints and output schema.

Nested delegation is disabled in the initial demo unless explicitly implemented and tested. Agent service identities do not grant broader privileges than the initiating principal and approved delegation contract.

## 4. Controlled agent evolution

`OBSERVE → DIAGNOSE → PROPOSE → EVALUATE → HUMAN_APPROVAL → PROMOTE → MONITOR → ROLLBACK (if needed)`

Observe execution traces, verification failures, tool errors, feedback and benchmark outcomes. Diagnose whether a failure belongs to a prompt, skill, route strategy, planning strategy or missing context. Generate a candidate version with an explicit change rationale. Run fixed benchmark, holdout and adversarial tests. Compare against the active version. Require authorised approval to promote. Preserve immutable version lineage and rollback.

The prototype may evolve agent prompts, skills, planning strategies and route preferences. It must not autonomously modify the security constitution, role assignments, policy rules, tenant boundaries or its own permissions.

## 5. Identity-aware governance

A policy decision evaluates:
- **Subject:** user, agent, service identity and delegation chain.
- **Action:** discover, read, transform, delegate, write, approve, export or execute.
- **Resource:** source, graph node, field, memory item, skill, tool or output.
- **Context:** tenant, department, project, purpose, data classification, risk and time-bound constraints.

Possible decisions: `ALLOW`, `DENY`, `REQUIRE_APPROVAL`, `REDACT`. Default to deny when a policy service is unavailable, identity is ambiguous or policy cannot be established. The agent is never a superuser.

## 6. Task-scoped execution environment lifecycle

`CREATE → ATTACH_MINIMUM_DATA → GRANT_SCOPED_TOOLS → APPLY_NETWORK_AND_RESOURCE_LIMITS → EXECUTE → VERIFY → EXPORT_APPROVED_ARTIFACTS → REVOKE → DESTROY`

Use temporary, task-scoped credentials and isolated execution for code or file operations. No standing superuser credentials. Network egress should be deny-by-default with explicit permitted endpoints. Enforce time, memory, CPU and file-size limits. Temporary data and credentials must be removed at teardown; durable audit and approved output artifacts remain.

## 7. Institutional memory lifecycle

`CAPTURE_TRACE → VALIDATE → CLASSIFY_AND_LABEL → HUMAN_OR_POLICY_APPROVAL → PROMOTE_TO_MEMORY → ACCESS_FILTERED_REUSE → CORRECT_OR_EXPIRE`

Do not promote every model response into institutional truth. Store source provenance, owner, tenant, classification, retention/expiry and validation status. Memory retrieval must go through the same identity and purpose checks as other knowledge sources. Support correction, revocation and deletion according to the data lifecycle.

## 8. Model routing and provider abstraction

The buildathon prototype uses Gemini as the active hosted provider behind a provider adapter contract. Routing inputs include task type, modality, required capabilities, data policy, availability and cost/latency constraints. The prototype should not claim a second provider is implemented until a second adapter has passed the same contract tests. Model output is untrusted structured proposal data; the runtime validates schema and policy before any tool call.

## 9. Demo workload: industrial incident investigation

The workload illustrates the general runtime, not the entire product category. An operator asks LARA to investigate an incident involving an asset. The runtime identifies incident records, asset registry, approved procedures and specialist capabilities. The operator's route excludes restricted vendor or commercial records. Research, analysis and verification agents collaborate under the orchestrator. LARA produces an evidence-linked investigation summary and a proposed maintenance request. Submission is simulated and requires supervisor approval. The Runtime Console displays route selection, denied path, delegated agents, policy checks, evolution state and audit trace.

No physical equipment actuation or production system write is part of the demo.

## 10. Evolution demo

Seed a known defect: the Analysis Agent does not check the effective revision of a procedure before relying on it. Run a task and record the verifier's failure. Let the Evolution Engine diagnose the gap and propose a prompt/skill change. Evaluate candidate and active versions against identical benchmark cases, including a policy regression case. Show actual results, approve promotion as Runtime Administrator, rerun the task and show version lineage and rollback availability. Do not fabricate improved scores.

## 11. Required execution trace

At minimum record: `execution_id`, initiating principal, tenant, task, plan version, agent IDs and versions, selected route, source references, model provider/model ID, tool calls, policy decisions, approval events, verifier results, output artifact references, timestamps and terminal status.
