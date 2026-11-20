# 11 — Google Cloud Deployment Runbook

## 0. Important

This runbook is a template. Project ID, region, billing, model ID and quota must be supplied by the project owner. Do not invent them or commit credentials. All commands must target the Google Cloud project approved for the event.

## 1. Required values

```bash
export PROJECT_ID="<your-google-cloud-project-id>"
export REGION="<verified-cloud-run-and-firestore-region>"
export VERTEX_LOCATION="<verified-vertex-ai-location>"
export SERVICE="lara-runtime"
export REPOSITORY="lara-build"
export BUCKET="<globally-unique-private-bucket-name>"
export RUNTIME_SA="lara-runtime-sa"
```

Choose Vertex location after checking Gemini model availability. Prefer one region for Cloud Run, Firestore and Cloud Storage where supported. Do not assume the same region name works for every service.

## 2. Authenticate and select project

```bash
gcloud auth login
gcloud config set project "$PROJECT_ID"
gcloud config get-value project
```

Verify the printed project ID before enabling APIs or creating resources.

## 3. Enable APIs

```bash
gcloud services enable   run.googleapis.com   cloudbuild.googleapis.com   artifactregistry.googleapis.com   firestore.googleapis.com   storage.googleapis.com   aiplatform.googleapis.com   secretmanager.googleapis.com   logging.googleapis.com   monitoring.googleapis.com   iam.googleapis.com
```

Only enable Secret Manager if required by actual secrets. It is included as an approved Google Cloud service, not a reason to create unnecessary API keys.

## 4. Create Firestore Native database

Create a Firestore database in Native mode in the selected location. Confirm it is the intended project and location. Do not create a Datastore-mode database. If a database already exists, inspect it before modifying it.

## 5. Create private Cloud Storage bucket

```bash
gcloud storage buckets create "gs://${BUCKET}"   --location="$REGION"   --uniform-bucket-level-access
```

Do not make the bucket public. Apply lifecycle rules only if needed; keep demo assets available throughout event judging.

## 6. Create runtime service account

```bash
gcloud iam service-accounts create "$RUNTIME_SA"   --display-name="LARA Cloud Run runtime"
```

Grant least-privilege roles after confirming exact APIs and required operations. Typical roles to evaluate:
- `roles/aiplatform.user` for Vertex AI inference.
- `roles/datastore.user` for Firestore data access.
- `roles/storage.objectCreator` and `roles/storage.objectViewer` on the specific bucket, not project-wide if possible.
- `roles/secretmanager.secretAccessor` only on named secrets if used.

Do not grant Owner, Editor or broad admin roles to runtime service account. Use a separate deployment identity for Cloud Build and Cloud Run deployment.

## 7. Create Artifact Registry repository

```bash
gcloud artifacts repositories create "$REPOSITORY"   --repository-format=docker   --location="$REGION"   --description="LARA prototype images"
```

## 8. Environment configuration

`.env.example` must contain placeholders only:

```dotenv
GOOGLE_CLOUD_PROJECT=<project-id>
GOOGLE_CLOUD_LOCATION=<vertex-location>
VERTEX_GEMINI_MODEL=<verified-model-id>
FIRESTORE_DATABASE=(default)
GCS_BUCKET=<bucket-name>
APP_ENV=production
DEMO_MODE=true
SESSION_COOKIE_SECURE=true
SESSION_TTL_MINUTES=240
GRAPH_CACHE_TTL_SECONDS=30
GRAPH_MAX_NODES=250
GRAPH_MAX_EDGES=800
```

Cloud Run environment variables are configuration, not secrets. Do not put credentials in frontend `VITE_*` variables. Use ADC for Google Cloud APIs. If a session-signing secret is required, create it in Secret Manager and grant access only to the runtime service account.

## 9. Build and deploy

Use Cloud Build to build the Docker image, push to Artifact Registry and deploy to Cloud Run. `cloudbuild.yaml` must run tests before image publication/deployment. Use an immutable image tag such as commit SHA.

Example shape:

```bash
gcloud builds submit --region="$REGION" --config=cloudbuild.yaml .
```

Cloud Build deployment service account must have only the roles needed to build, push and deploy. The Cloud Run runtime service account is separately attached to the service.

## 10. Cloud Run deployment requirements

- Set service name `lara-runtime`.
- Attach dedicated runtime service account.
- Set verified Vertex location/model config.
- Set GCS bucket and Firestore config.
- Set bounded max instances and concurrency for cost control.
- Configure request timeout for workflow execution.
- Serve React build and FastAPI from same origin.
- Public HTTPS service endpoint may be used for judging; protected routes still require application login.
- Never set frontend API key or service-account key.

## 11. Post-deploy verification

```bash
curl -fsS "$SERVICE_URL/health/live"
curl -fsS "$SERVICE_URL/health/ready"
```

Then verify in browser:
- demo login works;
- `/auth/me` returns server-derived principal;
- Firestore graph route resolves;
- Operator and Supervisor receive different routes;
- Gemini call succeeds through Vertex AI;
- GCS upload/download works through backend;
- simulated action requires approval;
- audit event persists after refresh;
- Cloud Run logs show request/trace IDs and no secret leakage.

## 12. Rollback

Cloud Run revisions are immutable. Keep the last known-good revision. If new revision fails smoke tests, route traffic back to previous revision. Do not overwrite or delete data to hide a failed deployment. Record rollback event in release notes.

## 13. Cost and abuse controls

- Use max instances and request concurrency caps.
- Use one Gemini model and bounded output tokens.
- Limit upload size and allowed MIME types.
- Rate-limit login and task submission.
- Prevent duplicate task execution with idempotency keys.
- Do not leave debug endpoints public.
- Check Cloud Billing budgets/alerts; budget alerts are not hard spending caps.
