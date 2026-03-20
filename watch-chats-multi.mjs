#!/usr/bin/env node
/**
 * watch-chats-multi.mjs
 * Watches BOTH chat URLs every 15s, extracts new messages, appends to JSONL files.
 * Output: ./chat-watch-new-messages-spaces-12206623.jsonl, ./chat-watch-new-messages-chats-23098072.jsonl
 * State: ./.chat-watch-state-spaces-12206623.json, ./.chat-watch-state-chats-23098072.json
 */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs'
import { createHash } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSION_PATH = path.join(__dirname, '.pw-session', 'state.json')

const CHATS = [
  {
    key: 'spaces-12206623',
    url: 'https://app.theprofessortrades.com/spaces/12206623/chat'
  },
  {
    key: 'chats-23098072',
    url: 'https://app.theprofessortrades.com/chats/23098072'
  }
]

function messageKey(msg) {
  const str = `${msg.dataTimestamp}-${msg.author}-${msg.message}`
  return createHash('sha256').update(str).digest('hex').substring(0, 32)
}

function getStatePath(key) {
  return path.join(__dirname, `.chat-watch-state-${key}.json`)
}

function getOutputPath(key) {
  return path.join(__dirname, `chat-watch-new-messages-${key}.jsonl`)
}

function loadState(key) {
  const p = getStatePath(key)
  if (!existsSync(p)) return { lastSeenMs: 0, seenKeys: {} }
  const data = JSON.parse(readFileSync(p, 'utf8'))
  return { lastSeenMs: data.lastSeenMs || 0, seenKeys: data.seenKeys || {} }
}

function saveState(key, lastSeenMs, seenKeys) {
  writeFileSync(
    getStatePath(key),
    JSON.stringify({ lastSeenMs, seenKeys }, null, 2),
    'utf8'
  )
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
      arr.push({ dataTimestamp, author, message: text, imageUrl: img?.src || null })
    })
    return arr
  })
}

async function pollChat(browser, chat, state) {
  const context = await browser.newContext({ storageState: SESSION_PATH })
  const page = await context.newPage()
  try {
    await page.goto(chat.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

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

    const { lastSeenMs, seenKeys } = state
    const newMessages = messages
      .filter((m) => m.dataTimestamp > lastSeenMs)
      .filter((m) => !seenKeys[messageKey(m)])

    let maxTs = lastSeenMs
    const outputPath = getOutputPath(chat.key)
    for (const m of newMessages) {
      const key = messageKey(m)
      state.seenKeys[key] = true
      if (m.dataTimestamp > maxTs) maxTs = m.dataTimestamp
      appendFileSync(outputPath, JSON.stringify({ ...m, messageKey: key }) + '\n', 'utf8')
    }
    if (maxTs > lastSeenMs) state.lastSeenMs = maxTs
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

  const browser = await chromium.launch({ headless: true })
  const states = {}
  for (const chat of CHATS) {
    states[chat.key] = loadState(chat.key)
  }

  console.log('Watching chats every 15s. Ctrl+C to stop.')
  const run = async () => {
    for (const chat of CHATS) {
      try {
        const count = await pollChat(browser, chat, states[chat.key])
        if (count > 0) console.log(`[${chat.key}] +${count} new messages`)
      } catch (err) {
        console.error(`[${chat.key}]`, err.message)
      }
    }
    setTimeout(run, 15000)
  }
  await run()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
