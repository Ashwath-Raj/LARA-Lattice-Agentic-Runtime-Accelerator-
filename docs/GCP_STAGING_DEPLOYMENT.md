# LARA — Google Cloud Staging Deployment Runbook

**Environment:** Google Cloud Platform (GCP) Staging  
**Architecture:** Single-Origin Cloud Run Service + Firestore Native + GCS + Vertex AI + goboxd GCE VM  
**Target Branch:** `integrate/lara-gcp-staging`  

> [!IMPORTANT]
> This runbook is strictly parameterized for the **authenticated user's own GCP project**. Never deploy staging resources to developer development projects (such as `lara-runtime-ashwath-2026`).

---

## 1. Prerequisites & Discovery Verification

Before initiating deployment, verify your local environment and GCP account:

```bash
# 1. Verify gcloud is installed and authenticated
gcloud auth list
gcloud config get-value project

# 2. Confirm billing is active on your project
gcloud billing projects describe "$(gcloud config get-value project)"

# 3. Export target configuration variables
export PROJECT_ID="$(gcloud config get-value project)"
export REGION="asia-south1"                  # Primary region for Cloud Run, GCS, Firestore
export VERTEX_LOCATION="global"              # Supported location for gemini-3.8-flash
export VERTEX_MODEL="gemini-3.8-flash"       # Active replacement for retired gemini-2.5-flash
export SERVICE_NAME="lara-runtime-staging"
export REPO_NAME="lara-staging-repo"
export BUCKET_NAME="${PROJECT_ID}-lara-assets"
export FIRESTORE_DB="(default)"
export RUNTIME_SA="lara-runtime-sa@${PROJECT_ID}.iam.gserviceaccount.com"
export BUILD_SA="lara-build-sa@${PROJECT_ID}.iam.gserviceaccount.com"
```

---

## 2. Infrastructure Provisioning Steps

### Step 2.1 — Enable Mandatory Google Cloud APIs
Enable only the services required by LARA:
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  aiplatform.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  vpcaccess.googleapis.com \
  --project="${PROJECT_ID}"
```

### Step 2.2 — Provision Firestore Native Database
Ensure Firestore is initialized in Native mode:
```bash
gcloud firestore databases create \
  --database="${FIRESTORE_DB}" \
  --location="${REGION}" \
  --type=firestore-native \
  --project="${PROJECT_ID}"
```

### Step 2.3 — Provision Private Storage Bucket
Create a private Cloud Storage bucket with uniform bucket-level access and public access prevention:
```bash
gcloud storage buckets create "gs://${BUCKET_NAME}" \
  --location="${REGION}" \
  --uniform-bucket-level-access \
  --public-access-prevention \
  --project="${PROJECT_ID}"
```

### Step 2.4 — Provision Artifact Registry Repository
Create a Docker repository for container images:
```bash
gcloud artifacts repositories create "${REPO_NAME}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="LARA Staging Container Registry" \
  --project="${PROJECT_ID}"
```

### Step 2.5 — Create User-Managed Service Accounts & Least-Privilege IAM

#### A. Cloud Run Runtime Service Account (`lara-runtime-sa`)
The application container executes under this identity:
```bash
gcloud iam service-accounts create lara-runtime-sa \
  --display-name="LARA Cloud Run Runtime Service Account" \
  --project="${PROJECT_ID}"

# Firestore Native read/write access
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/datastore.user"

# Vertex AI inference permissions
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/aiplatform.user"

# Structured telemetry and metrics
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/monitoring.metricWriter"

# Storage bucket-scoped access only
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET_NAME}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/storage.objectUser"
```

#### B. Cloud Build Service Account (`lara-build-sa`)
Cloud Build pipeline executes under this dedicated identity (instead of the legacy default identity):
```bash
gcloud iam service-accounts create lara-build-sa \
  --display-name="LARA Cloud Build Pipeline Service Account" \
  --project="${PROJECT_ID}"

# Allow Cloud Build to write build logs
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/logging.logWriter"

# Allow Cloud Build to push container images to Artifact Registry
gcloud artifacts repositories add-iam-policy-binding "${REPO_NAME}" \
  --location="${REGION}" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/artifactregistry.writer" \
  --project="${PROJECT_ID}"

# Allow Cloud Build to deploy Cloud Run revisions
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/run.developer"

# Allow Cloud Build to act as the runtime service account when deploying Cloud Run
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --project="${PROJECT_ID}"
```

#### C. Human Deployer Permissions (Submitting User)
The developer or CI pipeline principal submitting `gcloud builds submit` requires:
- `roles/cloudbuild.builds.editor` (to queue builds)
- `roles/iam.serviceAccountUser` on `lara-build-sa` (to impersonate the build service account)
- `roles/viewer` (to inspect deployment status)

```bash
# Example for deployer principal:
export DEPLOYER_USER="$(gcloud config get-value account)"
gcloud iam service-accounts add-iam-policy-binding "${BUILD_SA}" \
  --member="user:${DEPLOYER_USER}" \
  --role="roles/iam.serviceAccountUser" \
  --project="${PROJECT_ID}"
```

### Step 2.6 — Configure Secret Manager Secrets
Generate cryptographically strong random secrets and store in Secret Manager:
```bash
# 1. Generate 32+ character session key
SECRET_KEY_VAL=$(openssl rand -hex 32)
echo -n "${SECRET_KEY_VAL}" | gcloud secrets create lara-secret-key --data-file=- --project="${PROJECT_ID}"

# 2. Generate internal goboxd auth token
GOBOXD_TOKEN_VAL=$(openssl rand -hex 32)
echo -n "${GOBOXD_TOKEN_VAL}" | gcloud secrets create lara-goboxd-token --data-file=- --project="${PROJECT_ID}"

# 3. Grant Secret Accessor to the Cloud Run runtime identity ONLY
gcloud secrets add-iam-policy-binding lara-secret-key \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project="${PROJECT_ID}"

gcloud secrets add-iam-policy-binding lara-goboxd-token \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project="${PROJECT_ID}"
```

---

## 3. goboxd / nsjail Sandbox Networking & Transport Requirements

> [!CAUTION]
> The sandbox daemon operates on plain HTTP over port 8081 by default. While VPC traffic is link-encrypted within Google Cloud data centers, HTTP does NOT provide application-layer encryption. `GOBOXD_KILL_SWITCH=true` must remain active until the networking and TLS termination are confirmed.

### Networking Architecture
1. **Private Subnet:** The goboxd GCE VM (`e2-standard-4`, Ubuntu 22.04 LTS / Debian 12 with cgroup v2) must be provisioned with a private RFC1918 internal IP only (no external public IP).
2. **Cloud Run VPC Egress:** Cloud Run must be attached to the same VPC using **Direct VPC Egress** (`--network=default --subnet=default --vpc-egress=private-ranges-only`) or a Serverless VPC Access connector.
3. **Firewall Ingress Rule:** The VM firewall must strictly restrict ingress to port `8081` from the Cloud Run egress subnet only:
   ```bash
   gcloud compute firewall-rules create allow-cloudrun-to-goboxd \
     --network=default \
     --action=ALLOW \
     --direction=INGRESS \
     --rules=tcp:8081 \
     --source-ranges="10.8.0.0/28" \
     --target-tags="goboxd-sandbox" \
     --project="${PROJECT_ID}"
   ```
4. **Transport Layer Security (TLS):** Before activating the kill-switch in production, install a reverse proxy (e.g., Caddy or Nginx with an internal CA certificate) on the VM to terminate TLS/HTTPS at port 8443, ensuring bearer token confidentiality in transit.

---

## 4. Build and Deployment Execution

Trigger Cloud Build using the user-managed service account:
```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_REGION="${REGION}",_SERVICE="${SERVICE_NAME}",_REPOSITORY="${REPO_NAME}",_GCS_BUCKET="${BUCKET_NAME}",_VERTEX_LOCATION="${VERTEX_LOCATION}",_VERTEX_MODEL="${VERTEX_MODEL}" \
  --project="${PROJECT_ID}"
```

### Post-Deployment Verification
```bash
# 1. Fetch Cloud Run service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --format="value(status.url)")

# 2. Check liveness probe
curl -f "${SERVICE_URL}/health/live"

# 3. Check readiness probe
curl -f "${SERVICE_URL}/health/ready"

# 4. Open single-origin UI in browser
echo "Open ${SERVICE_URL} in browser"
```
