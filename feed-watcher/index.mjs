#!/usr/bin/env node
/**
 * Feed Watcher - Cloud Run Job
 * Runs every 1 min. Polls both feed pages, saves new posts to Firestore feedPosts.
 * Keeps only the 3 most recent posts per feed.
 * Uses same session as chat watcher (chatWatcherSession).
 */
import { chromium } from 'playwright'
import { createHash } from 'crypto'
import admin from 'firebase-admin'

const SESSION_COLLECTION = '_system'
const SESSION_DOC_ID = 'chatWatcherSession'
const POSTS_TO_KEEP_PER_FEED = 3

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
    feedItems.forEach((item) => {
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
      const linkElements = descEl?.querySelectorAll('a[href], [href]') || []
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

async function getSession(db) {
  const doc = await db.collection(SESSION_COLLECTION).doc(SESSION_DOC_ID).get()
  if (!doc.exists) {
    throw new Error('No session in Firestore. Run manual-login.mjs then upload-session.mjs')
  }
  const data = doc.data()
  if (!data?.state) {
    throw new Error('Session document exists but state is empty')
  }
  return typeof data.state === 'string' ? JSON.parse(data.state) : data.state
}

async function pruneOldPosts(db, feedKey) {
  try {
    const col = db.collection('feedPosts')
    const snapshot = await col
      .where('feedKey', '==', feedKey)
      .orderBy('createdAt', 'desc')
      .get()

    const toDelete = snapshot.docs.slice(POSTS_TO_KEEP_PER_FEED)
    for (const d of toDelete) {
      await d.ref.delete()
    }
    if (toDelete.length > 0) {
      console.log(`  Pruned ${toDelete.length} old posts from ${feedKey}`)
    }
  } catch (e) {
    console.error('Prune failed:', e.message)
  }
}

async function pollFeed(browser, feed, db, sessionState) {
  const context = await browser.newContext({ storageState: sessionState })
  const page = await context.newPage()

  try {
    await page.goto(feed.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    const url = page.url()
    if (url.includes('sign_in') || url.includes('login')) {
      await context.close()
      throw new Error('LOGOUT_DETECTED: Session expired.')
    }

    await page.waitForSelector('li.feed-item, a.feed-item-post', { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2000)

    const posts = await extractFeedPosts(page)
    await context.close()

    const col = db.collection('feedPosts')
    let saved = 0

    for (const p of posts) {
      const key = postKey(feed.key, p.postId, p.description)
      const docRef = col.doc(key)
      const exists = (await docRef.get()).exists
      if (!exists) {
        await docRef.set({
          postUrl: p.postUrl,
          postId: p.postId,
          description: p.description || '',
          descriptionHtml: p.descriptionHtml || '',
          links: p.links || [],
          chartLink: p.chartLink || null,
          sourceFeedUrl: feed.url,
          feedKey: feed.key,
          feedType: feed.feedType,
          spaceId: feed.spaceId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        saved++
      }
    }

    await pruneOldPosts(db, feed.key)
    return saved
  } catch (err) {
    await context.close()
    throw err
  }
}

const POSTS_TO_SYNC_TO_TRADE_ALERTS = 3

function descriptionHash(desc) {
  const n = (desc || '').trim().replace(/\s+/g, ' ')
  return createHash('sha256').update(n).digest('hex')
}

/** Description must contain "buy" or "sell" (case-insensitive; matches buys, selling, etc.). */
function descriptionHasBuyOrSell(desc) {
  const lower = (desc || '').toLowerCase()
  return lower.includes('buy') || lower.includes('sell')
}

/**
 * Build a Set of description hashes from existing trade alerts.
 * Duplicate = same description (normalized). Used to avoid posting twice.
 */
async function getExistingTradeAlertDescriptionHashes(db) {
  const snapshot = await db.collection('tradeAlerts')
    .where('type', '==', 'simple')
    .orderBy('createdAt', 'desc')
    .limit(1000)
    .get()
  const hashes = new Set()
  snapshot.forEach((d) => {
    const desc = (d.data().description || '').trim()
    if (desc) hashes.add(descriptionHash(desc))
  })
  return hashes
}

/**
 * Get the 3 most recent feed posts and post each as a trade alert if not a duplicate.
 * Duplicate = same description (normalized). Skips if that description already exists in tradeAlerts.
 */
async function syncLatestFeedPostToTradeAlert(db) {
  try {
    const [feedSnap, existingHashes] = await Promise.all([
      db.collection('feedPosts').orderBy('createdAt', 'desc').limit(POSTS_TO_SYNC_TO_TRADE_ALERTS).get(),
      getExistingTradeAlertDescriptionHashes(db),
    ])

    if (feedSnap.empty) return

    for (const docSnap of feedSnap.docs) {
      const desc = (docSnap.data().description || '').trim()
      if (!desc) continue
      if (!descriptionHasBuyOrSell(desc)) {
        console.log(`  Skipped (no buy/sell): "${desc.substring(0, 50)}${desc.length > 50 ? '...' : ''}"`)
        continue
      }
      if (existingHashes.has(descriptionHash(desc))) continue // duplicate: same description already in trade alerts

      await db.collection('tradeAlerts').add({
        description: desc,
        type: 'simple',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      existingHashes.add(descriptionHash(desc))
      console.log(`  Posted feed post as trade alert: ${docSnap.id}`)
    }
  } catch (e) {
    console.error('  syncLatestFeedPostToTradeAlert failed:', e.message)
  }
}

async function main() {
  if (admin.apps.length === 0) {
    admin.initializeApp()
  }
  const db = admin.firestore()

  const sessionState = await getSession(db)

  const useHeaded = !!process.env.DISPLAY
  const browser = await chromium.launch({
    headless: !useHeaded,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    for (const feed of FEEDS) {
      const count = await pollFeed(browser, feed, db, sessionState)
      if (count > 0) {
        console.log(`[${feed.key}] +${count} new posts`)
      }
    }
  } catch (err) {
    await browser.close()
    const msg = err.message || String(err)
    if (msg.includes('LOGOUT_DETECTED')) {
      console.error('Session expired. Run manual-login.mjs then upload-session.mjs')
      process.exit(1)
    }
    throw err
  } finally {
    await browser.close()
    await syncLatestFeedPostToTradeAlert(db)
    console.log('Done.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
