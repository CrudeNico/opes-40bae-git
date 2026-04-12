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
 * Prefer stored `currentBalance` when it is a finite number (canonical value from Firestore).
 * Otherwise, for dual-tranche + tagged history, derive combined ending balances; else initials.
 */
export function getAdminInvestorSummaryCurrentBalance(investmentData) {
  if (!investmentData) return 0

  const cb = Number(investmentData.currentBalance)
  if (Number.isFinite(cb)) return cb

  const primaryInit = Number(investmentData.initialInvestment) || 0
  const secondaryInit = Number(investmentData.secondaryInvestment?.initialInvestment) || 0
  const dual = investorHasDualTranche(investmentData)
  const mh = investmentData.monthlyHistory || []

  if (dual && mh.length > 0) {
    const tagged = mh.some(
      (r) => r.tranche === TRANCHE_PRIMARY || r.tranche === TRANCHE_SECONDARY
    )
    if (tagged) {
      return computeDualTrancheSumBalance(mh, primaryInit, secondaryInit)
    }
  }

  return dual ? primaryInit + secondaryInit : primaryInit
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
