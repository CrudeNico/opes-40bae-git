#!/usr/bin/env node
/**
 * One-off: rebuild August partner monthly ledger rows from Partner Management net profit.
 * Growth = partnerNet; ending = start + growth + deposits − withdrawals
 * (unless endingBalanceOverride is set — then ending is preserved).
 *
 * Usage: node re-sync-partners-august.mjs
 */
import { existsSync, readFileSync, readdirSync, unlinkSync } from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import admin from 'firebase-admin'
import * as esbuild from 'esbuild'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function initFirebase() {
  if (admin.apps.length > 0) return
  const credPath = path.join(__dirname, 'serviceAccountKey.json')
  const envCred = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const firebaseKeys = readdirSync(__dirname, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name.endsWith('.json') && f.name.includes('firebase-adminsdk'))
    .map((f) => path.join(__dirname, f.name))

  let credObj
  if (envCred && existsSync(envCred)) {
    credObj = JSON.parse(readFileSync(envCred, 'utf8'))
  } else if (existsSync(credPath)) {
    credObj = JSON.parse(readFileSync(credPath, 'utf8'))
  } else if (firebaseKeys[0]) {
    credObj = JSON.parse(readFileSync(firebaseKeys[0], 'utf8'))
  } else {
    console.error('Firebase credentials required.')
    process.exit(1)
  }
  admin.initializeApp({ credential: admin.credential.cert(credObj) })
}

async function loadBundledModules() {
  const outfile = path.join(__dirname, '.tmp-partner-sync-bundle.mjs')
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/utils/partnerMonthlyAutoSync.js')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    // Stub browser/firebase deps — we only need pure applyPartnerAutoSyncToInvestmentData
    // and computePartnerMonthFinancials (loaded separately).
    plugins: [
      {
        name: 'stub-firebase-and-jsx',
        setup(build) {
          build.onResolve({ filter: /^(firebase|firebase\/.*)$/ }, () => ({
            path: 'firebase-stub',
            namespace: 'stub'
          }))
          build.onResolve({ filter: /admin3Overrides$/, }, () => ({
            path: 'admin3-stub',
            namespace: 'stub'
          }))
          build.onResolve({ filter: /AdminPortfolio$/, }, () => ({
            path: 'admin-portfolio-stub',
            namespace: 'stub'
          }))
          build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => {
            if (args.path === 'firebase-stub') {
              return {
                contents: `
              export const doc = () => ({})
              export const getDoc = async () => ({ exists: () => false, data: () => ({}) })
              export const updateDoc = async () => {}
              export const getFirestore = () => ({})
              export const collection = () => ({})
              export const getDocs = async () => ({ forEach: () => {} })
            `,
                loader: 'js'
              }
            }
            if (args.path === 'admin3-stub') {
              return {
                contents: `
              export async function saveAdmin3UserOverride() {}
              export async function getAdmin3Overrides() { return {} }
              export async function getAdmin3DailyPerformanceOverrides() { return {} }
              export function admin3DailyPerformanceMonthKey() { return '' }
            `,
                loader: 'js'
              }
            }
            if (args.path === 'admin-portfolio-stub') {
              return {
                contents: `export function generateAdmin3PortfolioData() { return { monthlyHistory: [] } }`,
                loader: 'js'
              }
            }
            return null
          })
        }
      }
    ]
  })

  const monthOut = path.join(__dirname, '.tmp-partner-month-bundle.mjs')
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/utils/partnerManagementMonth.js')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: monthOut
  })

  const dualOut = path.join(__dirname, '.tmp-investor-dual-bundle.mjs')
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/utils/investorDualTranche.js')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: dualOut
  })

  const syncMod = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`)
  const monthMod = await import(pathToFileURL(monthOut).href + `?t=${Date.now()}`)
  const dualMod = await import(pathToFileURL(dualOut).href + `?t=${Date.now()}`)

  const cleanup = () => {
    for (const f of [outfile, monthOut, dualOut]) {
      try {
        unlinkSync(f)
      } catch {
        /* ignore */
      }
    }
  }

  return { syncMod, monthMod, dualMod, cleanup }
}

function resolveStatuses(userData) {
  let statuses = userData?.statuses || []
  if (statuses.length === 0 && Array.isArray(userData?.isAdmin) && userData.isAdmin.length > 0) {
    statuses = userData.isAdmin
  }
  if (statuses.length === 0 && userData?.isAdmin === true) {
    statuses = ['Admin']
  }
  return statuses
}

function isPartnerUser(inv) {
  return resolveStatuses(inv).includes('Partner')
}

async function main() {
  initFirebase()
  const db = admin.firestore()
  const monthName = 'August'
  const year = 2026

  console.log(`Loading users and August ${year} daily performance…`)

  const usersSnap = await db.collection('users').get()
  const investors = []
  let adminOwnerId = null

  usersSnap.forEach((docSnap) => {
    const data = docSnap.data() || {}
    const statuses = resolveStatuses(data)
    const investmentData = data.investmentData || null
    const row = {
      id: docSnap.id,
      ...data,
      statuses,
      investmentData,
      managedInvestorIds: Array.isArray(data.managedInvestorIds) ? data.managedInvestorIds : [],
      displayName: data.displayName || '',
      email: data.email || ''
    }

    if (
      statuses.includes('Admin') &&
      !statuses.includes('Admin 2') &&
      !statuses.includes('Admin 3') &&
      !statuses.includes('Relations')
    ) {
      adminOwnerId = docSnap.id
    }

    if (
      (statuses.includes('Investor') || statuses.includes('Trader')) &&
      investmentData &&
      investmentData.status === 'approved'
    ) {
      investors.push(row)
    }
  })

  if (!adminOwnerId) {
    console.error('Could not find main Admin user for daily performance owner.')
    process.exit(1)
  }

  const partners = investors.filter(
    (inv) => isPartnerUser(inv) && inv?.investmentData?.status === 'approved'
  )
  console.log(`Found ${partners.length} partners, ${investors.length} approved accounts. Owner=${adminOwnerId}`)

  const perfDocId = `dailyPerformance_${adminOwnerId}_${year}_${monthName}`
  const perfSnap = await db.collection('adminDailyPerformance').doc(perfDocId).get()
  const dailyPerformances = perfSnap.exists ? perfSnap.data()?.performances || {} : {}
  const dayCount = Object.keys(dailyPerformances).length
  console.log(`Daily performance doc ${perfDocId}: ${dayCount} day(s)`)

  const { syncMod, monthMod, dualMod, cleanup } = await loadBundledModules()
  const { applyPartnerAutoSyncToInvestmentData, findPartnerMonthRecordIndex } = syncMod
  const { computePartnerMonthFinancials } = monthMod
  const { getAdminInvestorSummaryCurrentBalance } = dualMod

  const getBalance = (inv) => getAdminInvestorSummaryCurrentBalance(inv?.investmentData)

  let updated = 0
  for (const partner of partners) {
    const financials = computePartnerMonthFinancials({
      selectedPartnerId: partner.id,
      partners,
      investors,
      dailyPerformances,
      getBalance,
      monthName,
      year,
      isPartnerUser
    })

    const partnerNet = financials.partnerNet
    const name = partner.displayName || partner.email || partner.id

    const updatedInvestmentData = applyPartnerAutoSyncToInvestmentData(
      partner.investmentData,
      monthName,
      year,
      partnerNet
    )

    if (!updatedInvestmentData) {
      console.log(`  skip ${name}: no update produced`)
      continue
    }

    const idx = findPartnerMonthRecordIndex(updatedInvestmentData.monthlyHistory, monthName, year)
    const row = idx >= 0 ? updatedInvestmentData.monthlyHistory[idx] : null

    await db.collection('users').doc(partner.id).update({
      investmentData: updatedInvestmentData,
      updatedAt: new Date().toISOString()
    })

    updated += 1
    console.log(
      `  ✓ ${name}: net/growth=${partnerNet.toFixed(2)}  ` +
        `start=${Number(row?.startingBalance || 0).toFixed(2)}  ` +
        `ending=${Number(row?.endingBalance || 0).toFixed(2)}  ` +
        `pct=${Number(row?.percentageGrowth || 0).toFixed(2)}%` +
        (row?.endingBalanceOverride ? '  [manual ending kept]' : '')
    )
  }

  cleanup()
  console.log(`\nDone. Updated ${updated}/${partners.length} partners for ${monthName} ${year}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
