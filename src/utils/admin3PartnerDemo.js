/** Demo-only partner profiles for Admin 3 (support@opessocius.com sandbox). */
export const ADMIN3_PARTNER_DEMO_BALANCES = {
  'nicolas.fernandez@opessocius.support': 20203.8,
  'marcoscollab@gmail.com': 1340101.09
}

const DEMO_EMAILS = new Set(Object.keys(ADMIN3_PARTNER_DEMO_BALANCES))

export function isAdmin3PartnerDemoProfile(investor) {
  const email = (investor?.email || '').toLowerCase()
  return DEMO_EMAILS.has(email)
}

export function getAdmin3PartnerDemoBalance(email) {
  const key = (email || '').toLowerCase()
  return ADMIN3_PARTNER_DEMO_BALANCES[key] ?? null
}

export function applyAdmin3PartnerDemoToInvestor(investor) {
  const demoBalance = getAdmin3PartnerDemoBalance(investor?.email)
  if (demoBalance == null || !investor?.investmentData) return investor
  return {
    ...investor,
    investmentData: {
      ...investor.investmentData,
      currentBalance: demoBalance
    }
  }
}

export function applyAdmin3PartnerDemoToInvestors(investors) {
  return (investors || []).map(applyAdmin3PartnerDemoToInvestor)
}
