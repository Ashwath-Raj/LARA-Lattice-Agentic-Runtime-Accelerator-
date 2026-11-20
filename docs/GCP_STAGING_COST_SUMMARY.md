# LARA — Google Cloud Staging Cost & Resource Summary

**Deployment Target:** Google Cloud Platform Staging  
**Billing Estimate Model:** Monthly Baseline (Floor) + Variable Operational Usage  
**Region:** `asia-south1` (Mumbai / India) or `us-central1` (low cost default)  

---

## 1. Resource Inventory & Monthly Cost Breakdown

| Service Component | Configuration & Sizing | Free Tier Coverage | Estimated Floor Cost (Idle/Low) | Estimated Active Staging Cost (1,000 runs/mo) | Cost Control Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cloud Run** | 1 vCPU, 1GiB RAM<br>`min-instances: 0`<br>`max-instances: 2`<br>`concurrency: 25` | 2M requests/mo free<br>360,000 vCPU-sec free<br>180,000 GiB-sec free | **$0.00 / month**<br>(Scales to zero when idle) | **$1.50 – $3.50 / month** | `min-instances=0` eliminates all idle CPU charges. |
| **Cloud Firestore** | Native Mode<br>Multi-tenant isolated | 1 GiB storage free<br>50,000 reads/day free<br>20,000 writes/day free | **$0.00 / month** | **$0.00 – $0.50 / month** | Standard staging usage fits comfortably within the daily free quota. |
| **Cloud Storage** | Private standard bucket<br>Uniform bucket access | 5 GiB standard storage free<br>5,000 Class A operations free | **$0.00 / month** | **$0.10 – $0.25 / month** | Lifecycle rule auto-deletes test attachments after 14 days. |
| **Vertex AI Gemini** | Gemini 2.5/3.5 Flash<br>Structured JSON generation | Pay-per-token pricing<br>($0.075 / 1M input tokens<br>$0.30 / 1M output tokens) | **$0.00 / month** | **$1.00 – $4.00 / month** | Cached system instructions and prompt compression reduce token consumption. |
| **Secret Manager** | 2 active secrets<br>(`SECRET_KEY`, `GOBOXD_INTERNAL_AUTH_TOKEN`) | 6 secret versions free<br>10,000 access operations free | **$0.00 / month** | **$0.00 / month** | Fits completely within free tier quota. |
| **Artifact Registry** | Standard Docker repo<br>Container image ~350MB | 0.5 GiB/mo storage free | **$0.00 / month** | **$0.10 / month** | Cleanup policy keeps only the last 3 image tags. |
| **Cloud Build** | Default machine type (e2-medium) | 120 build-minutes/day free | **$0.00 / month** | **$0.00 / month** | 120 free build minutes/day easily covers 20+ daily staging builds. |
| **Compute Engine (goboxd VM)** | `e2-standard-4` (4 vCPU, 16GiB RAM)<br>Ubuntu 22.04 LTS (cgroup v2) | N/A (Standard Compute Engine) | **$0.00 / month**<br>(Stopped when not testing) | **$10.00 – $30.00 / month**<br>(Assuming 40–120 operational hours/mo) | **Ephemeral / Scheduled:** VM can be stopped when test suites are not active. Continuous 24/7 runtime is ~$97/mo. |

---

## 2. Summary & Operational Recommendations

- **Baseline Floor Cost (Serverless Components):** **$0.00 / month** (all serverless components scale to zero when idle).
- **Active Variable Staging Budget (Cloud Run + Storage + Vertex AI):** **$3.00 – $8.00 / month**.
- **Sandbox VM Budget:** **$10.00 – $30.00 / month** if powered on on-demand for testing; ~$97/month if left running 24/7.
- **Maximum Recommended Monthly Staging Budget Cap:** **$50.00 / month** (configure Google Cloud Budget Alerts at 50%, 80%, and 100%).
