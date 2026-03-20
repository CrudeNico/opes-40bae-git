# Feed Watcher – Cloud Run Job

Polls The Professor Trades feed pages every minute and saves new posts to Firestore.

## Collection

**`feedPosts`** – All synced feed posts are stored here.

View in Firebase Console: **Firestore Database → feedPosts**

## Behavior

- Runs every 1 minute (Cloud Scheduler)
- Uses the same session as the chat watcher (`chatWatcherSession`)
- Keeps the **3 most recent posts per feed**
- Feeds: spaces/12849168 and spaces/20396883
- **Auto-posts to Trade Alerts**: After each run, the top 3 most recent feed posts (if new) are automatically added as simple trade alerts in `tradeAlerts`. Requirement: description must contain "buy" or "sell" (case-insensitive; matches buys, selling, etc.). Duplicate = same description; skips if that description already exists in any trade alert.

## Deploy

```bash
cd feed-watcher
./deploy.sh
```

Deploy Firestore indexes first (from project root):

```bash
firebase deploy --only firestore:indexes
```

## Prerequisites

- `manual-login.mjs` + `upload-session.mjs` (same session as chat watcher)
