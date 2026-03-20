#!/bin/bash
# Verify chat watcher Cloud Run Job and Scheduler are set up correctly.
PROJECT_ID="opes-40bae"
REGION="us-central1"
JOB_NAME="chat-watcher"
SCHEDULER_NAME="chat-watcher-trigger"

echo "=== Chat Watcher Status ==="
echo ""

echo "1. Cloud Run Job:"
if gcloud run jobs describe "$JOB_NAME" --region "$REGION" --project "$PROJECT_ID" &>/dev/null; then
  echo "   ✓ Job exists"
  echo "   To run manually: gcloud run jobs execute $JOB_NAME --region $REGION --project $PROJECT_ID"
else
  echo "   ✗ Job not found. Run: ./deploy.sh"
fi
echo ""

echo "2. Cloud Scheduler:"
if gcloud scheduler jobs describe "$SCHEDULER_NAME" --location "$REGION" --project "$PROJECT_ID" &>/dev/null; then
  STATE=$(gcloud scheduler jobs describe "$SCHEDULER_NAME" --location "$REGION" --project "$PROJECT_ID" --format='value(state)' 2>/dev/null || echo "UNKNOWN")
  SCHEDULE=$(gcloud scheduler jobs describe "$SCHEDULER_NAME" --location "$REGION" --project "$PROJECT_ID" --format='value(schedule)' 2>/dev/null || echo "")
  echo "   ✓ Scheduler exists"
  echo "   State: $STATE (should be ENABLED)"
  echo "   Schedule: $SCHEDULE (should be * * * * * = every min)"
  if [ "$STATE" = "PAUSED" ]; then
    echo "   ⚠ Scheduler is PAUSED. Run: gcloud scheduler jobs resume $SCHEDULER_NAME --location $REGION --project $PROJECT_ID"
  fi
else
  echo "   ✗ Scheduler not found. Run: ./deploy.sh"
fi
echo ""

echo "3. Recent executions:"
gcloud run jobs executions list --job "$JOB_NAME" --region "$REGION" --project "$PROJECT_ID" --limit 5 2>/dev/null || echo "   (Could not list)"
echo ""
echo "To trigger a run now: gcloud run jobs execute $JOB_NAME --region $REGION --project $PROJECT_ID"
