const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const formatEuro = (value) =>
  `€${(Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * Opens a printable partner month report (save as PDF via browser print).
 */
export function downloadPartnerMonthReport({
  partnerName,
  monthName,
  year,
  financials
}) {
  const tradeRows = (financials?.trades || [])
    .map((trade) => {
      const date = new Date(year, MONTH_NAMES.indexOf(monthName), trade.day)
      const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      return `
        <tr>
          <td>${dateLabel}</td>
          <td>${trade.type === 'loss' ? 'Loss' : 'Win'}</td>
          <td style="text-align:right;">${formatEuro(trade.netSigned)}</td>
          <td style="text-align:right;">${(trade.gainSharePct ?? 0).toFixed(1)}%</td>
          <td style="text-align:right;">${formatEuro(trade.partnerShare)}</td>
        </tr>
      `
    })
    .join('')

  const payoutRows = (financials?.payoutEntries || [])
    .map(
      (entry) => `
        <tr>
          <td>${entry.name}</td>
          <td style="text-align:right;">${formatEuro(entry.amount)}</td>
        </tr>
      `
    )
    .join('')

  const html = `
    <html>
      <head>
        <title>Opessocius - Partner Report - ${partnerName} - ${monthName} ${year}</title>
        <style>
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px 32px 80px; color: #111827; position: relative; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; }
          p { margin: 4px 0; font-size: 14px; }
          .report-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
          .report-brand { font-size: 14px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #1f2937; }
          .report-tag { font-size: 12px; font-weight: 500; color: #6b7280; }
          .report-subtitle { font-size: 13px; color: #4b5563; margin-top: 2px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
          .summary-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f9fafb; }
          .summary-card span { display: block; font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
          .summary-card strong { font-size: 16px; }
          .positive { color: #059669; }
          .negative { color: #dc2626; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
          th, td { border: 1px solid #e5e7eb; padding: 6px 8px; }
          th { background: #f3f4f6; text-align: left; }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <div class="report-brand">Opessocius</div>
            <h1>Partner Management Report</h1>
            <p class="report-subtitle">${partnerName} · ${monthName} ${year}</p>
          </div>
          <div class="report-tag">Internal Reporting</div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <span>Partner gains</span>
            <strong class="${(financials?.partnerGains ?? 0) >= 0 ? 'positive' : 'negative'}">${formatEuro(financials?.partnerGains)}</strong>
          </div>
          <div class="summary-card">
            <span>Partner payouts</span>
            <strong class="negative">${formatEuro(financials?.partnerPayouts)}</strong>
          </div>
          <div class="summary-card">
            <span>Net profit</span>
            <strong class="${(financials?.partnerNet ?? 0) >= 0 ? 'positive' : 'negative'}">${formatEuro(financials?.partnerNet)}</strong>
          </div>
        </div>

        <h2>Trades</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th style="text-align:right;">Firm</th>
              <th style="text-align:right;">Share %</th>
              <th style="text-align:right;">Partner</th>
            </tr>
          </thead>
          <tbody>
            ${tradeRows || '<tr><td colspan="5">No trades recorded.</td></tr>'}
          </tbody>
        </table>

        <h2>Investor payouts</h2>
        <table>
          <thead>
            <tr>
              <th>Investor</th>
              <th style="text-align:right;">Payout</th>
            </tr>
          </thead>
          <tbody>
            ${payoutRows || '<tr><td colspan="2">No investor payouts recorded.</td></tr>'}
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
