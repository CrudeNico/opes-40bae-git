#!/usr/bin/env node
/**
 * open-chat.mjs
 * Opens the chat page using the saved Playwright session (./.pw-session)
 * Usage: node open-chat.mjs [url]
 * Default URL: https://app.theprofessortrades.com/spaces/12206623/chat
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
    console.error('No saved session found. Run: node manual-login.mjs')
    process.exit(1)
  }

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    storageState: SESSION_PATH,
    acceptDownloads: true
  })
  const page = await context.newPage()

  console.log('Opening chat:', url)
  await page.goto(url, { waitUntil: 'networkidle' })
  console.log('Browser will stay open. Close it when done.')
  await page.waitForTimeout(60000) // Keep open 60s; user can Ctrl+C
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
