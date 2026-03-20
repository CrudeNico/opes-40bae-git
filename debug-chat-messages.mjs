#!/usr/bin/env node
/**
 * debug-chat-messages.mjs
 * Extracts and prints message structure from the chat page.
 * Helps figure out the real message element + how timestamps appear in the DOM.
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
  await page.waitForTimeout(3000)

  const messages = await page.evaluate(() => {
    const results = []
    // Try div.chat-item-content (from user spec) or common patterns
    const items = document.querySelectorAll('div.chat-item-content, [class*="chat-item"], [class*="message-item"]')
    items.forEach((el, i) => {
      const ts = el.querySelector('[data-timestamp], span.chat-timestamp, [class*="timestamp"]')
      const text = el.innerText?.trim().substring(0, 200)
      const dataTimestamp = ts?.getAttribute?.('data-timestamp')
      results.push({
        index: i,
        dataTimestamp: dataTimestamp || null,
        textPreview: text || null,
        tagName: el.tagName,
        className: el.className
      })
    })
    return results
  })

  console.log(JSON.stringify(messages, null, 2))

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
