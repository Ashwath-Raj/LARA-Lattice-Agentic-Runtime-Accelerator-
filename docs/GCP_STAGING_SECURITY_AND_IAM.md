# LARA — Google Cloud Staging Security & IAM Architecture

**Target Environment:** GCP Staging  
**Security Model:** Defense-in-depth, Principle of Least Privilege, Zero-Trust Execution Sandbox  

---

## 1. Identity & Access Management (IAM) Least-Privilege

LARA strictly disallows granting broad `Owner` or `Editor` roles to automated service accounts. Each workload operates under a dedicated service account with narrow, resource-scoped permissions:

```
┌─────────────────────────────────┐
│     Cloud Run Runtime SA        │
│  lara-runtime-sa@${PROJECT_ID}  │
└────────────────┬────────────────┘
                 │
                 ├──> roles/datastore.user (Firestore Native Database only)
                 ├──> roles/aiplatform.user (Vertex AI model inference calls)
                 ├──> roles/storage.objectUser (gs://${PROJECT_ID}-lara-assets bucket only)
                 ├──> roles/secretmanager.secretAccessor (lara-secret-key, lara-goboxd-token only)
                 ├──> roles/logging.logWriter (Cloud Logging structured event emitter)
                 └──> roles/monitoring.metricWriter (Cloud Monitoring custom telemetry)
```

### Prohibited IAM Patterns
- **No Service Account Keys:** No `.json` service account keys may be baked into Docker images or uploaded to the repository. Authentication relies on Google Application Default Credentials (ADC) and Cloud Run Workload Identity.
- **No Direct Bucket Public Access:** The GCS bucket enforces uniform bucket-level access and public access prevention.
- **No Gemini API Key in Client or Server:** Model inference operates through official Google Cloud IAM authentication via Vertex AI.

---

## 2. Container Hardening & Runtime Boundaries

### 2.1 Non-Root Container Execution
- Container runs as non-root user `appuser` (UID 10001) in group `appgroup` (GID 10001).
- Root filesystem is read-only where possible, with `/tmp` mounted for transient scratch operations.
- Process listens on `$PORT` (default 8080).

### 2.2 Same-Origin Cookie Security
- Authentication relies on the server-issued `lara_session` HttpOnly cookie.
- In production (`APP_ENV=production`), `COOKIE_SECURE=true` is enforced; cookies are only transmitted over TLS/HTTPS.
- `SameSite=Lax` ensures immunity to cross-site request forgery while preserving same-origin SPA navigation.
- No session secrets or user credentials are leaked into client-side JavaScript or HTML storage.

---

## 3. Tool Gateway & Physical Equipment Boundaries

### 3.1 Constitutional Boundary Against Actuation
- Physical equipment manipulation (`tool:equipment-control`) is constitutionally blocked at the gateway level.
- Any model or user attempt to actuate physical plant equipment returns an immediate 403 `PolicyDeniedError`.
- Maintenance work orders emitted by `tool:maintenance-request` are explicitly tagged `simulated: true` and require human Supervisor authorization.

### 3.2 Safe AST Calculator
- Mathematical operations requested by the Analysis Agent are evaluated by `SafeCalculatorTool` using Python's `ast` parser.
- Built-in functions (`eval`, `exec`, `__import__`, `open`, `globals`, `locals`) are strictly forbidden. Any non-arithmetic syntax tree node immediately aborts evaluation with a validation error.

---

## 4. Isolated Sandbox Execution Boundary (goboxd / nsjail)

```
┌─────────────────────────┐               Private Subnet (VPC)               ┌─────────────────────────┐
│   Cloud Run Container   │ ───────────────────────────────────────────────> │    Compute Engine VM    │
│  (Untrusted Code Client)│   Encrypted Internal HTTP (Port 8081)           │     (goboxd Daemon)     │
└─────────────────────────┘   Auth: Bearer ${GOBOXD_INTERNAL_AUTH_TOKEN}     └────────────┬────────────┘
                                                                                          │
                                                                                          ▼
                                                                             ┌─────────────────────────┐
                                                                             │     nsjail Sandbox      │
                                                                             │  - cgroup v2 (128MB)    │
                                                                             │  - Wall-clock (10s)     │
                                                                             │  - Network isolated     │
                                                                             │  - No cloud credentials │
                                                                             └─────────────────────────┘
```

- **Separate Host:** The sandbox daemon runs on an independent Compute Engine VM, never inside the Cloud Run container.
- **Kernel-Level Isolation:** nsjail uses Linux namespaces (PID, mount, network, IPC, UTS) and cgroup v2 to constrain CPU, memory, and process creation.
- **Network Isolation:** Sandbox processes have no network access (`clone_newnet`), preventing data exfiltration, lateral VPC movement, or access to Cloud metadata endpoints (`169.254.169.254`).
- **Zero Cloud Credentials:** The sandbox VM receives no GCP service account credentials or Firestore tokens.
- **Kill-Switch:** When `GOBOXD_KILL_SWITCH=true`, all tool gateway calls to goboxd fail closed, return `SANDBOX_UNAVAILABLE`, and emit an audit event.
