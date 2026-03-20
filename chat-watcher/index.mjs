#!/usr/bin/env node
/**
 * Chat Watcher - Cloud Run Job
 * Runs once per schedule (every 5 min). Polls both chats, writes new messages to Firestore.
 * Session and state stored in Firestore. On logout, sends alert email and exits 1.
 */
import { chromium } from 'playwright'
import { createHash } from 'crypto'
import admin from 'firebase-admin'

const SESSION_COLLECTION = '_system'
const SESSION_DOC_ID = 'chatWatcherSession'
const STATE_COLLECTION = '_systemChatWatcherState'

const CHATS = [
  { key: 'spaces-12206623', chatType: 'london-session', url: 'https://app.theprofessortrades.com/spaces/12206623/chat' },
  { key: 'chats-23098072', chatType: 'general', url: 'https://app.theprofessortrades.com/chats/23098072' }
]

function messageKey(chatType, msg) {
  const str = `${chatType}-${msg.author}-${msg.message}`
  return createHash('sha256').update(str).digest('hex').substring(0, 32)
}

async function extractMessages(page) {
  return page.evaluate(() => {
    const arr = []
    const items = document.querySelectorAll('div.chat-item-content')
    items.forEach((contentEl, idx) => {
      const textEl = contentEl.querySelector('.chat-item-text, .chat-item-text-paragraph')
      if (!textEl) return
      const text = textEl.innerText?.trim() || ''
      if (!text || text.length < 2) return

      const metaEl = contentEl.querySelector('.chat-item-meta')
      const author = metaEl?.textContent?.trim() || 'Community Member'
      const tsEl = contentEl.querySelector('[data-timestamp]')
      const dataTs = tsEl?.getAttribute?.('data-timestamp')
      const img = contentEl.querySelector('img')

      const dataTimestamp = dataTs ? parseInt(dataTs, 10) : Date.now() - (10000 * (items.length - idx))
      arr.push({
        dataTimestamp,
        author,
        message: text,
        imageUrl: img?.src || null
      })
    })
    return arr
  })
}

async function sendLogoutAlert(message) {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const alertEmail = process.env.CHAT_WATCHER_ALERT_EMAIL || senderEmail

  if (!apiKey || !senderEmail) {
    console.error('BREVO_API_KEY / BREVO_SENDER_EMAIL not set - cannot send alert')
    return
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      sender: { name: 'Chat Watcher', email: senderEmail },
      to: [{ email: alertEmail }],
      subject: '[Chat Watcher] Session expired – manual re-login required',
      htmlContent: `
        <h2>Chat watcher session expired</h2>
        <p>The community chat watcher could not access the chat. You need to log in again.</p>
        <pre>${message}</pre>
        <p><strong>Steps:</strong></p>
        <ol>
          <li>Run: <code>node manual-login.mjs</code></li>
          <li>Log in in the browser, press Enter to save</li>
          <li>Run: <code>node upload-session.mjs</code></li>
        </ol>
      `
    })
  })
  if (!res.ok) {
    console.error('Failed to send alert email:', await res.text())
  }
}

async function getSession(db) {
  const doc = await db.collection(SESSION_COLLECTION).doc(SESSION_DOC_ID).get()
  if (!doc.exists) {
    throw new Error('No chat watcher session in Firestore. Run manual-login.mjs then upload-session.mjs')
  }
  const data = doc.data()
  if (!data?.state) {
    throw new Error('Session document exists but state is empty')
  }
  return typeof data.state === 'string' ? JSON.parse(data.state) : data.state
}

async function loadState(db, key) {
  const doc = await db.collection(STATE_COLLECTION).doc(key).get()
  if (!doc.exists) return { lastSeenMs: 0, seenKeys: {} }
  const d = doc.data()
  return { lastSeenMs: d?.lastSeenMs ?? 0, seenKeys: d?.seenKeys ?? {} }
}

async function saveState(db, key, lastSeenMs, seenKeys) {
  await db.collection(STATE_COLLECTION).doc(key).set({ lastSeenMs, seenKeys, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
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

async function pollChat(browser, chat, state, db, sessionState) {
  const context = await browser.newContext({ storageState: sessionState })
  const page = await context.newPage()

  try {
    await page.goto(chat.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    const url = page.url()
    if (url.includes('sign_in') || url.includes('login')) {
      await context.close()
      await writeChatWatcherStatus(db, false, 'Redirected to login – session expired')
      throw new Error(`LOGOUT_DETECTED: Redirected to login (${url}). Session expired.`)
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
    const newMessages = messages.filter((m) => !seenKeys[messageKey(chatType, m)])

    const col = db.collection('communityMessages')

    for (const m of newMessages) {
      const key = messageKey(chatType, m)
      state.seenKeys[key] = true

      const docRef = col.doc(key)
      const exists = (await docRef.get()).exists
      if (exists) continue

      await docRef.set({
        userId: `imported-${key}`,
        userName: m.author || 'Community Member',
        message: m.message || '',
        imageUrl: m.imageUrl || null,
        createdAt: admin.firestore.Timestamp.now(),
        chatType,
        sourceChatUrl: chat.url,
        sourceChatKey: chat.key,
        sourceMessageKey: key,
        isAdmin: false
      })
    }

    await saveState(db, chat.key, state.lastSeenMs, state.seenKeys)

    return newMessages.length
  } catch (err) {
    await context.close()
    throw err
  }
}

async function main() {
  if (admin.apps.length === 0) {
    admin.initializeApp()
  }
  const db = admin.firestore()

  const sessionState = await getSession(db)

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  })

  const states = {}
  for (const chat of CHATS) {
    states[chat.key] = await loadState(db, chat.key)
  }

  try {
    await cleanupOldMessages(db)
    for (const chat of CHATS) {
      const count = await pollChat(browser, chat, states[chat.key], db, sessionState)
      if (count > 0) {
        console.log(`[${chat.key}] +${count} new messages`)
      }
    }
    await writeChatWatcherStatus(db, true)
    console.log('Done.')
  } catch (err) {
    await browser.close()
    const msg = err.message || String(err)
    if (msg.includes('LOGOUT_DETECTED') || msg.includes('sign_in') || msg.includes('login')) {
      console.error('Session expired. Sending alert email...')
      await writeChatWatcherStatus(db, false, msg)
      await sendLogoutAlert(msg)
      process.exit(1)
    }
    throw err
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
