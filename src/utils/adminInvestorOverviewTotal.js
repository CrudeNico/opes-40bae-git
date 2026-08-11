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
