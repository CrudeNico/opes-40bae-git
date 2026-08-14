import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { saveAdmin3UserOverride } from './admin3Overrides'
import { computePartnerMonthFinancials } from './partnerManagementMonth'
import { fetchCurrentMonthPartnerDailyPerformances } from './partnerDailyPerformance'
import {
  TRANCHE_PRIMARY,
  getLastTrancheEnding,
  getRecordTrancheStartingBalance,
  investorHasDualTranche,
  resolveInvestorCurrentBalance
} from './investorDualTranche'
import {
  calculateProratedDepositGrowth,
  calculateWithdrawalGrowthLoss
} from './monthlyCashflowProration'
import {
  isManualEndingBalanceRecord,
  reconcileManualEndingRecord,
  roundPercentageGrowth
} from './monthlyRecordBalance'

function round2(n) {
  return Math.round(n * 100) / 100
}

export function findPartnerMonthRecordIndex(monthlyHistory, monthName, year) {
  const y = parseInt(String(year), 10)
  const history = monthlyHistory || []
  let idx = history.findIndex(
    (r) => r?.month === monthName && parseInt(String(r?.year), 10) === y && !r?.tranche
  )
  if (idx < 0) {
    idx = history.findIndex(
      (r) => r?.month === monthName && parseInt(String(r?.year), 10) === y
    )
  }
  return idx
}

function getPartnerStartingBalance(investmentData) {
  const primaryInit = Number(investmentData?.initialInvestment) || 0
  const secondaryInit = Number(investmentData?.secondaryInvestment?.initialInvestment) || 0
  const mh = investmentData?.monthlyHistory || []
  const hasDual = investorHasDualTranche(investmentData)

  if (hasDual) {
    return getLastTrancheEnding(mh, TRANCHE_PRIMARY, primaryInit)
  }

  const untagged = mh.filter((r) => !r.tranche)
  if (untagged.length > 0) {
    const last = untagged[untagged.length - 1]
    return Number(last?.endingBalance) || primaryInit
  }

  const cb = Number(investmentData?.currentBalance)
  if (Number.isFinite(cb)) return cb

  return primaryInit
}

function normalizeCashflowEntries(record) {
  const depositEntries =
    Array.isArray(record?.depositEntries) && record.depositEntries.length > 0
      ? record.depositEntries.map((entry) => ({
          amount: Number(entry?.amount) || 0,
          date: entry?.date || null
        }))
      : record?.depositAmount
        ? [{ amount: Number(record.depositAmount) || 0, date: record.depositDate || null }]
        : []

  const withdrawalEntries =
    Array.isArray(record?.withdrawalEntries) && record.withdrawalEntries.length > 0
      ? record.withdrawalEntries.map((entry) => ({
          amount: Number(entry?.amount) || 0,
          date: entry?.date || null
        }))
      : record?.withdrawalAmount
        ? [{ amount: Number(record.withdrawalAmount) || 0, date: record.withdrawalDate || null }]
        : []

  return { depositEntries, withdrawalEntries }
}

export function isPartnerLedgerRecord(record) {
  return record?.partnerNetAutoSync === true || record?.partnerNetAutoSync === false
}

export function buildPartnerMonthLedgerRecord({
  month,
  year,
  startingBalance,
  growthAmount,
  depositEntries,
  withdrawalEntries,
  tranche,
  partnerNetAutoSync,
  existingRecord
}) {
  const deposits = depositEntries || []
  const withdrawals = withdrawalEntries || []
  const depositAmount = round2(deposits.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0))
  const withdrawalAmount = round2(
    withdrawals.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
  )
  const start = round2(Number(startingBalance) || 0)
  const growth = round2(Number(growthAmount) || 0)
  const percentageGrowth = start > 0 ? roundPercentageGrowth((growth / start) * 100) : 0
  const endingBalance = round2(start + growth + depositAmount - withdrawalAmount)

  return {
    month,
    year: String(year),
    startingBalance: start,
    growthAmount: growth,
    percentageGrowth,
    depositGrowth: 0,
    withdrawalGrowthLoss: 0,
    endingBalance,
    depositAmount,
    depositDate: deposits[0]?.date || null,
    withdrawalAmount,
    withdrawalDate: withdrawals[0]?.date || null,
    depositEntries: deposits,
    withdrawalEntries: withdrawals,
    partnerNetAutoSync:
      partnerNetAutoSync !== undefined
        ? partnerNetAutoSync
        : existingRecord?.partnerNetAutoSync ?? false,
    updatedAt: new Date().toISOString(),
    ...(tranche ? { tranche } : {})
  }
}

function recalculateHistoryFromIndex(history, startIndex, investmentData) {
  const updated = [...history]
  const editedTranche = updated[startIndex]?.tranche || null

  for (let i = startIndex; i < updated.length; i += 1) {
    const currentRecord = updated[i]
    if (editedTranche) {
      if (currentRecord.tranche !== editedTranche) continue
    } else if (currentRecord.tranche) {
      continue
    }

    const trancheStart = getRecordTrancheStartingBalance(updated, i, investmentData)
    const { depositEntries, withdrawalEntries } = normalizeCashflowEntries(currentRecord)
    const depAmount = depositEntries.reduce((sum, entry) => sum + entry.amount, 0)
    const wdAmount = withdrawalEntries.reduce((sum, entry) => sum + entry.amount, 0)

    if (isManualEndingBalanceRecord(currentRecord)) {
      updated[i] = reconcileManualEndingRecord(currentRecord, trancheStart)
      continue
    }

    if (isPartnerLedgerRecord(currentRecord)) {
      const monthGrowth = round2(Number(currentRecord.growthAmount) || 0)
      const runningBalance = round2(trancheStart + monthGrowth + depAmount - wdAmount)
      const percentageGrowth =
        trancheStart > 0 ? roundPercentageGrowth((monthGrowth / trancheStart) * 100) : 0

      updated[i] = {
        ...currentRecord,
        startingBalance: round2(trancheStart),
        growthAmount: monthGrowth,
        percentageGrowth,
        endingBalance: runningBalance,
        depositAmount: depAmount,
        depositDate: depositEntries[0]?.date || null,
        withdrawalAmount: wdAmount,
        withdrawalDate: withdrawalEntries[0]?.date || null,
        depositGrowth: 0,
        withdrawalGrowthLoss: 0,
        depositEntries,
        withdrawalEntries
      }
      continue
    }

    const percentageGrowth = Number(currentRecord.percentageGrowth) || 0
    const monthGrowth = trancheStart * (percentageGrowth / 100)
    let runningBalance = trancheStart + monthGrowth

    const depGrowth = depositEntries.reduce(
      (sum, entry) =>
        sum +
        calculateProratedDepositGrowth(
          entry.amount,
          percentageGrowth,
          entry.date,
          currentRecord.month,
          currentRecord.year
        ),
      0
    )
    const wdGrowth = withdrawalEntries.reduce(
      (sum, entry) =>
        sum +
        calculateWithdrawalGrowthLoss(
          entry.amount,
          percentageGrowth,
          entry.date,
          currentRecord.month,
          currentRecord.year
        ),
      0
    )

    runningBalance += depAmount + depGrowth
    runningBalance -= wdAmount + wdGrowth

    updated[i] = {
      ...currentRecord,
      startingBalance: trancheStart,
      growthAmount: monthGrowth,
      percentageGrowth: roundPercentageGrowth(percentageGrowth),
      endingBalance: runningBalance,
      depositAmount: depAmount,
      depositDate: depositEntries[0]?.date || null,
      withdrawalAmount: wdAmount,
      withdrawalDate: withdrawalEntries[0]?.date || null,
      depositGrowth: depGrowth,
      withdrawalGrowthLoss: wdGrowth,
      depositEntries,
      withdrawalEntries
    }
  }

  return updated
}

export function applyPartnerAutoSyncToInvestmentData(investmentData, monthName, year, partnerNet) {
  if (!investmentData) return null

  const history = [...(investmentData.monthlyHistory || [])]
  const recordIndex = findPartnerMonthRecordIndex(history, monthName, year)
  const existingRecord = recordIndex >= 0 ? history[recordIndex] : null

  const startingBalance =
    existingRecord?.startingBalance != null
      ? Number(existingRecord.startingBalance) || 0
      : getPartnerStartingBalance(investmentData)

  const growthAmount = round2(partnerNet)
  const { depositEntries, withdrawalEntries } = normalizeCashflowEntries(existingRecord)
  const manualEnding = isManualEndingBalanceRecord(existingRecord)

  let nextRecord
  if (manualEnding) {
    // Keep the manually entered ending balance; still sync growth/% from partner net profit.
    const start = round2(Number(startingBalance) || 0)
    const growth = growthAmount
    const percentageGrowth = start > 0 ? roundPercentageGrowth((growth / start) * 100) : 0
    const depositAmount = round2(
      depositEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
    )
    const withdrawalAmount = round2(
      withdrawalEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
    )

    nextRecord = {
      ...existingRecord,
      month: monthName,
      year: String(year),
      startingBalance: start,
      growthAmount: growth,
      percentageGrowth,
      depositGrowth: 0,
      withdrawalGrowthLoss: 0,
      endingBalance: round2(Number(existingRecord.endingBalance) || 0),
      endingBalanceOverride: true,
      depositAmount,
      depositDate: depositEntries[0]?.date || null,
      withdrawalAmount,
      withdrawalDate: withdrawalEntries[0]?.date || null,
      depositEntries,
      withdrawalEntries,
      partnerNetAutoSync: true,
      updatedAt: new Date().toISOString(),
      ...(existingRecord?.tranche ? { tranche: existingRecord.tranche } : {})
    }
  } else {
    // Normal path: ending = previous ending (start) + growth + deposits − withdrawals
    nextRecord = buildPartnerMonthLedgerRecord({
      month: monthName,
      year,
      startingBalance,
      growthAmount,
      depositEntries,
      withdrawalEntries,
      tranche: existingRecord?.tranche,
      partnerNetAutoSync: true,
      existingRecord
    })
  }

  if (recordIndex >= 0) {
    history[recordIndex] = nextRecord
  } else {
    history.push(nextRecord)
  }

  const syncIndex = recordIndex >= 0 ? recordIndex : history.length - 1
  const recalculatedHistory = recalculateHistoryFromIndex(history, syncIndex, investmentData)

  const primaryInit = Number(investmentData.initialInvestment) || 0
  const secondaryInit = Number(investmentData.secondaryInvestment?.initialInvestment) || 0
  const hasDual =
    investmentData.secondaryInvestment &&
    (investmentData.secondaryInvestment.initialInvestment || 0) > 0
  const depositBaseline = hasDual ? primaryInit + secondaryInit : primaryInit

  const totalDeposits =
    depositBaseline + recalculatedHistory.reduce((sum, r) => sum + (Number(r.depositAmount) || 0), 0)
  const totalWithdrawals = recalculatedHistory.reduce(
    (sum, r) => sum + (Number(r.withdrawalAmount) || 0),
    0
  )

  return {
    ...investmentData,
    currentBalance: resolveInvestorCurrentBalance(investmentData, recalculatedHistory),
    totalDeposits,
    totalWithdrawals,
    monthlyHistory: recalculatedHistory,
    lastUpdated: new Date().toISOString()
  }
}

async function persistPartnerInvestmentData(db, partnerId, investmentData, isAdmin3, admin3UserId) {
  if (isAdmin3 && admin3UserId) {
    await saveAdmin3UserOverride(admin3UserId, partnerId, { investmentData })
    return
  }
  await updateDoc(doc(db, 'users', partnerId), {
    investmentData,
    updatedAt: new Date().toISOString()
  })
}

/**
 * Sync current-month partner ledger entries from computed net profit.
 * Growth amount always tracks partner net profit. A manually entered ending balance
 * (endingBalanceOverride) is preserved; otherwise ending is recalculated from
 * start + growth + deposits − withdrawals.
 * Returns updated partner rows for in-memory merge.
 */
export async function syncAllPartnersMonthlyEntries({
  db,
  investors,
  isPartnerUser,
  getBalance,
  currentUserUid,
  isAdmin2,
  isAdmin3,
  referenceDate = new Date()
}) {
  const partners = (investors || []).filter(
    (inv) => isPartnerUser(inv) && inv?.investmentData?.status === 'approved'
  )
  if (partners.length === 0) return []

  const perfCtx = await fetchCurrentMonthPartnerDailyPerformances({
    currentUserUid,
    isAdmin2,
    isAdmin3,
    referenceDate
  })

  const { monthName, year, dailyPerformances } = perfCtx
  const updates = []

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

    const updatedInvestmentData = applyPartnerAutoSyncToInvestmentData(
      partner.investmentData,
      monthName,
      year,
      financials.partnerNet
    )

    if (!updatedInvestmentData) continue

    const prevIdx = findPartnerMonthRecordIndex(
      partner.investmentData?.monthlyHistory || [],
      monthName,
      year
    )
    const prevRow = prevIdx >= 0 ? partner.investmentData.monthlyHistory[prevIdx] : null
    const nextIdx = findPartnerMonthRecordIndex(updatedInvestmentData.monthlyHistory, monthName, year)
    const nextRow = nextIdx >= 0 ? updatedInvestmentData.monthlyHistory[nextIdx] : null

    if (
      prevRow &&
      nextRow &&
      round2(prevRow.growthAmount) === round2(nextRow.growthAmount) &&
      round2(prevRow.endingBalance) === round2(nextRow.endingBalance) &&
      round2(prevRow.percentageGrowth) === round2(nextRow.percentageGrowth) &&
      !!prevRow.endingBalanceOverride === !!nextRow.endingBalanceOverride
    ) {
      continue
    }

    if (isAdmin3) {
      await persistPartnerInvestmentData(db, partner.id, updatedInvestmentData, true, currentUserUid)
    } else {
      const snap = await getDoc(doc(db, 'users', partner.id))
      if (!snap.exists()) continue
      await persistPartnerInvestmentData(db, partner.id, updatedInvestmentData, false, currentUserUid)
    }

    updates.push({ partnerId: partner.id, investmentData: updatedInvestmentData })
  }

  return updates
}
