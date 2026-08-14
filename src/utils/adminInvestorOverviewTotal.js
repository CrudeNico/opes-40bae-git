import { getAdminInvestorSummaryCurrentBalance } from './investorDualTranche'

/** Normalize for case- and accent-insensitive comparison (e.g. Nicolás → nicolas). */
export function normalizeAdminInvestorOverviewKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Resolve statuses from current or legacy Firestore user fields. */
export function resolveAdminInvestorOverviewStatuses(userData) {
  let statuses = userData?.statuses || []
  if (statuses.length === 0 && Array.isArray(userData?.isAdmin) && userData.isAdmin.length > 0) {
    statuses = userData.isAdmin
  }
  if (statuses.length === 0 && userData?.isAdmin === true) {
    statuses = ['Admin']
  }
  return statuses
}

/** Legacy email-only exclusions from total investor accounts sum/modal. */
export function isExcludedFromInvestorOverviewTotal(email) {
  const em = normalizeAdminInvestorOverviewKey(email)
  return em === 'ndrf1806@gmail.com'
}

/** Approved Investor accounts included in overview/portfolio investor totals (not traders). */
export function isApprovedInvestorForOverviewTotal(userData) {
  const statuses = resolveAdminInvestorOverviewStatuses(userData)
  return (
    statuses.includes('Investor') &&
    userData?.investmentData &&
    userData.investmentData.status === 'approved'
  )
}

export function isPartnerUserForOverview(userData) {
  return resolveAdminInvestorOverviewStatuses(userData).includes('Partner')
}

/** Sum monthly targets, skipping partners (null targets). */
export function sumInvestorOverviewMonthlyTargets(modalLines) {
  return (modalLines || []).reduce((s, r) => s + (r.monthlyTarget ?? 0), 0)
}

/**
 * Build modal/total rows from a Firestore users snapshot.
 * @param {import('firebase/firestore').QuerySnapshot} usersSnapshot
 * @param {(investmentData: object, email: string, displayName: string) => { target: number }} monthlyTargetFn
 */
export function collectApprovedInvestorOverviewRows(usersSnapshot, monthlyTargetFn) {
  let total = 0
  let payoutTargetSum = 0
  const modalLines = []

  usersSnapshot.forEach((docSnapshot) => {
    const userData = docSnapshot.data()
    const email = userData.email || ''
    const displayName = userData.displayName || ''

    if (isExcludedFromInvestorOverviewTotal(email)) {
      return
    }

    if (!isApprovedInvestorForOverviewTotal(userData)) {
      return
    }

    const inv = userData.investmentData
    const balance = getAdminInvestorSummaryCurrentBalance(inv)
    const isPartner = isPartnerUserForOverview(userData)
    const { target } = isPartner ? { target: null } : monthlyTargetFn(inv, email, displayName)
    total += balance
    if (!isPartner) payoutTargetSum += target
    modalLines.push({
      id: docSnapshot.id,
      name: (displayName && displayName.trim()) || 'Unnamed investor',
      email,
      balance,
      isPartner,
      monthlyTarget: isPartner ? null : target
    })
  })

  modalLines.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

  return { total, payoutTargetSum, modalLines }
}

const PARTNER_AUM_PIE_COLORS = [
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
  '#6366f1',
  '#ef4444',
  '#84cc16',
  '#eab308'
]

/**
 * Partner capital under management for Overview Current Balance pie.
 * Each partner slice = partner own balance + balances of managed investors.
 * Shares are among partners only (no "rest" slice).
 *
 * @param {import('firebase/firestore').QuerySnapshot} usersSnapshot
 * @param {Record<string, object>} [overridesByUserId] Admin 3 sandbox overrides keyed by user id
 */
export function collectPartnerAumOverviewRows(usersSnapshot, overridesByUserId = {}) {
  const accounts = []

  usersSnapshot.forEach((docSnapshot) => {
    const raw = docSnapshot.data() || {}
    const ov = overridesByUserId[docSnapshot.id]
    const userData = ov
      ? {
          ...raw,
          ...(ov.statuses !== undefined ? { statuses: ov.statuses } : {}),
          ...(ov.investmentData !== undefined ? { investmentData: ov.investmentData } : {}),
          ...(ov.managedInvestorIds !== undefined
            ? { managedInvestorIds: ov.managedInvestorIds }
            : {})
        }
      : raw

    const email = userData.email || raw.email || ''
    const displayName = userData.displayName || raw.displayName || ''

    if (isExcludedFromInvestorOverviewTotal(email)) return
    if (!isApprovedInvestorForOverviewTotal(userData)) return

    accounts.push({
      id: docSnapshot.id,
      name: (displayName && displayName.trim()) || 'Unnamed investor',
      balance: Math.max(0, Number(getAdminInvestorSummaryCurrentBalance(userData.investmentData)) || 0),
      isPartner: isPartnerUserForOverview(userData),
      managedInvestorIds: Array.isArray(userData.managedInvestorIds) ? userData.managedInvestorIds : []
    })
  })

  const balanceById = Object.fromEntries(accounts.map((a) => [a.id, a.balance]))

  const rows = accounts
    .filter((a) => a.isPartner)
    .map((partner) => {
      const ownBalance = partner.balance
      const managedBalance = partner.managedInvestorIds.reduce(
        (sum, id) => sum + (balanceById[id] || 0),
        0
      )
      return {
        id: partner.id,
        name: partner.name,
        ownBalance,
        managedBalance,
        aum: ownBalance + managedBalance
      }
    })
    .filter((row) => row.aum > 0)
    .sort((a, b) => b.aum - a.aum || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

  const partnersAumTotal = rows.reduce((sum, row) => sum + row.aum, 0)

  const coloredRows = rows.map((row, idx) => ({
    ...row,
    color: PARTNER_AUM_PIE_COLORS[idx % PARTNER_AUM_PIE_COLORS.length],
    share: partnersAumTotal > 0 ? (row.aum / partnersAumTotal) * 100 : 0
  }))

  return { rows: coloredRows, partnersAumTotal }
}
