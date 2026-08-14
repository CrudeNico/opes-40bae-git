/** Day-of-month proration for deposits / withdrawals within a performance month. */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function getDaysInMonthByName(month, year) {
  const monthIndex = MONTH_NAMES.indexOf(month)
  if (monthIndex < 0) return 0
  const y = parseInt(String(year), 10)
  if (!Number.isFinite(y)) return 0
  return new Date(y, monthIndex + 1, 0).getDate()
}

/**
 * Parse YYYY-MM-DD (or Date) as a calendar day without UTC timezone shift.
 */
export function getCalendarDayOfMonth(date) {
  if (!date) return null
  if (typeof date === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim())
    if (match) return parseInt(match[3], 10)
  }
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return null
  return d.getDate()
}

/**
 * Days elapsed in the month through the cashflow date (inclusive).
 * Day 15 of a 30-day month → 15.
 */
export function elapsedMonthGrowthRatio(dayOfMonth, daysInMonth) {
  if (!Number.isFinite(dayOfMonth) || !Number.isFinite(daysInMonth) || daysInMonth <= 0) return 0
  if (dayOfMonth < 1 || dayOfMonth > daysInMonth) return 0
  return dayOfMonth / daysInMonth
}

/**
 * Days remaining after the cashflow date through month-end.
 * Day 15 of a 30-day month → 15 (days 16–30).
 * Last day → 0.
 */
export function remainingMonthGrowthRatio(dayOfMonth, daysInMonth) {
  if (!Number.isFinite(dayOfMonth) || !Number.isFinite(daysInMonth) || daysInMonth <= 0) return 0
  if (dayOfMonth < 1 || dayOfMonth > daysInMonth) return 0
  if (dayOfMonth === daysInMonth) return 0
  return (daysInMonth - dayOfMonth) / daysInMonth
}

/**
 * Deposit performance for the days remaining in the month:
 * DepositAmount × MonthlyRate × (DaysRemaining / DaysInMonth)
 */
export function calculateProratedDepositGrowth(amount, percentageGrowth, date, month, year) {
  const value = Number(amount) || 0
  if (!date || !month || !year || value === 0) return 0
  const dayOfMonth = getCalendarDayOfMonth(date)
  const daysInMonth = getDaysInMonthByName(month, year)
  if (!dayOfMonth || !daysInMonth) return 0
  const ratio = remainingMonthGrowthRatio(dayOfMonth, daysInMonth)
  return value * (Number(percentageGrowth) / 100) * ratio
}

/**
 * Withdrawal performance earned only while the amount was invested:
 * WithdrawalAmount × MonthlyRate × (DaysElapsed / DaysInMonth)
 *
 * Subtracted after full starting-balance growth was applied for the month.
 */
export function calculateWithdrawalGrowthLoss(amount, percentageGrowth, date, month, year) {
  const value = Number(amount) || 0
  if (!date || !month || !year || value === 0) return 0
  const dayOfMonth = getCalendarDayOfMonth(date)
  const daysInMonth = getDaysInMonthByName(month, year)
  if (!dayOfMonth || !daysInMonth) return 0
  const ratio = elapsedMonthGrowthRatio(dayOfMonth, daysInMonth)
  return value * (Number(percentageGrowth) / 100) * ratio
}

/**
 * Net growth shown in history / totals:
 * base growth on starting balance + prorated deposit growth − withdrawal growth loss.
 */
export function getRecordNetGrowthAmount(record) {
  if (!record) return 0
  const base = Number(record.growthAmount) || 0
  const depositGrowth = Number(record.depositGrowth) || 0
  const withdrawalGrowth =
    Number(record.withdrawalGrowth ?? record.withdrawalGrowthLoss) || 0
  return base + depositGrowth - withdrawalGrowth
}
