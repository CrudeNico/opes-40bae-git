/**
 * Generate sample users for Admin 3 sandbox - Manage Users section.
 * Deterministic (seeded) so data stays fixed when switching tabs.
 * Profile: background + first letter (no external images).
 * Admins: firstname.lastname@opessocius.support
 * Normal users: emails from list or firstname.lastname@gmail.com
 */
const NAME_AND_EMAIL_LIST = [
  { name: 'Alejandro Ruiz', email: 'aruiz.capital@gmail.com' },
  { name: 'Sofia Martinez', email: 'sofia.mtz88@gmail.com' },
  { name: 'Diego Fernandez', email: 'dfernandez.trading@gmail.com' },
  { name: 'Lucia Gomez', email: 'lgomez.invest@gmail.com' },
  { name: 'Carlos Navarro', email: 'carlos.nv97@gmail.com' },
  { name: 'Elena Torres', email: 'etorres.fxdesk@gmail.com' },
  { name: 'Javier Ortega', email: 'j.ortega.global@gmail.com' },
  { name: 'Marta Castillo', email: 'martacastillo.pm@gmail.com' },
  { name: 'Pablo Herrera', email: 'pablo.herrera21@gmail.com' },
  { name: 'Laura Vega', email: 'lauravega.cap@gmail.com' },
  { name: 'Ethan Walker', email: 'e.walker.ny@outlook.com' },
  { name: 'Olivia Harris', email: 'oliviaharris.invest@gmail.com' },
  { name: 'Noah Clark', email: 'noahc_87@gmail.com' },
  { name: 'Emma Lewis', email: 'emma.lewis.trd@gmail.com' },
  { name: 'Liam Robinson', email: 'liamr.fxdesk@gmail.com' },
  { name: 'Ava Young', email: 'ava_young.global@gmail.com' },
  { name: 'Mason Hall', email: 'mhall.capital@gmail.com' },
  { name: 'Isabella Allen', email: 'isabella.a_pm@gmail.com' },
  { name: 'James King', email: 'jking.trades@gmail.com' },
  { name: 'Mia Wright', email: 'miawright.fx@gmail.com' },
  { name: 'Daniel Moreno', email: 'danielm_fxdesk@outlook.com' },
  { name: 'Carmen Iglesias', email: 'carmen.iglesias90@gmail.com' },
  { name: 'Raul Dominguez', email: 'rdominguez.cap@gmail.com' },
  { name: 'Ana Delgado', email: 'anadelgado.trd@gmail.com' },
  { name: 'Sergio Mendez', email: 'smendez.global@gmail.com' },
  { name: 'Patricia Rubio', email: 'prubio.invest@gmail.com' },
  { name: 'Alberto Cruz', email: 'albertocruz_77@gmail.com' },
  { name: 'Teresa Molina', email: 'teresa.m.capital@gmail.com' },
  { name: 'Fernando Vidal', email: 'fvidal_fx@gmail.com' },
  { name: 'Cristina Reyes', email: 'cristinareyes.trading@gmail.com' },
  { name: 'Benjamin Scott', email: 'b.scott.portfolio@outlook.com' },
  { name: 'Charlotte Adams', email: 'charlotte.adams_pm@gmail.com' },
  { name: 'Alexander Baker', email: 'alexbaker.capital@gmail.com' },
  { name: 'Amelia Nelson', email: 'amelia_nelson.fx@gmail.com' },
  { name: 'Henry Carter', email: 'hcarter.trades@gmail.com' },
  { name: 'Harper Mitchell', email: 'harper.mitchell@gmail.com' },
  { name: 'Jack Perez', email: 'jackp_98@gmail.com' },
  { name: 'Evelyn Turner', email: 'evelyn.turner.invest@gmail.com' },
  { name: 'Sebastian Phillips', email: 'sebastian.phillips@icloud.com' },
  { name: 'Abigail Campbell', email: 'abigailcampbell.fx@gmail.com' },
  { name: 'Marcos Santos', email: 'marcos.santos.cap@outlook.com' },
  { name: 'Nuria Lozano', email: 'nurialz_91@icloud.com' },
  { name: 'Victor Prieto', email: 'vprieto.trading@gmail.com' },
  { name: 'Angela Rivas', email: 'angela.rivas.fx@protonmail.com' }
]

const PLACEHOLDER_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1']

function createSeededRandom(seed) {
  return function() {
    seed = Math.imul(1103515245, seed) + 12345
    return ((seed >>> 0) % 2147483648) / 2147483648
  }
}

function toAdminEmail(name) {
  const parts = name.trim().toLowerCase().split(/\s+/)
  return parts.join('.') + '@opessocius.support'
}

function toNormalEmail(displayName, globalIndex, rand) {
  if (globalIndex < NAME_AND_EMAIL_LIST.length) {
    return NAME_AND_EMAIL_LIST[globalIndex].email
  }
  const parts = displayName.trim().toLowerCase().split(/\s+/)
  const base = parts.join('.')
  const num = String(Math.floor(rand() * 9000) + 1000)
  return base + num + '@gmail.com'
}

export function generateAdmin3SampleUsers() {
  const rand = createSeededRandom(12345)
  const users = []
  let idx = 0

  const totalDepositsTarget = 2150000
  const totalWithdrawalsTarget = 300000
  const totalCurrentBalanceTarget = 1850000
  const depositWeights = Array.from({ length: 43 }, () => 0.7 + rand() * 0.6)
  const depositSum = depositWeights.reduce((a, b) => a + b, 0)
  const totalDepositsPerInvestor = depositWeights.map((w) => Math.round((w / depositSum) * totalDepositsTarget * 100) / 100)
  const withSum = totalDepositsPerInvestor.reduce((a, b) => a + b, 0)
  totalDepositsPerInvestor[0] += Math.round((totalDepositsTarget - withSum) * 100) / 100

  const wdWeights = Array.from({ length: 43 }, () => 0.5 + rand() * 1)
  const wdSum = wdWeights.reduce((a, b) => a + b, 0)
  const totalWithdrawalsPerInvestor = wdWeights.map((w) => Math.round((w / wdSum) * totalWithdrawalsTarget * 100) / 100)
  const wdFinalSum = totalWithdrawalsPerInvestor.reduce((a, b) => a + b, 0)
  totalWithdrawalsPerInvestor[0] += Math.round((totalWithdrawalsTarget - wdFinalSum) * 100) / 100

  const investorAccountData = totalDepositsPerInvestor.map((td, i) => {
    const tw = totalWithdrawalsPerInvestor[i]
    const cb = Math.round((td - tw) * 100) / 100
    const initial = Math.round(td * (0.5 + rand() * 0.4) * 100) / 100
    return { initialInvestment: initial, totalDeposits: td, totalWithdrawals: tw, currentBalance: cb }
  })
  const cbDrift = totalCurrentBalanceTarget - investorAccountData.reduce((a, d) => a + d.currentBalance, 0)
  investorAccountData[0].currentBalance = Math.round((investorAccountData[0].currentBalance + cbDrift) * 100) / 100

  let investorIdx = 0
  const addUsers = (count, primaryStatus) => {
    for (let i = 0; i < count; i++) {
      idx++
      const entry = NAME_AND_EMAIL_LIST[idx % NAME_AND_EMAIL_LIST.length]
      const displayName = entry.name
      const id = `sample_${primaryStatus.toLowerCase().replace(/\s/g, '_')}_${idx}`
      const isAdmin = ['Admin', 'Admin 2', 'Admin 3'].includes(primaryStatus)
      const email = isAdmin ? toAdminEmail(displayName) : toNormalEmail(displayName, idx - 1, rand)
      const firstLetter = (displayName || 'U').charAt(0).toUpperCase()
      const bgColor = PLACEHOLDER_COLORS[idx % PLACEHOLDER_COLORS.length]
      const statuses = primaryStatus === 'Admin' ? ['Admin']
        : primaryStatus === 'Admin 2' ? ['Admin 2', 'Relations']
        : primaryStatus === 'Admin 3' ? ['Admin 3', 'Community']
        : primaryStatus === 'Community' ? ['Community']
        : [primaryStatus, 'Community']
      const u = {
        id,
        displayName,
        email,
        profileImageUrl: '',
        profilePlaceholder: { letter: firstLetter, bgColor },
        statuses,
        _isSample: true,
        investmentData: null
      }
      if (primaryStatus === 'Investor') {
        const acc = investorAccountData[investorIdx++]
        u.investmentData = {
          initialInvestment: acc.initialInvestment,
          totalDeposits: acc.totalDeposits,
          totalWithdrawals: acc.totalWithdrawals,
          currentBalance: acc.currentBalance,
          status: 'approved',
          accountType: 'Investor',
          riskTolerance: 'moderate',
          monthlyReturnRate: 0.04
        }
      } else if (primaryStatus === 'Trader') {
        u.investmentData = {
          initialInvestment: Math.round((10000 + rand() * 90000) * 100) / 100,
          status: 'approved',
          accountType: 'Trader',
          monthlyReturnRate: 0
        }
      }
      users.push(u)
    }
  }

  addUsers(67, 'Community')
  addUsers(43, 'Investor')
  addUsers(28, 'Trader')
  addUsers(12, 'Admin 3')
  addUsers(8, 'Admin 2')
  addUsers(4, 'Admin')

  return users
}

export function getAdmin3SampleInvestors() {
  return generateAdmin3SampleUsers().filter((u) => (u.statuses || []).includes('Investor'))
}
