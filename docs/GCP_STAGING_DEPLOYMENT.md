# LARA — Google Cloud Staging Deployment Runbook

**Environment Target:** Google Cloud Platform (User-Owned Staging Project)<br>
**Execution Pipeline:** Google Cloud Build (`cloudbuild.yaml`)<br>
**Container Host:** Google Cloud Run (Fully Managed, Single-Origin React SPA + FastAPI Runtime)<br>
**Security Level:** Least-Privilege IAM, User-Managed Service Accounts, Secret Manager Bindings, Fail-Closed

---

## 1. Pre-Deployment Configuration & Parameter Variables

Before executing commands, define the target Google Cloud environment variables. All values must be supplied by the deployer.

```bash
# Core GCP Environment Settings
export PROJECT_ID="<your-gcp-project-id>"
export REGION="asia-south1"
export SERVICE_NAME="lara-runtime-staging"
export REPO_NAME="lara-staging-repo"
export BUCKET_NAME="${PROJECT_ID}-lara-assets"
export FIRESTORE_DB="(default)"

# Service Account Identifiers
export RUNTIME_SA="lara-runtime-sa@${PROJECT_ID}.iam.gserviceaccount.com"
export BUILD_SA="lara-build-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Model Lifecycle & Vertex AI Location
# Note: gemini-2.5-flash retired Oct 20, 2026. Candidate: gemini-3.8-flash.
# Serving location: global (multi-region processing) or approved regional endpoint.
export VERTEX_LOCATION="global"
export VERTEX_MODEL="gemini-3.8-flash"

# Network Topology (Must match organizational IPAM plan)
export VPC_NAME="lara-vpc"
export PRIVATE_SUBNET_NAME="lara-private-subnet"
export CLOUDRUN_SUBNET_CIDR="<your-cloudrun-subnet-cidr>"  # e.g., allocated per VPC subnet plan
```

---

## 2. Infrastructure Provisioning & Security IAM Setup

### Step 2.1 — Enable Required Google Cloud APIs
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
Cloud Build pipeline executes under this dedicated identity (instead of the legacy project-wide default identity):
```bash
gcloud iam service-accounts create lara-build-sa \
  --display-name="LARA Cloud Build Pipeline Service Account" \
  --project="${PROJECT_ID}"

# Source download permission on Cloud Build staging storage
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/storage.objectViewer"

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

# Allow Cloud Build to deploy Cloud Run service revisions
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/run.developer"

# Allow Cloud Build to bind/actAs the runtime service account when deploying Cloud Run
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --project="${PROJECT_ID}"
```

#### C. Submitting User Permissions
The developer or CI caller submitting `gcloud builds submit` requires:
- `roles/cloudbuild.builds.editor` (to submit and monitor builds)
- `roles/iam.serviceAccountUser` on `lara-build-sa` (the `iam.serviceAccounts.actAs` permission required to submit builds that specify a custom service account)

```bash
export DEPLOYER_USER="$(gcloud config get-value account)"
gcloud iam service-accounts add-iam-policy-binding "${BUILD_SA}" \
  --member="user:${DEPLOYER_USER}" \
  --role="roles/iam.serviceAccountUser" \
  --project="${PROJECT_ID}"
```

> [!NOTE]
> Do NOT use the `--impersonate-service-account` flag when submitting builds. `cloudbuild.yaml` directly specifies `serviceAccount: 'projects/${PROJECT_ID}/serviceAccounts/${_BUILD_SA}'`. Cloud Build natively executes the build under that identity once the submitting user has `iam.serviceAccountUser` on `lara-build-sa`.

### Step 2.6 — Configure Secret Manager Secrets
Store cryptographically secure values in Secret Manager:
```bash
# 1. Session secret key (minimum 32 characters)
SECRET_KEY_VAL=$(openssl rand -hex 32)
echo -n "${SECRET_KEY_VAL}" | gcloud secrets create lara-secret-key --data-file=- --project="${PROJECT_ID}"

# 2. Internal goboxd auth token (minimum 16 characters)
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

## 3. Initial Principal Bootstrap (Secure Administrative Provisioning)

Synthetic users from `data/synthetic/users.json` are **never** imported into production Firestore.
Run the idempotent bootstrap CLI to create the initial administrative principal:

```bash
python scripts/bootstrap_principals.py \
  --project="${PROJECT_ID}" \
  --database="${FIRESTORE_DB}" \
  --tenant="staging-enterprise" \
  --principal-id="usr_staging_admin_01" \
  --display-name="Staging Administrator" \
  --roles="admin,operator,supervisor" \
  --clearance="confidential"
```

The script will:
1. Generate a high-entropy 24-character one-time password (or use `--password` if supplied).
2. Hash the password with salted PBKDF2-HMAC-SHA256 (600,000 rounds).
3. Write the document to `principals/usr_staging_admin_01` (plaintext passwords are never stored).
4. Record an auditable event in `audit_events`.
5. Display the one-time enrollment credential securely to the terminal.

---

## 4. goboxd Sandbox Networking & Transport Requirements

> [!CAUTION]
> The sandbox daemon operates on plain HTTP over port 8081 by default. While VPC traffic is link-encrypted within Google Cloud data centers, HTTP does NOT provide application-layer encryption. `GOBOXD_KILL_SWITCH=true` must remain active until private subnet routing and TLS/mTLS reverse-proxy termination are verified.

### Unified Network Architecture
1. **VPC Network:** `lara-vpc` with private subnet `lara-private-subnet`.
2. **Cloud Run Egress:** Direct VPC Egress attached to `lara-private-subnet` with `--vpc-egress=private-ranges-only`.
3. **VM Ingress Firewall:** The GCE VM firewall restricts ingress on TCP 8081 strictly from the Cloud Run egress subnet CIDR:
   ```bash
   gcloud compute firewall-rules create allow-cloudrun-to-goboxd \
     --network="${VPC_NAME}" \
     --action=ALLOW \
     --direction=INGRESS \
     --rules=tcp:8081 \
     --source-ranges="${CLOUDRUN_SUBNET_CIDR}" \
     --target-tags="goboxd-sandbox" \
     --project="${PROJECT_ID}"
   ```
4. **TLS/mTLS Requirement:** Before disabling `GOBOXD_KILL_SWITCH`, configure an internal NGINX/Envoy reverse proxy on the VM with a private CA certificate, requiring client certificate verification (mTLS) to protect bearer token confidentiality in transit.

---

## 5. Build and Deployment Execution

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
curl -f "${SERVICE_URL}/api/v1/health/live"

# 3. Check readiness probe (validates database, principal bootstrap, Vertex AI config, and sandbox status)
curl -f "${SERVICE_URL}/api/v1/health/ready"

# Note: /health/ready returning 200 confirms database reachability, principal bootstrap,
# and Vertex SDK configuration. It does NOT claim live Vertex AI inference execution.
```
