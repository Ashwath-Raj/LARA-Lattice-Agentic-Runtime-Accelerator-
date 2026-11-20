#!/usr/bin/env bash
set -euo pipefail
: "${PROJECT_ID:?Set PROJECT_ID}"
: "${REGION:?Set REGION}"
: "${SERVICE:=lara-runtime}"
: "${REPOSITORY:=lara-build}"
gcloud config set project "$PROJECT_ID"
gcloud builds submit --region="$REGION" --config=cloudbuild.yaml .
echo "Build submitted. Verify Cloud Build result and Cloud Run revision before sharing URL."
