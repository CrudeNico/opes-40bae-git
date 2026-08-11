import React, { useState, useEffect, useId, useRef, useCallback } from 'react'
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore'
import { getAdmin3Overrides, saveAdmin3UserOverride } from '../utils/admin3Overrides'
import {
  getAdminInvestorSummaryCurrentBalance,
  getInvestorCombinedInitial,
  getLastTrancheEnding,
  TRANCHE_PRIMARY,
  TRANCHE_SECONDARY
} from '../utils/investorDualTranche'
import {
  isExcludedFromInvestorOverviewTotal,
  isPartnerUserForOverview,
  sumInvestorOverviewMonthlyTargets
} from '../utils/adminInvestorOverviewTotal'
import {
  ensureAdminPortfolioDataMigrated,
  resolveAdminPortfolioData,
  resolveAdminPortfolioDataWithLegacyFallback
} from '../utils/adminPortfolioData'
import './AdminPortfolio.css'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const PIE_SLICE_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#ef4444', '#84cc16']

function portfolioMonthYearKey(month, year) {
  const y = parseInt(String(year), 10)
  return `${month || ''}|${Number.isFinite(y) ? y : ''}`
}

function portfolioHistoryHasDuplicate(history, month, year, excludeIndex = -1) {
  if (!month || !String(year ?? '').trim()) return false
  const key = portfolioMonthYearKey(month, year)
  return (history || []).some(
    (record, index) =>
      index !== excludeIndex && portfolioMonthYearKey(record.month, record.year) === key
  )
}

function sortPortfolioMonthlyHistory(history) {
  return [...(history || [])].sort((a, b) => {
    const yearA = parseInt(String(a.year), 10) || 0
    const yearB = parseInt(String(b.year), 10) || 0
    if (yearA !== yearB) return yearA - yearB
    return MONTH_NAMES.indexOf(a.month || '') - MONTH_NAMES.indexOf(b.month || '')
  })
}

function getPortfolioDaysInMonth(month, year) {
  const monthIndex = MONTH_NAMES.indexOf(month)
  return new Date(parseInt(String(year), 10), monthIndex + 1, 0).getDate()
}

function calculatePortfolioProratedGrowth(amount, percentageGrowth, date, month, year) {
  if (!date || !month || !year || amount === 0) return 0
  const depositDate = new Date(date)
  const dayOfMonth = depositDate.getDate()
  const daysInMonth = getPortfolioDaysInMonth(month, year)
  let daysRemaining = daysInMonth - dayOfMonth + 1
  if (dayOfMonth === daysInMonth) daysRemaining = 0
  return amount * (percentageGrowth / 100) * (daysRemaining / daysInMonth)
}

function calculatePortfolioWithdrawalGrowthLoss(amount, percentageGrowth, date, month, year) {
  if (!date || !month || !year || amount === 0) return 0
  const withdrawalDate = new Date(date)
  const dayOfMonth = withdrawalDate.getDate()
  const daysInMonth = getPortfolioDaysInMonth(month, year)
  const daysRemaining = daysInMonth - dayOfMonth
  return amount * (percentageGrowth / 100) * (daysRemaining / daysInMonth)
}

function recalculatePortfolioMonthlyHistory(history, initialInvestment, options = {}) {
  const { preserveExactEndingBalances = false } = options
  const sortedHistory = sortPortfolioMonthlyHistory(history)
  let runningBalance = initialInvestment || 0

  return sortedHistory.map((record) => {
    const normalizedRecordDepositEntries = (record.depositEntries || [])
      .map((entry) => ({ amount: Number(entry?.amount) || 0, date: entry?.date || null }))
      .filter((entry) => entry.amount > 0 || entry.date)
    const normalizedRecordWithdrawalEntries = (record.withdrawalEntries || [])
      .map((entry) => ({ amount: Number(entry?.amount) || 0, date: entry?.date || null }))
      .filter((entry) => entry.amount > 0 || entry.date)
    const fallbackDepositEntries = normalizedRecordDepositEntries.length > 0
      ? normalizedRecordDepositEntries
      : [{ amount: Number(record.depositAmount) || 0, date: record.depositDate || null }]
    const fallbackWithdrawalEntries = normalizedRecordWithdrawalEntries.length > 0
      ? normalizedRecordWithdrawalEntries
      : [{ amount: Number(record.withdrawalAmount) || 0, date: record.withdrawalDate || null }]

    const recordDepositAmount = fallbackDepositEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0)
    const recordWithdrawalAmount = fallbackWithdrawalEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0)

    if (preserveExactEndingBalances) {
      const recordStartingBalance = runningBalance
      const growthAmount = Number(record.growthAmount) || 0
      const depositGrowth = Number(record.depositGrowth) || 0
      const withdrawalGrowth = Number(record.withdrawalGrowth) || 0
      const storedEnding = Number(record.endingBalance)
      const endingBalance = Number.isFinite(storedEnding)
        ? storedEnding
        : recordStartingBalance +
          growthAmount +
          recordDepositAmount +
          depositGrowth -
          recordWithdrawalAmount -
          withdrawalGrowth

      runningBalance = endingBalance

      return {
        ...record,
        startingBalance: recordStartingBalance,
        growthAmount,
        percentageGrowth: record.percentageGrowth,
        endingBalance,
        depositGrowth,
        withdrawalGrowth,
        depositAmount: recordDepositAmount,
        withdrawalAmount: recordWithdrawalAmount,
        depositDate: fallbackDepositEntries[0]?.date || null,
        withdrawalDate: fallbackWithdrawalEntries[0]?.date || null,
        depositEntries: fallbackDepositEntries,
        withdrawalEntries: fallbackWithdrawalEntries,
        exactEndingBalance: true,
        updatedAt: record.updatedAt || new Date().toISOString()
      }
    }

    const recordPercentageGrowth = record.percentageGrowth || 0
    const recordGrowthAmount = runningBalance * (recordPercentageGrowth / 100)

    const recordDepositGrowth = fallbackDepositEntries.reduce(
      (sum, entry) =>
        sum +
        calculatePortfolioProratedGrowth(
          entry.amount,
          recordPercentageGrowth,
          entry.date,
          record.month,
          record.year
        ),
      0
    )

    const recordWithdrawalGrowth = fallbackWithdrawalEntries.reduce(
      (sum, entry) =>
        sum +
        calculatePortfolioWithdrawalGrowthLoss(
          entry.amount,
          recordPercentageGrowth,
          entry.date,
          record.month,
          record.year
        ),
      0
    )

    const recordStartingBalance = runningBalance
    runningBalance =
      runningBalance +
      recordGrowthAmount +
      recordDepositAmount +
      recordDepositGrowth -
      recordWithdrawalAmount -
      recordWithdrawalGrowth

    return {
      ...record,
      startingBalance: recordStartingBalance,
      growthAmount: recordGrowthAmount,
      endingBalance: runningBalance,
      depositGrowth: recordDepositGrowth,
      withdrawalGrowth: recordWithdrawalGrowth,
      depositAmount: recordDepositAmount,
      withdrawalAmount: recordWithdrawalAmount,
      depositDate: fallbackDepositEntries[0]?.date || null,
      withdrawalDate: fallbackWithdrawalEntries[0]?.date || null,
      depositEntries: fallbackDepositEntries,
      withdrawalEntries: fallbackWithdrawalEntries,
      updatedAt: record.updatedAt || new Date().toISOString()
    }
  })
}

function sumPortfolioCashflowTotals(history, initialInvestment) {
  let totalDeposits = initialInvestment || 0
  let totalWithdrawals = 0
  ;(history || []).forEach((record) => {
    totalDeposits += record.depositAmount || 0
    totalWithdrawals += record.withdrawalAmount || 0
  })
  const currentBalance =
    history?.length > 0 ? history[history.length - 1].endingBalance : initialInvestment || 0
  return { totalDeposits, totalWithdrawals, currentBalance }
}

const isClaraPayoutInvestor = (email, displayName) => {
  const em = String(email || '').toLowerCase()
  const nm = String(displayName || '').toLowerCase()
  return em.includes('clara') || nm.includes('clara perez ramirez') || nm.includes('clara perez')
}

const hasSecondaryTrancheForTarget = (investmentData) => {
  const s = Number(investmentData?.secondaryInvestment?.initialInvestment)
  return Number.isFinite(s) && s > 0
}

const getPreviousMonthContext = (referenceDate = new Date()) => {
  const d = new Date(referenceDate)
  d.setMonth(d.getMonth() - 1)
  return { monthName: MONTH_NAMES[d.getMonth()], year: d.getFullYear() }
}

const monthlyHistoryRecordsForMonth = (monthlyHistory, monthName, year) =>
  (monthlyHistory || []).filter((r) => r.month === monthName && parseInt(String(r.year), 10) === year)

const payoutFromPreviousMonthRecords = (records) => {
  let sum = 0
  let hasValue = false
  for (const r of records) {
    const eb = Number(r.endingBalance)
    const pg = Number(r.percentageGrowth)
    if (!Number.isFinite(eb) || !Number.isFinite(pg)) continue
    sum += eb * (pg / 100)
    hasValue = true
  }
  return hasValue ? sum : null
}

const monthlyTargetAndRateForPayout = (investmentData, email, displayName, prevCtx) => {
  if (!investmentData) return 0
  const prevRecords = monthlyHistoryRecordsForMonth(investmentData.monthlyHistory, prevCtx.monthName, prevCtx.year)
  const fromHistory = payoutFromPreviousMonthRecords(prevRecords)
  if (fromHistory != null) return fromHistory

  if (isClaraPayoutInvestor(email, displayName)) {
    const combined = getAdminInvestorSummaryCurrentBalance(investmentData)
    return combined * 0.03
  }

  if (hasSecondaryTrancheForTarget(investmentData)) {
    const mh = investmentData.monthlyHistory || []
    const pInit = Number(investmentData.initialInvestment) || 0
    const sInit = Number(investmentData.secondaryInvestment?.initialInvestment) || 0
    const primaryBal = getLastTrancheEnding(mh, TRANCHE_PRIMARY, pInit)
    const secondaryBal = getLastTrancheEnding(mh, TRANCHE_SECONDARY, sInit)
    return primaryBal * 0.02 + secondaryBal * 0.04
  }

  const balance = getAdminInvestorSummaryCurrentBalance(investmentData)
  const rate =
    investmentData.monthlyReturnRate != null && Number.isFinite(Number(investmentData.monthlyReturnRate))
      ? Number(investmentData.monthlyReturnRate)
      : investmentData.riskTolerance === 'conservative'
        ? 0.02
        : 0.04
  return balance * rate
}

const polarToCartesian = (cx, cy, r, deg) => {
  const rad = (deg - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

const pieSlicePath = (cx, cy, r, startDeg, endDeg) => {
  if (endDeg - startDeg >= 359.999) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
  }
  const start = polarToCartesian(cx, cy, r, endDeg)
  const end = polarToCartesian(cx, cy, r, startDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
}

function formatCompact(num) {
  if (num >= 1e6) return `€${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) {
    const k = num / 1e3
    return `€${k.toFixed(1)}k`.replace('.0k', 'k')
  }
  return `€${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Graph line labels & y-axis: whole € below 1k; €Nk / €NM with rounded thousands / millions (no decimals). */
function formatGraphMoneyRounded(num) {
  const n = Math.max(0, Number(num) || 0)
  if (n >= 1e6) return `€${Math.round(n / 1e6)}M`
  if (n >= 1e3) {
    const k = Math.round(n / 1000)
    if (k >= 1000) return `€${Math.round(n / 1e6)}M`
    return `€${k}k`
  }
  return `€${Math.round(n)}`
}

/** Nudge amount labels so they do not sit on the SVG curve (side + above/below). */
function getGraphAmountLabelOffset(index, totalPoints, x, y, isProjection) {
  let dx = index % 2 === 0 ? -16 : 16
  if (index === 0) dx = 14
  if (index === totalPoints - 1) dx = -14
  if (x < 88) dx = Math.abs(dx) + 6
  if (x > 712) dx = -(Math.abs(dx) + 6)
  const nearTop = y < 82
  let dy = nearTop ? 22 : -26
  if (isProjection) {
    dx += dx >= 0 ? 10 : -10
    dy += nearTop ? 14 : -14
  }
  return { dx, dy }
}

/** Slightly smooth an SVG line without changing point positions. */
function buildSmoothSvgPath(points, tension = 0.15, leadingPoint = null) {
  if (!points || points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || leadingPoint || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const cp1x = p1.x + ((p2.x - p0.x) * tension)
    const cp1y = p1.y + ((p2.y - p0.y) * tension)
    const cp2x = p2.x - ((p3.x - p1.x) * tension)
    const cp2y = p2.y - ((p3.y - p1.y) * tension)
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}

function createSeededRandom(seed) {
  return function() {
    seed = Math.imul(1103515245, seed) + 12345
    return ((seed >>> 0) % 2147483648) / 2147483648
  }
}

export function generateAdmin3PortfolioData() {
  const rand = createSeededRandom(42)
  const initialBalance = 100000
  const numMonths = 60

  // Preserve the Admin 3 UI totals exactly (these are what the user sees).
  const targetCurrentBalance = 7110000
  const targetTotalGain = 5830000
  const targetTotalDeposits = 2150000 // includes the initial investment
  const targetTotalWithdrawals = 890000

  // Base return series (we'll rescale it to hit the target totals).
  const rnd = () => -5 + rand() * 15
  const rawPcts = Array.from({ length: numMonths }, () => rnd())
  let product = 1
  rawPcts.forEach((p) => { product *= 1 + p / 100 })

  const fixedGrowthRates = {
    'February_2024': -6.30,
    'February_2025': -3,
    'March_2026': 0.42
  }

  const now = new Date()
  const monthMeta = Array.from({ length: numMonths }, (_, i) => {
    const monthsAgo = numMonths - 1 - i
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
    const month = MONTH_NAMES[d.getMonth()]
    const year = d.getFullYear()
    const key = `${month}_${year}`
    return { month, year, key, monthIndex: d.getMonth() }
  })

  // Decide which months have deposits/withdrawals.
  const depositMonths = []
  const withdrawalMonths = []
  for (let i = 0; i < numMonths; i++) {
    if (rand() < 0.35) depositMonths.push(i)
    if (rand() < 0.2) withdrawalMonths.push(i)
  }

  // Cashflows: totals must remain exact.
  const depositsToAlloc = targetTotalDeposits - initialBalance
  const withdrawalToAlloc = targetTotalWithdrawals

  // Randomize deposit/withdraw amounts but keep their sums exact.
  // Your request "20000 to 10000" is interpreted as variability magnitude around the base
  // amounts (base +/- [10k..20k] with random sign), then rescaled to exact totals.
  const randDeltaMagnitude = () => 10000 + rand() * 10000 // [10k..20k]
  const randSigned = () => (rand() < 0.5 ? -1 : 1)

  const depositAmounts = new Array(numMonths).fill(0)
  const withdrawalAmounts = new Array(numMonths).fill(0)
  const depositDayOfMonth = new Array(numMonths).fill(null)
  const withdrawalDayOfMonth = new Array(numMonths).fill(null)

  const depositBase = depositMonths.length > 0 ? depositsToAlloc / depositMonths.length : 0
  const withdrawalBase = withdrawalMonths.length > 0 ? withdrawalToAlloc / withdrawalMonths.length : 0

  if (depositMonths.length > 0) {
    const raw = depositMonths.map((i) => {
      const v = depositBase + randSigned() * randDeltaMagnitude()
      return Math.max(1000, v)
    })
    const rawSum = raw.reduce((a, b) => a + b, 0) || 1
    let scaled = raw.map((v) => (v / rawSum) * depositsToAlloc)
    scaled = scaled.map((v) => Math.round(v * 100) / 100)

    let scaledSum = scaled.reduce((a, b) => a + b, 0)
    const residual = Math.round((depositsToAlloc - scaledSum) * 100) / 100
    scaled[0] = Math.round((scaled[0] + residual) * 100) / 100

    depositMonths.forEach((monthIdx, idx) => {
      depositAmounts[monthIdx] = scaled[idx]
      depositDayOfMonth[monthIdx] = Math.floor(rand() * 28) + 1 // 1..28
    })
  }

  if (withdrawalMonths.length > 0) {
    const raw = withdrawalMonths.map((i) => {
      const v = withdrawalBase + randSigned() * randDeltaMagnitude()
      return Math.max(0, v)
    })
    const rawSum = raw.reduce((a, b) => a + b, 0) || 1
    let scaled = raw.map((v) => (v / rawSum) * withdrawalToAlloc)
    scaled = scaled.map((v) => Math.round(v * 100) / 100)

    let scaledSum = scaled.reduce((a, b) => a + b, 0)
    const residual = Math.round((withdrawalToAlloc - scaledSum) * 100) / 100
    scaled[0] = Math.round((scaled[0] + residual) * 100) / 100

    withdrawalMonths.forEach((monthIdx, idx) => {
      withdrawalAmounts[monthIdx] = scaled[idx]
      withdrawalDayOfMonth[monthIdx] = Math.floor(rand() * 28) + 1 // 1..28
    })
  }

  // Precompute the random reductions so the solver doesn't consume RNG.
  const pctReductions = new Array(numMonths).fill(0)
  for (let i = 0; i < numMonths; i++) {
    if (fixedGrowthRates[monthMeta[i].key] !== undefined) continue
    if (rand() < 0.8) pctReductions[i] = 0.5 + rand() * 1.5
  }

  function simulateWithTargetFinal(targetFinal) {
    const scale = Math.pow(targetFinal / initialBalance / product, 1 / numMonths)
    const pcts = rawPcts.map((p) => {
      const r = (1 + p / 100) * scale - 1
      return r * 100
    })

    let balance = initialBalance
    let totalDeposits = initialBalance
    let totalWithdrawals = 0
    let totalGain = 0
    const monthlyHistory = []

    for (let i = 0; i < numMonths; i++) {
      const meta = monthMeta[i]
      const daysInMonth = new Date(meta.year, meta.monthIndex + 1, 0).getDate()

      let pctBase = fixedGrowthRates[meta.key] !== undefined ? fixedGrowthRates[meta.key] : Math.min(pcts[i], 10)
      if (fixedGrowthRates[meta.key] === undefined) pctBase -= pctReductions[i]
      const pct = pctBase

      const startingBalance = balance
      const growthAmount = balance * (pct / 100)
      totalGain += Math.round(growthAmount * 100) / 100
      balance = balance + growthAmount

      const depositAmount = depositAmounts[i] || 0
      const withdrawalAmount = withdrawalAmounts[i] || 0

      const depositDay = depositDayOfMonth[i] ?? 1
      const withdrawalDay = withdrawalDayOfMonth[i] ?? 1

      const depositDate = depositAmount
        ? `${meta.year}-${String(meta.monthIndex + 1).padStart(2, '0')}-${String(depositDay).padStart(2, '0')}`
        : null
      const withdrawalDate = withdrawalAmount
        ? `${meta.year}-${String(meta.monthIndex + 1).padStart(2, '0')}-${String(withdrawalDay).padStart(2, '0')}`
        : null

      const depositGrowth = depositAmount
        ? depositAmount * (pct / 100) * Math.max(0, (daysInMonth - depositDay + 1) / daysInMonth)
        : 0
      const withdrawalGrowth = withdrawalAmount
        ? withdrawalAmount * (pct / 100) * (daysInMonth - withdrawalDay) / daysInMonth
        : 0

      balance += depositAmount + depositGrowth - withdrawalAmount - withdrawalGrowth

      totalDeposits += depositAmount
      totalWithdrawals += withdrawalAmount

      monthlyHistory.push({
        month: meta.month,
        year: meta.year.toString(),
        percentageGrowth: Math.round(pct * 100) / 100,
        growthAmount: Math.round(growthAmount * 100) / 100,
        depositAmount,
        depositDate,
        withdrawalAmount,
        withdrawalDate,
        startingBalance: Math.round(startingBalance * 100) / 100,
        endingBalance: Math.round(balance * 100) / 100,
        depositGrowth: Math.round(depositGrowth * 100) / 100,
        withdrawalGrowth: Math.round(withdrawalGrowth * 100) / 100,
        updatedAt: new Date().toISOString()
      })
    }

    return {
      endingBalance: Math.round(balance * 100) / 100,
      totalDeposits,
      totalWithdrawals,
      totalGain: Math.round(totalGain * 100) / 100,
      monthlyHistory
    }
  }

  // Find a good bracket for ending balance, then scan for the best match of BOTH totals.
  // This avoids cases where ending balance is close but Total Gain is off.
  let low = 1000000
  let high = 20000000
  for (let iter = 0; iter < 18; iter++) {
    const mid = (low + high) / 2
    const sim = simulateWithTargetFinal(mid)
    if (sim.endingBalance > targetCurrentBalance) {
      high = mid
    } else {
      low = mid
    }
  }

  const scanSteps = 61
  let bestFinal = null
  for (let s = 0; s <= scanSteps; s++) {
    const candidate = low + ((high - low) * s) / scanSteps
    const sim = simulateWithTargetFinal(candidate)
    const endErrAbs = Math.abs(sim.endingBalance - targetCurrentBalance)
    const gainErrAbs = Math.abs(sim.totalGain - targetTotalGain)
    // Normalize to keep the two targets comparable.
    const score = endErrAbs / 1000 + gainErrAbs / 1000
    if (!bestFinal || score < bestFinal.score) {
      bestFinal = { ...sim, score }
    }
  }

  // Final deterministic tuning (so the visible UI totals match exactly).
  // We only adjust the last month:
  // - `Total Gain` is based on sum(growthAmount), so we shift the last `growthAmount`.
  // - `Current Balance` depends on growthAmount + depositGrowth/withdrawalGrowth, so we
  //   compensate by shifting the last `depositGrowth` to preserve the final balance.
  const round2 = (n) => Math.round(n * 100) / 100
  if (bestFinal?.monthlyHistory?.length) {
    const history = bestFinal.monthlyHistory
    const lastIdx = history.length - 1
    const actualTotalGain = history.reduce((sum, r) => sum + (r.growthAmount || 0), 0)
    const actualCurrentBalance = history[lastIdx].endingBalance
    const gainDelta = targetTotalGain - actualTotalGain
    const endDelta = targetCurrentBalance - actualCurrentBalance

    if (Math.abs(gainDelta) > 0.01 || Math.abs(endDelta) > 0.01) {
      const newGrowthAmount = round2((history[lastIdx].growthAmount || 0) + gainDelta)
      const newDepositGrowth = round2((history[lastIdx].depositGrowth || 0) + (endDelta - gainDelta))

      history[lastIdx].growthAmount = newGrowthAmount
      history[lastIdx].depositGrowth = newDepositGrowth
      history[lastIdx].endingBalance = round2(history[lastIdx].endingBalance + endDelta)

      const sb = history[lastIdx].startingBalance || 0
      if (sb > 0) {
        history[lastIdx].percentageGrowth = round2((newGrowthAmount / sb) * 100)
      }

      bestFinal.endingBalance = history[lastIdx].endingBalance
    }
  }

  return {
    initialInvestment: initialBalance,
    currentBalance: bestFinal.endingBalance,
    totalDeposits: Math.round(bestFinal.totalDeposits * 100) / 100,
    totalWithdrawals: Math.round(bestFinal.totalWithdrawals * 100) / 100,
    monthlyHistory: bestFinal.monthlyHistory,
    monthlyReturnRate: 0.03,
    monthlyAdditions: 0
  }
}

const HISTORICAL_LINE_GREEN = '#10b981'

const AdminPortfolio = ({ user, userStatuses = [] }) => {
  const isAdmin2 = userStatuses && (userStatuses.includes('Admin 2') || userStatuses.includes('Relations'))
  const isAdmin3 = userStatuses && userStatuses.includes('Admin 3')
  const canAddPerformance = !isAdmin2 && !isAdmin3
  const graphAreaFillUid = `pf${useId().replace(/:/g, '')}`

  const [loading, setLoading] = useState(true)
  const [portfolioData, setPortfolioData] = useState(null)
  const [showAddPerformance, setShowAddPerformance] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [monthlyUpdate, setMonthlyUpdate] = useState({
    month: '',
    year: '',
    percentageGrowth: '',
    growthAmountExact: '',
    depositAmount: '',
    depositDate: '',
    withdrawalAmount: '',
    withdrawalDate: '',
    depositEntries: [{ amount: '', date: '' }],
    withdrawalEntries: [{ amount: '', date: '' }]
  })
  const [loadingMonthlyUpdate, setLoadingMonthlyUpdate] = useState(false)
  const [editingRecordIndex, setEditingRecordIndex] = useState(null)
  const [editFormData, setEditFormData] = useState({
    month: '',
    year: '',
    percentageGrowth: '',
    growthAmountExact: '',
    depositAmount: '',
    depositDate: '',
    withdrawalAmount: '',
    withdrawalDate: '',
    depositEntries: [{ amount: '', date: '' }],
    withdrawalEntries: [{ amount: '', date: '' }]
  })
  const [loadingEdit, setLoadingEdit] = useState(false)
  const portfolioEditBelowChartRef = useRef(null)

  const handleCancelEdit = useCallback(() => {
    setEditingRecordIndex(null)
    setEditFormData({
      month: '',
      year: '',
      percentageGrowth: '',
      growthAmountExact: '',
      depositAmount: '',
      depositDate: '',
      withdrawalAmount: '',
      withdrawalDate: '',
      depositEntries: [{ amount: '', date: '' }],
      withdrawalEntries: [{ amount: '', date: '' }]
    })
    setError('')
    setSuccess('')
  }, [])

  const [totalInvestorAccounts, setTotalInvestorAccounts] = useState(0)
  const [loadingInvestorAccounts, setLoadingInvestorAccounts] = useState(true)
  const [portfolioOwnerId, setPortfolioOwnerId] = useState(null)
  const [activeTopMetricWidget, setActiveTopMetricWidget] = useState(null)
  const [investorBreakdownRows, setInvestorBreakdownRows] = useState([])
  const [investorTotalModalLines, setInvestorTotalModalLines] = useState([])
  const [allApprovedAccountRows, setAllApprovedAccountRows] = useState([])

  useEffect(() => {
    if (user) {
      loadPortfolioData()
      loadTotalInvestorAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin2, isAdmin3])

  useEffect(() => {
    if (!showAddPerformance) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAddPerformance(false)
        setError('')
        setSuccess('')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showAddPerformance])

  useEffect(() => {
    if (editingRecordIndex === null) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleCancelEdit()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editingRecordIndex, handleCancelEdit])

  useEffect(() => {
    if (editingRecordIndex === null) return
    portfolioEditBelowChartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [editingRecordIndex])

  useEffect(() => {
    if (!activeTopMetricWidget) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveTopMetricWidget(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeTopMetricWidget])

  // Helper function to sort monthly history chronologically
  const sortMonthlyHistory = (history) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    
    return [...history].sort((a, b) => {
      // First sort by year
      const yearA = parseInt(a.year) || 0
      const yearB = parseInt(b.year) || 0
      if (yearA !== yearB) {
        return yearA - yearB
      }
      
      // Then sort by month
      const monthA = monthNames.indexOf(a.month || '')
      const monthB = monthNames.indexOf(b.month || '')
      return monthA - monthB
    })
  }

  const loadTotalInvestorAccounts = async () => {
    try {
      const db = getFirestore()
      const overrides = isAdmin3 && user?.uid ? await getAdmin3Overrides(user.uid) : {}

      const mergeUserForInvestorView = (docSnapshot) => {
        const userData = docSnapshot.data()
        let statuses = userData.statuses || []
        let investmentData = userData.investmentData || null
        const ov = overrides[docSnapshot.id]
        if (ov) {
          if (ov.statuses !== undefined) statuses = ov.statuses
          if (ov.investmentData !== undefined) investmentData = ov.investmentData
        }
        return {
          userData,
          statuses,
          investmentData,
          email: userData.email || '',
          displayName: userData.displayName || ''
        }
      }

      const usersCollection = collection(db, 'users')
      const usersSnapshot = await getDocs(usersCollection)
      
      const prevMonthCtx = getPreviousMonthContext()
      let total = 0
      const investorRows = []
      const modalLines = []
      const allApprovedRows = []
      usersSnapshot.forEach((docSnapshot) => {
        const { userData, statuses, investmentData, email, displayName } = mergeUserForInvestorView(docSnapshot)

        // For current-balance allocation + initial-investment detail, include all approved Investor/Trader accounts.
        if (
          (statuses.includes('Investor') || statuses.includes('Trader')) &&
          investmentData &&
          investmentData.status === 'approved'
        ) {
          const invAll = investmentData
          const safeInitialAll = Number(getInvestorCombinedInitial(invAll)) || 0
          const safeDepositsAll = Number(invAll.totalDeposits ?? safeInitialAll) || 0
          const safeWithdrawalsAll = Number(invAll.totalWithdrawals ?? 0) || 0
          const safeCurrentAll = Number(getAdminInvestorSummaryCurrentBalance(invAll)) || 0
          allApprovedRows.push({
            id: docSnapshot.id,
            name: (displayName && displayName.trim()) || email || 'Unnamed investor',
            initialInvestment: safeInitialAll,
            totalDeposits: safeDepositsAll,
            totalWithdrawals: safeWithdrawalsAll,
            currentBalance: safeCurrentAll,
            growth: safeCurrentAll - safeDepositsAll + safeWithdrawalsAll
          })
        }
        
        if (isExcludedFromInvestorOverviewTotal(email)) {
          return
        }
        
        // Mirror overview total-investor rules: approved Investor accounts only.
        if (statuses.includes('Investor') && investmentData && investmentData.status === 'approved') {
          const safeInitial = Number(getInvestorCombinedInitial(investmentData)) || 0
          const safeDeposits = Number(investmentData.totalDeposits ?? safeInitial) || 0
          const safeWithdrawals = Number(investmentData.totalWithdrawals ?? 0) || 0
          const safeCurrentBalance = Number(getAdminInvestorSummaryCurrentBalance(investmentData)) || 0
          const isPartner = isPartnerUserForOverview({ statuses, investmentData })
          const monthlyTarget = isPartner
            ? null
            : Number(monthlyTargetAndRateForPayout(investmentData, email, displayName, prevMonthCtx)) || 0

          total += safeCurrentBalance

          investorRows.push({
            id: docSnapshot.id,
            name: (displayName && displayName.trim()) || email || 'Unnamed investor',
            initialInvestment: safeInitial,
            totalDeposits: safeDeposits,
            totalWithdrawals: safeWithdrawals,
            currentBalance: safeCurrentBalance,
            growth: safeCurrentBalance - safeDeposits + safeWithdrawals
          })

          modalLines.push({
            id: docSnapshot.id,
            name: (displayName && displayName.trim()) || 'Unnamed investor',
            balance: safeCurrentBalance,
            isPartner,
            monthlyTarget
          })
        }
      })
      
      const sortedInvestorRows = investorRows.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      )
      const sortedModalLines = modalLines.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      )
      const sortedAllApprovedRows = allApprovedRows.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      )
      setTotalInvestorAccounts(total)
      setInvestorBreakdownRows(sortedInvestorRows)
      setInvestorTotalModalLines(sortedModalLines)
      setAllApprovedAccountRows(sortedAllApprovedRows)
    } catch (error) {
      console.error('Error loading total investor accounts:', error)
      setTotalInvestorAccounts(0)
      setInvestorBreakdownRows([])
      setInvestorTotalModalLines([])
      setAllApprovedAccountRows([])
    } finally {
      setLoadingInvestorAccounts(false)
    }
  }

  const loadPortfolioData = async () => {
    try {
      const db = getFirestore()
      
      if (isAdmin2 || isAdmin3) {
        const usersCollection = collection(db, 'users')
        const usersSnapshot = await getDocs(usersCollection)
        const overrides = isAdmin3 && user?.uid ? await getAdmin3Overrides(user.uid) : {}
        let adminUser = null
        usersSnapshot.forEach((docSnapshot) => {
          const userData = docSnapshot.data()
          let statuses = userData.statuses || []
          if (statuses.length === 0 && Array.isArray(userData.isAdmin) && userData.isAdmin.length > 0) statuses = userData.isAdmin
          if (statuses.length === 0 && userData.isAdmin === true) statuses = ['Admin']
          if (statuses.includes('Admin') && !statuses.includes('Admin 2') && !statuses.includes('Admin 3') && !statuses.includes('Relations')) {
            adminUser = { id: docSnapshot.id, ...userData }
          }
        })
        if (isAdmin3) {
          setPortfolioOwnerId(adminUser?.id || null)
          setPortfolioData(generateAdmin3PortfolioData())
        } else if (adminUser) {
          setPortfolioOwnerId(adminUser.id)
          const adminOverride = overrides[adminUser.id]
          let portfolioSource = resolveAdminPortfolioDataWithLegacyFallback(adminUser, adminOverride)
          if (!resolveAdminPortfolioData(adminUser, adminOverride) && adminUser.investmentData && !isAdmin3) {
            portfolioSource = await ensureAdminPortfolioDataMigrated(db, adminUser.id, adminUser)
          }
          if (portfolioSource) {
            const sortedData = {
              ...portfolioSource,
              monthlyHistory: sortMonthlyHistory(portfolioSource.monthlyHistory || [])
            }
            setPortfolioData(sortedData)
          } else setPortfolioData(null)
        } else {
          setPortfolioOwnerId(null)
          setPortfolioData(null)
        }
      } else {
        setPortfolioOwnerId(user.uid)
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          let portfolioSource = resolveAdminPortfolioDataWithLegacyFallback(userData)
          if (!userData.adminPortfolioData && userData.investmentData) {
            portfolioSource = await ensureAdminPortfolioDataMigrated(db, user.uid, userData)
          }
          if (portfolioSource) {
            const sortedData = {
              ...portfolioSource,
              monthlyHistory: sortMonthlyHistory(portfolioSource.monthlyHistory || [])
            }
            setPortfolioData(sortedData)
          } else setPortfolioData(null)
        }
      }
    } catch (error) {
      console.error('Error loading admin portfolio:', error)
      setError('Failed to load portfolio data.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setMonthlyUpdate(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'depositAmount' || name === 'depositDate') {
        const entries = [...(prev.depositEntries || [{ amount: '', date: '' }])]
        if (!entries[0]) entries[0] = { amount: '', date: '' }
        if (name === 'depositAmount') entries[0].amount = value
        if (name === 'depositDate') entries[0].date = value
        next.depositEntries = entries
      }
      if (name === 'withdrawalAmount' || name === 'withdrawalDate') {
        const entries = [...(prev.withdrawalEntries || [{ amount: '', date: '' }])]
        if (!entries[0]) entries[0] = { amount: '', date: '' }
        if (name === 'withdrawalAmount') entries[0].amount = value
        if (name === 'withdrawalDate') entries[0].date = value
        next.withdrawalEntries = entries
      }
      if (name === 'percentageGrowth' && String(value).trim() !== '') {
        next.growthAmountExact = ''
      }
      if (name === 'growthAmountExact' && String(value).trim() !== '') {
        next.percentageGrowth = ''
      }
      return next
    })
  }

  const handleCashflowEntryChange = (type, index, field, value) => {
    setMonthlyUpdate((prev) => {
      const key = type === 'deposit' ? 'depositEntries' : 'withdrawalEntries'
      const fallback = [{ amount: '', date: '' }]
      const entries = [...(prev[key] || fallback)]
      if (!entries[index]) entries[index] = { amount: '', date: '' }
      entries[index] = {
        ...entries[index],
        [field]: value
      }

      const firstEntry = entries[0] || { amount: '', date: '' }
      const next = { ...prev, [key]: entries }
      if (type === 'deposit') {
        next.depositAmount = firstEntry.amount || ''
        next.depositDate = firstEntry.date || ''
      } else {
        next.withdrawalAmount = firstEntry.amount || ''
        next.withdrawalDate = firstEntry.date || ''
      }
      return next
    })
  }

  const handleAddCashflowEntry = (type) => {
    setMonthlyUpdate((prev) => {
      const key = type === 'deposit' ? 'depositEntries' : 'withdrawalEntries'
      const entries = [...(prev[key] || [{ amount: '', date: '' }]), { amount: '', date: '' }]
      return { ...prev, [key]: entries }
    })
  }

  const handleRemoveCashflowEntry = (type, index) => {
    setMonthlyUpdate((prev) => {
      const key = type === 'deposit' ? 'depositEntries' : 'withdrawalEntries'
      const currentEntries = prev[key] || [{ amount: '', date: '' }]
      if (currentEntries.length <= 1) return prev
      const entries = currentEntries.filter((_, i) => i !== index)
      const next = { ...prev, [key]: entries }
      const firstEntry = entries[0] || { amount: '', date: '' }
      if (type === 'deposit') {
        next.depositAmount = firstEntry.amount || ''
        next.depositDate = firstEntry.date || ''
      } else {
        next.withdrawalAmount = firstEntry.amount || ''
        next.withdrawalDate = firstEntry.date || ''
      }
      return next
    })
  }

  const handleEditInputChange = (e) => {
    const { name, value } = e.target
    setEditFormData((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'depositAmount' || name === 'depositDate') {
        const entries = [...(prev.depositEntries || [{ amount: '', date: '' }])]
        if (!entries[0]) entries[0] = { amount: '', date: '' }
        if (name === 'depositAmount') entries[0].amount = value
        if (name === 'depositDate') entries[0].date = value
        next.depositEntries = entries
      }
      if (name === 'withdrawalAmount' || name === 'withdrawalDate') {
        const entries = [...(prev.withdrawalEntries || [{ amount: '', date: '' }])]
        if (!entries[0]) entries[0] = { amount: '', date: '' }
        if (name === 'withdrawalAmount') entries[0].amount = value
        if (name === 'withdrawalDate') entries[0].date = value
        next.withdrawalEntries = entries
      }
      if (name === 'percentageGrowth' && String(value).trim() !== '') {
        next.growthAmountExact = ''
      }
      if (name === 'growthAmountExact' && String(value).trim() !== '') {
        next.percentageGrowth = ''
      }
      return next
    })
  }

  const handleEditCashflowEntryChange = (type, index, field, value) => {
    setEditFormData((prev) => {
      const key = type === 'deposit' ? 'depositEntries' : 'withdrawalEntries'
      const fallback = [{ amount: '', date: '' }]
      const entries = [...(prev[key] || fallback)]
      if (!entries[index]) entries[index] = { amount: '', date: '' }
      entries[index] = { ...entries[index], [field]: value }
      const firstEntry = entries[0] || { amount: '', date: '' }
      const next = { ...prev, [key]: entries }
      if (type === 'deposit') {
        next.depositAmount = firstEntry.amount || ''
        next.depositDate = firstEntry.date || ''
      } else {
        next.withdrawalAmount = firstEntry.amount || ''
        next.withdrawalDate = firstEntry.date || ''
      }
      return next
    })
  }

  const handleAddEditCashflowEntry = (type) => {
    setEditFormData((prev) => {
      const key = type === 'deposit' ? 'depositEntries' : 'withdrawalEntries'
      const entries = [...(prev[key] || [{ amount: '', date: '' }]), { amount: '', date: '' }]
      return { ...prev, [key]: entries }
    })
  }

  const handleRemoveEditCashflowEntry = (type, index) => {
    setEditFormData((prev) => {
      const key = type === 'deposit' ? 'depositEntries' : 'withdrawalEntries'
      const currentEntries = prev[key] || [{ amount: '', date: '' }]
      if (currentEntries.length <= 1) return prev
      const entries = currentEntries.filter((_, i) => i !== index)
      const firstEntry = entries[0] || { amount: '', date: '' }
      const next = { ...prev, [key]: entries }
      if (type === 'deposit') {
        next.depositAmount = firstEntry.amount || ''
        next.depositDate = firstEntry.date || ''
      } else {
        next.withdrawalAmount = firstEntry.amount || ''
        next.withdrawalDate = firstEntry.date || ''
      }
      return next
    })
  }

  const handleEditRecord = (index) => {
    if (!canAddPerformance) {
      setError('You do not have permission to edit monthly performance.')
      return
    }
    
    const record = monthlyHistory[index]
    const recordDepositEntries = Array.isArray(record.depositEntries) && record.depositEntries.length > 0
      ? record.depositEntries.map((entry) => ({
          amount: entry?.amount != null ? String(entry.amount) : '',
          date: entry?.date || ''
        }))
      : [{ amount: record.depositAmount != null ? String(record.depositAmount) : '', date: record.depositDate || '' }]
    const recordWithdrawalEntries = Array.isArray(record.withdrawalEntries) && record.withdrawalEntries.length > 0
      ? record.withdrawalEntries.map((entry) => ({
          amount: entry?.amount != null ? String(entry.amount) : '',
          date: entry?.date || ''
        }))
      : [{ amount: record.withdrawalAmount != null ? String(record.withdrawalAmount) : '', date: record.withdrawalDate || '' }]
    setEditFormData({
      month: record.month || '',
      year: record.year || '',
      percentageGrowth: record.percentageGrowth != null ? String(record.percentageGrowth) : '',
      growthAmountExact: '',
      depositAmount: record.depositAmount != null ? String(record.depositAmount) : '',
      depositDate: record.depositDate || '',
      withdrawalAmount: record.withdrawalAmount != null ? String(record.withdrawalAmount) : '',
      withdrawalDate: record.withdrawalDate || '',
      depositEntries: recordDepositEntries,
      withdrawalEntries: recordWithdrawalEntries
    })
    setEditingRecordIndex(index)
    setShowAddPerformance(false)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!canAddPerformance) {
      setError('You do not have permission to edit monthly performance.')
      return
    }
    if (!portfolioData || editingRecordIndex === null) {
      setError('Invalid edit operation.')
      return
    }
    setLoadingEdit(true)
    setError('')
    setSuccess('')
    try {
      const db = getFirestore()
      const ownerId = portfolioOwnerId || user.uid
      const userDocRef = doc(db, 'users', ownerId)
      const userDoc = await getDoc(userDocRef)
      if (!userDoc.exists()) {
        setError('User document not found')
        return
      }
      const userData = userDoc.data()
      const currentPortfolioData =
        (isAdmin3 ? portfolioData : resolveAdminPortfolioDataWithLegacyFallback(userData)) || {}
      const existingHistory = sortMonthlyHistory(currentPortfolioData.monthlyHistory || [])

      if (
        portfolioHistoryHasDuplicate(
          existingHistory,
          editFormData.month,
          editFormData.year,
          editingRecordIndex
        )
      ) {
        setError(`A record for ${editFormData.month} ${editFormData.year} already exists.`)
        return
      }

      // Get the starting balance for the record being edited
      // It's the ending balance of the previous record, or initial investment if it's the first record
      let startingBalance = currentPortfolioData.initialInvestment || 0
      if (editingRecordIndex > 0) {
        startingBalance = existingHistory[editingRecordIndex - 1].endingBalance || startingBalance
      }

      const pctStr = String(editFormData.percentageGrowth ?? '').trim()
      const exactStr = String(editFormData.growthAmountExact ?? '').trim()
      const hasExactGrowth = exactStr !== ''
      const hasPctGrowth = pctStr !== ''

      if (!hasExactGrowth && !hasPctGrowth) {
        setError('Enter either a growth percentage or an exact growth amount (€).')
        return
      }

      let percentageGrowth
      let growthAmount
      if (hasExactGrowth) {
        growthAmount = parseFloat(exactStr.replace(',', '.'))
        if (!Number.isFinite(growthAmount)) {
          setError('Invalid growth amount.')
          return
        }
        percentageGrowth = startingBalance > 0 ? (growthAmount / startingBalance) * 100 : 0
      } else {
        percentageGrowth = parseFloat(pctStr) || 0
        growthAmount = startingBalance * (percentageGrowth / 100)
      }
      const normalizedDepositEntries = (editFormData.depositEntries || [])
        .map((entry) => ({ amount: parseFloat(entry?.amount) || 0, date: entry?.date || null }))
        .filter((entry) => entry.amount > 0 || entry.date)
      const normalizedWithdrawalEntries = (editFormData.withdrawalEntries || [])
        .map((entry) => ({ amount: parseFloat(entry?.amount) || 0, date: entry?.date || null }))
        .filter((entry) => entry.amount > 0 || entry.date)

      const depositAmount = normalizedDepositEntries.reduce((sum, entry) => sum + entry.amount, 0)
      const withdrawalAmount = normalizedWithdrawalEntries.reduce((sum, entry) => sum + entry.amount, 0)

      const depositGrowth = normalizedDepositEntries.reduce(
        (sum, entry) =>
          sum +
          calculatePortfolioProratedGrowth(
            entry.amount,
            percentageGrowth,
            entry.date,
            editFormData.month,
            editFormData.year
          ),
        0
      )

      const withdrawalGrowth = normalizedWithdrawalEntries.reduce(
        (sum, entry) =>
          sum +
          calculatePortfolioWithdrawalGrowthLoss(
            entry.amount,
            percentageGrowth,
            entry.date,
            editFormData.month,
            editFormData.year
          ),
        0
      )

      const endingBalance = startingBalance + growthAmount + depositAmount + depositGrowth - withdrawalAmount - withdrawalGrowth

      // Update the record at the editing index
      const updatedRecord = {
        month: editFormData.month,
        year: editFormData.year,
        percentageGrowth: percentageGrowth,
        growthAmount: growthAmount,
        depositGrowth: depositGrowth,
        withdrawalGrowth: withdrawalGrowth,
        startingBalance: startingBalance,
        endingBalance: endingBalance,
        depositAmount: depositAmount,
        depositDate: normalizedDepositEntries[0]?.date || null,
        withdrawalAmount: withdrawalAmount,
        withdrawalDate: normalizedWithdrawalEntries[0]?.date || null,
        depositEntries: normalizedDepositEntries,
        withdrawalEntries: normalizedWithdrawalEntries,
        exactEndingBalance: true,
        updatedAt: new Date().toISOString()
      }

      existingHistory[editingRecordIndex] = updatedRecord

      const recalculatedHistory = recalculatePortfolioMonthlyHistory(
        existingHistory,
        currentPortfolioData.initialInvestment || 0,
        { preserveExactEndingBalances: true }
      )
      const { totalDeposits: newTotalDeposits, totalWithdrawals: newTotalWithdrawals, currentBalance: runningBalance } =
        sumPortfolioCashflowTotals(recalculatedHistory, currentPortfolioData.initialInvestment || 0)

      const updatedPortfolioData = {
        ...currentPortfolioData,
        currentBalance: runningBalance,
        totalDeposits: newTotalDeposits,
        totalWithdrawals: newTotalWithdrawals,
        monthlyHistory: recalculatedHistory,
        lastUpdated: new Date().toISOString()
      }

      if (isAdmin3 && user?.uid) {
        await saveAdmin3UserOverride(user.uid, ownerId, { adminPortfolioData: updatedPortfolioData })
      } else {
        await updateDoc(userDocRef, {
          adminPortfolioData: updatedPortfolioData,
          updatedAt: new Date().toISOString()
        })
      }
      setSuccess(isAdmin3 ? 'Saved to your sandbox (changes visible only to you)' : `Monthly record for ${editFormData.month} ${editFormData.year} updated successfully!`)
      setEditingRecordIndex(null)
      setEditFormData({
        month: '',
        year: '',
        percentageGrowth: '',
        growthAmountExact: '',
        depositAmount: '',
        depositDate: '',
        withdrawalAmount: '',
        withdrawalDate: '',
        depositEntries: [{ amount: '', date: '' }],
        withdrawalEntries: [{ amount: '', date: '' }]
      })
      
      // Reload portfolio data and total investor accounts
      await loadPortfolioData()
      await loadTotalInvestorAccounts()
    } catch (error) {
      console.error('Error updating monthly record:', error)
      setError(`Failed to update monthly record: ${error.message}`)
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleDeleteEditRecord = async () => {
    if (!canAddPerformance) {
      setError('You do not have permission to delete monthly performance.')
      return
    }
    if (!portfolioData || editingRecordIndex === null) {
      setError('Invalid delete operation.')
      return
    }

    const monthLabel = editFormData.month || 'this month'
    const yearLabel = editFormData.year || ''
    const confirmLabel = yearLabel ? `${monthLabel} ${yearLabel}` : monthLabel
    if (!window.confirm(`Eliminate the record for ${confirmLabel}? This cannot be undone.`)) {
      return
    }

    setLoadingEdit(true)
    setError('')
    setSuccess('')
    try {
      const db = getFirestore()
      const ownerId = portfolioOwnerId || user.uid
      const userDocRef = doc(db, 'users', ownerId)
      const userDoc = await getDoc(userDocRef)
      if (!userDoc.exists()) {
        setError('User document not found')
        return
      }
      const userData = userDoc.data()
      const currentPortfolioData =
        (isAdmin3 ? portfolioData : resolveAdminPortfolioDataWithLegacyFallback(userData)) || {}
      const existingHistory = sortMonthlyHistory(currentPortfolioData.monthlyHistory || [])
      const historyWithoutRecord = existingHistory.filter((_, index) => index !== editingRecordIndex)
      const recalculatedHistory = recalculatePortfolioMonthlyHistory(
        historyWithoutRecord,
        currentPortfolioData.initialInvestment || 0,
        { preserveExactEndingBalances: true }
      )
      const { totalDeposits, totalWithdrawals, currentBalance } = sumPortfolioCashflowTotals(
        recalculatedHistory,
        currentPortfolioData.initialInvestment || 0
      )

      const updatedPortfolioData = {
        ...currentPortfolioData,
        currentBalance,
        totalDeposits,
        totalWithdrawals,
        monthlyHistory: recalculatedHistory,
        lastUpdated: new Date().toISOString()
      }

      if (isAdmin3 && user?.uid) {
        await saveAdmin3UserOverride(user.uid, ownerId, { adminPortfolioData: updatedPortfolioData })
      } else {
        await updateDoc(userDocRef, {
          adminPortfolioData: updatedPortfolioData,
          updatedAt: new Date().toISOString()
        })
      }

      setSuccess(
        isAdmin3
          ? 'Record eliminated in your sandbox (changes visible only to you)'
          : `Monthly record for ${confirmLabel} eliminated successfully!`
      )
      setEditingRecordIndex(null)
      setEditFormData({
        month: '',
        year: '',
        percentageGrowth: '',
        growthAmountExact: '',
        depositAmount: '',
        depositDate: '',
        withdrawalAmount: '',
        withdrawalDate: '',
        depositEntries: [{ amount: '', date: '' }],
        withdrawalEntries: [{ amount: '', date: '' }]
      })
      await loadPortfolioData()
      await loadTotalInvestorAccounts()
    } catch (error) {
      console.error('Error deleting monthly record:', error)
      setError(`Failed to eliminate monthly record: ${error.message}`)
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleAddPerformance = async (e) => {
    e.preventDefault()
    if (!canAddPerformance) {
      setError('You do not have permission to add monthly performance.')
      return
    }
    if (!portfolioData) {
      setError('Portfolio data not found. Please initialize your portfolio first.')
      return
    }
    setLoadingMonthlyUpdate(true)
    setError('')
    setSuccess('')
    try {
      const db = getFirestore()
      const ownerId = portfolioOwnerId || user.uid
      const userDocRef = doc(db, 'users', ownerId)
      const userDoc = await getDoc(userDocRef)
      if (!userDoc.exists()) {
        setError('User document not found')
        return
      }
      const userData = userDoc.data()
      const currentPortfolioData =
        (isAdmin3 ? portfolioData : resolveAdminPortfolioDataWithLegacyFallback(userData)) || {}
      const existingHistory = sortMonthlyHistory(currentPortfolioData.monthlyHistory || [])

      if (portfolioHistoryHasDuplicate(existingHistory, monthlyUpdate.month, monthlyUpdate.year)) {
        setError(`A record for ${monthlyUpdate.month} ${monthlyUpdate.year} already exists.`)
        return
      }

      const currentBalance = currentPortfolioData.currentBalance || currentPortfolioData.initialInvestment || 0
      const totalDeposits = currentPortfolioData.totalDeposits || currentPortfolioData.initialInvestment || 0
      const totalWithdrawals = currentPortfolioData.totalWithdrawals || 0

      // Helper function to get days in a month
      const getDaysInMonth = (month, year) => {
        const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month)
        return new Date(year, monthIndex + 1, 0).getDate()
      }

      // Helper function to calculate prorated growth
      const calculateProratedGrowth = (amount, percentageGrowth, date, month, year) => {
        if (!date || !month || !year || amount === 0) return 0
        
        const depositDate = new Date(date)
        const dayOfMonth = depositDate.getDate()
        const daysInMonth = getDaysInMonth(month, parseInt(year))
        
        let daysRemaining = daysInMonth - dayOfMonth + 1
        if (dayOfMonth === daysInMonth) {
          daysRemaining = 0
        }
        
        const proratedRatio = daysRemaining / daysInMonth
        return amount * (percentageGrowth / 100) * proratedRatio
      }

      const calculateWithdrawalGrowthLoss = (amount, percentageGrowth, date, month, year) => {
        if (!date || !month || !year || amount === 0) return 0
        
        const withdrawalDate = new Date(date)
        const dayOfMonth = withdrawalDate.getDate()
        const daysInMonth = getDaysInMonth(month, parseInt(year))
        
        const daysRemaining = daysInMonth - dayOfMonth
        const proratedRatio = daysRemaining / daysInMonth
        return amount * (percentageGrowth / 100) * proratedRatio
      }

      const pctStr = String(monthlyUpdate.percentageGrowth ?? '').trim()
      const exactStr = String(monthlyUpdate.growthAmountExact ?? '').trim()
      const hasExactGrowth = exactStr !== ''
      const hasPctGrowth = pctStr !== ''

      if (!hasExactGrowth && !hasPctGrowth) {
        setError('Enter either a growth percentage or an exact growth amount (€).')
        return
      }

      let percentageGrowth
      let growthAmount
      if (hasExactGrowth) {
        growthAmount = parseFloat(exactStr)
        if (!Number.isFinite(growthAmount)) {
          setError('Invalid growth amount.')
          return
        }
        percentageGrowth =
          currentBalance > 0 ? (growthAmount / currentBalance) * 100 : 0
      } else {
        percentageGrowth = parseFloat(pctStr) || 0
        growthAmount = currentBalance * (percentageGrowth / 100)
      }

      let newBalance = currentBalance + growthAmount

      const normalizedDepositEntries = (monthlyUpdate.depositEntries || [])
        .map((entry) => ({
          amount: parseFloat(entry?.amount) || 0,
          date: entry?.date || null
        }))
        .filter((entry) => entry.amount > 0 || entry.date)
      const normalizedWithdrawalEntries = (monthlyUpdate.withdrawalEntries || [])
        .map((entry) => ({
          amount: parseFloat(entry?.amount) || 0,
          date: entry?.date || null
        }))
        .filter((entry) => entry.amount > 0 || entry.date)

      const depositAmount = normalizedDepositEntries.reduce((sum, entry) => sum + entry.amount, 0)
      const withdrawalAmount = normalizedWithdrawalEntries.reduce((sum, entry) => sum + entry.amount, 0)
      const newTotalDeposits = totalDeposits + depositAmount
      const newTotalWithdrawals = totalWithdrawals + withdrawalAmount

      const depositGrowth = normalizedDepositEntries.reduce((sum, entry) => (
        sum + calculateProratedGrowth(
          entry.amount,
          percentageGrowth,
          entry.date,
          monthlyUpdate.month,
          monthlyUpdate.year
        )
      ), 0)
      const withdrawalGrowth = normalizedWithdrawalEntries.reduce((sum, entry) => (
        sum + calculateWithdrawalGrowthLoss(
          entry.amount,
          percentageGrowth,
          entry.date,
          monthlyUpdate.month,
          monthlyUpdate.year
        )
      ), 0)

      newBalance += depositAmount + depositGrowth
      newBalance -= withdrawalAmount + withdrawalGrowth

      // Create monthly record
      const monthlyRecord = {
        month: monthlyUpdate.month,
        year: monthlyUpdate.year,
        percentageGrowth: percentageGrowth,
        growthAmount: growthAmount,
        depositGrowth: depositGrowth,
        withdrawalGrowth: withdrawalGrowth,
        startingBalance: currentBalance,
        endingBalance: newBalance,
        depositAmount: depositAmount,
        depositDate: normalizedDepositEntries[0]?.date || null,
        withdrawalAmount: withdrawalAmount,
        withdrawalDate: normalizedWithdrawalEntries[0]?.date || null,
        depositEntries: normalizedDepositEntries,
        withdrawalEntries: normalizedWithdrawalEntries,
        updatedAt: new Date().toISOString()
      }

      // Get existing monthly history
      const updatedHistory = [...existingHistory, monthlyRecord]
      
      // Sort the history chronologically
      const sortedHistory = sortMonthlyHistory(updatedHistory)

      // Update firm admin portfolio (separate from personal investor investmentData)
      const updatedPortfolioData = {
        ...currentPortfolioData,
        currentBalance: newBalance,
        totalDeposits: newTotalDeposits,
        totalWithdrawals: newTotalWithdrawals,
        monthlyHistory: sortedHistory,
        lastUpdated: new Date().toISOString()
      }

      if (isAdmin3 && user?.uid) {
        await saveAdmin3UserOverride(user.uid, ownerId, { adminPortfolioData: updatedPortfolioData })
      } else {
        await updateDoc(userDocRef, {
          adminPortfolioData: updatedPortfolioData,
          updatedAt: new Date().toISOString()
        })
      }
      setSuccess(isAdmin3 ? 'Saved to your sandbox (changes visible only to you)' : `Monthly update for ${monthlyUpdate.month} ${monthlyUpdate.year} saved successfully!`)
      setMonthlyUpdate({
        month: '',
        year: '',
        percentageGrowth: '',
        growthAmountExact: '',
        depositAmount: '',
        depositDate: '',
        withdrawalAmount: '',
        withdrawalDate: '',
        depositEntries: [{ amount: '', date: '' }],
        withdrawalEntries: [{ amount: '', date: '' }]
      })
      setShowAddPerformance(false)
      
      // Reload portfolio data and total investor accounts
      await loadPortfolioData()
      await loadTotalInvestorAccounts()
    } catch (error) {
      console.error('Error updating monthly performance:', error)
      setError(`Failed to update monthly performance: ${error.message}`)
    } finally {
      setLoadingMonthlyUpdate(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-portfolio-loading">
        <div className="loading-spinner">Loading portfolio...</div>
      </div>
    )
  }

  // If no portfolio data, show initialization message
  if (!portfolioData) {
    return (
      <div className="admin-portfolio-container">
        <div className="admin-portfolio-no-data">
          <h2>Admin Portfolio</h2>
          <p>Your portfolio has not been initialized yet. Please contact system administrator or initialize your portfolio data.</p>
        </div>
      </div>
    )
  }

  // Calculate portfolio display data
  const initialInvestment = portfolioData.initialInvestment || 0
  const monthlyReturnRate = portfolioData.monthlyReturnRate || 0.03
  const monthlyAdditions = portfolioData.monthlyAdditions || 0
  const currentBalance = portfolioData.currentBalance || initialInvestment
  const totalDeposits = portfolioData.totalDeposits || initialInvestment
  const totalWithdrawals = portfolioData.totalWithdrawals || 0
  // Chronological order for calculations; table shows newest months first
  const monthlyHistory = sortMonthlyHistory(portfolioData.monthlyHistory || [])
  const monthlyHistoryNewestFirst = monthlyHistory
    .map((record, originalIndex) => ({ record, originalIndex }))
    .reverse()

  // Calculate metrics
  const totalGain = monthlyHistory.reduce((sum, record) => {
    return sum + (record.growthAmount || 0)
  }, 0)

  const depositCount = 1 + monthlyHistory.filter(record => (record.depositAmount || 0) > 0).length
  const averageMonthlyInput = depositCount > 0 ? totalDeposits / depositCount : 0

  const totalPercentageGain = monthlyHistory.reduce((sum, record) => {
    return sum + (record.percentageGrowth || 0)
  }, 0)

  // Calculate 5-month projection
  let projectionStartingBalance = currentBalance
  if (monthlyHistory.length > 0) {
    const lastMonth = monthlyHistory[monthlyHistory.length - 1]
    projectionStartingBalance = lastMonth.endingBalance || currentBalance
  }
  
  let projectedBalance = projectionStartingBalance
  for (let month = 1; month <= 5; month++) {
    projectedBalance = projectedBalance * (1 + monthlyReturnRate) + monthlyAdditions
  }
  const projection5Months = projectedBalance

  // Calculate graph data
  const calculateGraphData = () => {
    const data = []
    
    // Helper function to convert month name to number
    const getMonthNumber = (monthName) => {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December']
      return monthNames.indexOf(monthName) + 1
    }
    
    // Helper function to format label as MM/YY
    const formatLabel = (month, year) => {
      const monthNum = typeof month === 'string' ? getMonthNumber(month) : month
      const yearStr = year.toString()
      const yearShort = yearStr.length >= 2 ? yearStr.slice(-2) : yearStr
      return `${monthNum}/${yearShort}`
    }
    
    if (monthlyHistory.length > 0) {
      const firstYear = monthlyHistory[0]?.year || new Date().getFullYear()
      data.push({
        month: -monthlyHistory.length,
        balance: initialInvestment,
        label: 'Start',
        year: firstYear,
        isHistorical: true
      })
      
      monthlyHistory.forEach((record, index) => {
        data.push({
          month: index - monthlyHistory.length + 1,
          balance: record.endingBalance,
          label: formatLabel(record.month, record.year),
          year: record.year,
          monthNum: getMonthNumber(record.month),
          isHistorical: true
        })
      })
    } else {
      data.push({
        month: 0,
        balance: currentBalance,
        label: 'Now',
        year: new Date().getFullYear().toString(),
        isHistorical: false
      })
    }
    
    let projectionStartingBalance = currentBalance
    let lastMonthRecord = null
    if (monthlyHistory.length > 0) {
      lastMonthRecord = monthlyHistory[monthlyHistory.length - 1]
      projectionStartingBalance = lastMonthRecord.endingBalance || currentBalance
    }
    
    let projectedBalance = projectionStartingBalance
    for (let month = 1; month <= 5; month++) {
      projectedBalance = projectedBalance * (1 + monthlyReturnRate) + monthlyAdditions
      
      // Calculate the actual month/year for projection
      let projectionMonth = 0
      let projectionYear = 0
      if (lastMonthRecord) {
        const lastMonthNum = getMonthNumber(lastMonthRecord.month)
        const lastYear = parseInt(lastMonthRecord.year)
        projectionMonth = lastMonthNum + month
        projectionYear = lastYear
        // Handle year rollover
        while (projectionMonth > 12) {
          projectionMonth -= 12
          projectionYear += 1
        }
      } else {
        // If no history, use current date + projection months
        const now = new Date()
        projectionMonth = now.getMonth() + 1 + month
        projectionYear = now.getFullYear()
        while (projectionMonth > 12) {
          projectionMonth -= 12
          projectionYear += 1
        }
      }
      
      data.push({
        month: monthlyHistory.length + month,
        balance: projectedBalance,
        label: formatLabel(projectionMonth, projectionYear),
        year: projectionYear.toString(),
        monthNum: projectionMonth,
        isHistorical: false
      })
    }
    
    return data
  }

  const projectionData = calculateGraphData()
  const maxBalance = Math.max(...projectionData.map(d => d.balance))
  const minBalance = Math.min(...projectionData.map(d => d.balance))
  const range = maxBalance - minBalance || 1
  const graphLinePoints = projectionData.map((point, index) => {
    const totalPoints = projectionData.length
    const x = 50 + (index * (700 / Math.max(totalPoints - 1, 1)))
    const y = 350 - ((point.balance - minBalance) / range * 300)
    return { ...point, index, x, y }
  })
  const historicalLinePoints = graphLinePoints.filter((p) => p.isHistorical)
  const lastHistoricalIndex = graphLinePoints.map((p, i) => p.isHistorical ? i : -1).filter(i => i >= 0).pop()
  const secondLastHistoricalIndex =
    lastHistoricalIndex != null && lastHistoricalIndex > 0
      ? graphLinePoints
          .slice(0, lastHistoricalIndex)
          .map((p, i) => (p.isHistorical ? i : -1))
          .filter((i) => i >= 0)
          .pop()
      : null
  const projectionLeadingPoint =
    secondLastHistoricalIndex != null ? graphLinePoints[secondLastHistoricalIndex] : null
  const projectionLinePoints = graphLinePoints.filter((p, i) => !p.isHistorical || i === lastHistoricalIndex)

  // First point of each year for x-axis labels (one label per year)
  const yearLabelIndices = {}
  projectionData.forEach((p, i) => {
    if (p.year && yearLabelIndices[p.year] === undefined) yearLabelIndices[p.year] = i
  })

  const historicalAreaProps =
    historicalLinePoints.length >= 2
      ? (() => {
          const first = historicalLinePoints[0]
          const last = historicalLinePoints[historicalLinePoints.length - 1]
          const curveD = buildSmoothSvgPath(historicalLinePoints)
          return {
            d: `${curveD} L ${last.x} 350 L ${first.x} 350 Z`,
            x1: first.x,
            x2: last.x
          }
        })()
      : null

  const histHGradId = `${graphAreaFillUid}-hist-h`
  const histVFeatId = `${graphAreaFillUid}-hist-vfeather`
  const histMaskId = `${graphAreaFillUid}-hist-feather-mask`

  const showPortfolioChartInWidget =
    !canAddPerformance || editingRecordIndex !== null || !showAddPerformance

  const openAddPerformanceFromChart = () => {
    if (!canAddPerformance || editingRecordIndex !== null) return
    setShowAddPerformance(true)
    setError('')
    setSuccess('')
  }

  const closeAddPerformanceToChart = () => {
    setShowAddPerformance(false)
    setError('')
    setSuccess('')
  }

  const topMetricWidgets = {
    currentBalance: { title: 'Current Balance' },
    totalGain: { title: 'Total Gain' },
    totalInvestorAccounts: { title: 'Total Investor Acc' },
    averageMonthlyInput: { title: 'Avg Monthly Input' },
    totalDeposits: { title: 'Total Deposits' },
    totalWithdrawals: { title: 'Total Withdrawals' },
    initialInvestment: { title: 'Initial Investment' },
    totalPercentageGain: { title: 'Total % Gain' }
  }

  const openTopMetricWidget = (widgetKey) => {
    setActiveTopMetricWidget(widgetKey)
  }

  const selectedTopMetricWidget = activeTopMetricWidget
    ? topMetricWidgets[activeTopMetricWidget]
    : null

  const formatCurrency = (value) =>
    `€${(Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const getSortableDateValue = (rawDate, fallbackMonth, fallbackYear) => {
    if (rawDate) {
      const parsed = new Date(rawDate)
      if (!Number.isNaN(parsed.getTime())) return parsed.getTime()
    }
    const monthIndex = MONTH_NAMES.indexOf(fallbackMonth)
    if (monthIndex >= 0 && fallbackYear) {
      return new Date(Number(fallbackYear), monthIndex, 1).getTime()
    }
    return 0
  }

  const formatDisplayDate = (rawDate, fallbackMonth, fallbackYear) => {
    if (rawDate) {
      const parsed = new Date(rawDate)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      }
    }
    if (fallbackMonth && fallbackYear) return `${fallbackMonth} ${fallbackYear}`
    return 'N/A'
  }

  const depositRows = monthlyHistoryNewestFirst
    .filter(({ record }) => (Number(record.depositAmount) || 0) > 0)
    .map(({ record, originalIndex }) => ({
      id: `deposit-${originalIndex}-${record.month}-${record.year}`,
      dateLabel: formatDisplayDate(record.depositDate, record.month, record.year),
      amount: Number(record.depositAmount) || 0
    }))

  const withdrawalRows = monthlyHistoryNewestFirst
    .filter(({ record }) => (Number(record.withdrawalAmount) || 0) > 0)
    .map(({ record, originalIndex }) => ({
      id: `withdrawal-${originalIndex}-${record.month}-${record.year}`,
      dateLabel: formatDisplayDate(record.withdrawalDate, record.month, record.year),
      amount: Number(record.withdrawalAmount) || 0
    }))

  const monthlyGainRows = monthlyHistory
    .map((record, index) => ({
      id: `gain-${index}-${record.month}-${record.year}`,
      label: `${record.month} ${record.year}`,
      gainAmount: Number(record.growthAmount) || 0,
      percentGain: Number(record.percentageGrowth) || 0,
      monthlyInput: Number(record.depositAmount) || 0
    }))
    .filter((row) => row.label.trim())

  const highestPercentageMonth = monthlyGainRows.reduce(
    (best, row) => (best == null || row.percentGain > best.percentGain ? row : best),
    null
  )
  const lowestPercentageMonth = monthlyGainRows.reduce(
    (best, row) => (best == null || row.percentGain < best.percentGain ? row : best),
    null
  )
  const averagePercentGain =
    monthlyGainRows.length > 0
      ? monthlyGainRows.reduce((sum, row) => sum + row.percentGain, 0) / monthlyGainRows.length
      : 0

  const highestMonthlyInput = monthlyGainRows.reduce(
    (best, row) => (best == null || row.monthlyInput > best.monthlyInput ? row : best),
    null
  )
  const highestMonthlyGain = monthlyGainRows.reduce(
    (best, row) => (best == null || row.gainAmount > best.gainAmount ? row : best),
    null
  )
  const lowestMonthlyGain = monthlyGainRows.reduce(
    (best, row) => (best == null || row.gainAmount < best.gainAmount ? row : best),
    null
  )
  const averageMonthlyGain =
    monthlyGainRows.length > 0
      ? monthlyGainRows.reduce((sum, row) => sum + row.gainAmount, 0) / monthlyGainRows.length
      : 0

  const currentBalanceAllocationRows = allApprovedAccountRows
    .map((row) => ({
      ...row,
      share: currentBalance > 0 ? (row.currentBalance / currentBalance) * 100 : 0
    }))
    .sort((a, b) => b.currentBalance - a.currentBalance)
    .map((row, index) => ({
      ...row,
      color: PIE_SLICE_COLORS[index % PIE_SLICE_COLORS.length]
    }))

  const pieAllocationRows = currentBalanceAllocationRows.filter((row) => row.currentBalance > 0)
  const pieTotal = pieAllocationRows.reduce((sum, row) => sum + row.currentBalance, 0)
  let pieAngle = -90
  const pieSlices = pieAllocationRows.map((row) => {
    const sweep = pieTotal > 0 ? (row.currentBalance / pieTotal) * 360 : 0
    const start = pieAngle
    const end = pieAngle + sweep
    pieAngle = end
    return { ...row, path: pieSlicePath(90, 90, 78, start, end) }
  })

  const initialInvestmentRows = [
    {
      id: 'portfolio-main',
      name: 'Main Portfolio',
      initialInvestment,
      totalDeposits,
      totalWithdrawals,
      currentBalance,
      growth: currentBalance - totalDeposits + totalWithdrawals
    },
    ...allApprovedAccountRows
  ]

  const renderTopMetricWidgetBody = () => {
    if (!activeTopMetricWidget) return null
    if (activeTopMetricWidget === 'currentBalance') {
      return (
        <div className="portfolio-widget-content-stack">
          <div className="portfolio-balance-pie-layout">
            <div className="portfolio-balance-pie-svg-wrap">
              <svg viewBox="0 0 180 180" className="portfolio-balance-pie-svg" aria-label="Current balance allocation pie chart">
                <circle cx="90" cy="90" r="78" fill="#f3f4f6" />
                {pieSlices.map((slice) => (
                  <path key={slice.id} d={slice.path} fill={slice.color} stroke="#ffffff" strokeWidth="1.5" />
                ))}
              </svg>
            </div>
            <div className="portfolio-balance-pie-legend">
              {currentBalanceAllocationRows.map((row) => (
                <div className="portfolio-balance-pie-legend-row" key={row.id}>
                  <span className="portfolio-balance-pie-dot" style={{ backgroundColor: row.color }} />
                  <span className="portfolio-balance-pie-name">{row.name}</span>
                  <span className="portfolio-balance-pie-amount">{formatCurrency(row.currentBalance)}</span>
                  <span className="portfolio-balance-pie-pct">{row.share.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (activeTopMetricWidget === 'totalInvestorAccounts') {
      return (
        <div className="portfolio-widget-content-stack">
          <div className="portfolio-widget-overview-grid">
            <span className="portfolio-widget-overview-colh">Investor</span>
            <span className="portfolio-widget-overview-colh portfolio-widget-overview-colh-num">Balance</span>
            <span className="portfolio-widget-overview-colh portfolio-widget-overview-colh-num">Monthly target</span>
            {investorTotalModalLines.map((row) => (
              <React.Fragment key={row.id}>
                <span className="portfolio-widget-overview-name">{row.name}</span>
                <span className="portfolio-widget-overview-amount">{formatCurrency(row.balance)}</span>
                <span className="portfolio-widget-overview-target">
                  {row.monthlyTarget == null ? '' : formatCurrency(row.monthlyTarget)}
                </span>
              </React.Fragment>
            ))}
          </div>
          <div className="portfolio-widget-overview-footer">
            <div className="portfolio-widget-overview-footer-line">
              <span>Total</span>
              <strong>{formatCurrency(investorTotalModalLines.reduce((s, r) => s + r.balance, 0))}</strong>
            </div>
            <div className="portfolio-widget-overview-footer-line">
              <span>Monthly payout target</span>
              <strong className="portfolio-widget-overview-target">
                {formatCurrency(sumInvestorOverviewMonthlyTargets(investorTotalModalLines))}
              </strong>
            </div>
          </div>
        </div>
      )
    }

    if (activeTopMetricWidget === 'totalDeposits' || activeTopMetricWidget === 'totalWithdrawals') {
      const rows = activeTopMetricWidget === 'totalDeposits' ? depositRows : withdrawalRows
      const amountHeader = activeTopMetricWidget === 'totalDeposits' ? 'Deposit Amount' : 'Withdrawal Amount'
      return (
        <div className="portfolio-widget-content-stack">
          <div className="portfolio-widget-table-wrap">
            <table className="portfolio-widget-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>{amountHeader}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.dateLabel}</td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (activeTopMetricWidget === 'initialInvestment') {
      return (
        <div className="portfolio-widget-content-stack">
          <div className="portfolio-widget-table-wrap">
            <table className="portfolio-widget-table">
              <thead>
                <tr>
                  <th>Investor</th>
                  <th>Initial</th>
                  <th>Deposits</th>
                  <th>Withdrawals</th>
                  <th>Current</th>
                  <th>Growth</th>
                </tr>
              </thead>
              <tbody>
                {initialInvestmentRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{formatCurrency(row.initialInvestment)}</td>
                    <td>{formatCurrency(row.totalDeposits)}</td>
                    <td>{formatCurrency(row.totalWithdrawals)}</td>
                    <td>{formatCurrency(row.currentBalance)}</td>
                    <td>{formatCurrency(row.growth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (activeTopMetricWidget === 'totalPercentageGain') {
      return (
        <div className="portfolio-widget-stat-grid">
          <div className="portfolio-widget-stat-item portfolio-widget-stat-item--green-tint">
            <span>Highest Month</span>
            <strong>{highestPercentageMonth ? `${highestPercentageMonth.label} (${highestPercentageMonth.percentGain.toFixed(2)}%)` : 'N/A'}</strong>
          </div>
          <div className="portfolio-widget-stat-item portfolio-widget-stat-item--red-tint">
            <span>Lowest Month</span>
            <strong>{lowestPercentageMonth ? `${lowestPercentageMonth.label} (${lowestPercentageMonth.percentGain.toFixed(2)}%)` : 'N/A'}</strong>
          </div>
          <div className="portfolio-widget-stat-item portfolio-widget-stat-item--blue-tint">
            <span>Average % Gain</span>
            <strong>{averagePercentGain.toFixed(2)}%</strong>
          </div>
        </div>
      )
    }

    if (activeTopMetricWidget === 'averageMonthlyInput') {
      return (
        <div className="portfolio-widget-stat-grid">
          <div className="portfolio-widget-stat-item">
            <span>Highest Amount</span>
            <strong>{highestMonthlyInput ? `${formatCurrency(highestMonthlyInput.monthlyInput)} (${highestMonthlyInput.label})` : 'N/A'}</strong>
          </div>
        </div>
      )
    }

    if (activeTopMetricWidget === 'totalGain') {
      return (
        <div className="portfolio-widget-stat-grid">
          <div className="portfolio-widget-stat-item">
            <span>Total Gain</span>
            <strong>{formatCurrency(totalGain)}</strong>
          </div>
          <div className="portfolio-widget-stat-item portfolio-widget-stat-item--red-tint">
            <span>Lowest Monthly Gain</span>
            <strong>{lowestMonthlyGain ? `${formatCurrency(lowestMonthlyGain.gainAmount)} (${lowestMonthlyGain.label})` : 'N/A'}</strong>
          </div>
          <div className="portfolio-widget-stat-item portfolio-widget-stat-item--blue-tint">
            <span>Average Monthly Gain</span>
            <strong>{formatCurrency(averageMonthlyGain)}</strong>
          </div>
          <div className="portfolio-widget-stat-item portfolio-widget-stat-item--green-tint">
            <span>Highest Monthly Gain</span>
            <strong>{highestMonthlyGain ? `${formatCurrency(highestMonthlyGain.gainAmount)} (${highestMonthlyGain.label})` : 'N/A'}</strong>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="admin-portfolio-container">
      <div className="admin-portfolio-content">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Metrics Grid */}
        <div className="portfolio-metrics-grid">
          <div
            className="metric-card metric-card--top-widget"
            role="button"
            tabIndex={0}
            onClick={() => openTopMetricWidget('currentBalance')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openTopMetricWidget('currentBalance')
              }
            }}
            aria-label="Open Current Balance widget"
          >
            <div className="metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="metric-content">
              <h4 className="metric-label">Current Balance</h4>
              <p className="metric-value">{formatCompact(currentBalance)}</p>
            </div>
          </div>

          <div
            className="metric-card metric-card--top-widget"
            role="button"
            tabIndex={0}
            onClick={() => openTopMetricWidget('totalGain')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openTopMetricWidget('totalGain')
              }
            }}
            aria-label="Open Total Gain widget"
          >
            <div className="metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
              </svg>
            </div>
            <div className="metric-content">
              <h4 className="metric-label">Total Gain</h4>
              <p className={`metric-value ${totalGain >= 0 ? 'positive' : 'negative'}`}>
                {formatCompact(totalGain)}
              </p>
            </div>
          </div>

          <div
            className="metric-card metric-card--top-widget"
            role="button"
            tabIndex={0}
            onClick={() => openTopMetricWidget('totalInvestorAccounts')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openTopMetricWidget('totalInvestorAccounts')
              }
            }}
            aria-label="Open Total Investor Accounts widget"
          >
            <div className="metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
              </svg>
            </div>
            <div className="metric-content">
              <h4 className="metric-label">Total Investor Acc</h4>
              <p className="metric-value">
                {loadingInvestorAccounts ? 'Loading...' : formatCompact(isAdmin3 ? 1850000 : totalInvestorAccounts)}
              </p>
            </div>
          </div>

          <div
            className="metric-card metric-card--top-widget"
            role="button"
            tabIndex={0}
            onClick={() => openTopMetricWidget('averageMonthlyInput')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openTopMetricWidget('averageMonthlyInput')
              }
            }}
            aria-label="Open Average Monthly Input widget"
          >
            <div className="metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="metric-content">
              <h4 className="metric-label">Avg Monthly Input</h4>
              <p className="metric-value">{formatCompact(averageMonthlyInput)}</p>
            </div>
          </div>

          <div
            className="metric-card metric-card--top-widget"
            role="button"
            tabIndex={0}
            onClick={() => openTopMetricWidget('totalDeposits')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openTopMetricWidget('totalDeposits')
              }
            }}
            aria-label="Open Total Deposits widget"
          >
            <div className="metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <div className="metric-content">
              <h4 className="metric-label">Total Deposits</h4>
              <p className="metric-value">{formatCompact(totalDeposits)}</p>
            </div>
          </div>

          <div
            className="metric-card metric-card--top-widget"
            role="button"
            tabIndex={0}
            onClick={() => openTopMetricWidget('totalWithdrawals')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openTopMetricWidget('totalWithdrawals')
              }
            }}
            aria-label="Open Total Withdrawals widget"
          >
            <div className="metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <div className="metric-content">
              <h4 className="metric-label">Total Withdrawals</h4>
              <p className="metric-value">{formatCompact(totalWithdrawals)}</p>
            </div>
          </div>

          <div
            className="metric-card metric-card--top-widget"
            role="button"
            tabIndex={0}
            onClick={() => openTopMetricWidget('initialInvestment')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openTopMetricWidget('initialInvestment')
              }
            }}
            aria-label="Open Initial Investment widget"
          >
            <div className="metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
              </svg>
            </div>
            <div className="metric-content">
              <h4 className="metric-label">Initial Investment</h4>
              <p className="metric-value">{formatCompact(initialInvestment)}</p>
            </div>
          </div>

          <div
            className="metric-card metric-card--top-widget"
            role="button"
            tabIndex={0}
            onClick={() => openTopMetricWidget('totalPercentageGain')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openTopMetricWidget('totalPercentageGain')
              }
            }}
            aria-label="Open Total percent gain widget"
          >
            <div className="metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.99 14.993 6-6m6 3.001c0 1.268-.63 2.39-1.593 3.069a3.746 3.746 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043 3.745 3.745 0 0 1-3.068 1.593c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 0 1-3.296-1.043 3.746 3.746 0 0 1-1.043-3.297 3.746 3.746 0 0 1-1.593-3.068c0-1.268.63-2.39 1.593-3.068a3.746 3.746 0 0 1 1.043-3.297 3.745 3.745 0 0 1 3.296-1.042 3.745 3.745 0 0 1 3.068-1.594c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.297 3.746 3.746 0 0 1 1.593 3.068ZM9.74 9.743h.008v.007H9.74v-.007Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
            <div className="metric-content">
              <h4 className="metric-label">Total % Gain</h4>
              <p className={`metric-value ${totalPercentageGain >= 0 ? 'positive' : 'negative'}`}>
                {totalPercentageGain.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {selectedTopMetricWidget && (
          <div
            className="portfolio-top-widget-modal-backdrop"
            role="presentation"
            onClick={() => setActiveTopMetricWidget(null)}
          >
            <div
              className={`portfolio-top-widget-modal${
                activeTopMetricWidget === 'initialInvestment'
                  ? ' portfolio-top-widget-modal--wide'
                  : ''
              }`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="portfolio-top-widget-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="portfolio-top-widget-modal-header">
                <h3 id="portfolio-top-widget-title">{selectedTopMetricWidget.title}</h3>
                <button
                  type="button"
                  className="portfolio-top-widget-modal-close"
                  onClick={() => setActiveTopMetricWidget(null)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="portfolio-top-widget-modal-body">
                {renderTopMetricWidgetBody()}
              </div>
            </div>
          </div>
        )}

        {/* Chart widget: click chart to add monthly performance; click outside the form (shell) to return */}
        <div
          className={`portfolio-graph-section${
            showPortfolioChartInWidget && canAddPerformance && editingRecordIndex === null
              ? ' portfolio-graph-section--chart-opens-add'
              : ''
          }${!showPortfolioChartInWidget ? ' portfolio-graph-section--add-form-open' : ''}`}
        >
          {showPortfolioChartInWidget ? (
            <div
              className={`graph-container${
                canAddPerformance && editingRecordIndex === null
                  ? ' graph-container--open-add-on-click'
                  : ''
              }`}
              onClick={openAddPerformanceFromChart}
              onKeyDown={(e) => {
                if (!canAddPerformance || editingRecordIndex !== null) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openAddPerformanceFromChart()
                }
              }}
              role={canAddPerformance && editingRecordIndex === null ? 'button' : undefined}
              tabIndex={canAddPerformance && editingRecordIndex === null ? 0 : undefined}
              aria-label={
                canAddPerformance && editingRecordIndex === null
                  ? 'Performance chart — open add monthly performance'
                  : undefined
              }
            >
            <svg className="investment-graph" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
              {historicalAreaProps && (
                <defs>
                  <linearGradient
                    id={histHGradId}
                    gradientUnits="userSpaceOnUse"
                    x1={historicalAreaProps.x1}
                    y1="350"
                    x2={historicalAreaProps.x2}
                    y2="350"
                  >
                    <stop offset="0%" stopColor={HISTORICAL_LINE_GREEN} stopOpacity="0.36" />
                    <stop offset="50%" stopColor={HISTORICAL_LINE_GREEN} stopOpacity="0.21" />
                    <stop offset="100%" stopColor={HISTORICAL_LINE_GREEN} stopOpacity="0" />
                  </linearGradient>
                  <linearGradient
                    id={histVFeatId}
                    gradientUnits="userSpaceOnUse"
                    x1="0"
                    y1="350"
                    x2="0"
                    y2="52"
                  >
                    <stop offset="0%" stopColor="white" stopOpacity="0" />
                    <stop offset="35%" stopColor="white" stopOpacity="0.62" />
                    <stop offset="100%" stopColor="white" stopOpacity="1" />
                  </linearGradient>
                  <mask
                    id={histMaskId}
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="800"
                    height="400"
                  >
                    <rect x="0" y="0" width="800" height="400" fill={`url(#${histVFeatId})`} />
                  </mask>
                </defs>
              )}
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const y = 50 + (ratio * 300)
                const value = minBalance + (range * (1 - ratio))
                return (
                  <g key={index}>
                    <line
                      x1="50"
                      y1={y}
                      x2="750"
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      strokeDasharray={ratio === 0 || ratio === 1 ? "0" : "2,2"}
                    />
                    <text
                      x="40"
                      y={y + 5}
                      fill="#6b7280"
                      fontSize="12"
                      textAnchor="end"
                    >
                      {formatGraphMoneyRounded(value)}
                    </text>
                  </g>
                )
              })}

              {/* Feathered fill under historical (green) segment only — fades L→R into transparent */}
              {historicalAreaProps && (
                <path
                  className="graph-historical-area-fill"
                  d={historicalAreaProps.d}
                  fill={`url(#${histHGradId})`}
                  mask={`url(#${histMaskId})`}
                  stroke="none"
                  pointerEvents="none"
                />
              )}

              {/* Historical line */}
              {projectionData.some(p => p.isHistorical) && (
                <path
                  d={buildSmoothSvgPath(historicalLinePoints)}
                  fill="none"
                  stroke={HISTORICAL_LINE_GREEN}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              
              {/* Projection line */}
              {projectionData.some(p => !p.isHistorical) && (
                <path
                  d={buildSmoothSvgPath(projectionLinePoints, 0.15, projectionLeadingPoint)}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeDasharray="5,5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              
              {/* Data points */}
              {projectionData.map((point, index) => {
                const totalPoints = projectionData.length
                const xSpan = Math.max(totalPoints - 1, 1)
                const x = 50 + (index * (700 / xSpan))
                const y = 350 - ((point.balance - minBalance) / range * 300)
                const showAmount = index % 6 === 0
                const showYearLabel = point.year && yearLabelIndices[point.year] === index
                const { dx, dy } = getGraphAmountLabelOffset(
                  index,
                  totalPoints,
                  x,
                  y,
                  !point.isHistorical
                )
                return (
                  <g key={index}>
                    {showAmount && (
                      <text
                        className="graph-amount-label"
                        x={x + dx}
                        y={y + dy}
                        fontSize="11"
                        textAnchor="middle"
                        fontWeight="600"
                      >
                        {formatGraphMoneyRounded(point.balance)}
                      </text>
                    )}
                    {showYearLabel && (
                      <text
                        x={x}
                        y={380}
                        fill="#6b7280"
                        fontSize="12"
                        textAnchor="middle"
                        fontWeight="500"
                      >
                        {point.year}
                      </text>
                    )}
                  </g>
                )
              })}
              
            </svg>
            </div>
          ) : (
            <div
              className="admin-portfolio-add-widget-shell"
              onClick={closeAddPerformanceToChart}
              role="presentation"
            >
              <div
                className="add-performance-section add-performance-section--in-chart-widget"
                onClick={(e) => e.stopPropagation()}
              >
                <form onSubmit={handleAddPerformance} className="performance-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="month">Select Month</label>
                      <select
                        id="month"
                        name="month"
                        value={monthlyUpdate.month}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">—</option>
                        <option value="January">January</option>
                        <option value="February">February</option>
                        <option value="March">March</option>
                        <option value="April">April</option>
                        <option value="May">May</option>
                        <option value="June">June</option>
                        <option value="July">July</option>
                        <option value="August">August</option>
                        <option value="September">September</option>
                        <option value="October">October</option>
                        <option value="November">November</option>
                        <option value="December">December</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="year">Select Year</label>
                      <input
                        type="number"
                        id="year"
                        name="year"
                        value={monthlyUpdate.year}
                        onChange={handleInputChange}
                        min="2020"
                        max={new Date().getFullYear() + 1}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="percentageGrowth">Growth Rate</label>
                      <input
                        type="number"
                        id="percentageGrowth"
                        name="percentageGrowth"
                        value={monthlyUpdate.percentageGrowth}
                        onChange={handleInputChange}
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group form-group--cashflow">
                      <label>Deposit entries</label>
                      <div className="cashflow-entry-list">
                        {(monthlyUpdate.depositEntries || [{ amount: '', date: '' }]).map((entry, index) => (
                          <div className="cashflow-entry-row" key={`deposit-entry-${index}`}>
                            <input
                              type="number"
                              value={entry.amount || ''}
                              onChange={(e) => handleCashflowEntryChange('deposit', index, 'amount', e.target.value)}
                              step="0.01"
                              min="0"
                              placeholder="Amount"
                            />
                            <input
                              type="date"
                              value={entry.date || ''}
                              onChange={(e) => handleCashflowEntryChange('deposit', index, 'date', e.target.value)}
                            />
                            {index === (monthlyUpdate.depositEntries || [{ amount: '', date: '' }]).length - 1 && (
                              <div className="cashflow-entry-actions">
                                <button
                                  type="button"
                                  className="cashflow-entry-action-btn"
                                  onClick={() => handleAddCashflowEntry('deposit')}
                                  aria-label="Add another deposit"
                                  title="Add another deposit"
                                >
                                  +
                                </button>
                                {(monthlyUpdate.depositEntries || [{ amount: '', date: '' }]).length > 1 && (
                                  <button
                                    type="button"
                                    className="cashflow-entry-action-btn"
                                    onClick={() => handleRemoveCashflowEntry('deposit', index)}
                                    aria-label="Remove deposit entry"
                                    title="Remove deposit entry"
                                  >
                                    -
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="form-group form-group--cashflow">
                      <label>Withdrawal entries</label>
                      <div className="cashflow-entry-list">
                        {(monthlyUpdate.withdrawalEntries || [{ amount: '', date: '' }]).map((entry, index) => (
                          <div className="cashflow-entry-row" key={`withdrawal-entry-${index}`}>
                            <input
                              type="number"
                              value={entry.amount || ''}
                              onChange={(e) => handleCashflowEntryChange('withdrawal', index, 'amount', e.target.value)}
                              step="0.01"
                              min="0"
                              placeholder="Amount"
                            />
                            <input
                              type="date"
                              value={entry.date || ''}
                              onChange={(e) => handleCashflowEntryChange('withdrawal', index, 'date', e.target.value)}
                            />
                            {index === (monthlyUpdate.withdrawalEntries || [{ amount: '', date: '' }]).length - 1 && (
                              <div className="cashflow-entry-actions">
                                <button
                                  type="button"
                                  className="cashflow-entry-action-btn"
                                  onClick={() => handleAddCashflowEntry('withdrawal')}
                                  aria-label="Add another withdrawal"
                                  title="Add another withdrawal"
                                >
                                  +
                                </button>
                                {(monthlyUpdate.withdrawalEntries || [{ amount: '', date: '' }]).length > 1 && (
                                  <button
                                    type="button"
                                    className="cashflow-entry-action-btn"
                                    onClick={() => handleRemoveCashflowEntry('withdrawal', index)}
                                    aria-label="Remove withdrawal entry"
                                    title="Remove withdrawal entry"
                                  >
                                    -
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="form-group form-group--growth-save">
                      <label htmlFor="growthAmountExact">Growth amount</label>
                      <input
                        type="number"
                        id="growthAmountExact"
                        name="growthAmountExact"
                        value={monthlyUpdate.growthAmountExact}
                        onChange={handleInputChange}
                        step="0.01"
                      />
                      <button
                        id="save-monthly-widget"
                        type="submit"
                        className="btn-submit btn-submit--monthly-widget"
                        aria-label="Save monthly performance"
                        disabled={
                          loadingMonthlyUpdate ||
                          !monthlyUpdate.month ||
                          !monthlyUpdate.year ||
                          (!String(monthlyUpdate.percentageGrowth ?? '').trim() &&
                            !String(monthlyUpdate.growthAmountExact ?? '').trim())
                        }
                      >
                        {loadingMonthlyUpdate ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>

                  {monthlyUpdate.month &&
                    monthlyUpdate.year &&
                    (String(monthlyUpdate.percentageGrowth ?? '').trim() ||
                      String(monthlyUpdate.growthAmountExact ?? '').trim()) &&
                    (() => {
                    const getDaysInMonth = (month, year) => {
                      const monthIndex = [
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                      ].indexOf(month)
                      return new Date(year, monthIndex + 1, 0).getDate()
                    }

                    const calculateProratedGrowth = (amount, percentageGrowth, date, month, year) => {
                      if (!date || !month || !year || amount === 0) return 0
                      const depositDate = new Date(date)
                      const dayOfMonth = depositDate.getDate()
                      const daysInMonth = getDaysInMonth(month, parseInt(year))
                      let daysRemaining = daysInMonth - dayOfMonth + 1
                      if (dayOfMonth === daysInMonth) {
                        daysRemaining = 0
                      }
                      const proratedRatio = daysRemaining / daysInMonth
                      return amount * (percentageGrowth / 100) * proratedRatio
                    }

                    const calculateWithdrawalGrowthLoss = (amount, percentageGrowth, date, month, year) => {
                      if (!date || !month || !year || amount === 0) return 0
                      const withdrawalDate = new Date(date)
                      const dayOfMonth = withdrawalDate.getDate()
                      const daysInMonth = getDaysInMonth(month, parseInt(year))
                      const daysRemaining = daysInMonth - dayOfMonth
                      const proratedRatio = daysRemaining / daysInMonth
                      return amount * (percentageGrowth / 100) * proratedRatio
                    }

                    const startingBalance = currentBalance
                    const previewExactStr = String(monthlyUpdate.growthAmountExact ?? '').trim()
                    const previewPctStr = String(monthlyUpdate.percentageGrowth ?? '').trim()
                    const previewHasExact = previewExactStr !== ''
                    let percentageGrowth
                    let baseGrowth
                    if (previewHasExact) {
                      baseGrowth = parseFloat(previewExactStr) || 0
                      percentageGrowth =
                        startingBalance > 0 ? (baseGrowth / startingBalance) * 100 : 0
                    } else {
                      percentageGrowth = parseFloat(previewPctStr) || 0
                      baseGrowth = startingBalance * (percentageGrowth / 100)
                    }
                    const depositAmount = parseFloat(monthlyUpdate.depositAmount) || 0
                    const withdrawalAmount = parseFloat(monthlyUpdate.withdrawalAmount) || 0

                    const depositGrowth = calculateProratedGrowth(
                      depositAmount,
                      percentageGrowth,
                      monthlyUpdate.depositDate,
                      monthlyUpdate.month,
                      monthlyUpdate.year
                    )

                    const withdrawalGrowth = calculateWithdrawalGrowthLoss(
                      withdrawalAmount,
                      percentageGrowth,
                      monthlyUpdate.withdrawalDate,
                      monthlyUpdate.month,
                      monthlyUpdate.year
                    )

                    const finalBalance =
                      startingBalance +
                      baseGrowth +
                      depositAmount +
                      depositGrowth -
                      withdrawalAmount -
                      withdrawalGrowth

                    return (
                      <div className="update-preview">
                        <h5>Update Preview:</h5>
                        <div className="preview-grid">
                          <div className="preview-item">
                            <span>Starting Balance:</span>
                            <span>
                              €
                              {startingBalance.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </span>
                          </div>
                          <div className="preview-item">
                            <span>
                              {previewHasExact
                                ? `Growth (exact €, ≈${percentageGrowth.toFixed(2)}%):`
                                : `Growth (${percentageGrowth}%):`}
                            </span>
                            <span>
                              €
                              {baseGrowth.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </span>
                          </div>
                          {depositAmount > 0 && (
                            <>
                              <div className="preview-item">
                                <span>Deposit:</span>
                                <span>
                                  +€
                                  {depositAmount.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </span>
                              </div>
                              {depositGrowth > 0 && (
                                <div className="preview-item">
                                  <span>Deposit Growth:</span>
                                  <span>
                                    +€
                                    {depositGrowth.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                          {withdrawalAmount > 0 && (
                            <>
                              <div className="preview-item">
                                <span>Withdrawal:</span>
                                <span>
                                  -€
                                  {withdrawalAmount.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </span>
                              </div>
                              {withdrawalGrowth > 0 && (
                                <div className="preview-item">
                                  <span>Withdrawal Growth Loss:</span>
                                  <span>
                                    -€
                                    {withdrawalGrowth.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                          <div className="preview-item preview-total">
                            <span>Final Balance:</span>
                            <span>
                              €
                              {finalBalance.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                </form>
              </div>
            </div>
          )}
        </div>

        {editingRecordIndex !== null && canAddPerformance && (
          <div
            ref={portfolioEditBelowChartRef}
            className="portfolio-edit-below-chart"
          >
            <div className="add-performance-section add-performance-section--in-chart-widget add-performance-section--edit-monthly-widget">
              <div className="portfolio-edit-monthly-header">
                <span className="portfolio-edit-monthly-title">Edit monthly performance</span>
                <button
                  type="button"
                  className="portfolio-edit-monthly-close"
                  aria-label="Close"
                  onClick={handleCancelEdit}
                  disabled={loadingEdit}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSaveEdit} className="performance-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-month">Select Month</label>
                    <select
                      id="edit-month"
                      name="month"
                      value={editFormData.month}
                      onChange={handleEditInputChange}
                      required
                    >
                      <option value="">—</option>
                      <option value="January">January</option>
                      <option value="February">February</option>
                      <option value="March">March</option>
                      <option value="April">April</option>
                      <option value="May">May</option>
                      <option value="June">June</option>
                      <option value="July">July</option>
                      <option value="August">August</option>
                      <option value="September">September</option>
                      <option value="October">October</option>
                      <option value="November">November</option>
                      <option value="December">December</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-year">Select Year</label>
                    <input
                      type="number"
                      id="edit-year"
                      name="year"
                      value={editFormData.year}
                      onChange={handleEditInputChange}
                      min="2020"
                      max={new Date().getFullYear() + 1}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-percentageGrowth">Growth Rate</label>
                    <input
                      type="number"
                      id="edit-percentageGrowth"
                      name="percentageGrowth"
                      value={editFormData.percentageGrowth}
                      onChange={handleEditInputChange}
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group form-group--cashflow">
                    <label>Deposit entries</label>
                    <div className="cashflow-entry-list">
                      {(editFormData.depositEntries || [{ amount: '', date: '' }]).map((entry, index) => (
                        <div className="cashflow-entry-row" key={`edit-deposit-entry-${index}`}>
                          <input
                            type="number"
                            value={entry.amount || ''}
                            onChange={(e) => handleEditCashflowEntryChange('deposit', index, 'amount', e.target.value)}
                            step="0.01"
                            min="0"
                            placeholder="Amount"
                          />
                          <input
                            type="date"
                            value={entry.date || ''}
                            onChange={(e) => handleEditCashflowEntryChange('deposit', index, 'date', e.target.value)}
                          />
                          {index === (editFormData.depositEntries || [{ amount: '', date: '' }]).length - 1 && (
                            <div className="cashflow-entry-actions">
                              <button
                                type="button"
                                className="cashflow-entry-action-btn"
                                onClick={() => handleAddEditCashflowEntry('deposit')}
                                aria-label="Add another deposit"
                                title="Add another deposit"
                              >
                                +
                              </button>
                              {(editFormData.depositEntries || [{ amount: '', date: '' }]).length > 1 && (
                                <button
                                  type="button"
                                  className="cashflow-entry-action-btn"
                                  onClick={() => handleRemoveEditCashflowEntry('deposit', index)}
                                  aria-label="Remove deposit entry"
                                  title="Remove deposit entry"
                                >
                                  -
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group form-group--cashflow">
                    <label>Withdrawal entries</label>
                    <div className="cashflow-entry-list">
                      {(editFormData.withdrawalEntries || [{ amount: '', date: '' }]).map((entry, index) => (
                        <div className="cashflow-entry-row" key={`edit-withdrawal-entry-${index}`}>
                          <input
                            type="number"
                            value={entry.amount || ''}
                            onChange={(e) => handleEditCashflowEntryChange('withdrawal', index, 'amount', e.target.value)}
                            step="0.01"
                            min="0"
                            placeholder="Amount"
                          />
                          <input
                            type="date"
                            value={entry.date || ''}
                            onChange={(e) => handleEditCashflowEntryChange('withdrawal', index, 'date', e.target.value)}
                          />
                          {index === (editFormData.withdrawalEntries || [{ amount: '', date: '' }]).length - 1 && (
                            <div className="cashflow-entry-actions">
                              <button
                                type="button"
                                className="cashflow-entry-action-btn"
                                onClick={() => handleAddEditCashflowEntry('withdrawal')}
                                aria-label="Add another withdrawal"
                                title="Add another withdrawal"
                              >
                                +
                              </button>
                              {(editFormData.withdrawalEntries || [{ amount: '', date: '' }]).length > 1 && (
                                <button
                                  type="button"
                                  className="cashflow-entry-action-btn"
                                  onClick={() => handleRemoveEditCashflowEntry('withdrawal', index)}
                                  aria-label="Remove withdrawal entry"
                                  title="Remove withdrawal entry"
                                >
                                  -
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group form-group--growth-save">
                    <label htmlFor="edit-growthAmountExact">Growth amount</label>
                    <input
                      type="number"
                      id="edit-growthAmountExact"
                      name="growthAmountExact"
                      value={editFormData.growthAmountExact}
                      onChange={handleEditInputChange}
                      step="0.01"
                    />
                    <div className="portfolio-edit-form-actions">
                      <button
                        id="save-edit-monthly-widget"
                        type="submit"
                        className="btn-submit btn-submit--monthly-widget"
                        aria-label="Save monthly performance"
                        disabled={
                          loadingEdit ||
                          !String(editFormData.month ?? '').trim() ||
                          !String(editFormData.year ?? '').trim() ||
                          (!String(editFormData.percentageGrowth ?? '').trim() &&
                            !String(editFormData.growthAmountExact ?? '').trim())
                        }
                      >
                        {loadingEdit ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="btn-delete portfolio-edit-eliminate-btn"
                        onClick={handleDeleteEditRecord}
                        disabled={loadingEdit}
                      >
                        {loadingEdit ? 'Working...' : 'Eliminate'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Monthly History Section */}
        {monthlyHistory.length > 0 && (
          <div className="portfolio-history-section">
            <div className="history-container">
              <div className={`history-table ${canAddPerformance ? 'with-actions' : ''}`}>
                <div className="history-header">
                  <div>Month/Year</div>
                  <div>Growth %</div>
                  <div>Growth Amount</div>
                  <div>Deposit</div>
                  <div>Withdrawal</div>
                  <div>Ending Balance</div>
                  {canAddPerformance && <div>Actions</div>}
                </div>
                {monthlyHistoryNewestFirst.map(({ record, originalIndex }) => (
                  <div
                    key={`${originalIndex}-${record.month}-${record.year}`}
                    className={`history-row ${editingRecordIndex === originalIndex ? 'editing' : ''}`}
                  >
                    <div>{record.month} {record.year}</div>
                    <div>{record.percentageGrowth}%</div>
                    <div>€{record.growthAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
                    <div>{record.depositAmount > 0 ? `€${record.depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</div>
                    <div>{record.withdrawalAmount > 0 ? `€${record.withdrawalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</div>
                    <div>€{record.endingBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
                    {canAddPerformance && (
                      <div>
                        <button
                          className="btn-edit-record"
                          onClick={() => handleEditRecord(originalIndex)}
                          disabled={editingRecordIndex !== null && editingRecordIndex !== originalIndex}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPortfolio

