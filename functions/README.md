## Community AI auto-reply function

This function listens for new docs in `communityMessages` and posts an AI answer.

### Behavior
- Triggers only when a new community chat message is created.
- Skips admin/AI messages and empty messages.
- Verifies the sender has `Community` status.
- Reads that user's previous 5 text messages in the same `chatType`.
- Sends context + current message to OpenAI (`gpt-5-nano`).
- Writes the AI reply back to `communityMessages`.

### Setup
1. Install deps (already in `functions/package.json`):
   - `firebase-functions`
   - `firebase-admin`
   - `openai`
2. Set the secret key in Firebase (do not hardcode API keys):
   - `firebase functions:secrets:set OPENAI_API_KEY`
3. Deploy:
   - `firebase deploy --only functions`

### Notes
- The frontend does not call OpenAI directly.
- The reply appears in real-time because the UI already listens to `communityMessages`.

## Resend email function

Transactional and admin emails are sent through the `sendResendEmail` callable Cloud Function (Resend blocks direct browser requests).

### Setup
1. Set Resend credentials in `functions/.env.opes-40bae` (or via GitHub Actions secrets):
   - `RESEND_API_KEY`
   - `RESEND_SENDER_EMAIL` (default: `noreply@opessocius.com`)
   - `RESEND_SENDER_NAME` (default: `Opessocius Asset Management`)
2. Deploy:
   - `firebase deploy --only functions:sendResendEmail`

Admin bulk/attachment emails require an authenticated admin session.
