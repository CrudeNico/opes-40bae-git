/** Shared helpers for two-tranche investors (Conservative primary + Moderate secondary). */

export const TRANCHE_PRIMARY = 'primary'
export const TRANCHE_SECONDARY = 'secondary'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function sortInvestorMonthlyHistory(history) {
  return [...(history || [])].sort((a, b) => {
    if (a.year !== b.year) return parseInt(a.year, 10) - parseInt(b.year, 10)
    return MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month)
  })
}

export function getLastTrancheEnding(history, tranche, fallback) {
  const sorted = sortInvestorMonthlyHistory((history || []).filter((r) => r.tranche === tranche))
  return sorted.length ? sorted[sorted.length - 1].endingBalance : fallback
}

export function computeDualTrancheSumBalance(history, primaryInit, secondaryInit) {
  return (
    getLastTrancheEnding(history, TRANCHE_PRIMARY, primaryInit) +
    getLastTrancheEnding(history, TRANCHE_SECONDARY, secondaryInit)
  )
}

/**
 * Starting balance for the record at `index`: previous same-tranche ending, else that tranche's initial.
 * Untagged (legacy) rows chain only to other untagged rows.
 */
export function getRecordTrancheStartingBalance(history, index, investmentData) {
  const record = history?.[index]
  if (!record) return Number(investmentData?.initialInvestment) || 0

  const primaryInit = Number(investmentData?.initialInvestment) || 0
  const secondaryInit = Number(investmentData?.secondaryInvestment?.initialInvestment) || 0
  const tranche = record.tranche

  for (let i = index - 1; i >= 0; i--) {
    const prev = history[i]
    if (tranche) {
      if (prev.tranche === tranche) return Number(prev.endingBalance) || 0
    } else if (!prev.tranche) {
      return Number(prev.endingBalance) || 0
    }
  }

  if (tranche === TRANCHE_SECONDARY) return secondaryInit
  return primaryInit
}

/**
 * Canonical current balance for an investor account.
 * Dual-tranche: always latest conservative ending + latest moderate ending (fallback to each tranche initial).
 * Single-tranche: latest monthly ending, else initial.
 */
export function resolveInvestorCurrentBalance(investmentData, monthlyHistory) {
  if (!investmentData) return 0

  const mh = monthlyHistory ?? investmentData.monthlyHistory ?? []
  const primaryInit = Number(investmentData.initialInvestment) || 0
  const secondaryInit = Number(investmentData.secondaryInvestment?.initialInvestment) || 0

  if (investorHasDualTranche(investmentData)) {
    return computeDualTrancheSumBalance(mh, primaryInit, secondaryInit)
  }

  if (mh.length > 0) {
    const sorted = sortInvestorMonthlyHistory(mh)
    const last = sorted[sorted.length - 1]
    const ending = Number(last?.endingBalance)
    return Number.isFinite(ending) ? ending : primaryInit
  }

  return primaryInit
}

/** Sum of primary and secondary initial amounts (secondary omitted if absent). */
export function getInvestorCombinedInitial(investmentData) {
  if (!investmentData || investmentData.accountType !== 'Investor') {
    return Number(investmentData?.initialInvestment) || 0
  }
  const p = Number(investmentData.initialInvestment) || 0
  const s = Number(investmentData.secondaryInvestment?.initialInvestment) || 0
  return p + s
}

export function investorHasDualTranche(investmentData) {
  if (!investmentData || investmentData.accountType !== 'Investor') return false
  const s = Number(investmentData.secondaryInvestment?.initialInvestment)
  return Number.isFinite(s) && s > 0
}

/**
 * Current balance for admin investor UI and overview totals.
 * Dual-tranche accounts always use latest ending balances summed (not a possibly stale stored field).
 * Single-tranche prefers stored `currentBalance` when finite, else derived ending / initial.
 */
export function getAdminInvestorSummaryCurrentBalance(investmentData) {
  if (!investmentData) return 0

  if (investorHasDualTranche(investmentData)) {
    return resolveInvestorCurrentBalance(investmentData)
  }

  const cb = Number(investmentData.currentBalance)
  if (Number.isFinite(cb)) return cb

  return resolveInvestorCurrentBalance(investmentData)
}

/**
 * Total deposits for admin investor UI: sum of both tranche initials plus tranche-tagged deposits
 * when available; otherwise max(stored totalDeposits, combined initial).
 */
export function getAdminInvestorSummaryTotalDeposits(investmentData) {
  if (!investmentData) return 0
  const primaryInit = Number(investmentData.initialInvestment) || 0
  const secondaryInit = Number(investmentData.secondaryInvestment?.initialInvestment) || 0
  const dual = investorHasDualTranche(investmentData)
  const combinedInitial = getInvestorCombinedInitial(investmentData)
  const mh = investmentData.monthlyHistory || []

  if (dual && mh.length > 0) {
    const primaryHist = mh.filter((r) => r.tranche === TRANCHE_PRIMARY)
    const secondaryHist = mh.filter((r) => r.tranche === TRANCHE_SECONDARY)
    if (primaryHist.length > 0 || secondaryHist.length > 0) {
      const depPrimary =
        primaryInit + primaryHist.reduce((s, r) => s + (Number(r.depositAmount) || 0), 0)
      const depSecondary =
        secondaryInit + secondaryHist.reduce((s, r) => s + (Number(r.depositAmount) || 0), 0)
      return depPrimary + depSecondary
    }
  }

  const stored = Number(investmentData.totalDeposits)
  const storedOk = Number.isFinite(stored) ? stored : 0
  return Math.max(storedOk, combinedInitial)
}

/**
 * Starting balance for "add performance" preview / growth hints: per tranche when dual, else summary balance.
 */
export function getAdminPerformancePreviewStartingBalance(investmentData, performanceScope) {
  if (!investmentData) return 0
  if (!investorHasDualTranche(investmentData)) {
    return getAdminInvestorSummaryCurrentBalance(investmentData)
  }
  const primaryInit = Number(investmentData.initialInvestment) || 0
  const secondaryInit = Number(investmentData.secondaryInvestment?.initialInvestment) || 0
  const mh = investmentData.monthlyHistory || []
  if (performanceScope === 'secondary') {
    return getLastTrancheEnding(mh, TRANCHE_SECONDARY, secondaryInit)
  }
  return getLastTrancheEnding(mh, TRANCHE_PRIMARY, primaryInit)
}
