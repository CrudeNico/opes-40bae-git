import { Timestamp } from 'firebase/firestore'

export const ADMIN3_PENDING_CONSULTATIONS_COUNT = 29
export const ADMIN3_USER_MESSAGE_ALERTS_COUNT = 15

const CONSULTATION_CONTACTS = [
  { name: 'Álvaro Medina', email: 'amedina.capital@gmail.com', statuses: ['Investor'] },
  { name: 'Gonzalo Serrano', email: 'g.serrano.fxdesk@outlook.com', statuses: ['Investor'] },
  { name: 'Rodrigo Valverde', email: 'rvalverde.trading@protonmail.com', statuses: ['Investor'] },
  { name: 'Íñigo Fuentes', email: 'inigo.fuentes.lrn@icloud.com', statuses: ['Learner'] },
  { name: 'Leandro Campos', email: 'lc.amsterdam92@gmail.com', statuses: ['Investor'] },
  { name: 'Bruno Carrasco', email: 'brunorides88@outlook.com', statuses: ['Investor'] },
  { name: 'Saúl Cabrera', email: 'saulwave91@hotmail.com', statuses: ['Relations'] },
  { name: 'Darío Montes', email: 'montes.harbor@outlook.com', statuses: ['Investor'] },
  { name: 'Rubén Lozano', email: 'rubenlz.capital@yahoo.com', statuses: ['Investor'] },
  { name: 'Héctor Navarro', email: 'h.navarro.portfolio@gmail.com', statuses: ['Investor'] },
  { name: 'César Pardo', email: 'cobalt.cesar87@gmail.com', statuses: ['Learner'] },
  { name: 'Aitor Vázquez', email: 'a.vazquez.trd@outlook.com', statuses: ['Investor'] },
  { name: 'Ander Salazar', email: 'ander.salazar_pm@gmail.com', statuses: ['Investor'] },
  { name: 'Unai Prieto', email: 'uprieto.basque@gmail.com', statuses: ['Investor'] },
  { name: 'Iker Montalvo', email: 'iker.montalvo_fx@protonmail.com', statuses: ['Investor'] },
  { name: 'Garrett Sullivan', email: 'g.sullivan.ny@gmail.com', statuses: ['Investor'] },
  { name: 'Cooper Hayes', email: 'chayes.capital@outlook.com', statuses: ['Investor'] },
  { name: 'Griffin Walker', email: 'gwalker.relations@protonmail.com', statuses: ['Relations'] },
  { name: 'Bryce Bennett', email: 'bbennett.fxdesk@gmail.com', statuses: ['Investor'] },
  { name: 'Tucker Brooks', email: 'tbrooks.capital@outlook.com', statuses: ['Investor'] },
  { name: 'Chase Morgan', email: 'cmorgan.trades@gmail.com', statuses: ['Investor'] },
  { name: 'Tanner Reed', email: 'treed.invest91@icloud.com', statuses: ['Investor'] },
  { name: 'Nolan Foster', email: 'nfoster.skyline@gmail.com', statuses: ['Investor'] },
  { name: 'Parker Mitchell', email: 'pmitchell.delta@gmail.com', statuses: ['Investor'] },
  { name: 'Sawyer Collins', email: 'collins.sawyerx@gmail.com', statuses: ['Learner'] },
  { name: 'Everett Dawson', email: 'everettnorthfield@gmail.com', statuses: ['Investor'] },
  { name: 'Wyatt Harper', email: 'wharper.fxdesk@protonmail.com', statuses: ['Investor'] },
  { name: 'Beckett Carter', email: 'bcarter.invest88@gmail.com', statuses: ['Investor'] },
  { name: 'Hudson Pierce', email: 'hudson.trails@outlook.com', statuses: ['Relations'] }
]

const ALERT_USERS = [
  { name: 'Álvaro', email: 'amedina.capital@gmail.com', statuses: ['Investor'] },
  { name: 'Rodrigo', email: 'rvalverde.trading@protonmail.com', statuses: ['Investor'] },
  { name: 'Bruno', email: 'brunorides88@outlook.com', statuses: ['Investor'] },
  { name: 'Darío', email: 'montes.harbor@outlook.com', statuses: ['Learner'] },
  { name: 'Sergio', email: 'smendez.fxdesk@outlook.com', statuses: ['Investor'] },
  { name: 'Iván', email: 'ifuentes.capital@protonmail.com', statuses: ['Investor'] },
  { name: 'Marcos', email: 'mserrano.trd@icloud.com', statuses: ['Learner'] },
  { name: 'Garrett', email: 'g.sullivan.ny@gmail.com', statuses: ['Investor'] },
  { name: 'Cooper', email: 'chayes.capital@outlook.com', statuses: ['Investor'] },
  { name: 'Nolan', email: 'nfoster.skyline@gmail.com', statuses: ['Investor'] },
  { name: 'Parker', email: 'pmitchell.delta@gmail.com', statuses: ['Investor'] },
  { name: 'Hudson', email: 'hudson.trails@outlook.com', statuses: ['Investor'] },
  { name: 'Wyatt', email: 'wharper.fxdesk@protonmail.com', statuses: ['Investor'] },
  { name: 'Aitor', email: 'a.vazquez.trd@outlook.com', statuses: ['Investor'] },
  { name: 'Beckett', email: 'bcarter.invest88@gmail.com', statuses: ['Investor'] }
]

const CONSULTATION_TIMES = [
  '8:15 AM', '8:45 AM', '9:10 AM', '9:35 AM', '10:05 AM', '10:40 AM',
  '11:15 AM', '11:50 AM', '12:20 PM', '12:55 PM', '1:25 PM', '2:05 PM',
  '2:35 PM', '3:10 PM', '3:45 PM', '4:15 PM', '4:50 PM', '5:20 PM'
]

const CONSULTATION_MESSAGES = [
  'I would like to review my current crude allocation and discuss a modest increase for Q3.',
  'Planning a €180,000 capital addition next month and need guidance on timing relative to open positions.',
  'Interested in understanding how drawdown limits would apply if I move from conservative to balanced risk.',
  'Could we walk through the monthly performance breakdown and fee structure on my account?',
  'I am relocating funds from a legacy broker and want to confirm onboarding steps before transferring.',
  'Looking to schedule a follow up on the portfolio model we discussed in my last quarterly review.',
  'Need clarity on whether partial withdrawals affect the compounding structure mid month.',
  'Would like to discuss hedging exposure ahead of an OPEC announcement window.',
  'Requesting a session to compare the managed portfolio track versus self directed alternatives.',
  'I have a corporate entity ready to invest and need to understand KYC requirements for the account.',
  'Seeking advice on rebalancing after a large unrealized gain in the energy sleeve.',
  'Can we review tax reporting documents and expected distribution timing for this year?',
  'I want to increase monthly contributions and confirm how deposits are prorated for performance.',
  'Please arrange a call to discuss risk parameters before approving a €95,000 top up.',
  'Interested in learning how stop loss rules interact with the crude oil strategy in volatile weeks.',
  'Need help interpreting last month’s statement, specifically the growth vs. cashflow lines.',
  'Would like operator input before confirming a wire transfer scheduled for Thursday.',
  'Requesting guidance on minimum holding periods before a partial redemption.',
  'I am considering a second tranche investment and want to understand capacity limits.',
  'Can we review execution windows and typical slippage during high volatility sessions?',
  'Looking to align my portfolio mandate with a more income oriented objective.',
  'Need a walkthrough of the investor portal reports before my board meeting.',
  'I would like to discuss currency exposure given most of my liabilities are in EUR.',
  'Please review my withdrawal request timeline. Funds needed by the 28th.',
  'Interested in adding a satellite allocation without disturbing the core crude book.',
  'Want to understand how weekend gaps are handled in the risk framework.',
  'Scheduling time to review beneficiary details and account succession paperwork.',
  'I need clarification on performance fees versus management fees on my latest invoice.',
  'Requesting a strategy session before committing an additional €220,000 from family office capital.'
]

const PLACEHOLDER_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1']

const OPERATOR = {
  adminName: 'Daniel G.',
  adminImagePath: 'homepage/diegorequena.JPG'
}

function hoursAgo(referenceDate, hours) {
  return Timestamp.fromDate(new Date(referenceDate.getTime() - hours * 3600000))
}

function buildChatThreads(referenceDate = new Date()) {
  const mk = (uid, userName, userEmail, rows) =>
    rows.map((row, i) => ({
      id: `${uid}-msg-${i + 1}`,
      userId: uid,
      userName,
      userEmail,
      status: row.pending ? 'pending' : 'read',
      type: 'chat',
      createdAt: hoursAgo(referenceDate, row.hoursAgo),
      updatedAt: hoursAgo(referenceDate, row.hoursAgo),
      ...(row.userMessage != null ? { message: row.userMessage } : {}),
      ...(row.adminResponse != null
        ? {
            adminResponse: {
              message: row.adminResponse,
              createdAt: hoursAgo(referenceDate, row.hoursAgo),
              adminName: OPERATOR.adminName,
              adminImagePath: OPERATOR.adminImagePath
            }
          }
        : {})
    }))

  return {
    'admin3-alert-user-1': mk('admin3-alert-user-1', 'Álvaro', 'amedina.capital@gmail.com', [
      {
        hoursAgo: 1.2,
        userMessage: 'hey, there’s a line on my statement called “custody adj”. what is that?',
        pending: true
      }
    ]),

    'admin3-alert-user-2': mk('admin3-alert-user-2', 'Rodrigo', 'rvalverde.trading@protonmail.com', [
      { hoursAgo: 8, userMessage: 'wire sent. €125k.' },
      { hoursAgo: 7, adminResponse: 'Thanks Rodrigo. Use your account ID in the reference so we can match it quickly.' },
      { hoursAgo: 0.6, userMessage: 'ref is OP88421. lmk when it lands pls', pending: true }
    ]),

    'admin3-alert-user-3': mk('admin3-alert-user-3', 'Bruno', 'brunorides88@outlook.com', [
      {
        hoursAgo: 72,
        userMessage:
          'Good morning. I am reviewing my learner account ahead of a potential upgrade to investor status and would like clarification on how monthly performance reports differ between the two tiers.'
      },
      {
        hoursAgo: 68,
        adminResponse:
          'Morning Bruno. Learner accounts receive a condensed monthly summary. Investor accounts include full trade attribution, cashflow detail, and downloadable PDF reporting.'
      },
      { hoursAgo: 50, userMessage: 'Is the upgrade automatic once I hit a balance threshold, or do I need to request it?' },
      {
        hoursAgo: 46,
        adminResponse:
          'It is request based. Once you meet the minimum balance we can initiate a short review and convert the account type.'
      },
      {
        hoursAgo: 2,
        userMessage:
          'Understood. Please send the minimum balance requirement and any forms I should complete before applying.',
        pending: true
      }
    ]),

    'admin3-alert-user-4': mk('admin3-alert-user-4', 'Darío', 'montes.harbor@outlook.com', [
      { hoursAgo: 36, userMessage: 'Need €18,200 out by the 30th for a closing.' },
      { hoursAgo: 32, adminResponse: 'Noted. Gross or net of fees?' },
      { hoursAgo: 14, userMessage: 'Net. Attorney needs exactly €18,200.' },
      { hoursAgo: 0.4, userMessage: 'hello? any update on this, closing is in 4 days', pending: true }
    ]),

    'admin3-alert-user-5': mk('admin3-alert-user-5', 'Sergio', 'smendez.fxdesk@outlook.com', [
      { hoursAgo: 14, userMessage: 'Adding €60,000 next Tuesday. Does it count for this month’s performance?' },
      {
        hoursAgo: 12,
        adminResponse: 'Yes. Credited deposits are prorated from the value date for monthly performance.'
      },
      { hoursAgo: 0.9, userMessage: 'Tuesday value date. Send estimate when you can.', pending: true }
    ]),

    'admin3-alert-user-6': mk('admin3-alert-user-6', 'Iván', 'ifuentes.capital@protonmail.com', [
      { hoursAgo: 96, userMessage: 'Why was daily P&L basically flat last week when Brent moved several dollars?' },
      {
        hoursAgo: 90,
        adminResponse:
          'Exposure was reduced ahead of the inventory release, so your book did not participate fully in the headline move.'
      },
      { hoursAgo: 80, userMessage: 'OK. When do you typically rebuild risk after events like that?' },
      {
        hoursAgo: 76,
        adminResponse:
          'Usually over the following two sessions unless volatility remains elevated. It is discretionary within your mandate.'
      },
      { hoursAgo: 60, userMessage: 'Can I get a notification when exposure is back above 80%?' },
      { hoursAgo: 55, adminResponse: 'We do not auto notify, but I can note that preference on your file.' },
      { hoursAgo: 3, userMessage: 'Please note it. Also send last week’s attribution breakdown if possible.', pending: true }
    ]),

    'admin3-alert-user-7': mk('admin3-alert-user-7', 'Marcos', 'mserrano.trd@icloud.com', [
      { hoursAgo: 9, userMessage: 'is anyone on support today?' },
      { hoursAgo: 0.3, userMessage: 'trying to confirm a tax withdrawal, €9,800, no rush but need an answer', pending: true }
    ]),

    'admin3-alert-user-8': mk('admin3-alert-user-8', 'Garrett', 'g.sullivan.ny@gmail.com', [
      {
        hoursAgo: 48,
        userMessage:
          'I will be transferring €200,000 from a corporate account next week. Please confirm whether additional source of funds documentation is required.'
      },
      {
        hoursAgo: 44,
        adminResponse:
          'For transfers above €150,000 we request a brief source of funds confirmation. I will email the one page form.'
      },
      { hoursAgo: 1.5, userMessage: 'Form received, uploading today. Hold capacity for the full amount?', pending: true }
    ]),

    'admin3-alert-user-9': mk('admin3-alert-user-9', 'Cooper', 'chayes.capital@outlook.com', [
      {
        hoursAgo: 5,
        userMessage:
          'I got an email asking me to “verify wallet linkage”. Didn’t click anything. Is that from you or phishing?'
      },
      { hoursAgo: 0.7, userMessage: 'still waiting on this, want to make sure my account is ok', pending: true }
    ]),

    'admin3-alert-user-10': mk('admin3-alert-user-10', 'Nolan', 'nfoster.skyline@gmail.com', [
      { hoursAgo: 40, userMessage: 'Can I split a redemption? €16k EUR + rest in USD.' },
      { hoursAgo: 36, adminResponse: 'Yes, if both accounts are linked. Confirm the USD account ending digits.' },
      { hoursAgo: 20, userMessage: '4418 on USD.' },
      { hoursAgo: 18, adminResponse: 'Matched. Send written confirmation and we will queue the split.' },
      { hoursAgo: 1.1, userMessage: 'Confirmed, please proceed. Total €32,000.', pending: true }
    ]),

    'admin3-alert-user-11': mk('admin3-alert-user-11', 'Parker', 'pmitchell.delta@gmail.com', [
      { hoursAgo: 6, userMessage: 'reports tab blank on safari' },
      { hoursAgo: 5, adminResponse: 'Try a hard refresh or Chrome. We are aware of a Safari caching issue.' },
      { hoursAgo: 0.5, userMessage: 'chrome works. safari still white screen tho', pending: true }
    ]),

    'admin3-alert-user-12': mk('admin3-alert-user-12', 'Hudson', 'hudson.trails@outlook.com', [
      {
        hoursAgo: 2.5,
        userMessage:
          'Hi, I enabled 2FA like you suggested last month but now the app keeps asking me to sign in again every time I open the portfolio view on my phone. Not sure if that’s normal. Also wanted to ask if I can name a secondary contact for account alerts because I travel a lot and my wife handles finances when I’m away. Let me know what you need from me.',
        pending: true
      }
    ]),

    'admin3-alert-user-13': mk('admin3-alert-user-13', 'Wyatt', 'wharper.fxdesk@protonmail.com', [
      { hoursAgo: 120, userMessage: 'Am I maxed out on crude exposure for my risk band?' },
      { hoursAgo: 115, adminResponse: 'You are at roughly 92% of ceiling for your current band.' },
      { hoursAgo: 100, userMessage: 'Room for a small increase without changing bands?' },
      { hoursAgo: 96, adminResponse: 'Possible after a short risk review call, about 15 minutes.' },
      { hoursAgo: 80, userMessage: 'Book something next week mornings CET.' },
      { hoursAgo: 75, adminResponse: 'I will send calendar options by email.' },
      { hoursAgo: 48, userMessage: 'Never got the calendar link.' },
      { hoursAgo: 4, userMessage: 'Following up again, still no link. Can someone call me instead?', pending: true }
    ]),

    'admin3-alert-user-14': mk('admin3-alert-user-14', 'Aitor', 'a.vazquez.trd@outlook.com', [
      { hoursAgo: 11, userMessage: 'where do i download the monthly pdf report?' },
      { hoursAgo: 8, adminResponse: 'Portfolio → Reports → Monthly Summary → Export PDF.' },
      { hoursAgo: 0.6, userMessage: 'that menu is greyed out for me. using investor account', pending: true }
    ]),

    'admin3-alert-user-15': mk('admin3-alert-user-15', 'Beckett', 'bcarter.invest88@gmail.com', [
      {
        hoursAgo: 3,
        userMessage: 'Can someone explain the performance fee line on my invoice? Amount looks higher than I expected.',
        pending: true
      }
    ])
  }
}

let cachedChatThreads = null
let cachedChatThreadsDay = null

function getChatThreads(referenceDate = new Date()) {
  const dayKey = referenceDate.toDateString()
  if (!cachedChatThreads || cachedChatThreadsDay !== dayKey) {
    cachedChatThreads = buildChatThreads(referenceDate)
    cachedChatThreadsDay = dayKey
  }
  return cachedChatThreads
}

function nextWeekdayOnOrAfter(startDate, daysAhead) {
  const d = new Date(startDate)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + daysAhead)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

/** Assign unique weekday date + time pairs (forward-looking, no duplicates). */
function buildUniqueConsultationSlots(count, referenceDate = new Date()) {
  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)
  const slots = []
  let dayOffset = 1
  let timeIdx = 0

  while (slots.length < count) {
    const date = nextWeekdayOnOrAfter(today, dayOffset)
    const time = CONSULTATION_TIMES[timeIdx % CONSULTATION_TIMES.length]
    slots.push({ date, time })
    timeIdx += 1
    if (timeIdx % CONSULTATION_TIMES.length === 0) {
      dayOffset += 1
      timeIdx = 0
    }
  }

  return slots
}

/** Pending consultations for Admin 3 support panel (forward-looking dates only). */
export function generateAdmin3PendingConsultations(referenceDate = new Date()) {
  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)
  const slots = buildUniqueConsultationSlots(CONSULTATION_CONTACTS.length, today)

  const consultations = CONSULTATION_CONTACTS.map((contact, index) => {
    const { date, time } = slots[index]
    const createdAt = Timestamp.fromDate(new Date(today.getTime() - (index + 1) * 3600000))

    return {
      id: `admin3-consultation-${index + 1}`,
      userName: contact.name,
      userEmail: contact.email,
      userStatuses: contact.statuses,
      status: 'pending',
      type: 'consultation',
      date: Timestamp.fromDate(date),
      time,
      message: CONSULTATION_MESSAGES[index % CONSULTATION_MESSAGES.length],
      createdAt,
      _isAdmin3Sample: true
    }
  })

  consultations.sort((a, b) => {
    const aTime = a.date?.toDate?.() || new Date(0)
    const bTime = b.date?.toDate?.() || new Date(0)
    if (aTime.getTime() !== bTime.getTime()) return aTime - bTime
    return String(a.time).localeCompare(String(b.time))
  })

  return consultations
}

/** Users with unread message bells for Admin 3 support sidebar. */
export function generateAdmin3AlertUsers() {
  return ALERT_USERS.map((contact, index) => ({
    uid: `admin3-alert-user-${index + 1}`,
    displayName: contact.name,
    email: contact.email,
    statuses: contact.statuses,
    hasUnreadMessages: true,
    profileColor: PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length],
    _isAdmin3Sample: true
  }))
}

/** Chat history for a sandbox alert user (operator + investor thread). */
export function getAdmin3SampleChatMessages(uid, referenceDate = new Date()) {
  const threads = getChatThreads(referenceDate)
  return threads[uid] ? [...threads[uid]] : []
}

export function isAdmin3SampleSupportId(id) {
  return typeof id === 'string' && (id.startsWith('admin3-consultation-') || id.startsWith('admin3-alert-user-'))
}
