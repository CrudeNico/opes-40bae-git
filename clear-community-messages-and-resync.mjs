#!/usr/bin/env node
/**
 * clear-community-messages-and-resync.mjs
 * 1. Deletes ALL documents in communityMessages
 * 2. Clears chat watcher state (_systemChatWatcherState) so Cloud Run will re-sync
 * 3. Runs sync-chat-messages to repopulate from the other website
 *
 * Usage:
 *   node clear-community-messages-and-resync.mjs           # headless sync
 *   node clear-community-messages-and-resync.mjs --headed  # headed sync (recommended)
 */
import { existsSync, readFileSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import admin from 'firebase-admin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHAT_KEYS = ['spaces-12206623', 'chats-23098072']

function initFirebase() {
  if (admin.apps.length > 0) return admin.firestore()
  const credPath = path.join(__dirname, 'serviceAccountKey.json')
  const envCred = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON

  let credObj
  if (envJson) {
    credObj = JSON.parse(envJson)
  } else if (envCred && existsSync(envCred)) {
    credObj = JSON.parse(readFileSync(envCred, 'utf8'))
  } else if (existsSync(credPath)) {
    credObj = JSON.parse(readFileSync(credPath, 'utf8'))
  } else {
    const firebaseKeys = readdirSync(__dirname, { withFileTypes: true })
      .filter((f) => f.isFile() && f.name.endsWith('.json') && f.name.includes('firebase-adminsdk'))
      .map((f) => path.join(__dirname, f.name))
    if (firebaseKeys[0] && existsSync(firebaseKeys[0])) {
      credObj = JSON.parse(readFileSync(firebaseKeys[0], 'utf8'))
    } else {
      console.error('Firebase credentials required.')
      process.exit(1)
    }
  }
  admin.initializeApp({ credential: admin.credential.cert(credObj) })
  return admin.firestore()
}

async function deleteCollection(db, collectionPath, batchSize = 100) {
  const col = db.collection(collectionPath)
  let deleted = 0
  let snapshot = await col.limit(batchSize).get()
  while (!snapshot.empty) {
    const batch = db.batch()
    snapshot.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
    deleted += snapshot.size
    process.stdout.write(`  Deleted ${deleted} documents...\r`)
    snapshot = await col.limit(batchSize).get()
  }
  return deleted
}

async function main() {
  if (!existsSync(path.join(__dirname, '.pw-session', 'state.json'))) {
    console.error('No session. Run: node manual-login.mjs')
    process.exit(1)
  }

  const db = initFirebase()
  const headed = process.argv.includes('--headed')

  console.log('Clearing communityMessages and chat watcher state...\n')

  // 1. Delete all communityMessages
  console.log('1. Deleting all communityMessages...')
  const msgCount = await deleteCollection(db, 'communityMessages')
  console.log(`   Done. Deleted ${msgCount} documents.\n`)

  // 2. Clear chat watcher state so Cloud Run will re-import on next run
  console.log('2. Clearing chat watcher state (_systemChatWatcherState)...')
  for (const key of CHAT_KEYS) {
    await db.collection('_systemChatWatcherState').doc(key).set({
      lastSeenMs: 0,
      seenKeys: {},
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
  }
  console.log('   Done.\n')

  // 3. Run sync-chat-messages
  console.log('3. Running sync-chat-messages to repopulate from the other website...')
  const syncScript = path.join(__dirname, 'sync-chat-messages.mjs')
  const args = [syncScript, ...(headed ? ['--headed'] : [])]
  const child = spawn('node', args, {
    stdio: 'inherit',
    cwd: __dirname
  })
  const code = await new Promise((resolve) => child.on('close', resolve))
  process.exit(code ?? 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
