# goboxd Sandbox on Google Compute Engine: Deployment & Hardening Runbook

**Service**: goboxd Execution Provider
**Upstream Repository**: `https://github.com/Praneeth0910/goboxd`
**Target Branch**: `team/sudo`
**Pinned Commit SHA**: `2e8a10dfc6271f33e88571446f319a1c3a7f11da`
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
        │ Authorization: Bearer <GOBOXD_INTERNAL_AUTH_TOKEN>
        ▼
[ Dedicated Hardened GCE Linux VM ] (No GCP Data Credentials, Loopback/Jail Only)
  ├── Systemd Service: goboxd daemon (Port 8081)
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
# Allow ingress to port 8081 ONLY from the Cloud Run VPC egress subnet range
# (Replace with the verified CIDR assigned to lara-private-subnet in your IPAM plan; do NOT use placeholder ranges)
export CLOUDRUN_SUBNET_CIDR="<your-cloudrun-subnet-cidr>"

gcloud compute firewall-rules create allow-cloudrun-to-goboxd \
    --project="${PROJECT_ID}" \
    --network="lara-vpc" \
    --direction=INGRESS \
    --priority=1000 \
    --action=ALLOW \
    --rules=tcp:8081 \
    --source-ranges="${CLOUDRUN_SUBNET_CIDR}" \
    --target-tags="goboxd-sandbox" \
    --target-service-accounts="goboxd-sandbox-sa@${PROJECT_ID}.iam.gserviceaccount.com"
```

### 2.3 Production TLS/mTLS Reverse-Proxy Setup
By default, goboxd listens on plain HTTP over port 8081. Before disabling the administrative kill-switch (`GOBOXD_KILL_SWITCH=false`), front the daemon with a reverse proxy (e.g. NGINX) terminating TLS:

```nginx
# /etc/nginx/sites-available/goboxd-mtls.conf
server {
    listen 8443 ssl;
    server_name goboxd.internal;

    ssl_certificate /etc/ssl/certs/goboxd-server.crt;
    ssl_certificate_key /etc/ssl/private/goboxd-server.key;

    # Client-side certificate verification (mTLS)
    ssl_client_certificate /etc/ssl/certs/lara-internal-ca.crt;
    ssl_verify_client on;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
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
