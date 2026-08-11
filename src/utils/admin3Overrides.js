/**
 * Admin 3 sandbox overrides - changes save only to the Admin 3 user's view.
 * Data stored in Firestore: admin3Overrides/{admin3UserId}
 * Structure: { userOverrides: { [targetUserId]: { displayName?, email?, profileImageUrl?, statuses?, investmentData?, adminPortfolioData? } } }
 */
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

const COLLECTION = 'admin3Overrides'

export async function getAdmin3Overrides(admin3UserId) {
  if (!admin3UserId) return {}
  const db = getFirestore()
  const snap = await getDoc(doc(db, COLLECTION, admin3UserId))
  return snap.exists() ? (snap.data().userOverrides || {}) : {}
}

export function isAdmin3(statuses) {
  return statuses && statuses.includes('Admin 3')
}

export async function saveAdmin3UserOverride(admin3UserId, targetUserId, override) {
  if (!admin3UserId || !targetUserId) return
  const db = getFirestore()
  const ref = doc(db, COLLECTION, admin3UserId)
  const snap = await getDoc(ref)
  const existing = snap.exists() ? snap.data().userOverrides || {} : {}
  const merged = {
    ...(existing[targetUserId] || {}),
    ...override,
    _updatedAt: new Date().toISOString()
  }
  await setDoc(ref, { userOverrides: { ...existing, [targetUserId]: merged } }, { merge: true })
}

export function mergeUserWithOverride(user, override) {
  if (!override) return user
  return {
    ...user,
    displayName: override.displayName !== undefined ? override.displayName : user.displayName,
    email: override.email !== undefined ? override.email : user.email,
    profileImageUrl: override.profileImageUrl !== undefined ? override.profileImageUrl : user.profileImageUrl,
    statuses: override.statuses !== undefined ? override.statuses : user.statuses,
    investmentData: override.investmentData !== undefined ? override.investmentData : user.investmentData,
    adminPortfolioData:
      override.adminPortfolioData !== undefined ? override.adminPortfolioData : user.adminPortfolioData,
    managedInvestorIds: override.managedInvestorIds !== undefined ? override.managedInvestorIds : user.managedInvestorIds,
    _hasAdmin3Override: true
  }
}

export function admin3DailyPerformanceMonthKey(year, monthName) {
  return `${year}_${monthName}`
}

export async function getAdmin3DailyPerformanceOverrides(admin3UserId) {
  if (!admin3UserId) return {}
  const db = getFirestore()
  const snap = await getDoc(doc(db, COLLECTION, admin3UserId))
  return snap.exists() ? (snap.data().dailyPerformanceOverrides || {}) : {}
}

export async function saveAdmin3DailyPerformanceMonth(admin3UserId, year, monthName, monthPayload) {
  if (!admin3UserId) return
  const db = getFirestore()
  const ref = doc(db, COLLECTION, admin3UserId)
  const snap = await getDoc(ref)
  const existing = snap.exists() ? snap.data() : {}
  const monthKey = admin3DailyPerformanceMonthKey(year, monthName)
  const dailyPerformanceOverrides = {
    ...(existing.dailyPerformanceOverrides || {}),
    [monthKey]: monthPayload
  }
  await setDoc(ref, { ...existing, dailyPerformanceOverrides }, { merge: true })
}
