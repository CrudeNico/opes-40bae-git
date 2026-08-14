import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore'
import { admin3DailyPerformanceMonthKey, getAdmin3DailyPerformanceOverrides, getAdmin3Overrides } from './admin3Overrides'
import {
  buildAdmin3DailyPerformances,
  getMonthlyGrowthFromHistory,
  mergeAdmin3DailyPerformanceOverrides
} from './admin3DailyPerformances'
import { generateAdmin3PortfolioData } from '../components/AdminPortfolio'

export async function resolvePartnerPerformanceOwnerId(db, currentUserUid, isAdmin2, isAdmin3) {
  let ownerId = currentUserUid
  if (!isAdmin2 && !isAdmin3) return ownerId

  const usersSnapshot = await getDocs(collection(db, 'users'))
  usersSnapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data()
    let statuses = data.statuses || []
    if (statuses.length === 0 && Array.isArray(data.isAdmin) && data.isAdmin.length > 0) {
      statuses = data.isAdmin
    }
    if (statuses.length === 0 && data.isAdmin === true) {
      statuses = ['Admin']
    }
    if (
      statuses.includes('Admin') &&
      !statuses.includes('Admin 2') &&
      !statuses.includes('Admin 3') &&
      !statuses.includes('Relations')
    ) {
      ownerId = docSnapshot.id
    }
  })
  return ownerId
}

export async function loadPartnerAdmin3PerformanceContext(admin3UserId, ownerId) {
  let monthlyHistory = generateAdmin3PortfolioData().monthlyHistory || []
  let dailyOverrides = {}
  if (admin3UserId && ownerId) {
    const overrides = await getAdmin3Overrides(admin3UserId)
    const overrideHistory =
      overrides[ownerId]?.adminPortfolioData?.monthlyHistory ??
      overrides[ownerId]?.investmentData?.monthlyHistory
    if (Array.isArray(overrideHistory) && overrideHistory.length > 0) {
      monthlyHistory = overrideHistory
    }
    dailyOverrides = await getAdmin3DailyPerformanceOverrides(admin3UserId)
  }
  return { monthlyHistory, dailyOverrides }
}

export async function fetchPartnerDailyPerformances({
  db,
  ownerId,
  year,
  monthIndex,
  monthName,
  isAdmin3,
  admin3MonthlyHistory,
  admin3DailyOverrides,
  referenceDate = new Date()
}) {
  if (isAdmin3) {
    const growthAmount = getMonthlyGrowthFromHistory(admin3MonthlyHistory, monthName, year)
    const monthKey = admin3DailyPerformanceMonthKey(year, monthName)
    const base = buildAdmin3DailyPerformances(growthAmount, year, monthIndex, referenceDate)
    return mergeAdmin3DailyPerformanceOverrides(base, admin3DailyOverrides?.[monthKey])
  }
  const docId = `dailyPerformance_${ownerId}_${year}_${monthName}`
  const perfDoc = await getDoc(doc(db, 'adminDailyPerformance', docId))
  return perfDoc.exists() ? (perfDoc.data().performances || {}) : {}
}

export async function fetchCurrentMonthPartnerDailyPerformances({
  currentUserUid,
  isAdmin2,
  isAdmin3,
  referenceDate = new Date()
}) {
  const db = getFirestore()
  const monthIndex = referenceDate.getMonth()
  const year = referenceDate.getFullYear()
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const monthName = monthNames[monthIndex]
  const ownerId = await resolvePartnerPerformanceOwnerId(db, currentUserUid, isAdmin2, isAdmin3)
  let admin3MonthlyHistory = []
  let admin3DailyOverrides = {}
  if (isAdmin3) {
    const ctx = await loadPartnerAdmin3PerformanceContext(currentUserUid, ownerId)
    admin3MonthlyHistory = ctx.monthlyHistory
    admin3DailyOverrides = ctx.dailyOverrides
  }
  const performances = await fetchPartnerDailyPerformances({
    db,
    ownerId,
    year,
    monthIndex,
    monthName,
    isAdmin3,
    admin3MonthlyHistory,
    admin3DailyOverrides,
    referenceDate
  })
  return {
    ownerId,
    monthName,
    year,
    monthIndex,
    dailyPerformances: performances,
    admin3MonthlyHistory,
    admin3DailyOverrides
  }
}
