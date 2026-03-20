#!/usr/bin/env node
/**
 * manual-login.mjs
 * Opens https://app.theprofessortrades.com/sign_in in a headed browser so you can log in manually.
 * Session is saved to ./.pw-session for use by open-chat.mjs and watch-chats-multi*.mjs
 */
import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSION_DIR = path.join(__dirname, '.pw-session')
const SIGN_IN_URL = 'https://app.theprofessortrades.com/sign_in'

async function main() {
  if (!existsSync(SESSION_DIR)) {
    await mkdir(SESSION_DIR, { recursive: true })
  }

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({ acceptDownloads: true })
  const page = await context.newPage()

  console.log('Opening sign-in page. Log in manually in the browser.')
  console.log('When you are logged in, press ENTER in this terminal to save the session and close.')
  await page.goto(SIGN_IN_URL, { waitUntil: 'networkidle' })

  // Wait for user to press Enter (they log in in the browser first)
  await new Promise((resolve) => {
    process.stdin.once('data', () => resolve())
  })

  await context.storageState({ path: path.join(SESSION_DIR, 'state.json') })
  console.log('Session saved to .pw-session/state.json')
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
