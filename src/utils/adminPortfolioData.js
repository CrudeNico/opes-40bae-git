/**
 * Firm admin portfolio (Admin Portfolio section charts, history, and performance).
 * Separate from `investmentData` on the same user when they are also an Investor.
 * Overview/Portfolio "Current Balance" uses total approved investor accounts instead.
 */
import { doc, updateDoc } from 'firebase/firestore'

export function resolveAdminPortfolioData(userData, override) {
  if (override?.adminPortfolioData !== undefined) return override.adminPortfolioData
  if (userData?.adminPortfolioData) return userData.adminPortfolioData
  return null
}

/** Legacy read path before adminPortfolioData existed on split accounts. */
export function resolveAdminPortfolioDataWithLegacyFallback(userData, override) {
  const dedicated = resolveAdminPortfolioData(userData, override)
  if (dedicated) return dedicated
  if (userData?.investmentData) return userData.investmentData
  return null
}

/**
 * One-time migration: copy legacy shared investmentData into adminPortfolioData
 * so portfolio edits no longer overwrite the personal investor account.
 */
export async function ensureAdminPortfolioDataMigrated(db, userId, userData) {
  if (!db || !userId || !userData) return null
  if (userData.adminPortfolioData) return userData.adminPortfolioData
  if (!userData.investmentData) return null

  const copy = structuredClone(userData.investmentData)
  await updateDoc(doc(db, 'users', userId), {
    adminPortfolioData: copy,
    updatedAt: new Date().toISOString()
  })
  return copy
}
