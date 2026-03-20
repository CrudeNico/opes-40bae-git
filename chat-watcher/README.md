# Chat Watcher (Cloud Run)

Runs in Google Cloud every 1 minute. Syncs messages from The Professor Trades community chats into your Firestore `communityMessages` collection.

## One-time setup

### 1. Log in and save session locally

```bash
cd /Users/nicolas/Desktop/Ops
node manual-login.mjs
```

Log in in the browser, then press Enter to save.

### 2. Upload session to Firestore

```bash
node upload-session.mjs
```

Requires `serviceAccountKey.json` or `GOOGLE_APPLICATION_CREDENTIALS`.

### 3. Deploy to Cloud Run

```bash
cd chat-watcher
chmod +x deploy.sh
./deploy.sh
```

This deploys the job, grants the Scheduler permission to invoke it, and creates/updates a Cloud Scheduler job to run every 1 minute.

### 4. Verify it's running

```bash
./verify.sh
```

To manually trigger a run: `gcloud run jobs execute chat-watcher --region us-central1 --project opes-40bae`

### 5. Set env vars (Brevo + alert email)

```bash
gcloud run jobs update chat-watcher --region us-central1 --project opes-40bae \
  --set-env-vars BREVO_API_KEY=your_brevo_key,BREVO_SENDER_EMAIL=no-reply@yourdomain.com,CHAT_WATCHER_ALERT_EMAIL=your@email.com
```

## When session expires

You’ll receive an email. Then:

1. `node manual-login.mjs` → log in, press Enter
2. `node upload-session.mjs` → re-upload session

No redeploy needed.

## When messages are missing from Firebase

If messages appear on The Professor Trades but not in your website, run a full re-sync from the project root:

```bash
node sync-chat-messages.mjs --headed
```

This fetches all visible messages from both chats and saves any missing to Firestore. Use `--headed` for best results (chat often needs a real browser to render).
