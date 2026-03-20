#!/usr/bin/env node
/**
 * watch-chats-multi-firestore.mjs
 * Same as watch-chats-multi.mjs but writes new messages to Firestore communityMessages.
 * De-dupes by messageKey as doc id.
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON or ./serviceAccountKey.json
 */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs'
import { createHash } from 'crypto'
import admin from 'firebase-admin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSION_PATH = path.join(__dirname, '.pw-session', 'state.json')

const CHATS = [
  { key: 'spaces-12206623', chatType: 'london-session', url: 'https://app.theprofessortrades.com/spaces/12206623/chat' },
  { key: 'chats-23098072', chatType: 'general', url: 'https://app.theprofessortrades.com/chats/23098072' }
]

function normalizeForDedup(msg) {
  const author = (msg.author || 'Community Member').trim().replace(/\s+/g, ' ')
  const message = (msg.message || '').trim().replace(/\s+/g, ' ')
  const imageUrl = msg.imageUrl || ''
  const fileUrl = msg.fileUrl || ''
  return { author, message, imageUrl, fileUrl }
}

function messageKey(chatType, msg) {
  const { author, message, imageUrl, fileUrl } = normalizeForDedup(msg)
  const str = `${chatType}-${author}-${message}-${imageUrl}-${fileUrl}`
  return createHash('sha256').update(str).digest('hex').substring(0, 32)
}

function getStatePath(key) {
  return path.join(__dirname, `.chat-watch-state-${key}.json`)
}

function loadState(key) {
  const p = getStatePath(key)
  if (!existsSync(p)) return { lastSeenMs: 0, seenKeys: {} }
  const data = JSON.parse(readFileSync(p, 'utf8'))
  return { lastSeenMs: data.lastSeenMs || 0, seenKeys: data.seenKeys || {} }
}

function saveState(key, lastSeenMs, seenKeys) {
  writeFileSync(getStatePath(key), JSON.stringify({ lastSeenMs, seenKeys }, null, 2), 'utf8')
}

async function extractMessages(page) {
  return page.evaluate(() => {
    const arr = []
    const items = document.querySelectorAll('div.chat-item-content')
    items.forEach((contentEl, idx) => {
      const textEl = contentEl.querySelector('.chat-item-text, .chat-item-text-paragraph')
      const text = textEl?.innerText?.trim() || ''
      const metaEl = contentEl.querySelector('.chat-item-meta')
      const author = metaEl?.textContent?.trim() || 'Community Member'
      const tsEl = contentEl.querySelector('[data-timestamp]')
      const dataTs = tsEl?.getAttribute?.('data-timestamp')
      const img = contentEl.querySelector('img')
      const fileLink = contentEl.querySelector('a[href]')
      const fileUrl = fileLink?.href && !fileLink.href.startsWith('javascript:') ? fileLink.href : null
      const fileName = fileLink?.textContent?.trim() || fileLink?.download || (fileUrl ? 'File' : null)

      if ((!text || text.length < 2) && !img?.src && !fileUrl) return

      const dataTimestamp = dataTs ? parseInt(dataTs, 10) : Date.now() - (10000 * (items.length - idx))
      arr.push({
        dataTimestamp,
        author,
        message: text || '',
        imageUrl: img?.src || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null
      })
    })
    return arr
  })
}

function initFirebase() {
  if (admin.apps.length > 0) return admin.firestore()

  const credPath = path.join(__dirname, 'serviceAccountKey.json')
  const envCred = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON

  let credObj
  if (envJson) {
    try {
      credObj = JSON.parse(envJson)
    } catch {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON')
      process.exit(1)
    }
  } else if (envCred && existsSync(envCred)) {
    credObj = JSON.parse(readFileSync(envCred, 'utf8'))
  } else if (existsSync(credPath)) {
    credObj = JSON.parse(readFileSync(credPath, 'utf8'))
  } else {
    const firebaseKeys = readdirSync(__dirname, { withFileTypes: true })
      .filter((f) => f.isFile() && f.name.endsWith('.json') && f.name.includes('firebase-adminsdk'))
      .map((f) => path.join(__dirname, f.name))
    const altPath = firebaseKeys[0]
    if (altPath && existsSync(altPath)) {
      credObj = JSON.parse(readFileSync(altPath, 'utf8'))
    } else {
      console.error(
        'Firebase credentials required. Place serviceAccountKey.json or *-firebase-adminsdk-*.json in project root.'
      )
      process.exit(1)
    }
  }

  admin.initializeApp({ credential: admin.credential.cert(credObj) })
  return admin.firestore()
}

async function cleanupOldMessages(db) {
  try {
    const col = db.collection('communityMessages')
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const snapshot = await col.orderBy('createdAt').endAt(admin.firestore.Timestamp.fromMillis(weekAgo)).get()
    for (const doc of snapshot.docs) {
      await doc.ref.delete()
    }
    if (snapshot.size > 0) console.log(`Cleaned up ${snapshot.size} messages older than 7 days`)
  } catch (e) {
    console.error('Cleanup failed:', e.message)
  }
}

async function writeChatWatcherStatus(db, loggedIn, lastError = null) {
  try {
    await db.collection('chatWatcherStatus').doc('status').set({
      loggedIn,
      lastError: lastError || null,
      lastChecked: admin.firestore.FieldValue.serverTimestamp()
    })
  } catch (e) {
    console.error('Failed to write status:', e.message)
  }
}

async function pollChat(browser, chat, state, db) {
  const context = await browser.newContext({ storageState: SESSION_PATH })
  const page = await context.newPage()
  try {
    await page.goto(chat.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    const url = page.url()
    if (url.includes('sign_in') || url.includes('login')) {
      await context.close()
      await writeChatWatcherStatus(db, false, 'Redirected to login – session expired')
      throw new Error('LOGOUT_DETECTED: Session expired.')
    }

    try {
      await page.waitForSelector('.chat-item-content, .chat-item-text', { timeout: 15000 })
    } catch {
      await page.waitForTimeout(5000)
    }

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const el = document.querySelector('[class*="scroll"], [class*="messages"], [class*="chat"]') || document.documentElement
        el.scrollTop = 0
      })
      await page.waitForTimeout(300)
    }
    await page.waitForTimeout(500)

    const messages = await extractMessages(page)
    await context.close()

    const { seenKeys } = state
    const chatType = chat.chatType || 'general'
    const newMessages = messages
      .filter((m) => !seenKeys[messageKey(chatType, m)])

    const col = db.collection('communityMessages')

    for (const m of newMessages) {
      const key = messageKey(chatType, m)

      const docRef = col.doc(key)
      const exists = (await docRef.get()).exists
      if (exists) {
        state.seenKeys[key] = true
        continue
      }

      state.seenKeys[key] = true
      const isProfileImage = (url) => {
        if (!url) return true
        const u = String(url).toLowerCase()
        if (u.includes('app.theprofessortrades.com')) return true
        if (u.includes('mightynetworks.imgix.net')) return true
        if (u.includes('gravatar.com') || u.includes('/avatar/')) return true
        if (u.includes('pbs.twimg.com')) return true
        if (u.includes('profile_images') || u.includes('profile-images')) return true
        if (/[=_](?:s|size)(?:32|40|48|64)\b|_normal|_mini|_bigger/.test(u)) return true
        return false
      }
      const isInternalFile = (url) => {
        if (!url) return false
        const u = String(url).toLowerCase()
        return u.includes('app.theprofessortrades.com') || u.includes('mightynetworks.imgix.net')
      }
      const imageUrl = isProfileImage(m.imageUrl) ? null : (m.imageUrl || null)
      const fileUrl = isInternalFile(m.fileUrl) ? null : (m.fileUrl || null)
      await docRef.set({
        userId: `imported-${key}`,
        userName: m.author || 'Community Member',
        message: m.message || '',
        imageUrl,
        fileUrl,
        fileName: fileUrl ? (m.fileName || null) : null,
        createdAt: admin.firestore.Timestamp.now(),
        chatType,
        sourceChatUrl: chat.url,
        sourceChatKey: chat.key,
        sourceMessageKey: key,
        isAdmin: false
      })
    }

    saveState(chat.key, state.lastSeenMs, state.seenKeys)

    return newMessages.length
  } catch (err) {
    await context.close()
    throw err
  }
}

async function main() {
  if (!existsSync(SESSION_PATH)) {
    console.error('No saved session. Run: node manual-login.mjs')
    process.exit(1)
  }

  const db = initFirebase()
  const browser = await chromium.launch({ headless: true })
  const states = {}
  for (const chat of CHATS) {
    states[chat.key] = loadState(chat.key)
  }

  console.log('Watching chats every 15s, writing to Firestore. Ctrl+C to stop.')
  const run = async () => {
    try {
      await cleanupOldMessages(db)
    } catch (e) {
      console.error('Cleanup:', e.message)
    }
    let anySuccess = false
    let lastErr = null
    for (const chat of CHATS) {
      try {
        const count = await pollChat(browser, chat, states[chat.key], db)
        anySuccess = true
        if (count > 0) console.log(`[${chat.key}] +${count} new messages -> Firestore`)
      } catch (err) {
        lastErr = err.message
        console.error(`[${chat.key}]`, err.message)
        if (err.message?.includes('LOGOUT_DETECTED')) break
      }
    }
    if (anySuccess) {
      await writeChatWatcherStatus(db, true)
    } else if (lastErr) {
      await writeChatWatcherStatus(db, false, lastErr)
    }
    setTimeout(run, 15000)
  }
  await run()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
