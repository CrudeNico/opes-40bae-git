function round2(n) {
  return Math.round(n * 100) / 100
}

/** Whole-month % stored with at most 2 decimal places (e.g. 1.00). */
export function roundPercentageGrowth(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function isManualEndingBalanceRecord(record) {
  return record?.endingBalanceOverride === true
}

export function reconcileManualEndingRecord(record, trancheStart) {
  return {
    ...record,
    startingBalance: round2(trancheStart),
    endingBalance: round2(Number(record?.endingBalance) || 0),
    endingBalanceOverride: true
  }
}

/**
 * Manual ending balance is authoritative for the month chain.
 * Growth amount and % are preserved as entered — not derived from ending − starting.
 */
export function buildRecordFromManualEndingBalance({
  month,
  year,
  startingBalance,
  endingBalance,
  growthAmount,
  percentageGrowth,
  tranche,
  existingRecord,
  partnerNetAutoSync,
  depositEntries,
  withdrawalEntries
}) {
  const start = round2(Number(startingBalance) || 0)
  const ending = round2(Number(endingBalance) || 0)
  const growth = round2(Number(growthAmount) || 0)
  const pct = roundPercentageGrowth(percentageGrowth)

  const resolvedDepositEntries =
    Array.isArray(depositEntries) && depositEntries.length > 0
      ? depositEntries.map((entry) => ({
          amount: round2(Number(entry?.amount) || 0),
          date: entry?.date || null
        }))
      : Array.isArray(existingRecord?.depositEntries) && existingRecord.depositEntries.length > 0
        ? existingRecord.depositEntries
        : existingRecord?.depositAmount
          ? [{ amount: round2(Number(existingRecord.depositAmount) || 0), date: existingRecord.depositDate || null }]
          : []

  const resolvedWithdrawalEntries =
    Array.isArray(withdrawalEntries) && withdrawalEntries.length > 0
      ? withdrawalEntries.map((entry) => ({
          amount: round2(Number(entry?.amount) || 0),
          date: entry?.date || null
        }))
      : Array.isArray(existingRecord?.withdrawalEntries) && existingRecord.withdrawalEntries.length > 0
        ? existingRecord.withdrawalEntries
        : existingRecord?.withdrawalAmount
          ? [{ amount: round2(Number(existingRecord.withdrawalAmount) || 0), date: existingRecord.withdrawalDate || null }]
          : []

  const depositAmount = round2(
    resolvedDepositEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
  )
  const withdrawalAmount = round2(
    resolvedWithdrawalEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
  )

  const base = {
    month,
    year: String(year),
    startingBalance: start,
    endingBalance: ending,
    growthAmount: growth,
    percentageGrowth: pct,
    depositGrowth: 0,
    withdrawalGrowthLoss: 0,
    depositAmount,
    depositDate: resolvedDepositEntries[0]?.date || null,
    withdrawalAmount,
    withdrawalDate: resolvedWithdrawalEntries[0]?.date || null,
    depositEntries: resolvedDepositEntries,
    withdrawalEntries: resolvedWithdrawalEntries,
    endingBalanceOverride: true,
    updatedAt: new Date().toISOString(),
    ...(tranche ? { tranche } : {})
  }

  if (partnerNetAutoSync !== undefined) {
    base.partnerNetAutoSync = partnerNetAutoSync
  } else if (existingRecord?.partnerNetAutoSync !== undefined) {
    base.partnerNetAutoSync = existingRecord.partnerNetAutoSync
  }

  return base
}

export function formatPercentageGrowthDisplay(value) {
  return roundPercentageGrowth(value).toFixed(2)
}
