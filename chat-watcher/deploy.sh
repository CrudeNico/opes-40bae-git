#!/bin/bash
# Deploy chat watcher as a Cloud Run Job and schedule it every 5 minutes.
# Requires: gcloud CLI, Firebase project opes-40bae
# Before first run: enable Cloud Run API, Cloud Scheduler API
set -e

if ! command -v gcloud &>/dev/null; then
  echo "gcloud CLI not found. Install it first:"
  echo "  https://cloud.google.com/sdk/docs/install"
  echo "  Or: brew install google-cloud-sdk"
  exit 1
fi

PROJECT_ID="opes-40bae"
REGION="us-central1"
JOB_NAME="chat-watcher"

# Get project number (needed for scheduler OAuth)
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)' 2>/dev/null || echo "")

echo "Building and deploying Cloud Run Job..."
gcloud run jobs deploy "$JOB_NAME" \
  --source . \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --memory 1Gi \
  --cpu 1 \
  --task-timeout 5m \
  --max-retries 0

echo ""
echo "Set env vars (Brevo + alert email):"
echo "  gcloud run jobs update $JOB_NAME --region $REGION --project $PROJECT_ID \\"
echo "    --set-env-vars BREVO_API_KEY=your_key,BREVO_SENDER_EMAIL=no-reply@yourdomain.com,CHAT_WATCHER_ALERT_EMAIL=your@email.com"

if [ -n "$PROJECT_NUMBER" ]; then
  echo ""
  echo "Creating scheduler to run every 5 min..."
  gcloud scheduler jobs create http "chat-watcher-trigger" \
    --location "$REGION" \
    --project "$PROJECT_ID" \
    --schedule "*/5 * * * *" \
    --uri "https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${REGION}/jobs/${JOB_NAME}:run" \
    --http-method POST \
    --oauth-service-account-email "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --time-zone "UTC" 2>/dev/null && echo "Scheduler created." || echo "Scheduler may exist. Delete and recreate if needed."
else
  echo ""
  echo "Could not get project number. Create scheduler manually in Cloud Console:"
  echo "  Cloud Scheduler -> Create Job -> Target: HTTP"
  echo "  URL: https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${REGION}/jobs/${JOB_NAME}:run"
  echo "  Method: POST, Auth: OIDC with default compute SA"
fi

echo ""
echo "Done. After manual-login + upload-session, the job will run every 5 min."
