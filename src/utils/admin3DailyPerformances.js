const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function createSeededRandom(seed) {
  let s = seed >>> 0
  return function seededRandom() {
    s = Math.imul(1103515245, s) + 12345
    return ((s >>> 0) % 2147483648) / 2147483648
  }
}

function monthSeed(year, monthIndex) {
  return year * 100 + monthIndex + 1
}

function round2(n) {
  return Math.round(n * 100) / 100
}

function isWeekend(year, monthIndex, day) {
  const dow = new Date(year, monthIndex, day).getDay()
  return dow === 0 || dow === 6
}

/** Weekdays only; for the current month, exclude days after today. */
export function getEligibleAdmin3TradingDays(year, monthIndex, referenceDate = new Date()) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const isCurrentMonth =
    year === referenceDate.getFullYear() && monthIndex === referenceDate.getMonth()
  const lastDay = isCurrentMonth ? referenceDate.getDate() : daysInMonth
  const days = []
  for (let d = 1; d <= lastDay; d += 1) {
    if (!isWeekend(year, monthIndex, d)) days.push(d)
  }
  return days
}

export function isAdmin3CalendarDayBlocked(year, monthIndex, day, referenceDate = new Date()) {
  if (isWeekend(year, monthIndex, day)) return true
  const isCurrentMonth =
    year === referenceDate.getFullYear() && monthIndex === referenceDate.getMonth()
  if (isCurrentMonth && day > referenceDate.getDate()) return true
  return false
}

export function getMonthlyGrowthFromHistory(monthlyHistory, monthName, year) {
  const record = (monthlyHistory || []).find(
    (r) => r.month === monthName && parseInt(String(r.year), 10) === year
  )
  if (!record) return 0
  return round2(Number(record.growthAmount) || 0)
}

function sumPerformances(performances) {
  return Object.values(performances).reduce((sum, p) => {
    const amount = Math.max(0, Number(p.amount) || 0)
    return sum + (p.type === 'loss' ? -amount : amount)
  }, 0)
}

function fixPerformanceSum(performances, tradeDays, target) {
  const diff = round2(target - sumPerformances(performances))
  if (Math.abs(diff) < 0.01 || tradeDays.length === 0) return performances

  const lastDay = String(tradeDays[tradeDays.length - 1])
  const existing = performances[lastDay]
  if (existing) {
    const nextAmount = round2(Math.max(0, (Number(existing.amount) || 0) + diff))
    if (nextAmount > 0) {
      performances[lastDay] = { ...existing, amount: nextAmount }
    } else {
      delete performances[lastDay]
    }
  } else if (Math.abs(diff) >= 0.01) {
    performances[lastDay] = diff >= 0
      ? { type: 'win', amount: diff }
      : { type: 'loss', amount: Math.abs(diff) }
  }
  return performances
}

/**
 * Deterministic daily win/loss map for Admin 3 overview calendar.
 * Net of all days equals the portfolio month's growthAmount.
 */
export function buildAdmin3DailyPerformances(targetGrowth, year, monthIndex, referenceDate = new Date()) {
  const eligible = getEligibleAdmin3TradingDays(year, monthIndex, referenceDate)
  const target = round2(targetGrowth)
  if (eligible.length === 0 || Math.abs(target) < 0.005) return {}

  const rand = createSeededRandom(monthSeed(year, monthIndex))
  const tradeDayCount = Math.max(
    1,
    Math.min(eligible.length, Math.floor(eligible.length * (0.4 + rand() * 0.35)))
  )
  const tradeDays = [...eligible]
    .sort(() => rand() - 0.5)
    .slice(0, tradeDayCount)
    .sort((a, b) => a - b)

  const performances = {}

  if (target >= 0) {
    const lossDayCount =
      tradeDays.length >= 4 && target > 500 ? (rand() < 0.65 ? 1 : Math.min(2, tradeDays.length - 2)) : 0
    const lossDaySet = new Set(
      [...tradeDays].sort(() => rand() - 0.5).slice(0, lossDayCount)
    )

    let lossTotal = 0
    if (lossDayCount > 0) {
      lossTotal = round2(target * (0.05 + rand() * 0.12))
      const lossDays = tradeDays.filter((d) => lossDaySet.has(d))
      let assignedLoss = 0
      lossDays.forEach((day, idx) => {
        const isLast = idx === lossDays.length - 1
        const amt = isLast
          ? round2(lossTotal - assignedLoss)
          : round2(lossTotal * (0.35 + rand() * 0.4))
        if (amt > 0) {
          performances[String(day)] = { type: 'loss', amount: amt }
          assignedLoss += isLast ? 0 : amt
        }
      })
    }

    const winTarget = round2(target + lossTotal)
    const winDays = tradeDays.filter((d) => !lossDaySet.has(d))
    if (winDays.length === 0) {
      performances[String(tradeDays[0])] = { type: 'win', amount: target }
      return fixPerformanceSum(performances, tradeDays, target)
    }

    const weights = winDays.map(() => 0.4 + rand() * 1.2)
    const weightSum = weights.reduce((a, b) => a + b, 0)
    let assignedWin = 0
    winDays.forEach((day, idx) => {
      const isLast = idx === winDays.length - 1
      const amt = isLast
        ? round2(winTarget - assignedWin)
        : round2((weights[idx] / weightSum) * winTarget)
      if (amt > 0) {
        performances[String(day)] = { type: 'win', amount: amt }
        assignedWin += isLast ? 0 : amt
      }
    })
  } else {
    const absTarget = Math.abs(target)
    const winDayCount =
      tradeDays.length >= 4 && absTarget > 500 ? (rand() < 0.5 ? 1 : 0) : 0
    const winDaySet = new Set(
      [...tradeDays].sort(() => rand() - 0.5).slice(0, winDayCount)
    )

    let winTotal = 0
    if (winDayCount > 0) {
      winTotal = round2(absTarget * (0.05 + rand() * 0.1))
      const winDays = tradeDays.filter((d) => winDaySet.has(d))
      winDays.forEach((day) => {
        performances[String(day)] = { type: 'win', amount: winTotal }
      })
    }

    const lossTarget = round2(absTarget + winTotal)
    const lossDays = tradeDays.filter((d) => !winDaySet.has(d))
    if (lossDays.length === 0) {
      performances[String(tradeDays[0])] = { type: 'loss', amount: absTarget }
      return fixPerformanceSum(performances, tradeDays, target)
    }

    const weights = lossDays.map(() => 0.4 + rand() * 1.2)
    const weightSum = weights.reduce((a, b) => a + b, 0)
    let assignedLoss = 0
    lossDays.forEach((day, idx) => {
      const isLast = idx === lossDays.length - 1
      const amt = isLast
        ? round2(lossTarget - assignedLoss)
        : round2((weights[idx] / weightSum) * lossTarget)
      if (amt > 0) {
        performances[String(day)] = { type: 'loss', amount: amt }
        assignedLoss += isLast ? 0 : amt
      }
    })
  }

  return fixPerformanceSum(performances, tradeDays, target)
}

export { MONTH_NAMES as ADMIN3_MONTH_NAMES }
