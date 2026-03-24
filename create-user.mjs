#!/usr/bin/env node
/**
 * Create a new user with Firebase Auth + Firestore.
 * Run from project root. Requires serviceAccountKey.json or *-firebase-adminsdk-*.json.
 *
 * Usage:
 *   node create-user.mjs --email user@example.com --password "Secret123" --name "John Doe" --statuses "Admin 3,Community"
 *
 * Statuses: Admin, Admin 2, Admin 3, Investor, Trader, Learner, Community
 * If Admin 3 is specified, Community is added automatically so they can log in and access member areas.
 */
import { existsSync, readFileSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import admin from 'firebase-admin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function initFirebase() {
  if (admin.apps.length > 0) return
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
      console.error('Firebase credentials required. Place serviceAccountKey.json in project root.')
      process.exit(1)
    }
  }
  admin.initializeApp({ credential: admin.credential.cert(credObj) })
}

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { email: null, password: null, name: '', statuses: [] }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) out.email = args[++i]
    else if (args[i] === '--password' && args[i + 1]) out.password = args[++i]
    else if ((args[i] === '--name' || args[i] === '--displayName') && args[i + 1]) out.name = args[++i]
    else if (args[i] === '--statuses' && args[i + 1]) {
      out.statuses = args[++i].split(',').map((s) => s.trim()).filter(Boolean)
    }
  }
  return out
}

async function main() {
  const { email, password, name, statuses } = parseArgs()
  if (!email || !password) {
    console.error('Usage: node create-user.mjs --email user@example.com --password "Secret123" [--name "John Doe"] [--statuses "Admin 3,Community"]')
    process.exit(1)
  }

  initFirebase()
  const auth = admin.auth()
  const db = admin.firestore()

  let statusList = [...statuses]
  if (statusList.includes('Admin 3') && !statusList.includes('Community')) {
    statusList.push('Community')
    console.log('Added Community status (Admin 3 needs member access to log in)')
  }

  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name || email.split('@')[0],
      emailVerified: false
    })

    const uid = userRecord.uid
    await db.collection('users').doc(uid).set({
      email,
      displayName: name || email.split('@')[0],
      statuses: statusList.length ? statusList : ['Community'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })

    console.log('User created successfully!')
    console.log('  Email:', email)
    console.log('  UID:', uid)
    console.log('  Statuses:', statusList.length ? statusList.join(', ') : 'Community')
    console.log('\nThe user can now log in with this email and password.')
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      console.error('Email already exists. To add statuses to an existing user, use Admin → Users in the dashboard.')
    } else {
      console.error('Error:', err.message)
    }
    process.exit(1)
  }
}

main()
