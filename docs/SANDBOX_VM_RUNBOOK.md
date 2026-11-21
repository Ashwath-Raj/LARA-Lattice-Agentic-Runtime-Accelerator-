# goboxd Sandbox on Google Compute Engine: Deployment & Hardening Runbook

**Service**: goboxd Execution Provider
**Upstream Repository**: `https://github.com/Praneeth0910/goboxd`
**Base Upstream Branch**: `team/sudo` (`2e8a10dfc6271f33e88571446f319a1c3a7f11da`)
**Integrated Feature Branch**: `feat/lara-authenticated-runtime` (`27043089b44b739d41f34cf22b8465d15f6b06cd`)
**License**: GNU General Public License v3.0 (GPL-3.0)

---

## 1. Architectural Topology

```text
[ Browser / Client ]
        │ HTTPS
        ▼
[ LARA Backend (Cloud Run) ]
  ├── Server-Side Session & Identity Validation
  ├── Strict RBAC / ABAC Policy Engine
  ├── Dynamic Information Highway Graph Resolver
  └── Tool Gateway (Payload Construction, Flag & Quota Checks, Kill Switch)
        │
        │ Private Authenticated VPC Traffic (Serverless VPC Access / Direct Egress)
        │ Port 8443 (Mutual TLS, Encrypted, Client Cert Verified)
        │ Authorization: Bearer <GOBOXD_INTERNAL_AUTH_TOKEN>
        ▼
[ Dedicated Hardened GCE Linux VM ] (No GCP Data Credentials, Loopback/Jail Only)
  ├── NGINX Reverse Proxy (Port 8443 mTLS terminating -> http://127.0.0.1:8081)
  ├── Docker Compose / Systemd Service: goboxd daemon (Port 8081 loopback)
  └── nsjail Sandboxed Subprocesses (cgroup v2, PID/Mount/UTS/IPC namespaces, seccomp-bpf)
```

---

## 2. Hardened GCE VM Provisioning Steps

### 2.1 Provision Dedicated VM via gcloud

```bash
# Set environment
export PROJECT_ID="your-gcp-project-id"
export ZONE="asia-south1-a"
export VM_NAME="lara-goboxd-sandbox-vm"
export SUBNET="lara-private-subnet"

# Dedicated minimal service account with ZERO Google Cloud database/storage permissions
gcloud iam service-accounts create goboxd-sandbox-sa \
    --display-name="goboxd Sandbox Execution SA" \
    --project="${PROJECT_ID}"

# Create hardened e2-standard-4 VM with Ubuntu 24.04 LTS (cgroup v2 enabled by default)
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

### 2.2 VPC Firewall Rule: Restrict Ingress to Cloud Run VPC Egress Only

```bash
# Allow ingress to port 8443 (mTLS) ONLY from the Cloud Run VPC egress subnet range
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

### 2.3 Turnkey VM Setup & Deployment via `deploy/goboxd/`

All deployment assets are automated in `deploy/goboxd/`:
- `generate_certificates.sh`: Creates CA, server certificate (SAN `goboxd.internal`, `127.0.0.1`), and client certificate.
- `setup_vm.sh`: Installs Docker, NGINX, deploys `docker-compose.yml`, registers `goboxd.service`, and configures UFW firewall.
- `smoke_test.py`: Validates mTLS and execution of Python 3, C, and C++.

```bash
# 1. Generate internal PKI certificates
cd deploy/goboxd
./generate_certificates.sh /etc/lara/certs

# 2. Upload certificates to Secret Manager
gcloud secrets create lara-goboxd-ca --data-file=/etc/lara/certs/lara-internal-ca.crt
gcloud secrets create lara-goboxd-server-cert --data-file=/etc/lara/certs/goboxd-server.crt
gcloud secrets create lara-goboxd-server-key --data-file=/etc/lara/certs/goboxd-server.key
gcloud secrets create lara-goboxd-client-cert --data-file=/etc/lara/certs/lara-client.crt
gcloud secrets create lara-goboxd-client-key --data-file=/etc/lara/certs/lara-client.key

# 3. SSH into VM and run automated bring-up
gcloud compute ssh "${VM_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}"
sudo ./setup_vm.sh

# 4. Verify deployment with smoke test
python3 smoke_test.py \
    --host="https://goboxd.internal:8443" \
    --token="<your-goboxd-internal-auth-token>" \
    --ca-cert="/etc/lara/certs/lara-internal-ca.crt" \
    --client-cert="/etc/lara/certs/lara-client.crt" \
    --client-key="/etc/lara/certs/lara-client.key"
```

> [!CAUTION]
> `GOBOXD_KILL_SWITCH=true` must remain active in staging until the private VM is provisioned, authenticated, and mTLS verification is operational.

---

## 3. Host Hardening & goboxd Installation on VM

1. **Install Prerequisites**:
   ```bash
   sudo apt-get update && sudo apt-get install -y \
       git make gcc g++ pkg-config libprotobuf-dev protobuf-compiler \
       libnl-route-3-dev bison flex libcap-dev
   ```

2. **Install nsjail**:
   ```bash
   git clone https://github.com/google/nsjail.git /opt/nsjail
   cd /opt/nsjail && make
   sudo cp /opt/nsjail/nsjail /usr/sbin/nsjail
   sudo chmod 755 /usr/sbin/nsjail
   ```

3. **Install Compilers & Runtimes**:
   ```bash
   sudo apt-get install -y python3 python3-pip g++ gcc
   ```

4. **Deploy goboxd**:
   ```bash
   git clone --branch team/sudo https://github.com/Praneeth0910/goboxd.git /opt/goboxd
   cd /opt/goboxd
   git checkout 2e8a10dfc6271f33e88571446f319a1c3a7f11da
   go build -o /usr/local/bin/goboxd ./cmd/goboxd
   ```

5. **Create Systemd Service**:
   ```ini
   # /etc/systemd/system/goboxd.service
   [Unit]
   Description=goboxd Untrusted Code Execution Daemon
   After=network.target

   [Service]
   Type=simple
   User=nobody
   Group=nogroup
   WorkingDirectory=/opt/goboxd
   ExecStart=/usr/local/bin/goboxd -config /opt/goboxd/languages.yaml
   Restart=always
   RestartSec=3
   LimitNOFILE=65536
   LimitNPROC=4096

   [Install]
   WantedBy=multi-user.target
   ```

6. **Start and Verify**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now goboxd
   curl -s http://localhost:8081/readyz
   ```

---

## 4. Kill Switch and Emergency Runbook

- **Disabling Sandbox Execution Immediately**:
  Set `GOBOXD_KILL_SWITCH=true` in the Cloud Run application environment and redeploy/update.
  This causes LARA's Tool Gateway to immediately fail closed for all `sandbox.execute` requests with status `403 POLICY_DENIED` (`KILL_SWITCH_ACTIVE`), without modifying Cloud Run or taking down normal orchestration.

- **Stale Jail Sweeping**:
  goboxd has built-in runner sweeps (`internal/runner/sweep.go`). In the event of hung jails, execute on VM:
  ```bash
  sudo pkill -9 -f nsjail
  ```
