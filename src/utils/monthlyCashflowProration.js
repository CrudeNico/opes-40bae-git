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
 * Fraction of the monthly % earned from `dayOfMonth` through month-end.
 * Day 1 → 1 (full %). Mid-month → ~half. Last day → 0.
 */
export function remainingMonthGrowthRatio(dayOfMonth, daysInMonth) {
  if (!Number.isFinite(dayOfMonth) || !Number.isFinite(daysInMonth) || daysInMonth <= 0) return 0
  if (dayOfMonth < 1 || dayOfMonth > daysInMonth) return 0
  if (dayOfMonth === daysInMonth) return 0
  return (daysInMonth - dayOfMonth + 1) / daysInMonth
}

/**
 * Deposit growth: money deposited on day D earns the remaining-month share of the monthly %.
 * - 1st → full %
 * - ~15th → ~half %
 * - last day → 0%
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
 * Withdrawal growth loss (subtracted after full starting-balance growth was applied):
 * money withdrawn on day D was not invested for the remaining-month share.
 * - 1st → lose full % on that amount (no gain)
 * - ~15th → lose ~half %
 * - last day → lose 0% (kept full % earned while invested)
 *
 * Same calendar ratio as deposits; opposite economic effect via subtraction.
 */
export function calculateWithdrawalGrowthLoss(amount, percentageGrowth, date, month, year) {
  return calculateProratedDepositGrowth(amount, percentageGrowth, date, month, year)
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
