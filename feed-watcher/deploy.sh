#!/bin/bash
# Deploy feed watcher as a Cloud Run Job, scheduled every 1 minute.
# Requires: gcloud CLI
# Uses same session as chat watcher - run manual-login + upload-session first.
set -e

if ! command -v gcloud &>/dev/null; then
  echo "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

PROJECT_ID="opes-40bae"
REGION="us-central1"
JOB_NAME="feed-watcher"
SCHEDULER_NAME="feed-watcher-trigger"

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)' 2>/dev/null || echo "")
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "Building Docker image..."
gcloud builds submit --tag us-central1-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/${JOB_NAME} . --project "$PROJECT_ID"

echo ""
echo "Deploying Cloud Run Job..."
gcloud run jobs deploy "$JOB_NAME" \
  --image us-central1-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/${JOB_NAME} \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --memory 1Gi \
  --cpu 1 \
  --task-timeout 5m \
  --max-retries 0

if [ -n "$PROJECT_NUMBER" ]; then
  echo ""
  echo "Granting Cloud Run Invoker to compute SA..."
  gcloud run jobs add-iam-policy-binding "$JOB_NAME" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/run.invoker" \
    --quiet 2>/dev/null || true

  echo ""
  echo "Setting up Cloud Scheduler (every 1 minute)..."
  if gcloud scheduler jobs describe "$SCHEDULER_NAME" --location "$REGION" --project "$PROJECT_ID" &>/dev/null; then
    gcloud scheduler jobs update http "$SCHEDULER_NAME" \
      --location "$REGION" \
      --project "$PROJECT_ID" \
      --schedule "* * * * *" \
      --uri "https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${REGION}/jobs/${JOB_NAME}:run" \
      --http-method POST \
      --oauth-service-account-email "$COMPUTE_SA" \
      --time-zone "UTC"
    gcloud scheduler jobs resume "$SCHEDULER_NAME" --location "$REGION" --project "$PROJECT_ID" 2>/dev/null || true
    echo "  Scheduler updated."
  else
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
  echo "Triggering one run now..."
  gcloud run jobs execute "$JOB_NAME" --region "$REGION" --project "$PROJECT_ID" 2>/dev/null && echo "  Run triggered." || true
fi

echo ""
echo "Done! Feed watcher runs every 1 minute."
echo "Posts are saved to Firestore collection: feedPosts"
echo "View in Firebase Console: Firestore Database → feedPosts"
echo ""
echo "Deploy Firestore indexes first: firebase deploy --only firestore:indexes"
