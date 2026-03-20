#!/usr/bin/env node
/**
 * inspect-feed-page.mjs
 * Opens feed pages with your session and dumps the structure + extracts feed posts.
 * Output: ./inspect-feed-output.txt and ./inspect-feed-posts.json
 *
 * Usage:
 *   node inspect-feed-page.mjs
 *   node inspect-feed-page.mjs --headed
 *   node inspect-feed-page.mjs https://app.theprofessortrades.com/spaces/12849168/feed
 */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync, writeFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSION_PATH = path.join(__dirname, '.pw-session', 'state.json')

const FEED_URLS = [
  'https://app.theprofessortrades.com/spaces/12849168/feed',
  'https://app.theprofessortrades.com/spaces/20396883/feed'
]

const HEADED = process.argv.includes('--headed')
const CUSTOM_URL = process.argv.find((a) => a.startsWith('http'))
const URLS_TO_INSPECT = CUSTOM_URL ? [CUSTOM_URL] : FEED_URLS

async function extractFeedPosts(page) {
  return page.evaluate(() => {
    const posts = []
    const feedItems = document.querySelectorAll('li.feed-item')
    feedItems.forEach((item, idx) => {
      const linkEl = item.querySelector('a.feed-item-post')
      if (!linkEl) return

      const href = linkEl.getAttribute('href') || ''
      const postIdMatch = href.match(/\/posts\/(\d+)/)
      const postId = postIdMatch ? postIdMatch[1] : null

      const descEl = linkEl.querySelector('.feed-item-post-description')
      const description = descEl?.innerText?.trim() || descEl?.textContent?.trim() || ''
      const descriptionHtml = descEl?.innerHTML?.trim() || ''

      const links = []
      const linkElements = descEl?.querySelectorAll('a[href], [href]') || []
      linkElements.forEach((a) => {
        const h = a.getAttribute('href')
        if (h && !h.startsWith('javascript:')) {
          links.push({ href: h, text: a.textContent?.trim() || h })
        }
      })
      const chartLink = links.find((l) => l.href.includes('tradingview.com'))?.href ||
        (description.match(/https?:\/\/[^\s]*tradingview\.com[^\s]*/i)?.[0]?.replace(/[.,;:!?)]+$/, '')

      posts.push({
        index: idx,
        postUrl: href.startsWith('http') ? href : `https://app.theprofessortrades.com${href.startsWith('/') ? '' : '/'}${href}`,
        postId,
        description,
        descriptionHtml: descriptionHtml.substring(0, 500),
        links,
        chartLink: chartLink || null,
      })
    })
    return posts
  })
}

async function main() {
  if (!existsSync(SESSION_PATH)) {
    console.error('No session. Run: node manual-login.mjs')
    process.exit(1)
  }

  const browser = await chromium.launch({ headless: !HEADED, args: ['--no-sandbox'] })
  const context = await browser.newContext({ storageState: SESSION_PATH })
  const page = await context.newPage()

  const allPosts = []
  const lines = []

  for (const url of URLS_TO_INSPECT) {
    console.log('Loading:', url, HEADED ? '(headed)' : '')
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(5000)

    const currentUrl = page.url()
    if (currentUrl.includes('sign_in') || currentUrl.includes('login')) {
      console.error('  Redirected to login - session expired. Run manual-login.mjs again.')
      continue
    }

    const spaceId = url.match(/spaces\/(\d+)/)?.[1] || 'unknown'
    const posts = await extractFeedPosts(page)

    lines.push(`\n=== ${url} ===`)
    lines.push(`Space ID: ${spaceId}`)
    lines.push(`Found ${posts.length} feed items\n`)

    posts.forEach((p, i) => {
      lines.push(`--- Post ${i + 1} ---`)
      lines.push(`Post URL: ${p.postUrl}`)
      lines.push(`Post ID: ${p.postId}`)
      lines.push(`Description: ${p.description.substring(0, 200)}${p.description.length > 200 ? '...' : ''}`)
      p.links.forEach((l) => lines.push(`  Link: ${l.href}`))
      lines.push('')

      allPosts.push({ ...p, sourceUrl: url, spaceId })
    })
  }

  await browser.close()

  const outPath = path.join(__dirname, 'inspect-feed-output.txt')
  writeFileSync(outPath, lines.join('\n'), 'utf8')
  console.log('\nStructure saved: inspect-feed-output.txt')

  const jsonPath = path.join(__dirname, 'inspect-feed-posts.json')
  writeFileSync(jsonPath, JSON.stringify(allPosts, null, 2), 'utf8')
  console.log('Posts JSON saved: inspect-feed-posts.json')

  console.log('\n--- Summary ---')
  console.log(`Total posts extracted: ${allPosts.length}`)
  allPosts.slice(0, 3).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.description?.substring(0, 60)}...`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
