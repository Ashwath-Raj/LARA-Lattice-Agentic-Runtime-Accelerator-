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
                 ├──> roles/secretmanager.secretAccessor (lara-secret-key, lara-goboxd-token, lara-goboxd-ca, lara-goboxd-client-cert, lara-goboxd-client-key, lara-admin-initial-password)
                 ├──> roles/logging.logWriter (Cloud Logging structured event emitter)
                 └──> roles/monitoring.metricWriter (Cloud Monitoring custom telemetry)

┌─────────────────────────────────┐
│     Cloud Build Pipeline SA     │
│   lara-build-sa@${PROJECT_ID}   │
└────────────────┬────────────────┘
                 │
                 ├──> roles/storage.objectViewer (Cloud Build source staging bucket)
                 ├──> roles/artifactregistry.writer (Push container images to Artifact Registry)
                 ├──> roles/run.developer (Deploy Cloud Run revisions)
                 ├──> roles/iam.serviceAccountUser (Scoped specifically to lara-runtime-sa)
                 └──> roles/logging.logWriter (Emit Cloud Build execution logs)

┌─────────────────────────────────┐
│     goboxd Sandbox VM SA        │
│ goboxd-sandbox-sa@${PROJECT_ID} │
└────────────────┬────────────────┘
                 │
                 ├──> roles/secretmanager.secretAccessor (lara-goboxd-token, lara-goboxd-ca, lara-goboxd-server-cert, lara-goboxd-server-key)
                 ├──> roles/logging.logWriter (VM syslog and daemon output)
                 └──> roles/monitoring.metricWriter (VM host telemetry)
```

### Submitting User IAM Requirement
The human deployer or CI initiator submitting `gcloud builds submit` requires:
- `roles/cloudbuild.builds.editor` (to queue builds)
- `roles/iam.serviceAccountUser` on `lara-build-sa` (the `iam.serviceAccounts.actAs` permission required to submit builds that specify a custom service account)

> [!NOTE]
> `cloudbuild.yaml` natively specifies `serviceAccount: 'projects/${PROJECT_ID}/serviceAccounts/${_BUILD_SA}'`. Deployers do not use `--impersonate-service-account`.

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
┌─────────────────────────┐         Private Subnet (lara-vpc)         ┌─────────────────────────┐
│   Cloud Run Container   │ ────────────────────────────────────────> │    Compute Engine VM    │
│  (Untrusted Code Client)│  Internal HTTP / TLS (Port 8081/8443)     │     (goboxd Daemon)     │
└─────────────────────────┘  [VPC Link Encryption Only; mTLS req.]    └────────────┬────────────┘
                             Auth: Bearer ${GOBOXD_INTERNAL_AUTH_TOKEN}            │
                                                                                   ▼
                                                                      ┌─────────────────────────┐
                                                                      │     nsjail Sandbox      │
                                                                      │  - cgroup v2 (1024MB)   │
                                                                      │  - Wall-clock (10s)     │
                                                                      │  - Network isolated     │
                                                                      │  - No cloud credentials │
                                                                      └─────────────────────────┘
```

### 4.1 Transport & Networking Truth Audit
- **No Application-Layer Encryption by Default:** Transport between Cloud Run and goboxd VM is plain HTTP over port 8081. While Google Cloud provides physical network link encryption between GCE data center hosts, this does NOT provide application-layer TLS. The bearer token travels unencrypted within the VPC network.
- **TLS / mTLS Prerequisite:** Before sandbox activation in production, TLS termination (via an NGINX or Envoy reverse proxy with an internal CA certificate on port 8443) must be configured on the GCE VM with client certificate verification (mTLS) to protect the internal authorization token.
- **Unified VPC Network Topology:**
  - Network: `lara-vpc`
  - Subnet: `lara-private-subnet`
  - Cloud Run Egress: Direct VPC Egress (`--network=lara-vpc --subnet=lara-private-subnet --vpc-egress=private-ranges-only`).
- **Firewall Restriction:** The GCE VM firewall strictly restricts ingress to port 8081/8443 from the Cloud Run subnet CIDR only (`${CLOUDRUN_SUBNET_CIDR}`). Target tag: `goboxd-sandbox`.
- **Zero Cloud Credentials:** The sandbox VM receives no GCP service account credentials or Firestore tokens.
- **Fail-Closed Kill-Switch:** `GOBOXD_KILL_SWITCH=true` is enforced in all production settings models. If the sandbox is unreachable or the kill-switch is active, all tool gateway execution calls fail closed with `PolicyDeniedError` (code `KILL_SWITCH_ACTIVE`) and emit an audit event. Untrusted code is NEVER executed in Cloud Run or locally.
