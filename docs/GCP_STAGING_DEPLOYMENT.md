# LARA — Google Cloud Staging Deployment Runbook

**Environment:** Google Cloud Platform (GCP) Staging  
**Architecture:** Single-Origin Cloud Run Service + Firestore Native + GCS + Vertex AI + goboxd GCE VM  
**Target Branch:** `integrate/lara-gcp-staging`  

> [!IMPORTANT]
> This runbook is parameterized for the **authenticated user's own GCP project**. Never deploy staging resources to Ashwath's development project (`lara-runtime-ashwath-2026`).

---

## 1. Prerequisites & Discovery Verification

Before initiating deployment, verify your local environment and GCP account:

```bash
# 1. Verify active GCP account and project
gcloud auth list
gcloud config get-value project

# 2. Confirm billing is enabled on your project
gcloud billing projects describe "$(gcloud config get-value project)"

# 3. Export target configuration variables
export PROJECT_ID="$(gcloud config get-value project)"
export REGION="asia-south1"
export SERVICE_NAME="lara-runtime-staging"
export REPO_NAME="lara-staging-repo"
export BUCKET_NAME="${PROJECT_ID}-lara-assets"
export FIRESTORE_DB="(default)"
export RUNTIME_SA="lara-runtime-sa@${PROJECT_ID}.iam.gserviceaccount.com"
export BUILD_SA="lara-build-sa@${PROJECT_ID}.iam.gserviceaccount.com"
```

---

## 2. Infrastructure Provisioning Steps

### Step 2.1 — Enable Required Google Cloud APIs
Enable only the mandatory APIs for LARA:
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
Create a private Cloud Storage bucket with public access prevention:
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

### Step 2.5 — Create Service Accounts and Assign IAM Least-Privilege
Create the runtime service account:
```bash
gcloud iam service-accounts create lara-runtime-sa \
  --display-name="LARA Cloud Run Runtime Service Account" \
  --project="${PROJECT_ID}"

# Grant minimum required roles
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/monitoring.metricWriter"

# Bucket-level access
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET_NAME}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/storage.objectUser"
```

### Step 2.6 — Configure Secret Manager Secrets
Generate cryptographically strong random secrets:
```bash
# Generate 32+ character session key
SECRET_KEY_VAL=$(openssl rand -hex 32)
echo -n "${SECRET_KEY_VAL}" | gcloud secrets create lara-secret-key --data-file=- --project="${PROJECT_ID}"

# Generate internal goboxd auth token
GOBOXD_TOKEN_VAL=$(openssl rand -hex 32)
echo -n "${GOBOXD_TOKEN_VAL}" | gcloud secrets create lara-goboxd-token --data-file=- --project="${PROJECT_ID}"

# Grant Secret Accessor to the Cloud Run runtime identity
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

## 3. goboxd / nsjail Compute Engine VM Setup

Deploy goboxd on an isolated Linux VM within your project's default or custom VPC:
1. Provision Compute Engine instance (`e2-standard-4`, Ubuntu 22.04 LTS / Debian 12 with cgroup v2).
2. Configure nsjail with memory limits (`128MB`), time limits (`10s`), and disabled network (`--disable_clone_newnet false`).
3. Set internal IP address as `GOBOXD_BASE_URL` (e.g. `http://10.160.0.2:8081`).
4. Ensure firewall permits ingress from Cloud Run egress subnet on port `8081` only.
5. In Cloud Run, attach Direct VPC egress or a Serverless VPC Access connector to reach the VM private IP.

---

## 4. Build and Deployment Execution

Trigger Cloud Build using the updated `cloudbuild.yaml`:
```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_REGION="${REGION}",_SERVICE="${SERVICE_NAME}",_REPOSITORY="${REPO_NAME}",_GCS_BUCKET="${BUCKET_NAME}" \
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

# 4. Access single-origin UI in browser
echo "Open ${SERVICE_URL} in your browser to verify Bright Lattice UI"
```
