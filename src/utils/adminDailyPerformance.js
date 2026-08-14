function round2(n) {
  return Math.round(n * 100) / 100
}

export function tradeSignedAmount(t) {
  if (!t || (t.type !== 'win' && t.type !== 'loss')) return 0
  const a = Math.max(0, parseFloat(String(t.amount).replace(',', '.')) || 0)
  return t.type === 'loss' ? -a : a
}

export function tradeSwapAmount(t) {
  if (t == null) return 0
  const raw = t.swap ?? t.fee
  if (raw === '' || raw == null) return 0
  return Math.max(0, parseFloat(String(raw).replace(',', '.')) || 0)
}

export function tradeSwapDirection(t) {
  if (t?.swapDirection === 'buy' || t?.swapDirection === 'sell') return t.swapDirection
  if (t?.fee != null && Number(t.fee) > 0) return 'sell'
  return null
}

/** Signed P&L after swap: buy adds to gross, sell subtracts from gross. */
export function tradeNetSigned(t) {
  const gross = tradeSignedAmount(t)
  const swap = tradeSwapAmount(t)
  if (swap <= 0) return gross
  const direction = tradeSwapDirection(t) || 'sell'
  return direction === 'buy' ? gross + swap : gross - swap
}

/** Normalize stored day performance (legacy single trade or `trades` array). */
export function normalizeDayPerformance(perf) {
  if (!perf) return { trades: [] }
  if (Array.isArray(perf.trades) && perf.trades.length > 0) {
    return {
      trades: perf.trades.map((t, i) => {
        const legacyFee = Math.max(0, Number(t.fee) || 0)
        const swap = Math.max(0, Number(t.swap) || 0) || legacyFee
        let swapDirection =
          t.swapDirection === 'buy' ? 'buy' : t.swapDirection === 'sell' ? 'sell' : null
        if (!swapDirection && swap > 0) swapDirection = 'sell'
        return {
          id: t.id || `trade-${i}`,
          type: t.type === 'loss' ? 'loss' : 'win',
          amount: Math.max(0, Number(t.amount) || 0),
          swap,
          swapDirection: swap > 0 ? swapDirection : null
        }
      })
    }
  }
  if (perf.type && perf.amount != null && perf.amount !== '') {
    const amt = Math.max(0, Number(perf.amount) || 0)
    return {
      trades: [{ id: `legacy-${amt}`, type: perf.type === 'loss' ? 'loss' : 'win', amount: amt }]
    }
  }
  return { trades: [] }
}

export function dayNetSigned(perf) {
  return normalizeDayPerformance(perf).trades.reduce((s, t) => s + tradeNetSigned(t), 0)
}

/** Flat list of all trades in a month map keyed by day number. */
export function collectMonthTrades(dailyPerformances) {
  const trades = []
  Object.entries(dailyPerformances || {}).forEach(([dayKey, perf]) => {
    const day = parseInt(String(dayKey), 10)
    if (!Number.isFinite(day)) return
    const { trades: dayTrades } = normalizeDayPerformance(perf)
    dayTrades.forEach((t, i) => {
      trades.push({
        id: `${day}-${t.id || i}`,
        day,
        type: t.type,
        amount: t.amount,
        swap: t.swap,
        swapDirection: t.swapDirection,
        netSigned: round2(tradeNetSigned(t))
      })
    })
  })
  trades.sort((a, b) => a.day - b.day || a.id.localeCompare(b.id))
  const totalGains = round2(trades.reduce((sum, t) => sum + t.netSigned, 0))
  return { trades, totalGains }
}
