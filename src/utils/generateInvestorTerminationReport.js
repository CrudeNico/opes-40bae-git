import {
  getInvestorCombinedInitial,
  getAdminInvestorSummaryCurrentBalance,
  getAdminInvestorSummaryTotalDeposits,
  sortInvestorMonthlyHistory
} from './investorDualTranche'

function formatMoney(value, currency = '€') {
  const n = Number(value) || 0
  return `${currency}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPercent(value) {
  const n = Number(value) || 0
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

function getRiskLabel(investmentData) {
  if (!investmentData) return 'N/A'
  if (investmentData.accountType === 'Trader') return 'Trader account'
  if (investmentData.riskTolerance === 'conservative') return 'Conservative (2% per month)'
  if (investmentData.riskTolerance === 'moderate') return 'Moderate (4% per month)'
  return 'N/A'
}

function buildMonthlyHistoryRows(monthlyHistory) {
  const sorted = sortInvestorMonthlyHistory(monthlyHistory || [])
  if (sorted.length === 0) {
    return '<tr><td colspan="6">No monthly performance records on file.</td></tr>'
  }
  return sorted
    .map((record) => {
      const tranche =
        record.tranche === 'primary'
          ? 'Conservative'
          : record.tranche === 'secondary'
            ? 'Moderate'
            : '—'
      return `
        <tr>
          <td>${record.month} ${record.year}</td>
          <td>${tranche}</td>
          <td style="text-align:right;">${formatPercent(record.percentageGrowth)}</td>
          <td style="text-align:right;">${formatMoney(record.depositAmount || 0)}</td>
          <td style="text-align:right;">${formatMoney(record.withdrawalAmount || 0)}</td>
          <td style="text-align:right;">${formatMoney(record.endingBalance || 0)}</td>
        </tr>
      `
    })
    .join('')
}

/**
 * Opens a printable HTML report (user saves as PDF via browser print).
 */
export function downloadInvestorTerminationReport({ user, investmentData, terminationDate }) {
  if (!user || !investmentData) return

  const displayName = user.displayName || 'Investor'
  const email = user.email || '—'
  const accountType = investmentData.accountType || 'Investor'
  const combinedInitial = getInvestorCombinedInitial(investmentData)
  const currentBalance = getAdminInvestorSummaryCurrentBalance(investmentData)
  const totalDeposits = getAdminInvestorSummaryTotalDeposits(investmentData)
  const totalWithdrawals = Number(investmentData.totalWithdrawals) || 0
  const monthlyHistory = investmentData.monthlyHistory || []
  const totalGain = sortInvestorMonthlyHistory(monthlyHistory).reduce(
    (sum, record) => sum + (Number(record.growthAmount) || 0),
    0
  )
  const totalPercentageGain = sortInvestorMonthlyHistory(monthlyHistory).reduce(
    (sum, record) => sum + (Number(record.percentageGrowth) || 0),
    0
  )
  const netProfit = currentBalance + totalWithdrawals - totalDeposits
  const generatedAt = new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  const terminationLabel = terminationDate
    ? new Date(`${terminationDate}T12:00:00`).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '—'

  const secondaryBlock = investmentData.secondaryInvestment
    ? `
      <p><strong>Second tranche initial (Moderate, 4%):</strong> ${formatMoney(investmentData.secondaryInvestment.initialInvestment || 0)}</p>
      <p><strong>Second tranche start:</strong> ${investmentData.secondaryInvestment.startingDate || 'N/A'}</p>
    `
    : ''

  const html = `
    <html>
      <head>
        <title>Opessocius - Investment Termination Overview - ${displayName}</title>
        <style>
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px 32px 80px; color: #111827; }
          h1 { font-size: 22px; margin: 0 0 4px; }
          h2 { font-size: 16px; margin: 24px 0 8px; }
          p { margin: 4px 0; font-size: 13px; }
          .report-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
          .report-brand { font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #1f2937; }
          .report-tag { font-size: 11px; color: #6b7280; }
          .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-top: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 6px 8px; }
          th { background: #f3f4f6; text-align: left; }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <div class="report-brand">Opessocius</div>
            <h1>Investment Termination Overview</h1>
            <p style="color:#4b5563;">Generated ${generatedAt}</p>
          </div>
          <div class="report-tag">Internal • Termination</div>
        </div>

        <h2>Investor</h2>
        <p><strong>Name:</strong> ${displayName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Account type:</strong> ${accountType}</p>
        <p><strong>Termination date:</strong> ${terminationLabel}</p>
        <p><strong>Investment status:</strong> ${investmentData.status || 'N/A'}</p>

        <h2>Summary</h2>
        <div class="summary-grid">
          <p><strong>Initial investment:</strong> ${formatMoney(investmentData.initialInvestment || 0)}</p>
          <p><strong>Total initial (all tranches):</strong> ${formatMoney(combinedInitial)}</p>
          <p><strong>Starting date:</strong> ${investmentData.startingDate || 'N/A'}</p>
          <p><strong>Risk tolerance:</strong> ${getRiskLabel(investmentData)}</p>
          <p><strong>Current balance:</strong> ${formatMoney(currentBalance)}</p>
          <p><strong>Total deposits:</strong> ${formatMoney(totalDeposits)}</p>
          <p><strong>Total withdrawals:</strong> ${formatMoney(totalWithdrawals)}</p>
          <p><strong>Total growth (recorded):</strong> ${formatMoney(totalGain)}</p>
          <p><strong>Cumulative % growth:</strong> ${formatPercent(totalPercentageGain)}</p>
          <p><strong>Net result (balance + withdrawals − deposits):</strong> ${formatMoney(netProfit)}</p>
          <p><strong>Monthly additions:</strong> ${formatMoney(investmentData.monthlyAdditions || 0)}</p>
          <p><strong>Country:</strong> ${investmentData.country || 'N/A'}</p>
        </div>
        ${secondaryBlock}

        <h2>Monthly history</h2>
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Tranche</th>
              <th style="text-align:right;">% Growth</th>
              <th style="text-align:right;">Deposit</th>
              <th style="text-align:right;">Withdrawal</th>
              <th style="text-align:right;">Ending balance</th>
            </tr>
          </thead>
          <tbody>
            ${buildMonthlyHistoryRows(monthlyHistory)}
          </tbody>
        </table>
      </body>
    </html>
  `

  const reportWindow = window.open('', '_blank')
  if (reportWindow) {
    reportWindow.document.open()
    reportWindow.document.write(html)
    reportWindow.document.close()
    reportWindow.focus()
    reportWindow.print()
  }
}
