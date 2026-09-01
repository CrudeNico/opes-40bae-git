#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ID="opes-40bae"

cd "$ROOT"

if [[ -f .env ]]; then
  RESEND_KEY="$(grep '^VITE_RESEND_API_KEY=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")"
else
  RESEND_KEY="${RESEND_API_KEY:-}"
fi

if [[ -z "${RESEND_KEY:-}" ]]; then
  echo "RESEND_API_KEY is not set. Add VITE_RESEND_API_KEY to .env or export RESEND_API_KEY."
  exit 1
fi

printf '%s' "$RESEND_KEY" | firebase functions:secrets:set RESEND_API_KEY --project "$PROJECT_ID" --force

cd functions
npm ci
cd "$ROOT"

firebase deploy --only functions:sendResendEmail --project "$PROJECT_ID" --non-interactive

echo "sendResendEmail deployed to $PROJECT_ID"
