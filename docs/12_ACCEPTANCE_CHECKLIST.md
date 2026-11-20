# 12 — Acceptance Checklist

A feature is complete only when its backend behaviour, UI state and test evidence agree.

## A. Google Cloud deployment
- [ ] React and FastAPI served from one Cloud Run HTTPS URL.
- [ ] Container image stored in Artifact Registry.
- [ ] Build/deploy performed by Cloud Build.
- [ ] Cloud Run uses dedicated service account.
- [ ] Vertex AI inference uses ADC/service identity; no Gemini key in browser.
- [ ] Firestore Native mode is canonical state store.
- [ ] Cloud Storage bucket is private.
- [ ] Cloud Logging receives structured logs.
- [ ] No external runtime/database/model/hosting provider is required.
- [ ] No local model or localhost dependency is required for demo.

## B. Identity and governance
- [ ] Four seeded demo identities exist.
- [ ] Login is checked server-side; password hashes only.
- [ ] Browser cannot assign its own role/clearance/tenant.
- [ ] RBAC and ABAC are evaluated on backend.
- [ ] Operator cannot read restricted vendor content or metadata.
- [ ] Supervisor can read only when ABAC conditions pass.
- [ ] Auditor cannot execute operational tools.
- [ ] Missing identity/policy/Firestore error fails closed.
- [ ] Delegated agents cannot widen source/tool scope.
- [ ] Approval separation of duties is enforced.

## C. Dynamic Information Highways
- [ ] Firestore contains seeded graph nodes and edges.
- [ ] Backend resolver loads canonical graph and reports graph version.
- [ ] Route is recomputed per task and identity.
- [ ] Same task yields different permitted routes for Operator and Supervisor.
- [ ] Restricted source is filtered before content retrieval.
- [ ] Stale SOP is excluded or ranked below current SOP.
- [ ] Disabled node/edge cannot be selected.
- [ ] Route includes selected path, source IDs, score components and policy decision IDs.
- [ ] Graph cache refreshes on graph version change.
- [ ] Firestore failure does not use stale permissive fallback.

## D. Orchestration and agents
- [ ] Task state machine persists transitions.
- [ ] Planner output is schema-validated.
- [ ] Agent registry resolves Research, Analysis and Verification.
- [ ] Each agent receives scoped context/delegation envelope.
- [ ] Research returns evidence references.
- [ ] Analysis separates facts from hypotheses.
- [ ] Verification detects unsupported claims/stale SOP.
- [ ] Gemini calls go through provider adapter.
- [ ] Model output cannot directly execute tools.

## E. Evolution engine
- [ ] Seeded failure is reproducible.
- [ ] Failure links to execution trace.
- [ ] Candidate prompt/skill is generated and immutable.
- [ ] Parent version and content hash are recorded.
- [ ] Functional tests run against candidate.
- [ ] Security regression tests run against candidate.
- [ ] Failed candidate cannot be promoted.
- [ ] Passing candidate waits for admin approval.
- [ ] Non-admin cannot approve/promote.
- [ ] Promotion changes active version pointer.
- [ ] Rollback restores prior version and creates audit event.
- [ ] Security policy cannot be evolved by this mechanism.

## F. Tools and approvals
- [ ] Tool registry has schemas and risk classes.
- [ ] Source read requires policy approval before read.
- [ ] Safe calculator is bounded; no `eval`, `exec` or shell.
- [ ] Simulated maintenance request requires Supervisor approval.
- [ ] Initiator cannot approve own request.
- [ ] Approval is revalidated before execution.
- [ ] `equipment.control` always denied.
- [ ] Simulated actions visibly marked `SIMULATED`.

## G. Audit and observability
- [ ] Trace records principal, tenant, task and request IDs.
- [ ] Trace records graph version and selected route.
- [ ] Trace records source provenance.
- [ ] Trace records agent and prompt versions.
- [ ] Trace records model invocation metadata.
- [ ] Trace records policy decisions and approval.
- [ ] Trace records tool result and outcome.
- [ ] Browser cannot modify/delete audit events.
- [ ] Logs contain no passwords, tokens, service keys or unrestricted source content.

## H. UX and demo
- [ ] Workbench and Runtime Console share same Cloud Run origin.
- [ ] Bright Lattice visual tokens applied consistently.
- [ ] Login/identity switch uses backend session.
- [ ] Highway graph reflects actual API route.
- [ ] Evolution Lab reflects actual candidate/evaluation records.
- [ ] Governance decisions reflect actual policy engine.
- [ ] Approval UI updates after backend decision.
- [ ] Audit timeline reflects persisted events.
- [ ] Empty, loading, error and denied states exist.
- [ ] Synthetic data label is visible.
- [ ] No fake metrics or fake live animations.

## I. Release freeze
- [ ] All tests pass or known failures are documented.
- [ ] Seed script is idempotent.
- [ ] One-click/demo reset procedure tested.
- [ ] Public Cloud Run URL tested from a fresh browser session.
- [ ] 3-minute demo rehearsed twice.
- [ ] Backup screen recording exists.
- [ ] README includes deployment URL and capability truth labels.
- [ ] No uncommitted code or secrets.
- [ ] Release tag/commit recorded.
