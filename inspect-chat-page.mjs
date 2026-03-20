#!/usr/bin/env node
/**
 * inspect-chat-page.mjs
 * Opens a chat page with your session and dumps the structure so we can find the right selectors.
 * Output: ./inspect-chat-output.txt and ./inspect-chat-screenshot.png
 */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { writeFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSION_PATH = path.join(__dirname, '.pw-session', 'state.json')
const URL = process.argv[2] || 'https://app.theprofessortrades.com/spaces/12206623/chat'
const HEADED = process.argv.includes('--headed')

async function main() {
  if (!existsSync(SESSION_PATH)) {
    console.error('No session. Run: node manual-login.mjs')
    process.exit(1)
  }

  const browser = await chromium.launch({ headless: !HEADED, args: ['--no-sandbox'] })
  const context = await browser.newContext({ storageState: SESSION_PATH })
  const page = await context.newPage()

  console.log('Loading:', URL, HEADED ? '(headed - you can watch)' : '')
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(8000)

  const url = page.url()
  if (url.includes('sign_in') || url.includes('login')) {
    console.error('Redirected to login - session expired. Run manual-login.mjs again.')
    await browser.close()
    process.exit(1)
  }

  await page.screenshot({ path: path.join(__dirname, 'inspect-chat-screenshot.png') })
  console.log('Screenshot saved: inspect-chat-screenshot.png')

  const info = await page.evaluate(() => {
    const lines = []
    lines.push('=== URL ===')
    lines.push(window.location.href)
    lines.push('')
    lines.push('=== Page title ===')
    lines.push(document.title)
    lines.push('')
    lines.push('=== iframes ===')
    const iframes = document.querySelectorAll('iframe')
    lines.push(`Found: ${iframes.length}`)
    iframes.forEach((f, i) => lines.push(`  [${i}] src=${f.src || '(none)'}`))
    lines.push('')
    lines.push('=== All unique classes on page (first 80) ===')
    const allClasses = [...new Set(
      Array.from(document.querySelectorAll('[class]')).flatMap((el) => String(el.className).split(/\s+/).filter(Boolean))
    )].sort()
    lines.push(allClasses.slice(0, 80).join(', '))
    lines.push('')
    lines.push('=== body innerHTML (first 3000 chars) ===')
    lines.push(document.body?.innerHTML?.substring(0, 3000) || '(empty)')
    lines.push('')
    lines.push('=== chat-item-text ===')
    const textEls = document.querySelectorAll('.chat-item-text, [class*="chat-item"]')
    lines.push(`Found: ${textEls.length}`)
    return lines.join('\n')
  })

  const outPath = path.join(__dirname, 'inspect-chat-output.txt')
  writeFileSync(outPath, info, 'utf8')
  console.log('Structure saved: inspect-chat-output.txt')

  console.log('\n--- Preview ---\n' + info.substring(0, 2000))
  if (info.length > 2000) console.log('\n... (see inspect-chat-output.txt for full output)')

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
