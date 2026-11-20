# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, React Flow (for live graph visualization and telemetry).
- **Backend**: Python, FastAPI.
- **Data & State Infrastructure**: Neo4j Aura (knowledge & capability graph store), Firestore (operational execution state), Google Cloud Storage (object storage).
- **Model Intelligence**: Gemini API behind a provider-independent adapter contract.

## Users

1. **Enterprise Operations & Reliability Engineers**: Investigate industrial and system incidents, review cross-domain evidence, track multi-agent root-cause analysis, and request maintenance actions.
2. **Runtime Administrators & Policy Officers**: Inspect execution traces, enforce RBAC/ABAC boundary policies, govern identity propagation, review candidate agent evolutions, and authorise or rollback version deployments.
3. **Domain Specialists & Knowledge Curators**: Inspect institutional knowledge fabric nodes, verify tool highway routing, and validate provenance-linked agent outputs.

## Product Purpose

LARA (**Lattice Agentic Runtime Accelerator**) is an adaptive, model-independent enterprise agentic runtime infrastructure. It dynamically determines how enterprise agents access information, coordinate specialist capabilities, and iteratively improve execution strategies, while strictly preserving identity, security policy, and operational accountability across the entire process.

Success means:
- The runtime plans and decomposes tasks dynamically based on initiating identity and context (not rigid hardcoded scripts).
- Dynamic Information Highways discover and route requests through graph-verified, permission-checked sources, agents, and tools.
- Specialist agents operate within strictly enforced task-scoped boundaries without privilege escalation.
- A controlled self-evolution loop continuously diagnoses failures and evaluates candidate prompt/skill improvements with human-in-the-loop approval.
- Every decision, model call, and tool execution is recorded in an immutable, inspectable audit trace.

## Positioning

Unlike generic multi-agent frameworks or black-box autonomous chatbots:
- LARA treats LLMs as untrusted intelligence providers behind strict capability adapters; model tool proposals are never direct execution authorities.
- Authorization (RBAC + ABAC) is enforced at the graph retrieval and tool gateway level *before* protected data enters model context.
- Agent self-evolution is rigorously bounded: LARA can evolve agent prompts, skills, and routing preferences, but is strictly prohibited from autonomously modifying the security constitution, role entitlements, or tenant boundaries.

## Operating Context

- **Enterprise Workbench**: Operational interface for initiating tasks, monitoring progress, inspecting evidence chains, and approving high-risk actions.
- **Runtime & Authority Console**: Governance and telemetry interface for observing live Dynamic Information Highway graphs, delegated agent execution, evolution version lineages, and audit traces.
- **Incident Investigation Workload**: Concrete demonstration scenario where an industrial incident is analyzed across asset registries, sensor telemetry, and operating manuals, culminating in a supervisor-approved maintenance request.

## Capabilities and Constraints

### Capabilities (Confirmed for Prototype)
- **Dynamic Information Highways**: Graph-backed route discovery filtering nodes and edges via RBAC + ABAC before data access.
- **Multi-Agent Orchestration**: Orchestrator coordinating three specialized agents:
  - *Research Agent*: Discovers sources and extracts source-linked evidence.
  - *Analysis Agent*: Synthesizes evidence, surfaces assumptions, and drafts recommendations.
  - *Verification Agent*: Validates evidence coverage, constraint compliance, and output schema.
- **Controlled Self-Evolution (`Observe → Diagnose → Propose → Evaluate → Approve`)**: Evaluates candidate prompt/skill modifications against fixed benchmarks with mandatory human administrator sign-off.
- **Task-Scoped Execution Environments**: Dynamic, time-bound execution envelopes with ephemeral credentials and strict egress filtering.
- **Comprehensive Audit Tracing**: Immutable event logging (`execution_id`, principal, tenant, route, agent versions, tool calls, policy decisions, verification results).

### Constraints & Invariants
- **No Physical Actuation**: No direct writes to live production machinery, SCADA, or physical control systems; external actions are simulated and require explicit supervisor approval.
- **Constitutional Boundary**: Security constitution, RBAC/ABAC rules, and tenant definitions are immutable to autonomous evolution.
- **Single Active Provider**: Gemini API is the active hosted provider behind the provider adapter contract for the prototype.

## Brand Commitments

- **Product Name**: LARA — Lattice Agentic Runtime Accelerator.
- **Design System Name**: *Bright Lattice*.
- **Visual Personality**: High-contrast, geometric, playful yet operationally rigorous. Rejects generic dark-mode "cyberpunk" tropes in favor of a bright, high-energy, semantically color-coded canvas.
- **Core Semantic Colors**:
  - `#F5FFE8` (Pale cream-green canvas)
  - `#4B43F5` (Electric Blue: Runtime & Orchestration)
  - `#00B9E8` (Cyan: Information Routing & Graph Connectors)
  - `#EC00D4` (Hot Magenta: Authority Boundaries & Policy Attention)
  - `#FF7138` (Orange: Execution & Review-Needed Actions)
  - `#23C978` (Green: Allowed, Healthy & Verified States)
  - `#C7B9FF` (Lilac: Agents & Institutional Knowledge)
  - `#8B4DFA` (Violet: Evolution, Adaptation & Candidate Versions)
  - `#E4FF88` (Neon Lime: Active Context & Focus Surfaces)
  - `#101014` (Near-Black: Critical Text & Security Boundaries)

## Evidence on Hand

- **Asset Reference Pack**: Full suite of clean SVG brand marks (`lara-mark.svg`, `lara-wordmark.svg`, `lara-palette.svg`, `lara-hero-art.svg`), 10 capability icons (`agent`, `approval`, `audit`, `evolution`, `graph`, `memory`, `model`, `policy`, `sandbox`, `tool`), 9 detailed architecture diagrams, and `lattice-grid.svg`.
- **Authoritative Specifications**:
  - `docs/LARA_PROTOTYPE_SCOPE_AND_TECHNICAL_SPEC.md` (2,490-line locked implementation spec).
  - `docs/WORKFLOWS.md` (Detailed state machines and execution lifecycles).
  - `docs/DESIGN_LANGUAGE.md` (Visual grammar and color semantic definitions).
  - `tokens/lara-design-tokens.json` & `styles/lara-theme.css`.
- **Visual Golden**: `references/provided-visual-reference.png`.

## Product Principles

1. **Identity & Policy Precede Execution**: No agent reads protected knowledge or executes tools without verified principal, tenant, and purpose authorization.
2. **Models Propose, Runtimes Decide**: Intelligence generation is separated from execution authority; all tool invocations and state changes are gated.
3. **Evolution Requires Human Accountability**: Autonomous optimization proposes and tests, but an authorized human must approve version promotions.
4. **Semantics Over Decoration**: Every color and shape represents an operational system role; aesthetics amplify clarity rather than disguising complexity.

## Accessibility & Inclusion

- Target standard: WCAG 2.2 AA compliance.
- Strict requirement: Color is never the sole communicator of security or policy status (always accompanied by text chips or distinct iconography).
- Full contrast enforcement: High-contrast near-black `#101014` on pale surfaces; no light text on bright lime, cyan, or yellow.
- Motion sensitivity: Full support for `prefers-reduced-motion` with zero ambient looping distracting from telemetry.
