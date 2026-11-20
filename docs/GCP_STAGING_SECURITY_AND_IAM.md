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
│  (Untrusted Code Client)│  Unencrypted Internal HTTP (Port 8081)           │     (goboxd Daemon)     │
└─────────────────────────┘  [VPC Link Encryption Only; No App-layer TLS]    └────────────┬────────────┘
                             Auth: Bearer ${GOBOXD_INTERNAL_AUTH_TOKEN}                   │
                                                                                          ▼
                                                                             ┌─────────────────────────┐
                                                                             │     nsjail Sandbox      │
                                                                             │  - cgroup v2 (128MB)    │
                                                                             │  - Wall-clock (10s)     │
                                                                             │  - Network isolated     │
                                                                             │  - No cloud credentials │
                                                                             └─────────────────────────┘
```

### 4.1 Transport & Networking Truth Audit
- **No Application-Layer Encryption:** Transport between Cloud Run and goboxd VM is plain HTTP. While Google Cloud provides physical network link encryption between GCE data center hosts, this does NOT provide application-layer TLS. The bearer token travels as plaintext within the VPC network.
- **Remaining TLS / mTLS Requirement:** Before sandbox activation in production, TLS termination (via Nginx or Caddy with an internal CA certificate on port 8443) must be configured on the GCE VM to protect the internal authorization token.
- **VPC Egress Path:** Cloud Run requires an explicit Direct VPC Egress binding (`--network=... --subnet=... --vpc-egress=private-ranges-only`) or a Serverless VPC Access connector to reach private RFC1918 internal IPs.
- **Firewall Restriction:** The GCE VM firewall must strictly restrict ingress to port 8081/8443 from the Cloud Run egress subnet only. Target tag: `goboxd-sandbox`.
- **Zero Cloud Credentials:** The sandbox VM receives no GCP service account credentials or Firestore tokens.
- **Fail-Closed Kill-Switch:** `GOBOXD_KILL_SWITCH=true` is enforced in all production settings models. If the sandbox is unreachable or the kill-switch is active, all tool gateway execution calls fail closed with `SANDBOX_UNAVAILABLE` and emit an audit event. Untrusted code is NEVER executed in Cloud Run or locally.
