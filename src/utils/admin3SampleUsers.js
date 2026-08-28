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

/** Approved investors in Admin 3 Investors section. */
const ADMIN3_INVESTOR_PROFILES = [
  { name: 'Leandro Vega', email: 'velvetcomet88@gmail.com' },
  { name: 'César Cabrera', email: 'cesar_cab@outlook.com' },
  { name: 'Rubén Morales', email: 'northsidefalcon@gmail.com' },
  { name: 'Héctor Fuentes', email: 'hxfuentes77@gmail.com' },
  { name: 'Joel Santana', email: 'joelsantana@proton.me' },
  { name: 'Gael Romero', email: 'mango.pixel22@gmail.com' },
  { name: 'Lorenzo Gil', email: 'lorenzo-g@outlook.com' },
  { name: 'Eloy Castro', email: 'driftwood.ink@gmail.com' },
  { name: 'Ismael Núñez', email: 'ismaelnz94@gmail.com' },
  { name: 'Abel Herrera', email: 'crimson.harbor@gmail.com' },
  { name: 'Jaime Villanueva', email: 'norteazul27@gmail.com' },
  { name: 'Easton Briggs', email: 'eastonvibes@gmail.com' },
  { name: 'Zane Holloway', email: 'zxholloway@gmail.com' },
  { name: 'Sergio Valdés', email: 'sv.archive91@gmail.com' },
  { name: 'Lucía Ferrer', email: 'lucerna.mailbox@outlook.com' },
  { name: 'Marta Cifuentes', email: 'mcf.box@outlook.com' },
  { name: 'Carla Benítez', email: 'cbn.workspace@outlook.com' },
  { name: 'Grant Mercer', email: 'quietrocket@proton.me' },
  { name: 'Cole Donovan', email: 'cdonovan.mail@gmail.com' },
  { name: 'Beau Whitman', email: 'beauwhitmanx@gmail.com' },
  { name: 'Mikel Aguirre', email: 'midnight.avocado@gmail.com' },
  { name: 'Asier Etxeberria', email: 'a.etech89@gmail.com' },
  { name: 'Irene Lozano', email: 'irenelz.private@outlook.com' },
  { name: 'Álvaro Menéndez', email: 'bluecorner.mail@gmail.com' },
  { name: 'Jacobo Rivas', email: 'jacoborv@outlook.com' },
  { name: 'Declan Murphy', email: 'luckyturnip@gmail.com' },
  { name: 'Daniel Montero', email: 'dmont.casa@gmail.com' },
  { name: 'Rodrigo Salas', email: 'r.sierra.contact@gmail.com' },
  { name: 'Reed Sullivan', email: 'reed.sullivan.x@gmail.com' },
  { name: 'Trevor McCoy', email: 'trev.mccoy@outlook.com' }
]

const ADMIN3_PENDING_USERS = [
  { name: 'Saúl Cabrera', email: 'scabrera.trades91@hotmail.com', phoneNumber: '+34 612 847 391', initialInvestment: 50000, country: 'Spain', accountType: 'Trader' },
  { name: 'Darío Montes', email: 'd.montes.fxdesk@protonmail.com', phoneNumber: '+34 633 205 118', initialInvestment: 70000, country: 'Spain', accountType: 'Investor' },
  { name: 'Rubén Lozano', email: 'rubenlz.capital@yahoo.com', phoneNumber: '+34 698 441 027', initialInvestment: 130000, country: 'Spain', accountType: 'Investor' },
  { name: 'Héctor Navarro', email: 'h.navarro.portfolio@gmail.com', phoneNumber: '+1 917 482 6031', initialInvestment: 90000, country: 'United States', accountType: 'Investor' },
  { name: 'César Pardo', email: 'cpardo_invest88@icloud.com', phoneNumber: '+34 655 903 774', initialInvestment: 65000, country: 'Spain', accountType: 'Investor' },
  { name: 'Aitor Vázquez', email: 'a.vazquez.trd@outlook.com', phoneNumber: '+34 677 128 559', initialInvestment: 80000, country: 'Spain', accountType: 'Investor' },
  { name: 'Ander Salazar', email: 'ander.salazar_pm@gmail.com', phoneNumber: '+34 644 390 216', initialInvestment: 100000, country: 'Spain', accountType: 'Investor' },
  { name: 'Unai Prieto', email: 'uprieto.basque@gmail.com', phoneNumber: '+34 621 557 803', initialInvestment: 55000, country: 'Spain', accountType: 'Trader' },
  { name: 'Iker Montalvo', email: 'iker.montalvo_fx@protonmail.com', phoneNumber: '+34 609 774 652', initialInvestment: 72000, country: 'Spain', accountType: 'Investor' },
  { name: 'Garrett Sullivan', email: 'g.sullivan.ny@gmail.com', phoneNumber: '+1 646 318 9042', initialInvestment: 140000, country: 'United States', accountType: 'Investor' },
  { name: 'Cooper Hayes', email: 'chayes.capital@outlook.com', phoneNumber: '+1 312 705 1188', initialInvestment: 88000, country: 'United States', accountType: 'Investor' }
]

export function generateAdmin3PendingUsers() {
  return ADMIN3_PENDING_USERS.map((entry, index) => {
    const displayName = entry.name
    const firstLetter = (displayName || 'U').charAt(0).toUpperCase()
    const dayOffset = ADMIN3_PENDING_USERS.length - index
    const initiatedAt = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000).toISOString()
    return {
      id: `sample_pending_v2_${index + 1}`,
      displayName,
      email: entry.email,
      profileImageUrl: '',
      profilePlaceholder: { letter: firstLetter, bgColor: PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length] },
      statuses: [],
      _isSample: true,
      _showNewUserFlag: true,
      _listOrder: index,
      investmentData: {
        initialInvestment: entry.initialInvestment,
        startingDate: '2026-05-15',
        country: entry.country,
        phoneNumber: entry.phoneNumber,
        monthlyAdditions: 0,
        status: 'pending',
        initiatedAt,
        accountType: entry.accountType,
        riskTolerance: entry.accountType === 'Investor' ? 'moderate' : undefined,
        monthlyReturnRate: entry.accountType === 'Investor' ? 0.04 : 0
      }
    }
  })
}

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

  const investorCount = ADMIN3_INVESTOR_PROFILES.length
  const totalDepositsTarget = 2150000
  const totalWithdrawalsTarget = 300000
  const totalCurrentBalanceTarget = 1850000
  const depositWeights = Array.from({ length: investorCount }, () => 0.7 + rand() * 0.6)
  const depositSum = depositWeights.reduce((a, b) => a + b, 0)
  const totalDepositsPerInvestor = depositWeights.map((w) => Math.round((w / depositSum) * totalDepositsTarget * 100) / 100)
  const withSum = totalDepositsPerInvestor.reduce((a, b) => a + b, 0)
  totalDepositsPerInvestor[0] += Math.round((totalDepositsTarget - withSum) * 100) / 100

  const wdWeights = Array.from({ length: investorCount }, () => 0.5 + rand() * 1)
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
  let investorProfileIdx = 0
  const addUsers = (count, primaryStatus) => {
    for (let i = 0; i < count; i++) {
      idx++
      const isAdmin = ['Admin', 'Admin 2', 'Admin 3'].includes(primaryStatus)
      let displayName
      let email
      if (primaryStatus === 'Investor') {
        const profile = ADMIN3_INVESTOR_PROFILES[investorProfileIdx++]
        displayName = profile.name
        email = profile.email
      } else {
        const entry = NAME_AND_EMAIL_LIST[idx % NAME_AND_EMAIL_LIST.length]
        displayName = entry.name
        email = isAdmin ? toAdminEmail(displayName) : toNormalEmail(displayName, idx - 1, rand)
      }
      const id = `sample_${primaryStatus.toLowerCase().replace(/\s/g, '_')}_${idx}`
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
          monthlyReturnRate: 0.04,
          startingDate: '2026-03-15',
          country: 'United States',
          phoneNumber: '+1 555-0100',
          monthlyAdditions: 0,
          // Fixed dates so the 30-day admin correction window is deterministic in sandbox (vs. Date.now()).
          initiatedAt: '2026-04-01T12:00:00.000Z',
          approvedAt: '2026-04-02T12:00:00.000Z'
        }
      } else if (primaryStatus === 'Trader') {
        u.investmentData = {
          initialInvestment: Math.round((10000 + rand() * 90000) * 100) / 100,
          status: 'approved',
          accountType: 'Trader',
          monthlyReturnRate: 0,
          startingDate: '2026-03-20',
          country: 'Canada',
          phoneNumber: '+1 555-0200',
          monthlyAdditions: 0,
          initiatedAt: '2026-04-01T12:00:00.000Z',
          approvedAt: '2026-04-03T12:00:00.000Z'
        }
      }
      users.push(u)
    }
  }

  addUsers(67, 'Community')
  addUsers(investorCount, 'Investor')
  addUsers(28, 'Trader')
  addUsers(12, 'Admin 3')
  addUsers(8, 'Admin 2')
  addUsers(4, 'Admin')

  return [...generateAdmin3PendingUsers(), ...users]
}

export function getAdmin3SampleInvestors() {
  return generateAdmin3SampleUsers().filter((u) => (u.statuses || []).includes('Investor'))
}
