import { collectMonthTrades } from './adminDailyPerformance'
import {
  TRANCHE_PRIMARY,
  TRANCHE_SECONDARY,
  getLastTrancheEnding,
  getInvestorMonthNetPayoutAmount,
  investorHasDualTranche,
  sortInvestorMonthlyHistory
} from './investorDualTranche'
import { getCalendarDayOfMonth } from './monthlyCashflowProration'

export const PARTNER_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function round2(n) {
  return Math.round(n * 100) / 100
}

function monthYearSortKey(monthName, year) {
  const monthIndex = PARTNER_MONTH_NAMES.indexOf(monthName)
  const y = parseInt(String(year), 10)
  if (monthIndex < 0 || !Number.isFinite(y)) return 0
  return y * 12 + monthIndex
}

function getPreviousMonthContext(monthName, year) {
  const monthIndex = PARTNER_MONTH_NAMES.indexOf(monthName)
  const y = parseInt(String(year), 10)
  if (monthIndex <= 0) {
    return { monthName: PARTNER_MONTH_NAMES[11], year: y - 1, monthIndex: 11 }
  }
  return { monthName: PARTNER_MONTH_NAMES[monthIndex - 1], year: y, monthIndex: monthIndex - 1 }
}

function historyUpToMonth(history, monthName, year) {
  const cutoff = monthYearSortKey(monthName, year)
  return sortInvestorMonthlyHistory(history).filter(
    (r) => monthYearSortKey(r.month, r.year) <= cutoff
  )
}

function getInvestorEndingAtMonth(investmentData, monthName, year) {
  if (!investmentData) return 0
  const history = investmentData.monthlyHistory || []
  const histUntil = historyUpToMonth(history, monthName, year)
  const primaryInit = Number(investmentData.initialInvestment) || 0
  const secondaryInit = Number(investmentData.secondaryInvestment?.initialInvestment) || 0

  if (investorHasDualTranche(investmentData)) {
    const hasTrancheRows = histUntil.some((r) => r.tranche === TRANCHE_PRIMARY || r.tranche === TRANCHE_SECONDARY)
    if (hasTrancheRows) {
      return (
        getLastTrancheEnding(histUntil, TRANCHE_PRIMARY, primaryInit) +
        getLastTrancheEnding(histUntil, TRANCHE_SECONDARY, secondaryInit)
      )
    }
  }

  const untagged = histUntil.filter((r) => !r.tranche)
  if (untagged.length > 0) {
    return Number(untagged[untagged.length - 1].endingBalance) || primaryInit
  }
  return primaryInit + (investorHasDualTranche(investmentData) ? secondaryInit : 0)
}

function extractCashflowEntries(record) {
  const deposits = []
  const withdrawals = []
  if (!record) return { deposits, withdrawals }

  if (Array.isArray(record.depositEntries) && record.depositEntries.length > 0) {
    record.depositEntries.forEach((entry) => {
      const amount = Number(entry?.amount) || 0
      if (amount > 0 && entry?.date) deposits.push({ amount, date: entry.date })
    })
  } else if (record.depositAmount && record.depositDate) {
    deposits.push({ amount: Number(record.depositAmount) || 0, date: record.depositDate })
  }

  if (Array.isArray(record.withdrawalEntries) && record.withdrawalEntries.length > 0) {
    record.withdrawalEntries.forEach((entry) => {
      const amount = Number(entry?.amount) || 0
      if (amount > 0 && entry?.date) withdrawals.push({ amount, date: entry.date })
    })
  } else if (record.withdrawalAmount && record.withdrawalDate) {
    withdrawals.push({ amount: Number(record.withdrawalAmount) || 0, date: record.withdrawalDate })
  }

  return { deposits, withdrawals }
}

function cashflowDeltaBeforeDay(records, day) {
  let delta = 0
  for (const record of records) {
    const { deposits, withdrawals } = extractCashflowEntries(record)
    deposits.forEach(({ amount, date }) => {
      const dom = getCalendarDayOfMonth(date)
      if (dom != null && dom < day) delta += amount
    })
    withdrawals.forEach(({ amount, date }) => {
      const dom = getCalendarDayOfMonth(date)
      if (dom != null && dom < day) delta -= amount
    })
  }
  return delta
}

function getMonthRecords(investmentData, monthName, year) {
  const history = investmentData?.monthlyHistory || []
  return history.filter(
    (r) => r?.month === monthName && parseInt(String(r?.year), 10) === parseInt(String(year), 10)
  )
}

/** Balance at start of trade day (before that day's cashflows). */
export function getInvestorBalanceAsOfTradeDay(investor, monthName, year, day) {
  const investmentData = investor?.investmentData
  if (!investmentData) return 0

  const prev = getPreviousMonthContext(monthName, year)
  let base = getInvestorEndingAtMonth(investmentData, prev.monthName, prev.year)

  const monthRecords = getMonthRecords(investmentData, monthName, year)
  if (monthRecords.length === 0) return Math.max(0, base)

  if (investorHasDualTranche(investmentData)) {
    const primaryRecord = monthRecords.find((r) => r.tranche === TRANCHE_PRIMARY)
    const secondaryRecord = monthRecords.find((r) => r.tranche === TRANCHE_SECONDARY)
    if (primaryRecord || secondaryRecord) {
      const primaryInit = Number(investmentData.initialInvestment) || 0
      const secondaryInit = Number(investmentData.secondaryInvestment?.initialInvestment) || 0
      const histUntilPrev = historyUpToMonth(investmentData.monthlyHistory || [], prev.monthName, prev.year)
      const primaryBase = primaryRecord
        ? getLastTrancheEnding(histUntilPrev, TRANCHE_PRIMARY, primaryInit)
        : getLastTrancheEnding(histUntilPrev, TRANCHE_PRIMARY, primaryInit)
      const secondaryBase = secondaryRecord
        ? getLastTrancheEnding(histUntilPrev, TRANCHE_SECONDARY, secondaryInit)
        : getLastTrancheEnding(histUntilPrev, TRANCHE_SECONDARY, secondaryInit)
      const primaryDelta = primaryRecord ? cashflowDeltaBeforeDay([primaryRecord], day) : 0
      const secondaryDelta = secondaryRecord ? cashflowDeltaBeforeDay([secondaryRecord], day) : 0
      return Math.max(0, primaryBase + primaryDelta + secondaryBase + secondaryDelta)
    }
  }

  base = getInvestorEndingAtMonth(investmentData, prev.monthName, prev.year)
  const delta = cashflowDeltaBeforeDay(monthRecords.filter((r) => !r.tranche), day)
  if (delta === 0 && monthRecords.some((r) => r.tranche)) {
    return Math.max(0, base + cashflowDeltaBeforeDay(monthRecords, day))
  }
  return Math.max(0, base + delta)
}

export function getPartnerSphereBalanceAsOfDay(partner, investors, monthName, year, day) {
  const own = getInvestorBalanceAsOfTradeDay(partner, monthName, year, day)
  const managedIds = Array.isArray(partner?.managedInvestorIds) ? partner.managedInvestorIds : []
  const managed = investors
    .filter((inv) => managedIds.includes(inv.id))
    .reduce((sum, inv) => sum + getInvestorBalanceAsOfTradeDay(inv, monthName, year, day), 0)
  return own + managed
}

export function computePartnerGainShareAsOfDay(partnerId, partners, investors, monthName, year, day) {
  const spheres = partners.map((partner) => ({
    partnerId: partner.id,
    sphere: getPartnerSphereBalanceAsOfDay(partner, investors, monthName, year, day)
  }))
  const totalSphere = spheres.reduce((sum, row) => sum + row.sphere, 0)
  if (totalSphere <= 0) {
    return partners.length > 0 ? 1 / partners.length : 0
  }
  const row = spheres.find((s) => s.partnerId === partnerId)
  return row ? row.sphere / totalSphere : 0
}

export function getPartnerSphereBalance(partner, investors, getBalance) {
  const own = Math.max(0, getBalance(partner) || 0)
  const managedIds = Array.isArray(partner?.managedInvestorIds) ? partner.managedInvestorIds : []
  const managed = investors
    .filter((inv) => managedIds.includes(inv.id))
    .reduce((sum, inv) => sum + Math.max(0, getBalance(inv) || 0), 0)
  return own + managed
}

export function computePartnerGainShares(partners, investors, getBalance) {
  const rows = partners.map((partner) => ({
    partnerId: partner.id,
    sphere: getPartnerSphereBalance(partner, investors, getBalance)
  }))
  const totalSphere = rows.reduce((sum, row) => sum + row.sphere, 0)
  return rows.map((row) => ({
    ...row,
    sharePct: totalSphere > 0 ? row.sphere / totalSphere : (partners.length > 0 ? 1 / partners.length : 0)
  }))
}

export function collectCurrentMonthInvestorPayouts(investors, monthName, year, isPartnerUser) {
  const entries = []
  for (const inv of investors || []) {
    if (isPartnerUser(inv)) continue
    const { amount, trancheBreakdown } = getInvestorMonthNetPayoutAmount(
      inv?.investmentData,
      monthName,
      year
    )
    if (Math.abs(amount) < 0.005) continue
    entries.push({
      id: inv.id,
      name: inv.displayName || inv.email || 'Investor',
      amount,
      trancheBreakdown
    })
  }
  entries.sort((a, b) => a.name.localeCompare(b.name))
  const total = round2(entries.reduce((sum, entry) => sum + entry.amount, 0))
  return { entries, total }
}

export function computePartnerMonthFinancials({
  selectedPartnerId,
  partners,
  investors,
  dailyPerformances,
  getBalance,
  monthName,
  year,
  isPartnerUser,
  useDateBasedGainShares = true
}) {
  const { trades, totalGains } = collectMonthTrades(dailyPerformances)
  const { entries: payoutEntries, total: totalPayouts } = collectCurrentMonthInvestorPayouts(
    investors,
    monthName,
    year,
    isPartnerUser
  )

  const partnerCount = Math.max(1, partners.length)
  const partnerPayoutSharePct = 1 / partnerCount
  const partnerPayouts = round2(-totalPayouts * partnerPayoutSharePct)

  let tradesWithPartnerShare
  let partnerGains

  if (useDateBasedGainShares) {
    tradesWithPartnerShare = trades.map((trade) => {
      const sharePct = computePartnerGainShareAsOfDay(
        selectedPartnerId,
        partners,
        investors,
        monthName,
        year,
        trade.day
      )
      return {
        ...trade,
        gainSharePct: round2(sharePct * 100),
        partnerShare: round2(trade.netSigned * sharePct)
      }
    })
    partnerGains = round2(tradesWithPartnerShare.reduce((sum, t) => sum + t.partnerShare, 0))
  } else {
    const gainShares = computePartnerGainShares(partners, investors, getBalance)
    const selectedGainShare = gainShares.find((row) => row.partnerId === selectedPartnerId)
    const partnerGainSharePct = selectedGainShare?.sharePct ?? 0
    tradesWithPartnerShare = trades.map((trade) => ({
      ...trade,
      gainSharePct: round2(partnerGainSharePct * 100),
      partnerShare: round2(trade.netSigned * partnerGainSharePct)
    }))
    partnerGains = round2(totalGains * partnerGainSharePct)
  }

  const partnerNet = round2(partnerGains + partnerPayouts)
  const partnerGainSharePct =
    Math.abs(totalGains) > 0.005 ? round2((partnerGains / totalGains) * 100) : 0

  const gainShares = computePartnerGainShares(partners, investors, getBalance)
  const currentGainSharePct =
    (gainShares.find((row) => row.partnerId === selectedPartnerId)?.sharePct ?? 0) * 100

  return {
    trades: tradesWithPartnerShare,
    totalGains,
    partnerGains,
    partnerGainSharePct,
    currentGainSharePct,
    payoutEntries,
    totalPayouts,
    partnerPayouts,
    partnerPayoutSharePct: partnerPayoutSharePct * 100,
    partnerNet,
    partnerCount,
    gainShares
  }
}

const PARTNER_HISTORY_MAX_MONTHS = 12

/** Rolling window: current month and the prior 11 months, newest first. */
export function collectAvailablePartnerHistoryMonths(
  _investors,
  _adminMonthlyHistory = [],
  referenceDate = new Date()
) {
  const nowMonthIndex = referenceDate.getMonth()
  const nowYear = referenceDate.getFullYear()
  const months = []

  for (let i = 0; i < PARTNER_HISTORY_MAX_MONTHS; i += 1) {
    const d = new Date(nowYear, nowMonthIndex - i, 1)
    const monthIndex = d.getMonth()
    const year = d.getFullYear()
    const monthName = PARTNER_MONTH_NAMES[monthIndex]
    months.push({
      monthName,
      year,
      monthIndex,
      sortKey: monthYearSortKey(monthName, year)
    })
  }

  return months
}

export function monthHistoryKey(monthName, year) {
  return `${year}_${monthName}`
}
