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
