#!/bin/bash
# Deploy chat watcher as a Cloud Run Job and schedule it every 1 minute.
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
SCHEDULER_NAME="chat-watcher-trigger"

# Get project number (needed for scheduler OAuth and IAM)
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)' 2>/dev/null || echo "")
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "Building and deploying Cloud Run Job..."
gcloud run jobs deploy "$JOB_NAME" \
  --source . \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --memory 1Gi \
  --cpu 1 \
  --task-timeout 5m \
  --max-retries 0

if [ -z "$PROJECT_NUMBER" ]; then
  echo ""
  echo "Could not get project number. Scheduler and IAM setup skipped."
  echo "Create scheduler manually in Cloud Console."
  exit 0
fi

# Grant Cloud Scheduler's service account permission to invoke the job
echo ""
echo "Granting Cloud Run Invoker role to compute SA (so Scheduler can trigger the job)..."
gcloud run jobs add-iam-policy-binding "$JOB_NAME" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/run.invoker" \
  --quiet 2>/dev/null || echo "  (IAM may already be set)"

echo ""
echo "Setting up Cloud Scheduler (every 1 minute)..."
if gcloud scheduler jobs describe "$SCHEDULER_NAME" --location "$REGION" --project "$PROJECT_ID" &>/dev/null; then
  echo "  Updating existing scheduler job..."
  gcloud scheduler jobs update http "$SCHEDULER_NAME" \
    --location "$REGION" \
    --project "$PROJECT_ID" \
    --schedule "* * * * *" \
    --uri "https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${REGION}/jobs/${JOB_NAME}:run" \
    --http-method POST \
    --oauth-service-account-email "$COMPUTE_SA" \
    --time-zone "UTC"
  gcloud scheduler jobs resume "$SCHEDULER_NAME" --location "$REGION" --project "$PROJECT_ID" 2>/dev/null || true
  echo "  Scheduler updated and resumed."
else
  echo "  Creating scheduler job..."
  gcloud scheduler jobs create http "$SCHEDULER_NAME" \
    --location "$REGION" \
    --project "$PROJECT_ID" \
    --schedule "* * * * *" \
    --uri "https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${REGION}/jobs/${JOB_NAME}:run" \
    --http-method POST \
    --oauth-service-account-email "$COMPUTE_SA" \
    --time-zone "UTC"
  echo "  Scheduler created."
fi

echo ""
echo "Set env vars (Brevo + alert email) if not already set:"
echo "  gcloud run jobs update $JOB_NAME --region $REGION --project $PROJECT_ID \\"
echo "    --set-env-vars BREVO_API_KEY=your_key,BREVO_SENDER_EMAIL=no-reply@yourdomain.com,CHAT_WATCHER_ALERT_EMAIL=your@email.com"

echo ""
echo "Triggering one run now (catches up after deploy)..."
gcloud run jobs execute "$JOB_NAME" --region "$REGION" --project "$PROJECT_ID" 2>/dev/null && echo "  Run triggered." || echo "  (Trigger skipped - run manually if needed)"

echo ""
echo "Done. After manual-login + upload-session, the job will run every 1 min."
echo "To re-sync missed messages locally: node sync-chat-messages.mjs --headed"
