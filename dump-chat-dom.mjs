#!/usr/bin/env node
/**
 * dump-chat-dom.mjs
 * Loads a chat page with saved session and dumps message-related DOM for debugging.
 * Usage: node dump-chat-dom.mjs [url]
 */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { writeFileSync } from 'fs'

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

  // Try multiple selectors - dump outer HTML of message containers
  const selectors = [
    'div.chat-item-content',
    '[class*="chat-item"]',
    '[class*="message"]',
    '[data-timestamp]',
    '.chat-message',
    '[role="listitem"]'
  ]

  const output = []
  for (const sel of selectors) {
    const els = await page.$$(sel)
    output.push(`\n=== Selector: ${sel} (${els.length} found) ===\n`)
    for (let i = 0; i < Math.min(els.length, 5); i++) {
      const html = await els[i].evaluate((el) => el.outerHTML)
      output.push(html.substring(0, 800) + (html.length > 800 ? '...' : ''))
      output.push('\n---\n')
    }
  }

  const outPath = path.join(__dirname, 'dump-chat-dom-output.txt')
  writeFileSync(outPath, output.join('\n'), 'utf8')
  console.log('Dumped to', outPath)

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
