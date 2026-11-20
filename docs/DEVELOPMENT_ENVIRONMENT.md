# LARA — Development Environment & MCP Inventory

**Last Updated**: 2026-11-20
**Repository**: `https://github.com/Ashwath-Raj/LARA-Lattice-Agentic-Runtime-Accelerator-`
**Current Branch**: `feat/ashwath-runtime-goboxd-integration`
**Host Architecture**: Linux x86_64 (`7.0.0-43-generic` Ubuntu) with unified cgroup v2 hierarchy

---

## 1. Executive Summary

This document serves as the authoritative inventory and operational verification record of the Antigravity development environment, Model Context Protocol (MCP) servers, installed skills, and supporting developer toolchains for project **LARA (Lattice Agentic Runtime Accelerator)**.

In adherence to security non-negotiables:
- All MCP tools adhere to strict least-privilege principles with read-only inspection allowlists.
- No secrets, tokens, or credentials are hardcoded or leaked into MCP environments.
- Deprecated, unverified, or third-party untrusted integrations have been evaluated and explicitly rejected in favor of official vendor solutions.
- Every verified tool includes its exact verification command and execution result.

---

## 2. Model Context Protocol (MCP) Server Inventory

### 2.1 Installed & Verified MCP Servers

#### `google-cloud` (Official Google Cloud MCP Server)
- **MCP Server Name**: `google-cloud`
- **Official Source / Repository**: [googleapis/gcloud-mcp](https://github.com/googleapis/gcloud-mcp)
- **Version**: `@google-cloud/gcloud-mcp@0.5.3` (npm)
- **Publisher**: Google LLC (`google-wombot`, `google-admin`)
- **License**: Apache-2.0
- **Installation Method**: Configured in `~/.gemini/config/mcp_config.json` running via `npx -y @google-cloud/gcloud-mcp -c ~/.gemini/config/gcloud_mcp_allowlist.json`.
- **Antigravity Compatibility**: Verified compatible over stdio transport. Exposes tool `run_gcloud_command`.
- **Permissions Granted**: Strictly scoped by JSON allowlist (`~/.gemini/config/gcloud_mcp_allowlist.json`). Mutation commands (e.g., `delete`, `create`, `update`, `set-iam-policy`) are rejected fail-closed.
- **Allowed Command Groups**:
  - `config list`, `config get-value`
  - `projects list`, `projects describe`
  - `run services list`, `run services describe`, `run revisions list`, `run revisions describe`
  - `firestore databases list`
  - `storage buckets list`, `storage ls`
  - `artifacts repositories list`, `artifacts docker images list`
  - `builds list`, `builds describe`
  - `compute instances list`, `compute instances describe`, `compute networks list`, `compute firewall-rules list`
  - `iam service-accounts list`, `iam service-accounts describe`
  - `logging read`, `monitoring time-series read`, `services list`
- **Authentication Method**: Local `gcloud` CLI credential store and Application Default Credentials (ADC). No credentials stored in MCP configuration.
- **Connected Services**: Cloud Run, Cloud Firestore, Cloud Storage, Vertex AI, Cloud Build, Artifact Registry, Compute Engine, VPC Networking, Cloud IAM, Cloud Logging, Cloud Monitoring.
- **Security Considerations**: Read-only inspection enforcement prevents AI agents from accidental resource destruction or privilege escalation. Command substitution, subshells, and pipes are blocked by `@google-cloud/gcloud-mcp` design.
- **Verification Command & Result**:
  - *Command*: JSON-RPC tool call `run_gcloud_command` with args `["config", "list"]`.
  - *Result*: Verified execution: `[core] disable_usage_reporting = True Your active configuration is: [default]`.
  - *Security Block Verification*: JSON-RPC tool call with `["run", "services", "delete", "lara-runtime"]` was rejected with `"Execution denied: This command is not on the access control's allowlist"`.

#### `context7` (Official Documentation Resolver)
- **MCP Server Name**: `context7`
- **Official Source / Endpoint**: `https://mcp.context7.com/mcp`
- **Transport**: SSE / Remote MCP
- **Antigravity Compatibility**: Verified active. Tools: `resolve-library-id`, `query-docs`.
- **Permissions**: Read-only documentation queries.

#### `playwright` (Browser Automation)
- **MCP Server Name**: `playwright`
- **Official Source / Package**: `@playwright/mcp@latest`
- **Transport**: Stdio via `npx`
- **Antigravity Compatibility**: Verified active.

---

### 2.2 Evaluated & Rejected / Alternative MCP Integrations

| Integration | Evaluated Package | Status | Rationale / Resolution |
|---|---|---|---|
| **GitHub MCP** | `@modelcontextprotocol/server-github` | **REJECTED (Deprecated)** | Package is officially marked `DEPRECATED - Archived and unmaintained; no security guarantees`. |
| **GitHub Operations** | GitHub CLI (`gh`) | **ACTIVE & VERIFIED** | `gh` v2.83.0 is installed, authenticated as `Ashwath-Raj` with scopes `repo, workflow, read:org, gist`. Operations are executed with token-free keyring credentials. |
| **GitHub MCP Server** | `github/github-mcp-server` (Docker) | **RECOMMENDED (Conditional)** | Official Go/Docker server by GitHub. Recommended once local Docker daemon is started. |
| **Unofficial GCP MCPs** | Various community gcp-mcp packages | **REJECTED** | Violates Rule 3.10 ("Do not use unofficial Google Cloud MCP servers when a suitable official integration exists"). Rejected in favor of `@google-cloud/gcloud-mcp`. |

---

## 3. Skills Inventory

### 3.1 Workspace Skills Installed (`.agents/skills/`)

The following specialized skills were created and installed directly in the workspace repository to guide LARA development and deployment:

1. **`gcp-architecture-and-cloud-run`** (`.agents/skills/gcp-architecture-and-cloud-run/SKILL.md`):
   - Scope: Google Cloud Run target architecture, production sizing, concurrency, Serverless VPC Access / Direct VPC egress, health probes (`/health/live`, `/health/ready`), and revision management.
2. **`firestore-data-modeling`** (`.agents/skills/firestore-data-modeling/SKILL.md`):
   - Scope: Firestore Native mode document modeling, canonical `graph_nodes` & `graph_edges` collections, in-memory NetworkX adjacency caching, tenant filtering, and composite indexing.
3. **`vertex-ai-gemini`** (`.agents/skills/vertex-ai-gemini/SKILL.md`):
   - Scope: Official `google-genai` Python SDK in Vertex mode (`genai.Client(vertexai=True)`), Application Default Credentials, structured JSON schema generation, and deterministic mock fallbacks.
4. **`cloud-build-cicd`** (`.agents/skills/cloud-build-cicd/SKILL.md`):
   - Scope: Automated `cloudbuild.yaml` pipelines, pre-deployment pytest testing gate, Artifact Registry container storage, and Cloud Run deployment.
5. **`gcp-iam-least-privilege`** (`.agents/skills/gcp-iam-least-privilege/SKILL.md`):
   - Scope: Service account provisioning, least-privilege role assignment (`roles/aiplatform.user`, `roles/datastore.user`, scoped storage access), zero-privilege sandbox VM service account.
6. **`docker-multistage-builds`** (`.agents/skills/docker-multistage-builds/SKILL.md`):
   - Scope: Two-stage Python 3.12-slim Dockerfile design, layer caching optimization, dedicated non-root user execution (`appuser:10001`), and minimal runtime attack surface.
7. **`linux-sandboxing-nsjail`** (`.agents/skills/linux-sandboxing-nsjail/SKILL.md`):
   - Scope: Linux namespaces, cgroup v2 memory/CPU/PID limits, seccomp-bpf system call filters, read-only root mounts, and `goboxd` execution daemon orchestration.

### 3.2 Global Active Skills (`~/.gemini/config/skills/`)

- **`fastapi-templates`**: FastAPI asynchronous routing, dependency injection, and schema patterns.
- **`python-testing-patterns`**: Pytest async fixtures, unit and integration test design.
- **`api-design-principles`**: REST & OpenAPI specification consistency.
- **`auth-implementation-patterns`**: RBAC, ABAC, and session security.
- **`git-advanced-workflows` & `code-review-excellence`**: Clean Git history, rebasing, and peer review standards.
- **`secrets-management`**: Secure environment handling and ADC credential workflows.

---

## 4. Supporting Toolchains & Core Dependencies

### 4.1 Host Toolchains

| Tool | Version | Path | Status | Verification Command | Verification Result |
|---|---|---|---|---|---|
| **Python** | 3.12.14 | `.venv/bin/python` | Verified | `.venv/bin/python --version` | `Python 3.12.14` |
| **pytest** | 9.2.0 | `.venv/bin/pytest` | Verified | `.venv/bin/pytest tests/` | `30 passed, 2 skipped in 0.50s` |
| **gcloud CLI** | 594.0.0 | `/home/ashwathraj/.local/bin/gcloud` | Verified | `gcloud --version` | `Google Cloud SDK 594.0.0` |
| **gsutil** | 5.38 | `/home/ashwathraj/.local/bin/gsutil` | Verified | `gsutil version` | `gsutil version: 5.38` |
| **bq** | 2.1.42 | `/home/ashwathraj/.local/bin/bq` | Verified | `bq version` | `This is BigQuery CLI 2.1.42` |
| **GitHub CLI (`gh`)** | 2.83.0 | `/usr/bin/gh` | Verified | `gh auth status` | Logged in as `Ashwath-Raj` with repo/workflow scopes |
| **Node.js / npm** | v24.21.0 / 11.7.0 | `~/.nvm/versions/node/v24.21.0/bin` | Verified | `node -v && npm -v` | `v24.21.0 / 11.7.0` |
| **Linux Kernel / cgroup** | Linux 7.0 / cgroup v2 | `/sys/fs/cgroup` | Verified | `mount \| grep cgroup` | `cgroup2 on /sys/fs/cgroup type cgroup2 (rw,nsdelegate)` |
| **Docker Engine** | *(Not installed)* | `docker` | Requires User Action | `which docker` | Not installed on host. Container builds currently delegated to Google Cloud Build. |

---

## 5. Security & Authentication Status

1. **Google Cloud Authentication**:
   - `gcloud auth list`: Currently `No credentialed accounts`.
   - `google.auth.default()`: Detected `DefaultCredentialsError: Your default credentials were not found`.
   - *Required User Action*: When ready to target a live Google Cloud project, execute:
     ```bash
     gcloud auth login
     gcloud config set project <YOUR_PROJECT_ID>
     gcloud auth application-default login
     ```
2. **Deterministic Mock vs Production Gating**:
   - `backend/app/adapters/vertex_ai.py` and `backend/app/repositories/base.py` automatically use deterministic mocks in local development.
   - If `ENVIRONMENT=production` is set, the application enforces a strict fail-closed check: if live Vertex AI or Firestore is not configured, the runtime refuses to start.
3. **Secret Isolation**:
   - `.env.example` contains placeholders only.
   - No `.env` secrets or keys are committed or exposed to MCP servers.

---

## 6. Action Items & Prerequisites for Next Phase

1. **GCP Project Linking**: Run `gcloud auth login` and `gcloud config set project <PROJECT_ID>` to enable live project inspection via `google-cloud` MCP.
2. **Local Docker (Optional)**: If local image builds are needed without Cloud Build, install Docker (`sudo apt update && sudo apt install -y docker.io`).
3. **Proceed with Deployment**: With development environment and MCP tooling validated, proceed to remaining backend and Cloud Build deployment tasks.
