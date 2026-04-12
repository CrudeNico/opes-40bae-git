import React, { useState, useEffect, useRef } from 'react'
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, Timestamp, onSnapshot } from 'firebase/firestore'
import {
  getAdminInvestorSummaryCurrentBalance,
  getLastTrancheEnding,
  TRANCHE_PRIMARY,
  TRANCHE_SECONDARY
} from '../utils/investorDualTranche'
import './AdminOverview.css'

/** Normalize for case- and accent-insensitive comparison (e.g. Nicolás → nicolas). */
function normalizeOverviewKey(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Excluded from “total investor accounts” sum (Marcos & Nicolás/Nicolas de Rodrigo + legacy emails). */
function isExcludedFromInvestorOverviewTotal(email, displayName) {
  const em = normalizeOverviewKey(email)
  const nm = normalizeOverviewKey(displayName)
  const excludedEmails = [
    'nicolas.fernandez@opessocius.support',
    'marcoscollab@gmail.com',
    'ndrf1806@gmail.com'
  ]
  if (excludedEmails.includes(em)) return true
  const excludedNames = ['marcos de rodrigo', 'nicolas de rodrigo']
  // After NFD, Nicolás → nicolas, so this matches Nicolás or Nicolas de Rodrigo
  if (excludedNames.includes(nm)) return true
  return false
}

const CALENDAR_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function isClaraPayoutInvestor(email, displayName) {
  const em = (email || '').toLowerCase()
  const nm = (displayName || '').toLowerCase()
  return (
    em.includes('clara') ||
    nm.includes('clara perez ramirez') ||
    nm.includes('clara perez')
  )
}

/** True when a second tranche exists with a positive initial (same idea as dual investor in product rules). */
function hasSecondaryTrancheForTarget(investmentData) {
  const s = Number(investmentData?.secondaryInvestment?.initialInvestment)
  return Number.isFinite(s) && s > 0
}

/** Calendar previous month relative to `referenceDate` (used for payout target vs prior performance). */
function getPreviousMonthContext(referenceDate = new Date()) {
  const d = new Date(referenceDate)
  d.setMonth(d.getMonth() - 1)
  return { monthName: CALENDAR_MONTH_NAMES[d.getMonth()], year: d.getFullYear() }
}

function monthlyHistoryRecordsForMonth(monthlyHistory, monthName, year) {
  return (monthlyHistory || []).filter(
    (r) => r.month === monthName && parseInt(String(r.year), 10) === year
  )
}

/**
 * If prior month has valid performance rows: sum(endingBalance × percentageGrowth/100) per row.
 * `percentageGrowth` is stored as whole percent (e.g. 2 → 2%).
 */
function payoutFromPreviousMonthRecords(records, monthLabel) {
  let sum = 0
  const labelParts = []
  for (const r of records) {
    const eb = Number(r.endingBalance)
    const pg = Number(r.percentageGrowth)
    if (!Number.isFinite(eb) || !Number.isFinite(pg)) continue
    sum += eb * (pg / 100)
    labelParts.push(`${pg}%`)
  }
  if (labelParts.length === 0) return null
  const rateLabel =
    labelParts.length === 1 ? `${labelParts[0]} (${monthLabel})` : `${labelParts.join(' · ')} (${monthLabel})`
  return { target: sum, rateLabel }
}

/**
 * Monthly € target for the progress bar (~33%) and modal: prior month ledger if present; else fallbacks.
 */
function monthlyTargetAndRateForPayout(investmentData, email, displayName, prevCtx) {
  if (!investmentData) return { target: 0, rateLabel: '—' }
  const { monthName, year } = prevCtx
  const prevRecords = monthlyHistoryRecordsForMonth(investmentData.monthlyHistory, monthName, year)

  if (prevRecords.length > 0) {
    const fromHistory = payoutFromPreviousMonthRecords(prevRecords, `${monthName} ${year}`)
    if (fromHistory !== null) return fromHistory
  }

  if (isClaraPayoutInvestor(email, displayName)) {
    const combined = getAdminInvestorSummaryCurrentBalance(investmentData)
    return { target: combined * 0.03, rateLabel: '3%' }
  }

  if (hasSecondaryTrancheForTarget(investmentData)) {
    const mh = investmentData.monthlyHistory || []
    const pInit = Number(investmentData.initialInvestment) || 0
    const sInit = Number(investmentData.secondaryInvestment?.initialInvestment) || 0
    const primaryBal = getLastTrancheEnding(mh, TRANCHE_PRIMARY, pInit)
    const secondaryBal = getLastTrancheEnding(mh, TRANCHE_SECONDARY, sInit)
    return {
      target: primaryBal * 0.02 + secondaryBal * 0.04,
      rateLabel: '2% + 4%'
    }
  }

  const balance = getAdminInvestorSummaryCurrentBalance(investmentData)
  const rate =
    investmentData.monthlyReturnRate != null && Number.isFinite(Number(investmentData.monthlyReturnRate))
      ? Number(investmentData.monthlyReturnRate)
      : investmentData.riskTolerance === 'conservative'
        ? 0.02
        : 0.04
  return {
    target: balance * rate,
    rateLabel: `${(rate * 100).toFixed(0)}%`
  }
}

const AdminOverview = ({ user, userStatuses = [] }) => {
  const [loading, setLoading] = useState(true)
  const [currentBalance, setCurrentBalance] = useState(0)
  const [totalInvestorAccounts, setTotalInvestorAccounts] = useState(0)
  /** { name, balance, monthlyTarget }[] for the total-investor modal (non–Admin 3 only). */
  const [investorTotalModalLines, setInvestorTotalModalLines] = useState([])
  const [showInvestorTotalModal, setShowInvestorTotalModal] = useState(false)
  const [pendingConsultations, setPendingConsultations] = useState(0)
  const [userMessageAlerts, setUserMessageAlerts] = useState(0)
  const [investorPayoutTarget, setInvestorPayoutTarget] = useState(0)
  const [error, setError] = useState('')
  const [progressBarKey, setProgressBarKey] = useState(0)
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [dailyPerformances, setDailyPerformances] = useState({})
  const [selectedDay, setSelectedDay] = useState(null)
  const [showDayModal, setShowDayModal] = useState(false)
  const [dayPerformanceForm, setDayPerformanceForm] = useState({ type: 'win', amount: '' })
  const [totalDailyPerformance, setTotalDailyPerformance] = useState(0)
  const [performanceOwnerId, setPerformanceOwnerId] = useState(null)
  const [isAdmin2, setIsAdmin2] = useState(false)
  const [isAdmin3, setIsAdmin3] = useState(false)
  const dailyPerfUnsubscribeRef = useRef(null)

  const ADMIN3_CURRENT_BALANCE = 7110000
  const ADMIN3_TOTAL_INVESTOR_ACCOUNTS = 1850000
  const ADMIN3_INVESTOR_PAYOUT_TARGET = 37500
  const ADMIN3_MONTHLY_PROJECTION = 7110000 * 0.09
  const ADMIN3_TRADE_DAYS = [2, 3, 4, 18, 19, 20]
  const ADMIN3_FIXED_TRADES = {
    2: { type: 'win', amount: 5051.30 },
    3: { type: 'win', amount: 10460.32 },
    4: { type: 'win', amount: 2744.82 },
    18: { type: 'win', amount: 3641 },
    19: { type: 'win', amount: 6178.15 },
    20: { type: 'win', amount: 1647.99 }
  }

  function generateAdmin3DailyPerformances() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const perf = {}
    for (const day of ADMIN3_TRADE_DAYS) {
      const d = new Date(year, month, day)
      if (d.getDay() === 0 || d.getDay() === 6) continue
      const trade = ADMIN3_FIXED_TRADES[day]
      if (trade) perf[day] = { ...trade }
    }
    return perf
  }

  useEffect(() => {
    loadOverviewData()
  }, [user])

  // Load saved calendar month from localStorage (skip for Admin 3 - always current month)
  useEffect(() => {
    if (userStatuses?.includes('Admin 3')) return
    const savedMonth = localStorage.getItem('adminOverviewCalendarMonth')
    const savedYear = localStorage.getItem('adminOverviewCalendarYear')
    if (savedMonth !== null && savedYear !== null) {
      setCalendarMonth(parseInt(savedMonth))
      setCalendarYear(parseInt(savedYear))
    }
  }, [userStatuses])

  // Save calendar month to localStorage when it changes (skip for Admin 3)
  useEffect(() => {
    if (userStatuses?.includes('Admin 3')) return
    localStorage.setItem('adminOverviewCalendarMonth', calendarMonth.toString())
    localStorage.setItem('adminOverviewCalendarYear', calendarYear.toString())
  }, [calendarMonth, calendarYear, userStatuses])

  // Admin 3: force current month only
  useEffect(() => {
    if (isAdmin3 || userStatuses?.includes('Admin 3')) {
      const now = new Date()
      setCalendarMonth(now.getMonth())
      setCalendarYear(now.getFullYear())
    }
  }, [userStatuses, isAdmin3])

  // Load daily performances when month/year or owner changes
  useEffect(() => {
    loadDailyPerformances()
    return () => {
      if (dailyPerfUnsubscribeRef.current) {
        dailyPerfUnsubscribeRef.current()
        dailyPerfUnsubscribeRef.current = null
      }
    }
  }, [user, calendarMonth, calendarYear, performanceOwnerId, isAdmin3, userStatuses])

  // Calculate total daily performance
  useEffect(() => {
    const total = Object.values(dailyPerformances).reduce((sum, perf) => {
      if (perf.type === 'win') {
        return sum + (parseFloat(perf.amount) || 0)
      } else {
        return sum - (parseFloat(perf.amount) || 0)
      }
    }, 0)
    setTotalDailyPerformance(total)
  }, [dailyPerformances])

  // Reset progress bar animation when currentBalance changes
  useEffect(() => {
    setProgressBarKey(prev => prev + 1)
  }, [currentBalance])

  useEffect(() => {
    if (!showInvestorTotalModal) return
    const onKey = (e) => {
      if (e.key === 'Escape') setShowInvestorTotalModal(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showInvestorTotalModal])

  const loadOverviewData = async () => {
    try {
      setLoading(true)
      setShowInvestorTotalModal(false)
      const db = getFirestore()

      // Load admin portfolio current balance and determine performance owner (Admin vs Admin 2)
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          const docStatuses = userData.statuses || []
          
          const isAdmin2Local = docStatuses && (docStatuses.includes('Admin 2') || docStatuses.includes('Relations'))
          const isAdmin3Local = docStatuses && docStatuses.includes('Admin 3')
          setIsAdmin2(isAdmin2Local)
          setIsAdmin3(isAdmin3Local)
          let portfolioData = null
          let ownerId = user.uid
          // If Admin 2 or Admin 3, find and use the main Admin's data
          if (isAdmin2Local || isAdmin3Local) {
            const usersCollection = collection(db, 'users')
            const usersSnapshot = await getDocs(usersCollection)
            
            // Find the Admin user (not Admin 2, just Admin)
            let adminUser = null
            usersSnapshot.forEach((docSnapshot) => {
              const data = docSnapshot.data()
              let statuses = data.statuses || []
              
              // Handle old format (isAdmin as array)
              if (statuses.length === 0 && Array.isArray(data.isAdmin) && data.isAdmin.length > 0) {
                statuses = data.isAdmin
              }
              // Handle old format (isAdmin as boolean)
              if (statuses.length === 0 && data.isAdmin === true) {
                statuses = ['Admin']
              }
              
              // Find user with 'Admin' status but not 'Admin 2'
              if (statuses.includes('Admin') && !statuses.includes('Admin 2') && !statuses.includes('Admin 3') && !statuses.includes('Relations')) {
                adminUser = { id: docSnapshot.id, ...data }
              }
            })
            
            if (adminUser) {
              ownerId = adminUser.id
              if (adminUser.investmentData) {
                portfolioData = adminUser.investmentData
              }
            }
          } else {
            // For full Admin, load their own portfolio data
            if (userData.investmentData) {
              portfolioData = userData.investmentData
            }
          }
          
          setPerformanceOwnerId(ownerId)
          
          if (isAdmin3Local) {
            setCurrentBalance(ADMIN3_CURRENT_BALANCE)
          } else if (portfolioData) {
            const initialInvestment = portfolioData.initialInvestment || 0
            const balance = portfolioData.currentBalance || initialInvestment
            setCurrentBalance(balance)
          } else {
            setCurrentBalance(0)
          }
        }
      }

      if (userStatuses?.includes('Admin 3')) {
        setIsAdmin3(true)
      }

      // Load total investor accounts + monthly payout target (same rules as ~33% bar)
      const usersCollection = collection(db, 'users')
      const usersSnapshot = await getDocs(usersCollection)
      const prevMonthCtx = getPreviousMonthContext()

      let total = 0
      let payoutTargetSum = 0
      const modalLines = []
      usersSnapshot.forEach((docSnapshot) => {
        const userData = docSnapshot.data()
        const statuses = userData.statuses || []
        const email = userData.email || ''
        const displayName = userData.displayName || ''

        if (isExcludedFromInvestorOverviewTotal(email, displayName)) {
          return
        }

        // Sum balances for approved Investor accounts only (not traders)
        if (
          statuses.includes('Investor') &&
          userData.investmentData &&
          userData.investmentData.status === 'approved'
        ) {
          const inv = userData.investmentData
          const balance = getAdminInvestorSummaryCurrentBalance(inv)
          const { target } = monthlyTargetAndRateForPayout(inv, email, displayName, prevMonthCtx)
          total += balance
          payoutTargetSum += target
          modalLines.push({
            name: (displayName && displayName.trim()) || 'Unnamed investor',
            balance,
            monthlyTarget: target
          })
        }
      })
      modalLines.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      if (userStatuses?.includes('Admin 3')) {
        setTotalInvestorAccounts(ADMIN3_TOTAL_INVESTOR_ACCOUNTS)
        setInvestorTotalModalLines([])
      } else {
        setTotalInvestorAccounts(total)
        setInvestorTotalModalLines(modalLines)
      }

      // Load pending consultations
      const consultationsQuery = query(
        collection(db, 'supportRequests'),
        where('status', '==', 'pending'),
        where('type', '==', 'consultation')
      )
      const consultationsSnapshot = await getDocs(consultationsQuery)
      setPendingConsultations(consultationsSnapshot.size)

      // Load user message alerts (unread chat messages)
      // We mirror the logic from AdminSupport: count users that have at least one pending support message
      const messagesQuery = query(
        collection(db, 'supportMessages'),
        where('status', '==', 'pending')
      )
      const messagesSnapshot = await getDocs(messagesQuery)
      const unreadUserIds = new Set()
      messagesSnapshot.forEach((docSnapshot) => {
        const msgData = docSnapshot.data()
        if (msgData.userId) {
          unreadUserIds.add(msgData.userId)
        }
      })
      setUserMessageAlerts(unreadUserIds.size)

      if (userStatuses?.includes('Admin 3')) {
        setInvestorPayoutTarget(ADMIN3_INVESTOR_PAYOUT_TARGET)
      } else {
        setInvestorPayoutTarget(payoutTargetSum)
      }

    } catch (error) {
      console.error('Error loading overview data:', error)
      setError('Failed to load overview data')
    } finally {
      setLoading(false)
    }
  }

  const loadDailyPerformances = () => {
    const now = new Date()
    const isCurrentMonth = calendarMonth === now.getMonth() && calendarYear === now.getFullYear()

    if ((isAdmin3 || userStatuses?.includes('Admin 3')) && isCurrentMonth) {
      if (dailyPerfUnsubscribeRef.current) {
        dailyPerfUnsubscribeRef.current()
        dailyPerfUnsubscribeRef.current = null
      }
      setDailyPerformances(generateAdmin3DailyPerformances())
      return
    }

    const ownerId = performanceOwnerId || user?.uid
    if (!ownerId) return

    if (dailyPerfUnsubscribeRef.current) {
      dailyPerfUnsubscribeRef.current()
      dailyPerfUnsubscribeRef.current = null
    }

    const db = getFirestore()
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    const monthName = monthNames[calendarMonth]
    const docId = `dailyPerformance_${ownerId}_${calendarYear}_${monthName}`
    const perfDocRef = doc(db, 'adminDailyPerformance', docId)

    const unsubscribe = onSnapshot(perfDocRef, (perfDoc) => {
      if (perfDoc.exists()) {
        const data = perfDoc.data()
        setDailyPerformances(data.performances || {})
      } else {
        setDailyPerformances({})
      }
    }, (error) => {
      console.error('Error listening to daily performances:', error)
      setDailyPerformances({})
    })

    dailyPerfUnsubscribeRef.current = unsubscribe
  }

  const handleDayClick = (day) => {
    setSelectedDay(day)
    const dayKey = day.toString()
    if (dailyPerformances[dayKey]) {
      setDayPerformanceForm({
        type: dailyPerformances[dayKey].type,
        amount: dailyPerformances[dayKey].amount.toString()
      })
    } else {
      setDayPerformanceForm({ type: 'win', amount: '' })
    }
    setShowDayModal(true)
  }

  const handleSaveDayPerformance = async () => {
    if (isAdmin2 || isAdmin3 || userStatuses?.includes('Admin 3')) return

    if (!selectedDay || !dayPerformanceForm.amount || parseFloat(dayPerformanceForm.amount) <= 0) {
      return
    }

    try {
      const db = getFirestore()
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December']
      const monthName = monthNames[calendarMonth]
      const ownerId = performanceOwnerId || user?.uid
      if (!ownerId) return
      const docId = `dailyPerformance_${ownerId}_${calendarYear}_${monthName}`
      
      const dayKey = selectedDay.toString()
      const updatedPerformances = {
        ...dailyPerformances,
        [dayKey]: {
          type: dayPerformanceForm.type,
          amount: parseFloat(dayPerformanceForm.amount)
        }
      }

      await setDoc(doc(db, 'adminDailyPerformance', docId), {
        userId: user.uid,
        year: calendarYear,
        month: monthName,
        performances: updatedPerformances,
        updatedAt: Timestamp.now()
      }, { merge: false })

      setDailyPerformances(updatedPerformances)
      setShowDayModal(false)
      setSelectedDay(null)
      setDayPerformanceForm({ type: 'win', amount: '' })
    } catch (error) {
      console.error('Error saving daily performance:', error)
      setError('Failed to save daily performance')
    }
  }

  const handleDeleteDayPerformance = async () => {
    if (isAdmin2 || isAdmin3 || userStatuses?.includes('Admin 3')) return
    if (!selectedDay) return

    try {
      const db = getFirestore()
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December']
      const monthName = monthNames[calendarMonth]
      const ownerId = performanceOwnerId || user?.uid
      if (!ownerId) return
      const docId = `dailyPerformance_${ownerId}_${calendarYear}_${monthName}`
      
      const dayKey = selectedDay.toString()
      const updatedPerformances = { ...dailyPerformances }
      delete updatedPerformances[dayKey]

      await setDoc(doc(db, 'adminDailyPerformance', docId), {
        userId: user.uid,
        year: calendarYear,
        month: monthName,
        performances: updatedPerformances,
        updatedAt: Timestamp.now()
      }, { merge: false })

      setDailyPerformances(updatedPerformances)
      setShowDayModal(false)
      setSelectedDay(null)
      setDayPerformanceForm({ type: 'win', amount: '' })
    } catch (error) {
      console.error('Error deleting daily performance:', error)
      setError('Failed to delete daily performance')
    }
  }

  const handleMonthNavigation = (direction) => {
    if (direction === 'prev') {
      if (calendarMonth === 0) {
        setCalendarMonth(11)
        setCalendarYear(calendarYear - 1)
      } else {
        setCalendarMonth(calendarMonth - 1)
      }
    } else {
      if (calendarMonth === 11) {
        setCalendarMonth(0)
        setCalendarYear(calendarYear + 1)
      } else {
        setCalendarMonth(calendarMonth + 1)
      }
    }
  }

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay()
  }

  const getCurrentDate = () => {
    const now = new Date()
    return {
      day: now.getDate(),
      month: now.getMonth(),
      year: now.getFullYear()
    }
  }

  const isCurrentDay = (day) => {
    const current = getCurrentDate()
    return day === current.day && 
           calendarMonth === current.month && 
           calendarYear === current.year
  }

  // Download monthly performance as a printable HTML report (user can save as PDF)
  const handleDownloadMonthlyReport = () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const monthName = monthNames[calendarMonth]

    const entries = Object.entries(dailyPerformances).sort((a, b) => Number(a[0]) - Number(b[0]))
    let totalPnL = 0

    const rowsHtml = entries.map(([day, perf]) => {
      const amount = Number(perf.amount) || 0
      const signedAmount = perf.type === 'loss' ? -amount : amount
      totalPnL += signedAmount

      const date = new Date(calendarYear, calendarMonth, Number(day))
      const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

      return `
        <tr>
          <td>${dateLabel}</td>
          <td>${perf.type === 'win' ? 'Win' : 'Loss'}</td>
          <td style="text-align:right;">€${signedAmount >= 0 ? '+' : ''}${signedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `
    }).join('')

    const bal = (isAdmin3 || userStatuses?.includes('Admin 3')) ? ADMIN3_CURRENT_BALANCE : currentBalance
    const totalPnLPercent = bal > 0 ? (totalPnL / bal) * 100 : 0

    const summaryHtml = `
      <h2>Summary</h2>
      <p><strong>Total Net Result:</strong> €${totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      <p><strong>Total Net % vs Current Balance:</strong> ${totalPnLPercent.toFixed(2)}%</p>
      <p><strong>Current Balance:</strong> €${bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    `

    const html = `
      <html>
        <head>
          <title>Opessocius - Monthly Performance Report - ${monthName} ${calendarYear}</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px 32px 80px; color: #111827; position: relative; }
            h1 { font-size: 24px; margin-bottom: 4px; }
            h2 { font-size: 18px; margin-top: 24px; }
            p { margin: 4px 0; font-size: 14px; }
            .report-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
            .report-brand { font-size: 14px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #1f2937; }
            .report-tag { font-size: 12px; font-weight: 500; color: #6b7280; }
            .report-subtitle { font-size: 13px; color: #4b5563; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
            th, td { border: 1px solid #e5e7eb; padding: 6px 8px; }
            th { background: #f3f4f6; text-align: left; }
            tfoot td { background: #f9fafb; font-weight: 600; }
            .wave-footer {
              position: fixed;
              left: 0;
              right: 0;
              bottom: 0;
              height: 80px;
              background: radial-gradient(120% 200% at 50% 120%, rgba(15,23,42,0.9) 0%, rgba(30,64,175,0.95) 40%, rgba(15,23,42,1) 100%);
              border-top-left-radius: 80% 100%;
              border-top-right-radius: 80% 100%;
            }
            .wave-footer::before {
              content: '';
              position: absolute;
              inset: 0;
              background: radial-gradient(150% 240% at 50% 130%, rgba(59,130,246,0.35), transparent 55%);
              opacity: 0.9;
            }
            .wave-footer-inner {
              position: absolute;
              inset: 0 32px 12px 32px;
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
              color: #e5e7eb;
              font-size: 11px;
            }
            .wave-footer-inner span {
              opacity: 0.9;
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div>
              <div class="report-brand">Opessocius</div>
              <h1>Monthly Performance Report</h1>
              <p class="report-subtitle">${monthName} ${calendarYear}</p>
            </div>
            <div class="report-tag">Internal Reporting</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="3">No daily performance recorded for this month.</td></tr>'}
            </tbody>
          </table>
          ${summaryHtml}
          <div class="wave-footer">
            <div class="wave-footer-inner">
              <span>Opessocius • Internal Reporting</span>
              <span>${monthName} ${calendarYear}</span>
            </div>
          </div>
        </body>
      </html>
    `

    const reportWindow = window.open('', '_blank')
    if (reportWindow) {
      reportWindow.document.open()
      reportWindow.document.write(html)
      reportWindow.document.close()
      reportWindow.focus()
      // Let user choose "Save as PDF" from the browser's print dialog
      reportWindow.print()
    }
  }

  const displayBalance = (userStatuses?.includes('Admin 3') || isAdmin3) ? ADMIN3_CURRENT_BALANCE : currentBalance
  const displayInvestorAccounts = (userStatuses?.includes('Admin 3') || isAdmin3) ? ADMIN3_TOTAL_INVESTOR_ACCOUNTS : totalInvestorAccounts
  const displayPayoutTarget = (userStatuses?.includes('Admin 3') || isAdmin3) ? ADMIN3_INVESTOR_PAYOUT_TARGET : investorPayoutTarget
  const displayMonthlyProjection = (userStatuses?.includes('Admin 3') || isAdmin3) ? ADMIN3_MONTHLY_PROJECTION : displayBalance * 0.07

  const monthlyProjection = displayMonthlyProjection
  
  const firstTargetPosition = 33.33
  const secondTargetAmount = displayPayoutTarget
  
  // Calculate progress based on daily performance
  // We map daily performance to the bar in two segments:
  // - From 0 up to investorPayoutTarget -> fills 0 to firstTargetPosition (blue)
  // - From investorPayoutTarget up to monthlyProjection -> fills firstTargetPosition to 100% (green)
  const progressAmount = totalDailyPerformance
  let progressPercentage = 0
  
  if (monthlyProjection > 0 && progressAmount !== 0) {
    if (progressAmount < 0) {
      progressPercentage = -Math.min(Math.abs(progressAmount) / monthlyProjection * 100, 100)
    } else {
      const useAdmin3Bar = (userStatuses?.includes('Admin 3') || isAdmin3) && secondTargetAmount > monthlyProjection
      if (useAdmin3Bar) {
        progressPercentage = Math.min((progressAmount / monthlyProjection) * 100, 100)
      } else if (secondTargetAmount > 0 && secondTargetAmount <= monthlyProjection) {
        if (progressAmount <= secondTargetAmount) {
          progressPercentage = Math.min((progressAmount / secondTargetAmount) * firstTargetPosition, firstTargetPosition)
        } else {
          const extra = Math.min(progressAmount, monthlyProjection) - secondTargetAmount
          const remainingNeeded = Math.max(monthlyProjection - secondTargetAmount, 0.0001)
          const extraRatio = Math.min(extra / remainingNeeded, 1)
          progressPercentage = firstTargetPosition + extraRatio * (100 - firstTargetPosition)
        }
      } else {
        progressPercentage = Math.min((progressAmount / monthlyProjection) * 100, 100)
      }
    }
  }

  // Determine if current progress label should be hidden to avoid overlapping with targets
  const hideCurrentProgressLabel =
    progressAmount !== 0 &&
    (
      (secondTargetAmount > 0 && Math.abs(progressAmount - secondTargetAmount) <= 200) ||
      (monthlyProjection > 0 && Math.abs(progressAmount - monthlyProjection) <= 200)
    )

  if (loading) {
    return (
      <div className="admin-overview-loading">
        <div className="loading-spinner">Loading overview...</div>
      </div>
    )
  }

  return (
    <div className="admin-overview-container">
      <h2 className="admin-overview-title">Overview</h2>
      
      {error && <div className="alert alert-error">{error}</div>}

      <div className="overview-widgets-grid">
        {/* Current Balance Widget */}
        <div className="overview-widget">
          <div className="widget-header">
            <h3 className="widget-title">Current Balance</h3>
          </div>
          <div className="widget-value">€{displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        {/* Total Investor Accounts Widget — click to see names and balances that sum to this total */}
        <div
          className={`overview-widget overview-widget-investor-total-click${userStatuses?.includes('Admin 3') || isAdmin3 ? ' overview-widget-investor-total-click-disabled' : ''}`}
          role="button"
          tabIndex={userStatuses?.includes('Admin 3') || isAdmin3 ? -1 : 0}
          onClick={() => {
            if (userStatuses?.includes('Admin 3') || isAdmin3) return
            setShowInvestorTotalModal(true)
          }}
          onKeyDown={(e) => {
            if (userStatuses?.includes('Admin 3') || isAdmin3) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setShowInvestorTotalModal(true)
            }
          }}
          aria-label="Show list of investors included in total investor accounts"
        >
          <div className="widget-header">
            <h3 className="widget-title">Total Investor Accounts</h3>
          </div>
          <div className="widget-value">€{displayInvestorAccounts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        {/* Pending Consultations Widget */}
        <div className="overview-widget">
          <div className="widget-header">
            <h3 className="widget-title">Pending Consultations</h3>
          </div>
          <div className="widget-value">{pendingConsultations}</div>
        </div>

        {/* User Message Alerts Widget */}
        <div className="overview-widget">
          <div className="widget-header">
            <h3 className="widget-title">User Message Alerts</h3>
          </div>
          <div className="widget-value">{userMessageAlerts}</div>
        </div>
      </div>

      {showInvestorTotalModal && (
        <div
          className="investor-total-modal-backdrop"
          role="presentation"
          onClick={() => setShowInvestorTotalModal(false)}
        >
          <div
            className="investor-total-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="investor-total-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="investor-total-modal-header">
              <h3 id="investor-total-modal-title">Investors in this total</h3>
              <button
                type="button"
                className="investor-total-modal-close"
                onClick={() => setShowInvestorTotalModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="investor-total-modal-list">
              {investorTotalModalLines.length === 0 ? (
                <p className="investor-total-modal-empty">No approved investor accounts match the current rules.</p>
              ) : (
                <div className="investor-total-modal-grid">
                  <span className="investor-total-modal-colh">Investor</span>
                  <span className="investor-total-modal-colh investor-total-modal-colh-num">Balance</span>
                  <span className="investor-total-modal-colh investor-total-modal-colh-num">Monthly target</span>
                  {investorTotalModalLines.map((row, idx) => (
                    <React.Fragment key={`${row.name}-${idx}`}>
                      <span className="investor-total-modal-name investor-total-modal-grid-row">{row.name}</span>
                      <span className="investor-total-modal-amount investor-total-modal-grid-row investor-total-modal-cell-num">
                        €
                        {row.balance.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                      <span className="investor-total-modal-target-amount investor-total-modal-grid-row investor-total-modal-cell-num">
                        €
                        {row.monthlyTarget.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
            {investorTotalModalLines.length > 0 && (
              <div className="investor-total-modal-footer investor-total-modal-footer-stack">
                <div className="investor-total-modal-footer-line">
                  <span>Total balances</span>
                  <span className="investor-total-modal-amount">
                    €
                    {investorTotalModalLines
                      .reduce((s, r) => s + r.balance, 0)
                      .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="investor-total-modal-footer-line">
                  <span>Monthly payout target</span>
                  <span className="investor-total-modal-target-amount investor-total-modal-footer-target">
                    €
                    {investorTotalModalLines
                      .reduce((s, r) => s + r.monthlyTarget, 0)
                      .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Monthly Projection Progress Bar */}
      <div className="projection-widget">
        <div className="projection-header">
          <h3 className="projection-title">Monthly Projection</h3>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-labels">
            <div 
              className="target-label-amount target-1"
              style={{ right: '0%' }}
            >
              €{monthlyProjection.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div 
              className="target-label-amount target-2"
              style={{ left: '33.33%' }}
            >
              €{secondTargetAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            {/* Current progress amount label */}
            {progressAmount !== 0 && !hideCurrentProgressLabel && progressPercentage > 0 && progressPercentage <= 100 && (
              <div
                className="current-progress-label"
                style={{ left: `${Math.min(Math.max(progressPercentage, 5), 95)}%` }}
              >
                €{progressAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>
          <div className="progress-bar" key={progressBarKey}>
            {/* Positive progress: blue up to investor target (1/3 of bar) */}
            {progressPercentage > 0 && (
              <>
                <div 
                  className="progress-bar-fill progress-bar-blue"
                  style={{ width: `${Math.min(progressPercentage, firstTargetPosition) + 0.6}%` }}
                ></div>
                {/* Green from investor target to 7% target */}
                {progressPercentage > firstTargetPosition && (
                  <div 
                    className="progress-bar-fill progress-bar-green"
                    style={{ 
                      width: `${Math.min(progressPercentage - firstTargetPosition, 100 - firstTargetPosition)}%`,
                      left: `${firstTargetPosition}%`
                    }}
                  ></div>
                )}
              </>
            )}
            {/* Negative progress: red from start */}
            {progressPercentage < 0 && (
              <div 
                className="progress-bar-fill progress-bar-red"
                style={{ width: `${Math.min(Math.abs(progressPercentage), 100)}%` }}
              ></div>
            )}
          </div>
        </div>

        {/* Calendar Widget */}
        <div className="calendar-widget">
          <div className="calendar-header">
            <button
              className="calendar-nav-button"
              onClick={() => !(isAdmin3 || userStatuses?.includes('Admin 3')) && handleMonthNavigation('prev')}
              aria-label="Previous month"
              disabled={isAdmin3 || userStatuses?.includes('Admin 3')}
              style={{ opacity: (isAdmin3 || userStatuses?.includes('Admin 3')) ? 0.4 : 1, cursor: (isAdmin3 || userStatuses?.includes('Admin 3')) ? 'not-allowed' : 'pointer' }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h3 className="calendar-title">
              {new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              className="calendar-nav-button"
              onClick={() => !(isAdmin3 || userStatuses?.includes('Admin 3')) && handleMonthNavigation('next')}
              aria-label="Next month"
              disabled={isAdmin3 || userStatuses?.includes('Admin 3')}
              style={{ opacity: (isAdmin3 || userStatuses?.includes('Admin 3')) ? 0.4 : 1, cursor: (isAdmin3 || userStatuses?.includes('Admin 3')) ? 'not-allowed' : 'pointer' }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="calendar-day-header">{day}</div>
            ))}
            {Array.from({ length: getFirstDayOfMonth(calendarMonth, calendarYear) }).map((_, i) => (
              <div key={`empty-${i}`} className="calendar-day-empty"></div>
            ))}
            {Array.from({ length: getDaysInMonth(calendarMonth, calendarYear) }, (_, i) => {
              const day = i + 1
              const dayKey = day.toString()
              const performance = dailyPerformances[dayKey]
              const isCurrent = isCurrentDay(day)
              
              return (
                <div
                  key={day}
                  className={`calendar-day ${isCurrent ? 'current-day' : ''} ${performance ? (performance.type === 'win' ? 'day-win' : 'day-loss') : ''}`}
                  onClick={() => {
                    if (!isAdmin2) handleDayClick(day)
                  }}
                >
                  <span className="day-number">{day}</span>
                  {performance && (
                    <span className="day-performance">
                      {performance.type === 'win' ? '+' : '-'}
                      {performance.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="calendar-footer">
            <button
              className="calendar-pdf-button"
              onClick={handleDownloadMonthlyReport}
              type="button"
              aria-label="Download monthly performance report as PDF"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" aria-hidden="true">
                <path d="M320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112C434.9 112 528 205.1 528 320C528 434.9 434.9 528 320 528zM320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64zM308.7 451.3C314.9 457.5 325.1 457.5 331.3 451.3L435.3 347.3C439.9 342.7 441.2 335.8 438.8 329.9C436.4 324 430.5 320 424 320L352 320L352 216C352 202.7 341.3 192 328 192L312 192C298.7 192 288 202.7 288 216L288 320L216 320C209.5 320 203.7 323.9 201.2 329.9C198.7 335.9 200.1 342.8 204.7 347.3L308.7 451.3z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Day Performance Modal */}
        {showDayModal && (
          <div className="modal-overlay" onClick={() => setShowDayModal(false)}>
            <div className="day-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="day-modal-header">
                <h3>Day {selectedDay} Performance</h3>
                <button className="modal-close" onClick={() => setShowDayModal(false)}>×</button>
              </div>
              <div className="day-modal-body">
                <div className="form-group">
                  <label>Type</label>
                  <div className="performance-type-buttons">
                    <button
                      className={`type-button ${dayPerformanceForm.type === 'win' ? 'active' : ''}`}
                      onClick={() => !(isAdmin3 || userStatuses?.includes('Admin 3')) && setDayPerformanceForm({ ...dayPerformanceForm, type: 'win' })}
                      disabled={isAdmin3 || userStatuses?.includes('Admin 3')}
                    >
                      Win
                    </button>
                    <button
                      className={`type-button ${dayPerformanceForm.type === 'loss' ? 'active' : ''}`}
                      onClick={() => !(isAdmin3 || userStatuses?.includes('Admin 3')) && setDayPerformanceForm({ ...dayPerformanceForm, type: 'loss' })}
                      disabled={isAdmin3 || userStatuses?.includes('Admin 3')}
                    >
                      Loss
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={dayPerformanceForm.amount}
                    onChange={(e) => !(isAdmin3 || userStatuses?.includes('Admin 3')) && setDayPerformanceForm({ ...dayPerformanceForm, amount: e.target.value })}
                    placeholder="Enter amount"
                    className="form-input"
                    readOnly={isAdmin3 || userStatuses?.includes('Admin 3')}
                  />
                </div>
              </div>
              <div className="day-modal-footer">
                <button className="btn-secondary" onClick={() => setShowDayModal(false)}>
                  {(isAdmin3 || userStatuses?.includes('Admin 3')) ? 'Close' : 'Cancel'}
                </button>
                {!(isAdmin3 || userStatuses?.includes('Admin 3')) && (
                  <>
                    {dailyPerformances[selectedDay?.toString()] && (
                      <button className="btn-delete" onClick={handleDeleteDayPerformance}>
                        Delete
                      </button>
                    )}
                    <button 
                      className="btn-primary" 
                      onClick={handleSaveDayPerformance}
                      disabled={!dayPerformanceForm.amount || parseFloat(dayPerformanceForm.amount) <= 0}
                    >
                      Save
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminOverview
