#!/usr/bin/env node
/**
 * sync-chat-messages.mjs
 * Full re-sync: fetches ALL visible messages from both chats and saves any missing to Firestore.
 * Use when messages on the website haven't been stored correctly.
 * Run with --headed for best results (chat DOM often only renders in headed mode).
 *
 * Usage:
 *   node sync-chat-messages.mjs           # headless (may get fewer messages)
 *   node sync-chat-messages.mjs --headed  # recommended - opens browser, gets all visible
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

async function extractMessages(page) {
  return page.evaluate(() => {
    const arr = []
    const items = document.querySelectorAll('div.chat-item-content')
    items.forEach((contentEl, idx) => {
      const textEl = contentEl.querySelector('.chat-item-text, .chat-item-text-paragraph')
      const text = textEl?.innerText?.trim() || ''
      const metaEl = contentEl.querySelector('.chat-item-meta')
      const author = metaEl?.textContent?.trim() || 'Community Member'
      const tsEl = contentEl.querySelector('[data-timestamp]') || contentEl.closest('[data-timestamp]')
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

  console.log('Full re-sync of chat messages to Firestore.')
  if (HEADED) console.log('Using headed mode (recommended for complete extraction).\n')

  let totalSaved = 0
  for (const chat of CHATS) {
    const context = await browser.newContext({ storageState: SESSION_PATH })
    const page = await context.newPage()
    try {
      console.log('Loading', chat.url, '...')
      await page.goto(chat.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(3000)

      if (page.url().includes('sign_in') || page.url().includes('login')) {
        console.error('  Session expired. Run manual-login.mjs then upload-session.mjs')
        await context.close()
        continue
      }

      try {
        await page.waitForSelector('.chat-item-content, .chat-item-text', { timeout: 20000 })
      } catch {
        console.log('  Chat not visible yet, waiting 15s more...')
        await page.waitForTimeout(15000)
      }

      // Scroll up many times to load full history
      console.log('  Scrolling to load history...')
      for (let i = 0; i < 15; i++) {
        await page.evaluate(() => {
          const el = document.querySelector('[class*="scroll"], [class*="messages"], [class*="chat"]') || document.documentElement
          el.scrollTop = 0
        })
        await page.waitForTimeout(600)
      }
      await page.waitForTimeout(1500)

      const messages = await extractMessages(page)
      await context.close()

      const chatType = chat.chatType || 'general'
      console.log(`  [${chat.key}] Found ${messages.length} messages, syncing to Firestore...`)

      let savedThisChat = 0
      for (const m of messages) {
        const key = messageKey(chatType, m)
        const exists = (await col.doc(key).get()).exists
        if (!exists) {
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
          await col.doc(key).set({
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
          totalSaved++
          savedThisChat++
          console.log('    +', m.message?.substring(0, 60) + (m.message?.length > 60 ? '...' : ''))
        }
      }
      if (messages.length === 0) {
        console.log('    (no messages found - try with --headed)')
      } else {
        console.log(`  Saved ${savedThisChat} new messages from this chat.`)
      }
    } catch (err) {
      console.error(`  [${chat.key}]`, err.message)
      await context.close()
    }
  }

  await browser.close()
  console.log(`\nDone. Total new messages saved: ${totalSaved}`)
  console.log('Run with --headed if you got 0 messages (chat often needs headed browser).')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
