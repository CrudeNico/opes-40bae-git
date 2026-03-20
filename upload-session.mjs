#!/usr/bin/env node
/**
 * upload-session.mjs
 * Uploads .pw-session/state.json to Firestore for the Cloud Run chat watcher.
 * Run after manual-login.mjs. Requires serviceAccountKey.json or GOOGLE_APPLICATION_CREDENTIALS.
 */
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import admin from 'firebase-admin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSION_PATH = path.join(__dirname, '.pw-session', 'state.json')

async function main() {
  if (!existsSync(SESSION_PATH)) {
    console.error('No session file. Run: node manual-login.mjs')
    process.exit(1)
  }

  if (admin.apps.length === 0) {
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
      const { readdirSync } = await import('fs')
      const firebaseKeys = readdirSync(__dirname, { withFileTypes: true })
        .filter((f) => f.isFile() && f.name.endsWith('.json') && f.name.includes('firebase-adminsdk'))
        .map((f) => path.join(__dirname, f.name))
      const altPath = firebaseKeys[0]
      if (altPath && existsSync(altPath)) {
        credObj = JSON.parse(readFileSync(altPath, 'utf8'))
      } else {
        console.error('Firebase credentials required.')
        console.error('Expected file:', credPath)
        console.error('Or any *-firebase-adminsdk-*.json in this folder.')
        console.error('Or GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json')
        process.exit(1)
      }
    }
    admin.initializeApp({ credential: admin.credential.cert(credObj) })
  }

  const state = JSON.parse(readFileSync(SESSION_PATH, 'utf8'))
  await admin.firestore().collection('_system').doc('chatWatcherSession').set({
    state,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })

  console.log('Session uploaded to Firestore. The Cloud Run chat watcher can now use it.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
