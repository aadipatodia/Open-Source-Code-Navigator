#!/usr/bin/env bash
# Deploy the FastAPI backend to Google Cloud Run.
#
# Usage (from backend/):
#   export GEMINI_API_KEY=...          # required on first run (creates Secret Manager secret)
#   export GITHUB_TOKEN=...            # optional but strongly recommended
#   export GCP_PROJECT=your-project-id # or: gcloud config set project ...
#   ./deploy.sh
#
# Optional:
#   REGION=europe-west1 SERVICE=my-api ./deploy.sh

set -euo pipefail

SERVICE="${SERVICE:-open-source-code-navigator-api}"
REGION="${REGION:-us-central1}"
PROJECT="${GCP_PROJECT:-$(gcloud config get-value project 2>/dev/null || true)}"

if [[ -z "${PROJECT}" || "${PROJECT}" == "(unset)" ]]; then
  echo "ERROR: Set GCP_PROJECT or run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: Install the Google Cloud CLI: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

echo "Project:  ${PROJECT}"
echo "Region:   ${REGION}"
echo "Service:  ${SERVICE}"
echo

gcloud config set project "${PROJECT}"

echo "Enabling required APIs (safe to re-run)..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --quiet

# Artifact Registry repo used by Cloud Build / source deploys
if ! gcloud artifacts repositories describe cloud-run-source-deploy \
  --location="${REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create cloud-run-source-deploy \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Images for Cloud Run deployments"
fi

upsert_secret() {
  local name="$1"
  local value="$2"
  if [[ -z "${value}" ]]; then
    return 0
  fi
  if gcloud secrets describe "${name}" >/dev/null 2>&1; then
    echo "Updating secret: ${name}"
    printf '%s' "${value}" | gcloud secrets versions add "${name}" --data-file=-
  else
    echo "Creating secret: ${name}"
    printf '%s' "${value}" | gcloud secrets create "${name}" --data-file=-
  fi
}

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  if ! gcloud secrets describe gemini-api-key >/dev/null 2>&1; then
    echo "ERROR: GEMINI_API_KEY is not set and secret gemini-api-key does not exist."
    echo "Export GEMINI_API_KEY before the first deploy."
    exit 1
  fi
  echo "Using existing Secret Manager secret: gemini-api-key"
else
  upsert_secret gemini-api-key "${GEMINI_API_KEY}"
fi

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  upsert_secret github-token "${GITHUB_TOKEN}"
elif ! gcloud secrets describe github-token >/dev/null 2>&1; then
  echo "WARNING: GITHUB_TOKEN not set — creating an empty github-token secret."
  echo "         Issue search will hit GitHub rate limits. Add a token later with:"
  echo "         printf '%s' YOUR_TOKEN | gcloud secrets versions add github-token --data-file=-"
  printf '' | gcloud secrets create github-token --data-file=- 2>/dev/null || \
    printf '' | gcloud secrets versions add github-token --data-file=-
fi

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT}" --format='value(projectNumber)')"
RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for secret in gemini-api-key github-token; do
  gcloud secrets add-iam-policy-binding "${secret}" \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null
done

SECRET_FLAGS="GEMINI_API_KEY=gemini-api-key:latest,GITHUB_TOKEN=github-token:latest"

echo
echo "Building and deploying to Cloud Run..."
gcloud run deploy "${SERVICE}" \
  --source . \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 900 \
  --concurrency 4 \
  --min-instances 0 \
  --max-instances 10 \
  --set-secrets "${SECRET_FLAGS}"

URL="$(gcloud run services describe "${SERVICE}" --region "${REGION}" --format='value(status.url)')"
echo
echo "Deployed: ${URL}"
echo
echo "Next steps:"
echo "  1. Test:  curl ${URL}/"
echo "  2. Vercel: set REACT_APP_API_BASE=${URL} and redeploy the frontend"
echo "  3. Extra CORS origins: gcloud run services update ${SERVICE} --region ${REGION} \\"
echo "       --update-env-vars ALLOWED_ORIGINS=https://your-domain.example"
