#!/usr/bin/env node
/**
 * extract-chat-last-5.mjs
 * Loads chat history (scrolls to trigger lazy-load), extracts last 5 messages.
 * Confirms we can reliably get message content + ordering via span.chat-timestamp[data-timestamp].
 */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSION_PATH = path.join(__dirname, '.pw-session', 'state.json')
const DEFAULT_CHAT_URL = 'https://app.theprofessortrades.com/spaces/12206623/chat'

async function main() {
  const url = process.argv[2] || DEFAULT_CHAT_URL

  if (!existsSync(SESSION_PATH)) {
    console.error('No saved session. Run: node manual-login.mjs')
    process.exit(1)
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: SESSION_PATH })
  const page = await context.newPage()

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // Scroll up to trigger history load
  const scrollable = await page.$('[class*="scroll"], [class*="messages"], [class*="chat"]')
  const scrollTarget = scrollable || page
  for (let i = 0; i < 5; i++) {
    await scrollTarget.evaluate((el) => {
      if (el.tagName === 'BODY') el = document.documentElement
      el.scrollTop = 0
    })
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(1000)

  const messages = await page.evaluate(() => {
    const items = document.querySelectorAll('div.chat-item-content, [class*="chat-item-content"], [class*="message-item"]')
    const arr = []
    items.forEach((el) => {
      const tsEl = el.querySelector('span.chat-timestamp[data-timestamp], [data-timestamp], [class*="timestamp"]')
      const dataTs = tsEl?.getAttribute?.('data-timestamp') || el.getAttribute?.('data-timestamp')
      const textEl = el.querySelector('[class*="message"], [class*="content"], [class*="text"]')
      const text = (textEl || el).innerText?.trim() || ''
      const img = el.querySelector('img')
      const authorEl = el.querySelector('[class*="author"], [class*="user"], [class*="name"]')
      const author = authorEl?.innerText?.trim() || ''
      if (text || img || dataTs) {
        arr.push({
          dataTimestamp: dataTs ? parseInt(dataTs, 10) : null,
          author,
          message: text,
          imageUrl: img?.src || null
        })
      }
    })
    return arr
  })

  // Sort by timestamp ascending, take last 5
  const sorted = messages
    .filter((m) => m.dataTimestamp != null)
    .sort((a, b) => a.dataTimestamp - b.dataTimestamp)
  const last5 = sorted.slice(-5)

  console.log(JSON.stringify(last5, null, 2))

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
