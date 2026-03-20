#!/usr/bin/env node
/**
 * sync-feed-posts.mjs
 * Fetches feed posts from The Professor Trades feed pages and saves them.
 * Run internally first (--json) to verify extraction, then use --firestore to push to cloud.
 *
 * Usage:
 *   node sync-feed-posts.mjs              # saves to ./feed-posts-output.json (internal)
 *   node sync-feed-posts.mjs --json       # same, explicit JSON output
 *   node sync-feed-posts.mjs --firestore  # saves to Firestore feedPosts collection
 *   node sync-feed-posts.mjs --headed     # use browser with UI (recommended for full load)
 */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'
import admin from 'firebase-admin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSION_PATH = path.join(__dirname, '.pw-session', 'state.json')
const HEADED = process.argv.includes('--headed')
const USE_FIRESTORE = process.argv.includes('--firestore')
const USE_JSON = process.argv.includes('--json') || !USE_FIRESTORE

const FEEDS = [
  { key: 'spaces-12849168', spaceId: '12849168', feedType: 'feed-1', url: 'https://app.theprofessortrades.com/spaces/12849168/feed' },
  { key: 'spaces-20396883', spaceId: '20396883', feedType: 'feed-2', url: 'https://app.theprofessortrades.com/spaces/20396883/feed' },
]

function postKey(feedKey, postId, description) {
  const str = `${feedKey}-${postId}-${(description || '').substring(0, 100)}`
  return createHash('sha256').update(str).digest('hex').substring(0, 32)
}

async function extractFeedPosts(page) {
  return page.evaluate(() => {
    const posts = []
    const feedItems = document.querySelectorAll('li.feed-item')
    feedItems.forEach((item, idx) => {
      const linkEl = item.querySelector('a.feed-item-post')
      if (!linkEl) return

      const href = linkEl.getAttribute('href') || ''
      const fullUrl = href.startsWith('http') ? href : `https://app.theprofessortrades.com${href.startsWith('/') ? '' : '/'}${href}`
      const postIdMatch = href.match(/\/posts\/(\d+)/)
      const postId = postIdMatch ? postIdMatch[1] : null

      const descEl = linkEl.querySelector('.feed-item-post-description')
      const description = descEl?.innerText?.trim() || descEl?.textContent?.trim() || ''
      const descriptionHtml = descEl?.innerHTML?.trim() || ''

      const links = []
      const linkElements = descEl?.querySelectorAll('a[href]') || []
      linkElements.forEach((a) => {
        const h = a.getAttribute('href')
        if (h && !h.startsWith('javascript:')) {
          links.push({ href: h, text: a.textContent?.trim() || h })
        }
      })

      let chartLink = links.find((l) => l.href.includes('tradingview.com'))?.href || null
      if (!chartLink && description) {
        const tvMatch = description.match(/https?:\/\/[^\s]*tradingview\.com[^\s]*/i)
        if (tvMatch) chartLink = tvMatch[0].replace(/[.,;:!?)]+$/, '')
      }

      if (description || links.length > 0) {
        posts.push({
          postUrl: fullUrl,
          postId,
          description,
          descriptionHtml: descriptionHtml.substring(0, 2000),
          links,
          chartLink,
        })
      }
    })
    return posts
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
      console.error('Firebase credentials required for --firestore.')
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

  const db = USE_FIRESTORE ? initFirebase() : null
  const browser = await chromium.launch({ headless: !HEADED, args: ['--no-sandbox'] })
  const context = await browser.newContext({ storageState: SESSION_PATH })
  const page = await context.newPage()

  const allPosts = []

  for (const feed of FEEDS) {
    console.log(`Loading ${feed.url} ...`)
    try {
      await page.goto(feed.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(4000)

      const currentUrl = page.url()
      if (currentUrl.includes('sign_in') || currentUrl.includes('login')) {
        console.error('  Session expired. Run manual-login.mjs')
        continue
      }

      await page.waitForSelector('li.feed-item, a.feed-item-post', { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(2000)

      const posts = await extractFeedPosts(page)
      console.log(`  Found ${posts.length} posts`)

      for (const p of posts) {
        const key = postKey(feed.key, p.postId, p.description)
        const record = {
          ...p,
          sourceFeedUrl: feed.url,
          feedKey: feed.key,
          feedType: feed.feedType,
          spaceId: feed.spaceId,
        }

        if (USE_FIRESTORE) {
          const col = db.collection('feedPosts')
          const docRef = col.doc(key)
          const exists = (await docRef.get()).exists
          if (!exists) {
            await docRef.set({
              ...record,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            })
            console.log(`    + New: ${p.description?.substring(0, 50)}...`)
          }
        }

        allPosts.push(record)
      }
    } catch (err) {
      console.error(`  Error: ${err.message}`)
    }
  }

  await context.close()
  await browser.close()

  if (USE_JSON) {
    const outPath = path.join(__dirname, 'feed-posts-output.json')
    writeFileSync(outPath, JSON.stringify(allPosts, null, 2), 'utf8')
    console.log(`\nSaved ${allPosts.length} posts to feed-posts-output.json`)
  }

  if (USE_FIRESTORE) {
    console.log('\nDone. Posts saved to Firestore feedPosts collection.')
  }

  console.log(`\nTotal extracted: ${allPosts.length}`)
  if (allPosts.length > 0) {
    console.log('Sample:', allPosts[0].description?.substring(0, 80) + '...')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
