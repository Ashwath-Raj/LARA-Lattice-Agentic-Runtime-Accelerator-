# goboxd Sandbox Deployment Package for LARA

This directory contains the production-grade deployment package, container orchestration definitions, mTLS reverse-proxy configuration, certificate generation scripts, systemd unit, and automated smoke verification tests for deploying the **goboxd** untrusted execution sandbox on a dedicated Google Compute Engine (GCE) Linux VM.

---

## 1. Upstream Service & Licensing Boundary

- **Upstream Repository**: `https://github.com/Praneeth0910/goboxd`
- **Base Integration Branch**: `team/sudo` (commit `2e8a10dfc6271f33e88571446f319a1c3a7f11da`)
- **Integrated Feature Branch**: `feat/lara-authenticated-runtime` (commit `27043089b44b739d41f34cf22b8465d15f6b06cd`)
- **Upstream PR / Compare**: `https://github.com/Praneeth0910/goboxd/compare/team/sudo...feat/lara-authenticated-runtime`
- **License**: GNU General Public License v3.0 (GPL-3.0)
- **Architectural Boundary**: LARA interacts with goboxd strictly via authenticated network HTTP/HTTPS over an isolated private VPC. No goboxd source code is vendored or incorporated into LARA's codebase. Both repositories maintain independent release cycles and versioning.

---

## 2. Network Topology & Defense-in-Depth Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                   Google Cloud Platform                     │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │           Cloud Run (LARA Web & Backend)            │   │
│   │           Service Account: lara-runtime-sa          │   │
│   │  ├── Server-Side Session Auth & Policy Engine       │   │
│   │  ├── Dynamic Highway Graph Resolver                 │   │
│   │  └── ToolGateway (Kill-Switch: GOBOXD_KILL_SWITCH)  │   │
│   │       │                                             │   │
│   │       │ GoboxdClient (Python httpx)                 │   │
│   │       │ - Client mTLS Cert: lara-goboxd-client-cert │   │
│   │       │ - Client mTLS Key:  lara-goboxd-client-key  │   │
│   │       │ - Internal CA Cert: lara-goboxd-ca          │   │
│   │       │ - Header: Authorization: Bearer <TOKEN>     │   │
│   └───────┼─────────────────────────────────────────────┘   │
│           │                                                 │
│           │ Direct VPC Egress / Serverless VPC Access       │
│           │ Port 8443 (Mutual TLS, Encrypted, Authenticated)│
│           ▼                                                 │
│   ┌─────────────────────────────────────────────────────┐   │
│   │      Dedicated GCE Linux VM (Hardened Ubuntu 24.04) │   │
│   │      Service Account: goboxd-sandbox-sa (No GCP DB) │   │
│   │                                                     │   │
│   │   [ NGINX Reverse Proxy ]                           │   │
│   │   ├── Port 8443 (External Ingress from VPC)         │   │
│   │   ├── Server Cert: lara-goboxd-server-cert          │   │
│   │   ├── mTLS Verification: ssl_verify_client on       │   │
│   │   └── Reverse Proxy -> http://127.0.0.1:8081        │   │
│   │            │                                        │   │
│   │            ▼                                        │   │
│   │   [ goboxd Daemon (Docker / Systemd) ]              │   │
│   │   ├── Port 8081 (Bound strictly to 127.0.0.1)       │   │
│   │   ├── Internal Token: GOBOXD_INTERNAL_AUTH_TOKEN    │   │
│   │   │   (constant-time subtle.ConstantTimeCompare)    │   │
│   │   └── Routes:                                       │   │
│   │       ├── GET  /healthz (Public liveness)           │   │
│   │       ├── GET  /readyz  (Authenticated readiness)   │   │
│   │       ├── GET  /info    (Authenticated capabilities)│   │
│   │       └── POST /run     (Authenticated execution)   │   │
│   │            │                                        │   │
│   │            ▼                                        │   │
│   │   [ nsjail Sandbox Engine ]                         │   │
│   │   ├── cgroup v2 (Memory: 1024MB, PIDs, CPU quota)   │   │
│   │   ├── Execution Time Limit (10s wall-clock)         │   │
│   │   ├── Network Namespace (CLONE_NEWNET, no network)  │   │
│   │   ├── Mount / PID / IPC / UTS Namespaces            │   │
│   │   └── Output Buffers (Max 512KB, strictly truncated)│   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Port Allocation & Binding Summary

| Port | Protocol | Binding Host | Authentication | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **8443** | HTTPS (mTLS) | `0.0.0.0:8443` (VPC ingress) | Client X.509 Certificate + Bearer Token | Public VM entrypoint for Cloud Run VPC egress |
| **8081** | HTTP | `127.0.0.1:8081` (Loopback only) | Bearer Token (`subtle.ConstantTimeCompare`) | Host port mapped to goboxd container |
| **8080** | HTTP | Container Internal | Bearer Token | goboxd internal listening port |

---

## 4. Google Secret Manager Reconciliation

The following 8 canonical secrets are registered in Google Secret Manager:

| Secret Manager Secret ID | Primary Consumer | Purpose |
| :--- | :--- | :--- |
| `lara-secret-key` | Cloud Run (`lara-runtime-sa`) | HMAC signing key for session cookies (`lara_session`) |
| `lara-goboxd-token` | Cloud Run & GCE VM | Shared Bearer token ($\ge 32$ hex chars) for `/run` and `/readyz` |
| `lara-goboxd-ca` | Cloud Run & GCE VM | Internal Root Certificate Authority public certificate (`.crt`) |
| `lara-goboxd-client-cert` | Cloud Run (`lara-runtime-sa`) | Client public certificate for mTLS mutual handshake |
| `lara-goboxd-client-key` | Cloud Run (`lara-runtime-sa`) | Client private key for mTLS mutual handshake |
| `lara-goboxd-server-cert` | GCE VM (`NGINX`) | Server public certificate with SAN (`goboxd.internal`, `127.0.0.1`) |
| `lara-goboxd-server-key` | GCE VM (`NGINX`) | Server private key for TLS termination |
| `lara-admin-initial-password` | Bootstrapper (`bootstrap_principals.py`) | Initial administrative password for `usr_admin_01` |

---

## 5. Deployment Procedures

### Step 5.1 — Generate Internal PKI Certificates
Run the certificate generation script on your administrative machine:

```bash
cd deploy/goboxd
chmod +x generate_certificates.sh
./generate_certificates.sh /etc/lara/certs
```

This creates:
- `lara-internal-ca.crt` & `lara-internal-ca.key` (Root CA)
- `goboxd-server.crt` & `goboxd-server.key` (Server Certificate, SAN: `goboxd.internal`, `127.0.0.1`)
- `lara-client.crt` & `lara-client.key` (Client Certificate, CN: `lara-cloudrun-client`)

Upload them to Google Secret Manager:
```bash
gcloud secrets create lara-goboxd-ca --data-file=/etc/lara/certs/lara-internal-ca.crt
gcloud secrets create lara-goboxd-server-cert --data-file=/etc/lara/certs/goboxd-server.crt
gcloud secrets create lara-goboxd-server-key --data-file=/etc/lara/certs/goboxd-server.key
gcloud secrets create lara-goboxd-client-cert --data-file=/etc/lara/certs/lara-client.crt
gcloud secrets create lara-goboxd-client-key --data-file=/etc/lara/certs/lara-client.key
```

### Step 5.2 — Provision the Hardened Compute Engine VM
Use Ubuntu 24.04 LTS (kernel 6.8+ with native cgroup v2 support):

```bash
export PROJECT_ID="<your-gcp-project-id>"
export ZONE="asia-south1-a"
export VM_NAME="lara-goboxd-sandbox-vm"
export SUBNET="lara-private-subnet"

gcloud iam service-accounts create goboxd-sandbox-sa \
    --display-name="goboxd Sandbox VM Execution SA" \
    --project="${PROJECT_ID}"

gcloud compute instances create "${VM_NAME}" \
    --project="${PROJECT_ID}" \
    --zone="${ZONE}" \
    --machine-type="e2-standard-4" \
    --subnet="${SUBNET}" \
    --no-address \
    --service-account="goboxd-sandbox-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --scopes="https://www.googleapis.com/auth/logging.write,https://www.googleapis.com/auth/monitoring.write" \
    --image-family="ubuntu-2404-lts-amd64" \
    --image-project="ubuntu-os-cloud" \
    --boot-disk-size="50GB" \
    --boot-disk-type="pd-ssd" \
    --metadata=enable-oslogin=TRUE
```

### Step 5.3 — Configure Firewall Rules
Allow ingress strictly to port 8443 from Cloud Run's VPC egress subnet:

```bash
export CLOUDRUN_SUBNET_CIDR="<your-cloudrun-subnet-cidr>"

gcloud compute firewall-rules create allow-cloudrun-to-goboxd-mtls \
    --project="${PROJECT_ID}" \
    --network="lara-vpc" \
    --direction=INGRESS \
    --priority=1000 \
    --action=ALLOW \
    --rules=tcp:8443 \
    --source-ranges="${CLOUDRUN_SUBNET_CIDR}" \
    --target-service-accounts="goboxd-sandbox-sa@${PROJECT_ID}.iam.gserviceaccount.com"
```

### Step 5.4 — Run VM Initialization Script
SSH to the VM and run `setup_vm.sh`:

```bash
gcloud compute ssh "${VM_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}"
# (Copy setup_vm.sh, nginx-mtls.conf, docker-compose.yml to VM)
chmod +x setup_vm.sh
sudo ./setup_vm.sh
```

---

## 6. Verification & Automated Smoke Testing

Execute `smoke_test.py` against the mTLS endpoint to verify the full stack:

```bash
python3 smoke_test.py \
    --host="https://goboxd.internal:8443" \
    --token="<your-goboxd-internal-auth-token>" \
    --ca-cert="/etc/lara/certs/lara-internal-ca.crt" \
    --client-cert="/etc/lara/certs/lara-client.crt" \
    --client-key="/etc/lara/certs/lara-client.key"
```

Verified test coverage:
1. Public `/healthz` check without authentication.
2. Authenticated `/readyz` probe with mTLS and Bearer token.
3. Authenticated `/info` capability inspection.
4. Python 3 execution (`21 * 2 = 42`).
5. C arithmetic and stdout validation.
6. C++ stream and string formatting validation.
7. Unauthenticated request rejection (401 verification).
8. Invalid client certificate rejection (mTLS verification).
