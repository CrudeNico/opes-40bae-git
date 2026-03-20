#!/usr/bin/env node
/**
 * fetch-last-5-and-save.mjs
 * Fetches the last 5 messages from BOTH chats and saves them to Firestore communityMessages.
 * Run once to verify extraction works. Messages will appear in the website Community chat.
 */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { createHash } from 'crypto'
import admin from 'firebase-admin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSION_PATH = path.join(__dirname, '.pw-session', 'state.json')

const HEADED = process.argv.includes('--headed')

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
    // Each message is in div.chat-item-content; text in div.chat-item-text; author in div.chat-item-meta
    const items = document.querySelectorAll('div.chat-item-content')
    items.forEach((contentEl, idx) => {
      const textEl = contentEl.querySelector('.chat-item-text, .chat-item-text-paragraph')
      if (!textEl) return
      const text = textEl.innerText?.trim() || ''
      if (!text || text.length < 2) return

      const metaEl = contentEl.querySelector('.chat-item-meta')
      const author = metaEl?.textContent?.trim() || 'Community Member'
      const tsEl = contentEl.querySelector('[data-timestamp]') || contentEl.closest('[data-timestamp]')
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

async function main() {
  if (!existsSync(SESSION_PATH)) {
    console.error('No session. Run: node manual-login.mjs')
    process.exit(1)
  }

  const db = initFirebase()
  const browser = await chromium.launch({ headless: !HEADED })
  const col = db.collection('communityMessages')

  let totalSaved = 0
  for (const chat of CHATS) {
    const context = await browser.newContext({ storageState: SESSION_PATH })
    const page = await context.newPage()
    try {
      console.log('Loading', chat.url, '...')
      await page.goto(chat.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(2000)

      if (page.url().includes('sign_in') || page.url().includes('login')) {
        console.error('Session expired. Run manual-login.mjs')
        await context.close()
        continue
      }

      // Wait for chat to render (up to 15 sec)
      try {
        await page.waitForSelector('.chat-item-content, .chat-item-text', { timeout: 15000 })
      } catch {
        console.log('  Chat not visible yet, waiting 10s more...')
        await page.waitForTimeout(10000)
      }

      // Scroll up to load more history
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => {
          const el = document.querySelector('[class*="scroll"], [class*="messages"], [class*="chat"]') || document.documentElement
          el.scrollTop = 0
        })
        await page.waitForTimeout(500)
      }
      await page.waitForTimeout(1000)

      const messages = await extractMessages(page)
      await context.close()

      const last5 = messages.slice(-5)

      console.log(`[${chat.key}] Found ${messages.length} messages, saving last 5:`)
      const chatType = chat.chatType || 'general'
      for (const m of last5) {
        const key = messageKey(chatType, m)
        const exists = (await col.doc(key).get()).exists
        if (!exists) {
          await col.doc(key).set({
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
          totalSaved++
          console.log('  -', m.message?.substring(0, 50) + (m.message?.length > 50 ? '...' : ''))
        }
      }
      if (last5.length === 0) {
        console.log('  (no messages found - check selectors)')
      }
    } catch (err) {
      console.error(`[${chat.key}]`, err.message)
      await context.close()
    }
  }

  await browser.close()
  console.log(`\nDone. Saved ${totalSaved} new messages to Firestore. Check your website Community chat.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
