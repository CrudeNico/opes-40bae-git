import React, { useState, useEffect } from 'react'
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore'
import {
  getAdmin3Overrides,
  saveAdmin3UserOverride,
  mergeUserWithOverride
} from '../utils/admin3Overrides'
import {
  computePartnerMonthFinancials,
  collectAvailablePartnerHistoryMonths,
  monthHistoryKey
} from '../utils/partnerManagementMonth'
import { downloadPartnerMonthReport } from '../utils/partnerManagementReport'
import {
  fetchPartnerDailyPerformances,
  loadPartnerAdmin3PerformanceContext,
  resolvePartnerPerformanceOwnerId
} from '../utils/partnerDailyPerformance'
import { syncAllPartnersMonthlyEntries, buildPartnerMonthLedgerRecord, isPartnerLedgerRecord } from '../utils/partnerMonthlyAutoSync'
import { generateAdmin3PortfolioData } from './AdminPortfolio'
import { getAdmin3SampleInvestors } from '../utils/admin3SampleUsers'
import {
  TRANCHE_PRIMARY,
  TRANCHE_SECONDARY,
  getLastTrancheEnding,
  getRecordTrancheStartingBalance,
  resolveInvestorCurrentBalance,
  getInvestorCombinedInitial,
  getAdminInvestorSummaryCurrentBalance,
  getAdminInvestorSummaryTotalDeposits,
  getAdminPerformancePreviewStartingBalance,
  getDefaultMonthlyPerformanceFormValues,
  investorHasDualTranche
} from '../utils/investorDualTranche'
import {
  calculateProratedDepositGrowth,
  calculateWithdrawalGrowthLoss,
  getRecordNetGrowthAmount
} from '../utils/monthlyCashflowProration'
import {
  buildRecordFromManualEndingBalance,
  formatPercentageGrowthDisplay,
  isManualEndingBalanceRecord,
  reconcileManualEndingRecord,
  roundPercentageGrowth
} from '../utils/monthlyRecordBalance'
import './AdminInvestorsManagement.css'

const PLACEHOLDER_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1']
const PIE_SLICE_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#ef4444', '#84cc16']

const isPartnerUser = (inv) => Array.isArray(inv?.statuses) && inv.statuses.includes('Partner')

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const hasPerformanceEntryForCurrentMonth = (investor) => {
  const history = investor?.investmentData?.monthlyHistory
  if (!Array.isArray(history) || history.length === 0) return false
  const now = new Date()
  const monthName = MONTH_NAMES[now.getMonth()]
  const year = now.getFullYear()
  return history.some((record) => {
    const recordYear = parseInt(record?.year, 10)
    return record?.month === monthName && recordYear === year
  })
}

const CurrentMonthPerformanceCheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="18"
    height="18"
    role="img"
    aria-label="Performance logged for this month"
    className="investor-card-month-check-icon"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="0.1"
    strokeLinecap="round"
    strokeLinejoin="round"
    paintOrder="stroke fill markers"
  >
    <path
      fill="currentColor"
      d="M17 3.34a10 10 0 1 1-14.995 8.984L2 12l.005-.324A10 10 0 0 1 17 3.34m-1.293 5.953a1 1 0 0 0-1.32-.083l-.094.083L11 12.585l-1.293-1.292l-.094-.083a1 1 0 0 0-1.403 1.403l.083.094l2 2l.094.083a1 1 0 0 0 1.226 0l.094-.083l4-4l.083-.094a1 1 0 0 0-.083-1.32"
    />
  </svg>
)

const polarToCartesian = (cx, cy, r, deg) => {
  const rad = (deg - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

const donutSlicePath = (cx, cy, outerR, innerR, startDeg, endDeg) => {
  if (endDeg - startDeg >= 359.999) {
    return [
      `M ${cx} ${cy - outerR}`,
      `A ${outerR} ${outerR} 0 1 1 ${cx - 0.01} ${cy - outerR}`,
      `M ${cx} ${cy - innerR}`,
      `A ${innerR} ${innerR} 0 1 0 ${cx + 0.01} ${cy - innerR}`,
      'Z'
    ].join(' ')
  }
  const outerStart = polarToCartesian(cx, cy, outerR, endDeg)
  const outerEnd = polarToCartesian(cx, cy, outerR, startDeg)
  const innerStart = polarToCartesian(cx, cy, innerR, startDeg)
  const innerEnd = polarToCartesian(cx, cy, innerR, endDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
    'Z'
  ].join(' ')
}

function buildPartnerSummaryDonut(partner, investors, getBalance) {
  const partnerOwnBalance = Math.max(0, getBalance(partner) || 0)
  const managedIds = Array.isArray(partner.managedInvestorIds) ? partner.managedInvestorIds : []
  const managedBalance = investors
    .filter((inv) => managedIds.includes(inv.id))
    .reduce((sum, inv) => sum + Math.max(0, getBalance(inv) || 0), 0)

  const totalInvestorAccounts = investors.reduce(
    (sum, inv) => sum + Math.max(0, getBalance(inv) || 0),
    0
  )
  const partnerSphereTotal = partnerOwnBalance + managedBalance
  const restBalance = Math.max(0, totalInvestorAccounts - partnerSphereTotal)
  const spherePctOfTotal =
    totalInvestorAccounts > 0 ? (partnerSphereTotal / totalInvestorAccounts) * 100 : 0

  const segments = [
    { id: 'own', label: 'Partner', balance: partnerOwnBalance, color: '#eab308' },
    { id: 'managed', label: 'Managed', balance: managedBalance, color: '#3b82f6' },
    { id: 'rest', label: 'Other', balance: restBalance, color: '#d1d5db' }
  ].filter((segment) => segment.balance > 0)

  const chartTotal = totalInvestorAccounts > 0
    ? totalInvestorAccounts
    : segments.reduce((sum, segment) => sum + segment.balance, 0)

  let angle = -90
  const slices = segments.map((segment) => {
    const sweep = chartTotal > 0 ? (segment.balance / chartTotal) * 360 : 0
    const start = angle
    const end = angle + sweep
    angle = end
    return {
      ...segment,
      share: chartTotal > 0 ? (segment.balance / chartTotal) * 100 : 0,
      path: donutSlicePath(90, 90, 78, 48, start, end)
    }
  })

  return {
    partnerOwnBalance,
    managedBalance,
    partnerSphereTotal,
    spherePctOfTotal,
    restBalance,
    totalInvestorAccounts,
    chartTotal,
    slices
  }
}

const formatEuro = (value) =>
  `€${(Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatEuroWhole = (value) =>
  `€${Math.round(Number(value) || 0).toLocaleString('en-US')}`

function formatPartnerGrowthAmountInput(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return String(Math.round(n * 100) / 100)
}

/** True when at least one deposit or withdrawal entry has a positive amount or a date. */
function formHasCashflowEntries(form) {
  const deposits = form?.depositEntries || []
  const withdrawals = form?.withdrawalEntries || []
  return (
    deposits.some((entry) => (parseFloat(entry?.amount) || 0) > 0 || !!entry?.date) ||
    withdrawals.some((entry) => (parseFloat(entry?.amount) || 0) > 0 || !!entry?.date)
  )
}

function canSaveNewMonthlyUpdate(form, investor) {
  if (!form?.month || !form?.year) return false
  if (isPartnerUser(investor)) {
    return !!(form.percentageGrowth || form.growthAmount || formHasCashflowEntries(form))
  }
  return !!(form.percentageGrowth || formHasCashflowEntries(form))
}

function canUpdateExistingRecord(form, investor, originalRecord) {
  if (!form?.month || !form?.year) return false
  if (isPartnerUser(investor)) {
    return !!(
      form.percentageGrowth ||
      form.growthAmount ||
      form.endingBalanceOverride ||
      isManualEndingBalanceRecord(originalRecord) ||
      formHasCashflowEntries(form)
    )
  }
  return !!(form.percentageGrowth || formHasCashflowEntries(form))
}

/** Investors always derive ending balance; never persist manual override flags. */
function withoutManualEndingOverride(record) {
  if (!record || typeof record !== 'object') return record
  const { endingBalanceOverride, ...rest } = record
  return rest
}

function syncPartnerGrowthFields(startingBalance, percentageGrowth, growthAmount, changedField) {
  const start = Number(startingBalance) || 0
  if (changedField === 'growthAmount') {
    if (growthAmount === '' || growthAmount == null) {
      return { growthAmount: '', percentageGrowth: '' }
    }
    const growth = parseFloat(String(growthAmount).replace(',', '.')) || 0
    const pct = start > 0 ? (growth / start) * 100 : 0
    return {
      growthAmount: formatPartnerGrowthAmountInput(growth),
      percentageGrowth: String(roundPercentageGrowth(pct))
    }
  }
  if (percentageGrowth === '' || percentageGrowth == null) {
    return { percentageGrowth: '', growthAmount: '' }
  }
  const pct = parseFloat(String(percentageGrowth).replace(',', '.')) || 0
  const growth = start * (pct / 100)
  return {
    percentageGrowth: String(roundPercentageGrowth(pct)),
    growthAmount: formatPartnerGrowthAmountInput(growth)
  }
}

const getProfilePlaceholder = (inv) => {
  if (inv?.profilePlaceholder) return inv.profilePlaceholder
  const key = `${inv?.id || ''}${inv?.displayName || ''}${inv?.email || ''}`
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return {
    letter: (inv?.displayName || inv?.email || 'I').charAt(0).toUpperCase(),
    bgColor: PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length]
  }
}

const AdminInvestorsManagement = ({ user: currentUser, userStatuses = [] }) => {
  const isAdmin2 = userStatuses.includes('Admin 2') || userStatuses.includes('Relations')
  const isAdmin3 = userStatuses.includes('Admin 3')
  const canAddPerformance = !isAdmin2 || isAdmin3
  const canEditPerformance = !isAdmin2 || isAdmin3
  const canModifyStatuses = !isAdmin2 || isAdmin3
  const canManagePartners = !isAdmin2 || isAdmin3
  const [investors, setInvestors] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedInvestor, setSelectedInvestor] = useState(null)
  const [showViewPerformance, setShowViewPerformance] = useState(false)
  const [showAddPerformance, setShowAddPerformance] = useState(false)
  const [showPartnerManagement, setShowPartnerManagement] = useState(false)
  const [partnerManagedIds, setPartnerManagedIds] = useState([])
  const [loadingPartnerManagement, setLoadingPartnerManagement] = useState(false)
  const [partnerModalDailyPerformances, setPartnerModalDailyPerformances] = useState({})
  const [loadingPartnerModalData, setLoadingPartnerModalData] = useState(false)
  const [partnerModalMonthTab, setPartnerModalMonthTab] = useState(null)
  const [partnerModalDonutHoverSlice, setPartnerModalDonutHoverSlice] = useState(null)
  const [showPartnerHistoryPanel, setShowPartnerHistoryPanel] = useState(false)
  const [loadingPartnerHistory, setLoadingPartnerHistory] = useState(false)
  const [partnerHistorySummaries, setPartnerHistorySummaries] = useState([])
  const [partnerModalPerformanceOwnerId, setPartnerModalPerformanceOwnerId] = useState(null)
  const [partnerModalAdmin3MonthlyHistory, setPartnerModalAdmin3MonthlyHistory] = useState([])
  const [partnerModalAdmin3DailyOverrides, setPartnerModalAdmin3DailyOverrides] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [monthlyUpdate, setMonthlyUpdate] = useState({
    month: '',
    year: '',
    percentageGrowth: '',
    depositAmount: '',
    depositDate: '',
    withdrawalAmount: '',
    withdrawalDate: '',
    depositEntries: [{ amount: '', date: '' }],
    withdrawalEntries: [{ amount: '', date: '' }],
    performanceScope: 'primary'
  })
  const [loadingMonthlyUpdate, setLoadingMonthlyUpdate] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [editedRecordData, setEditedRecordData] = useState({})
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [partnerDonutHoverSlice, setPartnerDonutHoverSlice] = useState(null)

  const createEmptyMonthlyUpdateForm = (performanceScope = 'primary') => ({
    month: '',
    year: '',
    percentageGrowth: '',
    growthAmount: '',
    depositAmount: '',
    depositDate: '',
    withdrawalAmount: '',
    withdrawalDate: '',
    depositEntries: [{ amount: '', date: '' }],
    withdrawalEntries: [{ amount: '', date: '' }],
    performanceScope
  })

  const buildPrefilledMonthlyUpdateForm = (investmentData, performanceScope = 'primary') => {
    const scope = investorHasDualTranche(investmentData) ? performanceScope : 'account'
    const defaults = getDefaultMonthlyPerformanceFormValues(investmentData, scope)
    return {
      ...createEmptyMonthlyUpdateForm(performanceScope),
      month: defaults.month,
      year: defaults.year,
      percentageGrowth: defaults.percentageGrowth
    }
  }

  const getInvestorDisplayBalance = (investor) =>
    getAdminInvestorSummaryCurrentBalance(investor?.investmentData)

  const getPartnerEditFormStartingBalance = () => {
    if (!selectedInvestor?.investmentData || !editingRecord) return 0
    const mh = selectedInvestor.investmentData.monthlyHistory || []
    return getRecordTrancheStartingBalance(mh, editingRecord.index, selectedInvestor.investmentData)
  }

  const handleEditedRecordPartnerGrowthChange = (field, value) => {
    const startingBalance = getPartnerEditFormStartingBalance()
    setEditedRecordData((prev) => {
      const synced = syncPartnerGrowthFields(
        startingBalance,
        field === 'percentageGrowth' ? value : prev.percentageGrowth,
        field === 'growthAmount' ? value : prev.growthAmount,
        field
      )
      return { ...prev, ...synced }
    })
  }

  const handleMonthlyPartnerGrowthChange = (field, value) => {
    setMonthlyUpdate((prev) => {
      const startingBalance = getAdminPerformancePreviewStartingBalance(
        selectedInvestor?.investmentData,
        prev.performanceScope || 'primary'
      )
      const synced = syncPartnerGrowthFields(
        startingBalance,
        field === 'percentageGrowth' ? value : prev.percentageGrowth,
        field === 'growthAmount' ? value : prev.growthAmount,
        field
      )
      return { ...prev, ...synced }
    })
  }

  const handleEditedRecordEndingBalanceChange = (value) => {
    setEditedRecordData((prev) => ({
      ...prev,
      endingBalance: value,
      endingBalanceOverride: value !== '' && value != null
    }))
  }

  const mergePartnerSyncUpdates = (investorsList, updates) => {
    if (!updates?.length) return investorsList
    return investorsList.map((inv) => {
      const hit = updates.find((row) => row.partnerId === inv.id)
      return hit ? { ...inv, investmentData: hit.investmentData } : inv
    })
  }

  const runPartnerMonthlyAutoSync = async (investorsList) => {
    if (!investorsList?.some(isPartnerUser)) return investorsList
    try {
      const db = getFirestore()
      const updates = await syncAllPartnersMonthlyEntries({
        db,
        investors: investorsList,
        isPartnerUser,
        getBalance: getInvestorDisplayBalance,
        currentUserUid: currentUser?.uid,
        isAdmin2,
        isAdmin3
      })
      return mergePartnerSyncUpdates(investorsList, updates)
    } catch (err) {
      console.error('Error syncing partner monthly entries:', err)
      return investorsList
    }
  }

  useEffect(() => {
    loadInvestors()
  }, [])

  useEffect(() => {
    if (!showPartnerManagement || !selectedInvestor) return undefined

    let cancelled = false

    const loadPartnerModalDailyPerformances = async () => {
      setLoadingPartnerModalData(true)
      try {
        const db = getFirestore()
        const now = new Date()
        const monthIndex = now.getMonth()
        const year = now.getFullYear()
        const monthName = MONTH_NAMES[monthIndex]

        const ownerId = await resolvePartnerPerformanceOwnerId(
          db,
          currentUser?.uid,
          isAdmin2,
          isAdmin3
        )
        if (!cancelled) setPartnerModalPerformanceOwnerId(ownerId)

        let admin3MonthlyHistory = generateAdmin3PortfolioData().monthlyHistory || []
        let admin3DailyOverrides = {}

        if (isAdmin3 && currentUser?.uid && ownerId) {
          const ctx = await loadPartnerAdmin3PerformanceContext(currentUser.uid, ownerId)
          admin3MonthlyHistory = ctx.monthlyHistory
          admin3DailyOverrides = ctx.dailyOverrides
        }

        if (!cancelled) {
          setPartnerModalAdmin3MonthlyHistory(admin3MonthlyHistory)
          setPartnerModalAdmin3DailyOverrides(admin3DailyOverrides)
        }

        const performances = await fetchPartnerDailyPerformances({
          db,
          ownerId,
          year,
          monthIndex,
          monthName,
          isAdmin3,
          admin3MonthlyHistory,
          admin3DailyOverrides,
          referenceDate: now
        })

        if (!cancelled) setPartnerModalDailyPerformances(performances)

        if (!cancelled) {
          const updates = await syncAllPartnersMonthlyEntries({
            db,
            investors,
            isPartnerUser,
            getBalance: getInvestorDisplayBalance,
            currentUserUid: currentUser?.uid,
            isAdmin2,
            isAdmin3,
            referenceDate: now
          })
          if (!cancelled && updates.length > 0) {
            setInvestors((prev) => mergePartnerSyncUpdates(prev, updates))
            setSelectedInvestor((prev) => {
              if (!prev) return prev
              const hit = updates.find((row) => row.partnerId === prev.id)
              return hit ? { ...prev, investmentData: hit.investmentData } : prev
            })
          }
        }
      } catch (err) {
        console.error('Error loading partner modal daily performances:', err)
        if (!cancelled) setPartnerModalDailyPerformances({})
      } finally {
        if (!cancelled) setLoadingPartnerModalData(false)
      }
    }

    loadPartnerModalDailyPerformances()
    return () => {
      cancelled = true
    }
  }, [showPartnerManagement, selectedInvestor?.id, isAdmin2, isAdmin3, currentUser?.uid])

  useEffect(() => {
    if (selectedInvestor) {
      setShowViewPerformance(false)
      setShowAddPerformance(false)
      setError('')
      setSuccess('')
      setPartnerDonutHoverSlice(null)
    }
  }, [selectedInvestor])

  const loadInvestors = async () => {
    try {
      const db = getFirestore()
      const overrides = isAdmin3 && currentUser?.uid ? await getAdmin3Overrides(currentUser.uid) : {}
      const usersCollection = collection(db, 'users')
      const usersSnapshot = await getDocs(usersCollection)

      const investorsList = []
      usersSnapshot.forEach((docSnapshot) => {
        const userData = docSnapshot.data()
        let statuses = userData.statuses || []
        let investmentData = userData.investmentData || null
        let managedInvestorIds = userData.managedInvestorIds || []
        const ov = overrides[docSnapshot.id]
        if (ov) {
          if (ov.statuses !== undefined) statuses = ov.statuses
          if (ov.investmentData !== undefined) investmentData = ov.investmentData
          if (ov.managedInvestorIds !== undefined) managedInvestorIds = ov.managedInvestorIds
        }
        const merged = { ...userData, statuses, investmentData, managedInvestorIds, id: docSnapshot.id }
        if ((statuses.includes('Investor') || statuses.includes('Trader')) && investmentData && investmentData.status === 'approved') {
          investorsList.push(mergeUserWithOverride(merged, overrides[docSnapshot.id]))
        }
      })

      if (isAdmin3) {
        const sampleInvestors = getAdmin3SampleInvestors()
        sampleInvestors.forEach((si) => {
          investorsList.push(mergeUserWithOverride(si, overrides[si.id]))
        })
      }

      // Partners first, then by displayed balance (highest to lowest)
      investorsList.sort((a, b) => {
        const aPartner = isPartnerUser(a)
        const bPartner = isPartnerUser(b)
        if (aPartner && !bPartner) return -1
        if (!aPartner && bPartner) return 1
        const aBalance = getAdminInvestorSummaryCurrentBalance(a?.investmentData)
        const bBalance = getAdminInvestorSummaryCurrentBalance(b?.investmentData)
        return bBalance - aBalance
      })

      const syncedList = await runPartnerMonthlyAutoSync(investorsList)
      setInvestors(syncedList)
    } catch (error) {
      console.error('Error loading investors:', error)
      setError('Failed to load investors. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInvestorSelect = (investor) => {
    setSelectedInvestor(investor)
    setShowViewPerformance(false)
    setShowAddPerformance(false)
    setShowPartnerManagement(false)
    setEditingRecord(null)
    setEditedRecordData({})
  }

  const openPartnerManagement = () => {
    if (!selectedInvestor || !isPartnerUser(selectedInvestor)) return
    setPartnerManagedIds(Array.isArray(selectedInvestor.managedInvestorIds) ? [...selectedInvestor.managedInvestorIds] : [])
    setPartnerModalMonthTab(null)
    setPartnerModalDonutHoverSlice(null)
    setShowPartnerHistoryPanel(false)
    setPartnerHistorySummaries([])
    setShowPartnerManagement(true)
    setError('')
    setSuccess('')
  }

  const closePartnerManagement = () => {
    setShowPartnerManagement(false)
    setPartnerManagedIds([])
    setPartnerModalMonthTab(null)
    setPartnerModalDonutHoverSlice(null)
    setPartnerModalDailyPerformances({})
    setShowPartnerHistoryPanel(false)
    setPartnerHistorySummaries([])
    setPartnerModalPerformanceOwnerId(null)
    setPartnerModalAdmin3MonthlyHistory([])
    setPartnerModalAdmin3DailyOverrides({})
  }

  const togglePartnerModalMonthTab = (tab) => {
    setShowPartnerHistoryPanel(false)
    setPartnerModalMonthTab((prev) => (prev === tab ? null : tab))
  }

  const loadPartnerHistorySummaries = async () => {
    if (!selectedInvestor || !isPartnerUser(selectedInvestor)) return

    setLoadingPartnerHistory(true)
    try {
      const db = getFirestore()
      const ownerId =
        partnerModalPerformanceOwnerId ||
        (await resolvePartnerPerformanceOwnerId(db, currentUser?.uid, isAdmin2, isAdmin3))

      const months = collectAvailablePartnerHistoryMonths(
        investors,
        partnerModalAdmin3MonthlyHistory
      )

      const summaries = await Promise.all(
        months.map(async (monthRow) => {
          const dailyPerformances = await fetchPartnerDailyPerformances({
            db,
            ownerId,
            year: monthRow.year,
            monthIndex: monthRow.monthIndex,
            monthName: monthRow.monthName,
            isAdmin3,
            admin3MonthlyHistory: partnerModalAdmin3MonthlyHistory,
            admin3DailyOverrides: partnerModalAdmin3DailyOverrides
          })
          const financials = computePartnerMonthFinancials({
            selectedPartnerId: selectedInvestor.id,
            partners: investors.filter(isPartnerUser),
            investors,
            dailyPerformances,
            getBalance: getInvestorDisplayBalance,
            monthName: monthRow.monthName,
            year: monthRow.year,
            isPartnerUser
          })
          return { ...monthRow, key: monthHistoryKey(monthRow.monthName, monthRow.year), financials }
        })
      )

      setPartnerHistorySummaries(summaries)
    } catch (err) {
      console.error('Error loading partner history:', err)
      setPartnerHistorySummaries([])
    } finally {
      setLoadingPartnerHistory(false)
    }
  }

  const openPartnerHistoryPanel = () => {
    setPartnerModalMonthTab(null)
    setShowPartnerHistoryPanel(true)
    if (partnerHistorySummaries.length === 0) {
      loadPartnerHistorySummaries()
    }
  }

  const handleDownloadPartnerMonthPdf = (summary) => {
    if (!selectedInvestor || !summary?.financials) return
    downloadPartnerMonthReport({
      partnerName: selectedInvestor.displayName || selectedInvestor.email || 'Partner',
      monthName: summary.monthName,
      year: summary.year,
      financials: summary.financials
    })
  }

  const togglePartnerManagedInvestor = (investorId) => {
    setPartnerManagedIds((prev) =>
      prev.includes(investorId) ? prev.filter((id) => id !== investorId) : [...prev, investorId]
    )
  }

  const getAssignableInvestors = (partnerId) =>
    investors.filter((inv) => inv.id !== partnerId && !isPartnerUser(inv))

  const handleSavePartnerManagement = async () => {
    if (!selectedInvestor || !canManagePartners) return

    setLoadingPartnerManagement(true)
    setError('')
    setSuccess('')

    try {
      const db = getFirestore()
      const cleanedIds = [...new Set(partnerManagedIds.filter(Boolean))]
      const partnerId = selectedInvestor.id

      if (isAdmin3 && currentUser?.uid) {
        await saveAdmin3UserOverride(currentUser.uid, partnerId, { managedInvestorIds: cleanedIds })
        const otherPartners = investors.filter((inv) => isPartnerUser(inv) && inv.id !== partnerId)
        for (const partner of otherPartners) {
          const current = Array.isArray(partner.managedInvestorIds) ? partner.managedInvestorIds : []
          const next = current.filter((id) => !cleanedIds.includes(id))
          if (next.length !== current.length) {
            await saveAdmin3UserOverride(currentUser.uid, partner.id, { managedInvestorIds: next })
          }
        }
      } else {
        const otherPartners = investors.filter((inv) => isPartnerUser(inv) && inv.id !== partnerId)
        for (const partner of otherPartners) {
          const current = Array.isArray(partner.managedInvestorIds) ? partner.managedInvestorIds : []
          const next = current.filter((id) => !cleanedIds.includes(id))
          if (next.length !== current.length) {
            await updateDoc(doc(db, 'users', partner.id), {
              managedInvestorIds: next,
              updatedAt: new Date().toISOString()
            })
          }
        }
        await updateDoc(doc(db, 'users', partnerId), {
          managedInvestorIds: cleanedIds,
          updatedAt: new Date().toISOString()
        })
      }

      setSuccess(isAdmin3 ? 'Partner management saved to your sandbox.' : 'Partner management updated successfully.')
      closePartnerManagement()
      await loadInvestors()
      setSelectedInvestor((prev) =>
        prev && prev.id === partnerId ? { ...prev, managedInvestorIds: cleanedIds } : prev
      )
    } catch (err) {
      console.error('Error saving partner management:', err)
      setError('Failed to save partner management. Please try again.')
    } finally {
      setLoadingPartnerManagement(false)
    }
  }

  const closeEditingRecord = () => {
    setEditingRecord(null)
    setEditedRecordData({})
  }

  const handleEditCashflowEntryChange = (type, index, field, value) => {
    setEditedRecordData((prev) => {
      const key = type === 'deposit' ? 'depositEntries' : 'withdrawalEntries'
      const entries = [...(prev[key] || [{ amount: '', date: '' }])]
      if (!entries[index]) entries[index] = { amount: '', date: '' }
      entries[index] = { ...entries[index], [field]: value }
      const first = entries[0] || { amount: '', date: '' }
      const next = { ...prev, [key]: entries }
      if (type === 'deposit') {
        next.depositAmount = first.amount || ''
        next.depositDate = first.date || ''
      } else {
        next.withdrawalAmount = first.amount || ''
        next.withdrawalDate = first.date || ''
      }
      return next
    })
  }

  const handleAddEditCashflowEntry = (type) => {
    setEditedRecordData((prev) => {
      const key = type === 'deposit' ? 'depositEntries' : 'withdrawalEntries'
      return {
        ...prev,
        [key]: [...(prev[key] || [{ amount: '', date: '' }]), { amount: '', date: '' }]
      }
    })
  }

  const handleRemoveEditCashflowEntry = (type, index) => {
    setEditedRecordData((prev) => {
      const key = type === 'deposit' ? 'depositEntries' : 'withdrawalEntries'
      const currentEntries = prev[key] || [{ amount: '', date: '' }]
      if (currentEntries.length <= 1) return prev
      const entries = currentEntries.filter((_, i) => i !== index)
      const first = entries[0] || { amount: '', date: '' }
      const next = { ...prev, [key]: entries }
      if (type === 'deposit') {
        next.depositAmount = first.amount || ''
        next.depositDate = first.date || ''
      } else {
        next.withdrawalAmount = first.amount || ''
        next.withdrawalDate = first.date || ''
      }
      return next
    })
  }

  const handleMonthlyUpdateFieldChange = (field, value) => {
    setMonthlyUpdate((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'depositAmount' || field === 'depositDate') {
        const entries = [...(prev.depositEntries || [{ amount: '', date: '' }])]
        if (!entries[0]) entries[0] = { amount: '', date: '' }
        if (field === 'depositAmount') entries[0].amount = value
        if (field === 'depositDate') entries[0].date = value
        next.depositEntries = entries
      }
      if (field === 'withdrawalAmount' || field === 'withdrawalDate') {
        const entries = [...(prev.withdrawalEntries || [{ amount: '', date: '' }])]
        if (!entries[0]) entries[0] = { amount: '', date: '' }
        if (field === 'withdrawalAmount') entries[0].amount = value
        if (field === 'withdrawalDate') entries[0].date = value
        next.withdrawalEntries = entries
      }
      return next
    })
  }

  const handleMonthlyCashflowEntryChange = (type, index, field, value) => {
    setMonthlyUpdate((prev) => {
      const key = type === 'deposit' ? 'depositEntries' : 'withdrawalEntries'
      const entries = [...(prev[key] || [{ amount: '', date: '' }])]
      if (!entries[index]) entries[index] = { amount: '', date: '' }
      entries[index] = { ...entries[index], [field]: value }
      const first = entries[0] || { amount: '', date: '' }
      const next = { ...prev, [key]: entries }
      if (type === 'deposit') {
        next.depositAmount = first.amount || ''
        next.depositDate = first.date || ''
      } else {
        next.withdrawalAmount = first.amount || ''
        next.withdrawalDate = first.date || ''
      }
      return next
    })
  }

  const handleAddMonthlyCashflowEntry = (type) => {
    setMonthlyUpdate((prev) => {
      const key = type === 'deposit' ? 'depositEntries' : 'withdrawalEntries'
      return {
        ...prev,
        [key]: [...(prev[key] || [{ amount: '', date: '' }]), { amount: '', date: '' }]
      }
    })
  }

  const handleRemoveMonthlyCashflowEntry = (type, index) => {
    setMonthlyUpdate((prev) => {
      const key = type === 'deposit' ? 'depositEntries' : 'withdrawalEntries'
      const currentEntries = prev[key] || [{ amount: '', date: '' }]
      if (currentEntries.length <= 1) return prev
      const entries = currentEntries.filter((_, i) => i !== index)
      const first = entries[0] || { amount: '', date: '' }
      const next = { ...prev, [key]: entries }
      if (type === 'deposit') {
        next.depositAmount = first.amount || ''
        next.depositDate = first.date || ''
      } else {
        next.withdrawalAmount = first.amount || ''
        next.withdrawalDate = first.date || ''
      }
      return next
    })
  }

  const handleRecordClick = (record, index) => {
    // Prevent Admin 2 from editing records
    if (!canEditPerformance) return
    
    setEditingRecord({ ...record, index })
    const recordDepositEntries = Array.isArray(record.depositEntries) && record.depositEntries.length > 0
      ? record.depositEntries.map((entry) => ({
          amount: entry?.amount != null ? String(entry.amount) : '',
          date: entry?.date || ''
        }))
      : [{
          amount: record.depositAmount?.toString() || '',
          date: record.depositDate || ''
        }]
    const recordWithdrawalEntries = Array.isArray(record.withdrawalEntries) && record.withdrawalEntries.length > 0
      ? record.withdrawalEntries.map((entry) => ({
          amount: entry?.amount != null ? String(entry.amount) : '',
          date: entry?.date || ''
        }))
      : [{
          amount: record.withdrawalAmount?.toString() || '',
          date: record.withdrawalDate || ''
        }]

    setEditedRecordData({
      month: record.month,
      year: record.year.toString(),
      percentageGrowth: String(roundPercentageGrowth(record.percentageGrowth)),
      growthAmount:
        record.growthAmount != null && Number.isFinite(Number(record.growthAmount))
          ? formatPartnerGrowthAmountInput(record.growthAmount)
          : '',
      endingBalance:
        isPartnerUser(selectedInvestor) &&
        record.endingBalance != null &&
        Number.isFinite(Number(record.endingBalance))
          ? formatPartnerGrowthAmountInput(record.endingBalance)
          : '',
      endingBalanceOverride:
        isPartnerUser(selectedInvestor) && record.endingBalanceOverride === true,
      depositAmount: record.depositAmount?.toString() || '',
      depositDate: record.depositDate || '',
      withdrawalAmount: record.withdrawalAmount?.toString() || '',
      withdrawalDate: record.withdrawalDate || '',
      depositEntries: recordDepositEntries,
      withdrawalEntries: recordWithdrawalEntries
    })
    setShowViewPerformance(true)
    setShowAddPerformance(false)
  }

  const handleUpdateRecord = async () => {
    if (!selectedInvestor || !editingRecord) return

    setLoadingEdit(true)
    setError('')
    setSuccess('')

    try {
      const db = getFirestore()
      const userDocRef = doc(db, 'users', selectedInvestor.id)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) {
        setError('User document not found')
        return
      }

      const userData = userDoc.data()
      const currentInvestmentData = (isAdmin3 ? selectedInvestor.investmentData : userData.investmentData) || {}
      const monthlyHistory = currentInvestmentData.monthlyHistory || []
      const primaryInitForTotals = currentInvestmentData.initialInvestment || 0
      const secondaryInitForTotals = currentInvestmentData.secondaryInvestment?.initialInvestment || 0
      const hasDualForTotals =
        currentInvestmentData.secondaryInvestment &&
        (currentInvestmentData.secondaryInvestment.initialInvestment || 0) > 0
      const depositBaseline =
        hasDualForTotals ? primaryInitForTotals + secondaryInitForTotals : primaryInitForTotals

      // Get the record at the index we're editing
      const recordIndex = editingRecord.index
      if (recordIndex < 0 || recordIndex >= monthlyHistory.length) {
        setError('Invalid record index')
        return
      }

      // Calculate the starting balance for this month (same-tranche previous ending, or tranche initial)
      let startingBalance = getRecordTrancheStartingBalance(
        monthlyHistory,
        recordIndex,
        currentInvestmentData
      )

      // Recalculate the month's data with edited values
      const normalizedDepositEntries = (editedRecordData.depositEntries || [])
        .map((entry) => ({ amount: parseFloat(entry?.amount) || 0, date: entry?.date || null }))
        .filter((entry) => entry.amount > 0 || entry.date)
      const normalizedWithdrawalEntries = (editedRecordData.withdrawalEntries || [])
        .map((entry) => ({ amount: parseFloat(entry?.amount) || 0, date: entry?.date || null }))
        .filter((entry) => entry.amount > 0 || entry.date)

      const originalRecord = monthlyHistory[recordIndex]
      let updatedRecord

      const useManualEnding =
        isPartnerUser(selectedInvestor) &&
        (isManualEndingBalanceRecord(originalRecord) ||
          editedRecordData.endingBalanceOverride === true)

      if (useManualEnding) {
        const preservedGrowth =
          isPartnerUser(selectedInvestor) &&
          editedRecordData.growthAmount !== '' &&
          editedRecordData.growthAmount != null
            ? parseFloat(editedRecordData.growthAmount) || 0
            : Number(originalRecord?.growthAmount) ||
              startingBalance * ((parseFloat(editedRecordData.percentageGrowth) || 0) / 100)

        updatedRecord = buildRecordFromManualEndingBalance({
          month: editedRecordData.month,
          year: editedRecordData.year,
          startingBalance,
          endingBalance: parseFloat(editedRecordData.endingBalance) || 0,
          growthAmount: preservedGrowth,
          percentageGrowth:
            parseFloat(editedRecordData.percentageGrowth) ||
            Number(originalRecord?.percentageGrowth) ||
            0,
          tranche: editingRecord.tranche,
          existingRecord: originalRecord,
          // Growth continues to sync from partner net profit; only ending stays fixed.
          partnerNetAutoSync: isPartnerUser(selectedInvestor) ? true : undefined,
          depositEntries: normalizedDepositEntries,
          withdrawalEntries: normalizedWithdrawalEntries
        })
      } else if (isPartnerUser(selectedInvestor)) {
        const growthAmount =
          editedRecordData.growthAmount !== '' && editedRecordData.growthAmount != null
            ? parseFloat(editedRecordData.growthAmount) || 0
            : startingBalance * ((parseFloat(editedRecordData.percentageGrowth) || 0) / 100)

        updatedRecord = buildPartnerMonthLedgerRecord({
          month: editedRecordData.month,
          year: editedRecordData.year,
          startingBalance,
          growthAmount,
          depositEntries: normalizedDepositEntries,
          withdrawalEntries: normalizedWithdrawalEntries,
          tranche: editingRecord.tranche,
          partnerNetAutoSync: true,
          existingRecord: originalRecord
        })
        // Ensure a previously manual ending is cleared when not overriding.
        delete updatedRecord.endingBalanceOverride
      } else {
        const percentageGrowth = parseFloat(editedRecordData.percentageGrowth) || 0
        const growthAmount = startingBalance * (percentageGrowth / 100)
        let newBalance = startingBalance + growthAmount

        const depositAmount = normalizedDepositEntries.reduce((sum, entry) => sum + entry.amount, 0)
        const depositGrowth = normalizedDepositEntries.reduce((sum, entry) => (
          sum + calculateProratedDepositGrowth(
            entry.amount,
            percentageGrowth,
            entry.date,
            editedRecordData.month,
            editedRecordData.year
          )
        ), 0)
        newBalance += depositAmount + depositGrowth

        const withdrawalAmount = normalizedWithdrawalEntries.reduce((sum, entry) => sum + entry.amount, 0)
        const withdrawalGrowthLoss = normalizedWithdrawalEntries.reduce((sum, entry) => (
          sum + calculateWithdrawalGrowthLoss(
            entry.amount,
            percentageGrowth,
            entry.date,
            editedRecordData.month,
            editedRecordData.year
          )
        ), 0)
        newBalance -= withdrawalAmount + withdrawalGrowthLoss

        updatedRecord = withoutManualEndingOverride({
          month: editedRecordData.month,
          year: editedRecordData.year,
          percentageGrowth: roundPercentageGrowth(percentageGrowth),
          growthAmount: growthAmount,
          depositGrowth: depositGrowth,
          withdrawalGrowthLoss: withdrawalGrowthLoss,
          startingBalance: startingBalance,
          endingBalance: newBalance,
          depositAmount: depositAmount,
          depositDate: normalizedDepositEntries[0]?.date || null,
          withdrawalAmount: withdrawalAmount,
          withdrawalDate: normalizedWithdrawalEntries[0]?.date || null,
          depositEntries: normalizedDepositEntries,
          withdrawalEntries: normalizedWithdrawalEntries,
          updatedAt: new Date().toISOString(),
          ...(editingRecord.tranche ? { tranche: editingRecord.tranche } : {})
        })
      }

      // Update the history array
      const updatedHistory = [...monthlyHistory]
      updatedHistory[recordIndex] = updatedRecord

      const editedTranche = updatedRecord.tranche || null

      // Recalculate subsequent months in the same tranche only (dual portfolios stay independent)
      for (let i = recordIndex + 1; i < updatedHistory.length; i++) {
        const currentRecord = updatedHistory[i]
        if (editedTranche) {
          if (currentRecord.tranche !== editedTranche) continue
        } else if (currentRecord.tranche) {
          continue
        }

        const trancheStart = getRecordTrancheStartingBalance(
          updatedHistory,
          i,
          currentInvestmentData
        )

        const depEntries = Array.isArray(currentRecord.depositEntries) && currentRecord.depositEntries.length > 0
          ? currentRecord.depositEntries
          : [{ amount: currentRecord.depositAmount || 0, date: currentRecord.depositDate || null }]
        const wdEntries = Array.isArray(currentRecord.withdrawalEntries) && currentRecord.withdrawalEntries.length > 0
          ? currentRecord.withdrawalEntries
          : [{ amount: currentRecord.withdrawalAmount || 0, date: currentRecord.withdrawalDate || null }]
        const depAmount = depEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
        const wdAmount = wdEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)

        if (isPartnerUser(selectedInvestor) && isManualEndingBalanceRecord(currentRecord)) {
          updatedHistory[i] = reconcileManualEndingRecord(currentRecord, trancheStart)
          continue
        }

        if (isPartnerLedgerRecord(currentRecord)) {
          const monthGrowth = Number(currentRecord.growthAmount) || 0
          const runningBalance = trancheStart + monthGrowth + depAmount - wdAmount
          updatedHistory[i] = {
            ...currentRecord,
            startingBalance: trancheStart,
            growthAmount: monthGrowth,
            percentageGrowth: trancheStart > 0
              ? roundPercentageGrowth((monthGrowth / trancheStart) * 100)
              : 0,
            endingBalance: runningBalance,
            depositAmount: depAmount,
            depositDate: depEntries[0]?.date || null,
            withdrawalAmount: wdAmount,
            withdrawalDate: wdEntries[0]?.date || null,
            depositGrowth: 0,
            withdrawalGrowthLoss: 0,
            depositEntries: depEntries,
            withdrawalEntries: wdEntries
          }
          continue
        }

        const monthGrowth = trancheStart * (currentRecord.percentageGrowth / 100)
        let runningBalance = trancheStart + monthGrowth

        const depGrowth = depEntries.reduce((sum, entry) => (
          sum + calculateProratedDepositGrowth(
            Number(entry.amount) || 0,
            currentRecord.percentageGrowth,
            entry.date,
            currentRecord.month,
            currentRecord.year
          )
        ), 0)
        const wdGrowth = wdEntries.reduce((sum, entry) => (
          sum + calculateWithdrawalGrowthLoss(
            Number(entry.amount) || 0,
            currentRecord.percentageGrowth,
            entry.date,
            currentRecord.month,
            currentRecord.year
          )
        ), 0)
        runningBalance += depAmount + depGrowth
        runningBalance -= wdAmount + wdGrowth

        updatedHistory[i] = withoutManualEndingOverride({
          ...currentRecord,
          startingBalance: trancheStart,
          growthAmount: monthGrowth,
          endingBalance: runningBalance,
          depositAmount: depAmount,
          depositDate: depEntries[0]?.date || null,
          withdrawalAmount: wdAmount,
          withdrawalDate: wdEntries[0]?.date || null,
          depositGrowth: depGrowth,
          withdrawalGrowthLoss: wdGrowth,
          depositEntries: depEntries,
          withdrawalEntries: wdEntries,
          percentageGrowth: roundPercentageGrowth(currentRecord.percentageGrowth)
        })
      }

      // Dual-tranche: current balance = latest conservative ending + latest moderate ending
      const finalBalance = resolveInvestorCurrentBalance(currentInvestmentData, updatedHistory)

      // Recalculate total deposits and withdrawals (both tranche initials when dual)
      const totalDeposits =
        depositBaseline + updatedHistory.reduce((sum, r) => sum + (r.depositAmount || 0), 0)
      const totalWithdrawals = updatedHistory.reduce((sum, r) => sum + (r.withdrawalAmount || 0), 0)

      // Update investment data
      const updatedInvestmentData = {
        ...currentInvestmentData,
        currentBalance: finalBalance,
        totalDeposits: totalDeposits,
        totalWithdrawals: totalWithdrawals,
        monthlyHistory: updatedHistory,
        lastUpdated: new Date().toISOString()
      }

      if (isAdmin3 && currentUser?.uid) {
        await saveAdmin3UserOverride(currentUser.uid, selectedInvestor.id, { investmentData: updatedInvestmentData })
      } else {
        await updateDoc(userDocRef, {
          investmentData: updatedInvestmentData,
          updatedAt: new Date().toISOString()
        })
      }

      setSuccess(isAdmin3 ? 'Saved to your sandbox (changes visible only to you)' : `Monthly record for ${editedRecordData.month} ${editedRecordData.year} updated successfully!`)
      setEditingRecord(null)
      setEditedRecordData({})

      // Reload investors and update selected investor
      await loadInvestors()
      const updatedUserDoc = await getDoc(userDocRef)
      if (updatedUserDoc.exists()) {
        const updatedUserData = updatedUserDoc.data()
        setSelectedInvestor({ ...selectedInvestor, investmentData: updatedInvestmentData })
      }
    } catch (error) {
      console.error('Error updating monthly record:', error)
      setError(`Failed to update monthly record: ${error.message}`)
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleDeleteRecord = async () => {
    if (!canEditPerformance) {
      setError('You do not have permission to delete monthly performance.')
      return
    }
    if (!selectedInvestor || !editingRecord) return

    const monthLabel = editedRecordData.month || editingRecord.month || 'this month'
    const yearLabel = editedRecordData.year || editingRecord.year || ''
    const confirmLabel = yearLabel ? `${monthLabel} ${yearLabel}` : monthLabel
    if (!window.confirm(`Eliminate the record for ${confirmLabel}? This cannot be undone.`)) {
      return
    }

    setLoadingEdit(true)
    setError('')
    setSuccess('')

    try {
      const db = getFirestore()
      const userDocRef = doc(db, 'users', selectedInvestor.id)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        setError('User document not found')
        return
      }

      const userData = userDoc.data()
      const currentInvestmentData = (isAdmin3 ? selectedInvestor.investmentData : userData.investmentData) || {}
      const monthlyHistory = currentInvestmentData.monthlyHistory || []
      const primaryInitForTotals = currentInvestmentData.initialInvestment || 0
      const secondaryInitForTotals = currentInvestmentData.secondaryInvestment?.initialInvestment || 0
      const hasDualForTotals =
        currentInvestmentData.secondaryInvestment &&
        (currentInvestmentData.secondaryInvestment.initialInvestment || 0) > 0
      const depositBaseline =
        hasDualForTotals ? primaryInitForTotals + secondaryInitForTotals : primaryInitForTotals

      const recordIndex = editingRecord.index
      if (recordIndex < 0 || recordIndex >= monthlyHistory.length) {
        setError('Invalid record index')
        return
      }

      const deletedTranche = monthlyHistory[recordIndex]?.tranche || null
      const updatedHistory = monthlyHistory.filter((_, index) => index !== recordIndex)

      // Recalculate subsequent same-tranche rows only (other tranche stays untouched)
      for (let i = recordIndex; i < updatedHistory.length; i++) {
        const currentRecord = updatedHistory[i]
        if (deletedTranche) {
          if (currentRecord.tranche !== deletedTranche) continue
        } else if (currentRecord.tranche) {
          continue
        }

        const trancheStart = getRecordTrancheStartingBalance(
          updatedHistory,
          i,
          currentInvestmentData
        )
        const monthGrowth = trancheStart * (currentRecord.percentageGrowth / 100)
        let runningBalance = trancheStart + monthGrowth

        const depEntries = Array.isArray(currentRecord.depositEntries) && currentRecord.depositEntries.length > 0
          ? currentRecord.depositEntries
          : [{ amount: currentRecord.depositAmount || 0, date: currentRecord.depositDate || null }]
        const wdEntries = Array.isArray(currentRecord.withdrawalEntries) && currentRecord.withdrawalEntries.length > 0
          ? currentRecord.withdrawalEntries
          : [{ amount: currentRecord.withdrawalAmount || 0, date: currentRecord.withdrawalDate || null }]
        const depAmount = depEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
        const wdAmount = wdEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
        const depGrowth = depEntries.reduce((sum, entry) => (
          sum + calculateProratedDepositGrowth(
            Number(entry.amount) || 0,
            currentRecord.percentageGrowth,
            entry.date,
            currentRecord.month,
            currentRecord.year
          )
        ), 0)
        const wdGrowth = wdEntries.reduce((sum, entry) => (
          sum + calculateWithdrawalGrowthLoss(
            Number(entry.amount) || 0,
            currentRecord.percentageGrowth,
            entry.date,
            currentRecord.month,
            currentRecord.year
          )
        ), 0)
        runningBalance += depAmount + depGrowth
        runningBalance -= wdAmount + wdGrowth

        updatedHistory[i] = withoutManualEndingOverride({
          ...currentRecord,
          startingBalance: trancheStart,
          growthAmount: monthGrowth,
          endingBalance: runningBalance,
          depositAmount: depAmount,
          depositDate: depEntries[0]?.date || null,
          withdrawalAmount: wdAmount,
          withdrawalDate: wdEntries[0]?.date || null,
          depositGrowth: depGrowth,
          withdrawalGrowthLoss: wdGrowth,
          depositEntries: depEntries,
          withdrawalEntries: wdEntries
        })
      }

      const finalBalance = resolveInvestorCurrentBalance(currentInvestmentData, updatedHistory)

      const totalDeposits =
        depositBaseline + updatedHistory.reduce((sum, r) => sum + (r.depositAmount || 0), 0)
      const totalWithdrawals = updatedHistory.reduce((sum, r) => sum + (r.withdrawalAmount || 0), 0)

      const updatedInvestmentData = {
        ...currentInvestmentData,
        currentBalance: finalBalance,
        totalDeposits,
        totalWithdrawals,
        monthlyHistory: updatedHistory,
        lastUpdated: new Date().toISOString()
      }

      if (isAdmin3 && currentUser?.uid) {
        await saveAdmin3UserOverride(currentUser.uid, selectedInvestor.id, { investmentData: updatedInvestmentData })
      } else {
        await updateDoc(userDocRef, {
          investmentData: updatedInvestmentData,
          updatedAt: new Date().toISOString()
        })
      }

      setSuccess(
        isAdmin3
          ? 'Record eliminated in your sandbox (changes visible only to you)'
          : `Monthly record for ${confirmLabel} eliminated successfully!`
      )
      setEditingRecord(null)
      setEditedRecordData({})

      await loadInvestors()
      setSelectedInvestor({ ...selectedInvestor, investmentData: updatedInvestmentData })
    } catch (error) {
      console.error('Error deleting monthly record:', error)
      setError(`Failed to eliminate monthly record: ${error.message}`)
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleAddPerformance = async () => {
    if (!selectedInvestor || !selectedInvestor.investmentData) return

    setLoadingMonthlyUpdate(true)
    setError('')
    setSuccess('')

    try {
      const db = getFirestore()
      const userDocRef = doc(db, 'users', selectedInvestor.id)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) {
        setError('User document not found')
        return
      }

      const userData = userDoc.data()
      const currentInvestmentData = (isAdmin3 ? selectedInvestor.investmentData : userData.investmentData) || {}
      const primaryInit = currentInvestmentData.initialInvestment || 0
      const secondaryInit = currentInvestmentData.secondaryInvestment?.initialInvestment || 0
      const hasDualTranche =
        currentInvestmentData.secondaryInvestment &&
        (currentInvestmentData.secondaryInvestment.initialInvestment || 0) > 0
      const scope = !hasDualTranche
        ? 'account'
        : monthlyUpdate.performanceScope === 'secondary'
          ? 'secondary'
          : 'primary'

      let currentBalance =
        scope === 'account'
          ? currentInvestmentData.currentBalance || currentInvestmentData.initialInvestment || 0
          : scope === 'primary'
            ? getLastTrancheEnding(
                currentInvestmentData.monthlyHistory,
                TRANCHE_PRIMARY,
                primaryInit
              )
            : getLastTrancheEnding(
                currentInvestmentData.monthlyHistory,
                TRANCHE_SECONDARY,
                secondaryInit
              )

      const combinedInitial = hasDualTranche ? primaryInit + secondaryInit : primaryInit
      const totalDeposits = Math.max(
        Number(currentInvestmentData.totalDeposits) || 0,
        combinedInitial
      )
      const totalWithdrawals = currentInvestmentData.totalWithdrawals || 0

      const normalizedDepositEntries = (monthlyUpdate.depositEntries || [])
        .map((entry) => ({ amount: parseFloat(entry?.amount) || 0, date: entry?.date || null }))
        .filter((entry) => entry.amount > 0 || entry.date)
      const normalizedWithdrawalEntries = (monthlyUpdate.withdrawalEntries || [])
        .map((entry) => ({ amount: parseFloat(entry?.amount) || 0, date: entry?.date || null }))
        .filter((entry) => entry.amount > 0 || entry.date)

      const depositAmount = normalizedDepositEntries.reduce((sum, entry) => sum + entry.amount, 0)
      const withdrawalAmount = normalizedWithdrawalEntries.reduce((sum, entry) => sum + entry.amount, 0)
      const newTotalDeposits = totalDeposits + depositAmount
      const newTotalWithdrawals = totalWithdrawals + withdrawalAmount

      let monthlyRecord

      if (isPartnerUser(selectedInvestor)) {
        const growthAmount =
          monthlyUpdate.growthAmount !== '' && monthlyUpdate.growthAmount != null
            ? parseFloat(monthlyUpdate.growthAmount) || 0
            : currentBalance * ((parseFloat(monthlyUpdate.percentageGrowth) || 0) / 100)

        monthlyRecord = buildPartnerMonthLedgerRecord({
          month: monthlyUpdate.month,
          year: monthlyUpdate.year,
          startingBalance: currentBalance,
          growthAmount,
          depositEntries: normalizedDepositEntries,
          withdrawalEntries: normalizedWithdrawalEntries,
          partnerNetAutoSync: true
        })
      } else {
      const percentageGrowth = parseFloat(monthlyUpdate.percentageGrowth) || 0
      const growthAmount = currentBalance * (percentageGrowth / 100)
      let newBalance = currentBalance + growthAmount

      const depositGrowth = normalizedDepositEntries.reduce((sum, entry) => (
        sum + calculateProratedDepositGrowth(
          entry.amount,
          percentageGrowth,
          entry.date,
          monthlyUpdate.month,
          monthlyUpdate.year
        )
      ), 0)
      const withdrawalGrowth = normalizedWithdrawalEntries.reduce((sum, entry) => (
        sum + calculateWithdrawalGrowthLoss(
          entry.amount,
          percentageGrowth,
          entry.date,
          monthlyUpdate.month,
          monthlyUpdate.year
        )
      ), 0)
      
      newBalance += depositAmount + depositGrowth
      newBalance -= withdrawalAmount + withdrawalGrowth

      monthlyRecord = withoutManualEndingOverride({
        month: monthlyUpdate.month,
        year: monthlyUpdate.year,
        percentageGrowth: roundPercentageGrowth(percentageGrowth),
        growthAmount: growthAmount,
        depositGrowth: depositGrowth,
        withdrawalGrowth: withdrawalGrowth,
        withdrawalGrowthLoss: withdrawalGrowth,
        startingBalance: currentBalance,
        endingBalance: newBalance,
        depositAmount: depositAmount,
        depositDate: normalizedDepositEntries[0]?.date || null,
        withdrawalAmount: withdrawalAmount,
        withdrawalDate: normalizedWithdrawalEntries[0]?.date || null,
        depositEntries: normalizedDepositEntries,
        withdrawalEntries: normalizedWithdrawalEntries,
        updatedAt: new Date().toISOString(),
        ...(scope === 'primary'
          ? { tranche: TRANCHE_PRIMARY }
          : scope === 'secondary'
            ? { tranche: TRANCHE_SECONDARY }
            : {})
      })
      }

      // Get existing monthly history
      const existingHistory = currentInvestmentData.monthlyHistory || []
      const updatedHistory = [...existingHistory, monthlyRecord]

      const finalCombinedBalance = resolveInvestorCurrentBalance(
        currentInvestmentData,
        updatedHistory
      )

      // Update investment data
      const updatedInvestmentData = {
        ...currentInvestmentData,
        currentBalance: finalCombinedBalance,
        totalDeposits: newTotalDeposits,
        totalWithdrawals: newTotalWithdrawals,
        monthlyHistory: updatedHistory,
        lastUpdated: new Date().toISOString()
      }

      if (isAdmin3 && currentUser?.uid) {
        await saveAdmin3UserOverride(currentUser.uid, selectedInvestor.id, { investmentData: updatedInvestmentData })
      } else {
        await updateDoc(userDocRef, {
          investmentData: updatedInvestmentData,
          updatedAt: new Date().toISOString()
        })
      }

      setSuccess(isAdmin3 ? 'Saved to your sandbox (changes visible only to you)' : `Monthly update for ${monthlyUpdate.month} ${monthlyUpdate.year} saved successfully!`)
      setMonthlyUpdate(
        buildPrefilledMonthlyUpdateForm(
          updatedInvestmentData,
          investorHasDualTranche(updatedInvestmentData)
            ? (monthlyUpdate.performanceScope || 'primary')
            : 'primary'
        )
      )
      setShowAddPerformance(false)

      // Reload investors and update selected investor
      await loadInvestors()
      const updatedUserDoc = await getDoc(userDocRef)
      if (updatedUserDoc.exists()) {
        setSelectedInvestor({ ...selectedInvestor, investmentData: updatedInvestmentData })
      }
    } catch (error) {
      console.error('Error updating monthly performance:', error)
      setError(`Failed to update monthly performance: ${error.message}`)
    } finally {
      setLoadingMonthlyUpdate(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-investors-loading">
        <div className="loading-spinner">Loading investors...</div>
      </div>
    )
  }

  const assignableInvestors = selectedInvestor ? getAssignableInvestors(selectedInvestor.id) : []
  const partners = investors.filter(isPartnerUser)
  const currentCalendarMonth = MONTH_NAMES[new Date().getMonth()]
  const currentCalendarYear = new Date().getFullYear()
  const partnerModalDonut =
    showPartnerManagement && selectedInvestor && isPartnerUser(selectedInvestor)
      ? buildPartnerSummaryDonut(selectedInvestor, investors, getInvestorDisplayBalance)
      : null
  const partnerMonthFinancials =
    showPartnerManagement && selectedInvestor && isPartnerUser(selectedInvestor)
      ? computePartnerMonthFinancials({
          selectedPartnerId: selectedInvestor.id,
          partners,
          investors,
          dailyPerformances: partnerModalDailyPerformances,
          getBalance: getInvestorDisplayBalance,
          monthName: currentCalendarMonth,
          year: currentCalendarYear,
          isPartnerUser
        })
      : null
  const selectedIsPartner = selectedInvestor && isPartnerUser(selectedInvestor)
  const partnerSummaryDonut = selectedIsPartner
    ? buildPartnerSummaryDonut(selectedInvestor, investors, getInvestorDisplayBalance)
    : null

  return (
    <div className="admin-investors-management">
      <div className="investors-layout">
        {/* Investors List */}
        <div className="investors-list-panel">
          <div className="investors-list">
            {investors.length === 0 ? (
              <p className="no-investors">No investors found</p>
            ) : (
              investors.map((investor) => {
                const partner = isPartnerUser(investor)
                const hasCurrentMonthEntry = hasPerformanceEntryForCurrentMonth(investor)
                return (
                <div
                  key={investor.id}
                  className={`investor-card ${selectedInvestor?.id === investor.id ? 'selected' : ''}${partner ? ' investor-card-partner' : ''}`}
                  onClick={() => handleInvestorSelect(investor)}
                >
                  {hasCurrentMonthEntry && (
                    <span className="investor-card-month-check" title="Performance logged for this month">
                      <CurrentMonthPerformanceCheckIcon />
                    </span>
                  )}
                  <div className={`investor-card-image${partner ? ' investor-card-image-partner' : ''}`}>
                    {!isAdmin3 && investor.profileImageUrl ? (
                      <img src={investor.profileImageUrl} alt={investor.displayName || investor.email} />
                    ) : (
                      <div
                        className="investor-card-placeholder"
                        style={{ background: getProfilePlaceholder(investor).bgColor }}
                      >
                        {getProfilePlaceholder(investor).letter}
                      </div>
                    )}
                  </div>
                  <div className="investor-card-info">
                    <h3 className="investor-card-name">
                      {investor.displayName || 'No name'}
                      {partner && <span className="investor-partner-badge">Partner</span>}
                    </h3>
                    <p className="investor-card-email">{investor.email}</p>
                    {investor.investmentData && (
                      <div className="investor-balance">
                        <span className="balance-label">Balance:</span>
                        <span className="balance-value">
                          €
                          {getInvestorDisplayBalance(investor).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                )
              })
            )}
          </div>
        </div>

        {/* Investor Details Panel */}
        <div className="investor-details-panel">
          {selectedInvestor ? (
            <div className="investor-details">
              <div className="investor-details-header">
                <div className="investor-details-header-main">
                  <h2 className="panel-title">{selectedInvestor.displayName || selectedInvestor.email}</h2>
                  {selectedInvestor.email && (
                    <span className="investor-details-email">{selectedInvestor.email}</span>
                  )}
                </div>
                {isPartnerUser(selectedInvestor) && (
                  <button
                    type="button"
                    className="btn-partner-management"
                    onClick={openPartnerManagement}
                  >
                    Management
                  </button>
                )}
              </div>
              
              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              {/* Portfolio Summary */}
              {selectedInvestor.investmentData && (
                <div className={`portfolio-summary-section${selectedIsPartner ? ' portfolio-summary-section--partner' : ''}`}>
                  <h3 className="section-title">Current Portfolio Summary</h3>
                  <div className="portfolio-summary-layout">
                    <div className="portfolio-summary-stats">
                      <div className="portfolio-summary-grid">
                        <div className="summary-item">
                          <span className="summary-label">Current Balance:</span>
                          <span className="summary-value">€{getAdminInvestorSummaryCurrentBalance(selectedInvestor.investmentData).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">
                            {selectedInvestor.investmentData.secondaryInvestment
                              ? 'First tranche initial (Conservative, 2%):'
                              : 'Initial investment:'}
                          </span>
                          <span className="summary-value">€{(selectedInvestor.investmentData.initialInvestment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {selectedInvestor.investmentData.secondaryInvestment && (
                          <div className="summary-item">
                            <span className="summary-label">Second tranche initial (Moderate, 4%):</span>
                            <span className="summary-value">
                              €
                              {(selectedInvestor.investmentData.secondaryInvestment.initialInvestment || 0).toLocaleString(
                                'en-US',
                                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                              )}
                            </span>
                          </div>
                        )}
                        {selectedInvestor.investmentData.secondaryInvestment && (
                          <div className="summary-item">
                            <span className="summary-label">Total initial (both tranches):</span>
                            <span className="summary-value">
                              €
                              {getInvestorCombinedInitial(selectedInvestor.investmentData).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </span>
                          </div>
                        )}
                        <div className="summary-item">
                          <span className="summary-label">Total Deposits:</span>
                          <span className="summary-value">€{getAdminInvestorSummaryTotalDeposits(selectedInvestor.investmentData).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Total Withdrawals:</span>
                          <span className="summary-value">€{(selectedInvestor.investmentData.totalWithdrawals || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    {selectedIsPartner && partnerSummaryDonut && (() => {
                      const hoveredSlice = partnerSummaryDonut.slices.find(
                        (slice) => slice.id === partnerDonutHoverSlice
                      )
                      const centerAmount = hoveredSlice
                        ? hoveredSlice.balance
                        : partnerSummaryDonut.partnerSphereTotal
                      const centerPct = hoveredSlice
                        ? hoveredSlice.share
                        : partnerSummaryDonut.spherePctOfTotal

                      return (
                      <div className="partner-summary-donut-panel" aria-label="Partner allocation across all investors">
                        <div
                          className="partner-summary-donut-wrap"
                          onMouseLeave={() => setPartnerDonutHoverSlice(null)}
                        >
                          <svg viewBox="0 0 180 180" className="partner-summary-donut" role="img">
                            {partnerSummaryDonut.slices.length > 0 ? (
                              partnerSummaryDonut.slices.map((slice) => (
                                <path
                                  key={slice.id}
                                  d={slice.path}
                                  fill={slice.color}
                                  stroke="#ffffff"
                                  strokeWidth="1.5"
                                  className={`partner-summary-donut-slice partner-summary-donut-slice--${slice.id}${
                                    partnerDonutHoverSlice && partnerDonutHoverSlice !== slice.id
                                      ? ' is-dimmed'
                                      : ''
                                  }${partnerDonutHoverSlice === slice.id ? ' is-active' : ''}`}
                                  onMouseEnter={() => setPartnerDonutHoverSlice(slice.id)}
                                />
                              ))
                            ) : (
                              <circle cx="90" cy="90" r="78" fill="none" stroke="#e5e7eb" strokeWidth="22" />
                            )}
                          </svg>
                          <div className="partner-summary-donut-center">
                            {hoveredSlice && (
                              <span className="partner-summary-donut-slice-label">{hoveredSlice.label}</span>
                            )}
                            <strong className="partner-summary-donut-amount">
                              {formatEuroWhole(centerAmount)}
                            </strong>
                            {!hoveredSlice && (
                              <span className="partner-summary-donut-pct">
                                {centerPct.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* Action Buttons - hide for sample investors */}
              {!selectedInvestor._isSample && (
              <div className="action-buttons">
                <button
                  onClick={() => {
                    setShowViewPerformance(true)
                    setShowAddPerformance(false)
                  }}
                  className="btn-action btn-view"
                >
                  View Performance
                </button>
                {canAddPerformance && !(selectedInvestor.statuses && selectedInvestor.statuses.includes('Trader')) && (
                  <button
                    onClick={() => {
                      setMonthlyUpdate(
                        buildPrefilledMonthlyUpdateForm(
                          selectedInvestor.investmentData,
                          'primary'
                        )
                      )
                      setShowAddPerformance(true)
                      setShowViewPerformance(false)
                    }}
                    className="btn-action btn-add"
                  >
                    Add New Performance
                  </button>
                )}
                {selectedInvestor.statuses && selectedInvestor.statuses.includes('Trader') && (
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    This user is a Trader and manages their own portfolio performance.
                  </p>
                )}
              </div>
              )}

              {/* Edit Record Widget - Only show for admins with full permissions */}
              {editingRecord && canEditPerformance && (
                <div className="investor-edit-record-inline">
                  <div className="add-performance-section investor-edit-record-widget">
                    <div className="investor-edit-record-header">
                      <h3>Edit Monthly Record</h3>
                      <button
                        type="button"
                        className="investor-edit-record-close"
                        onClick={closeEditingRecord}
                        aria-label="Close"
                        disabled={loadingEdit}
                      >
                        ×
                      </button>
                    </div>

                    <div className="monthly-update-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Month</label>
                          <select
                            className="form-input"
                            value={editedRecordData.month}
                            onChange={(e) => setEditedRecordData({ ...editedRecordData, month: e.target.value })}
                          >
                            <option value="">Select Month</option>
                            <option value="January">January</option>
                            <option value="February">February</option>
                            <option value="March">March</option>
                            <option value="April">April</option>
                            <option value="May">May</option>
                            <option value="June">June</option>
                            <option value="July">July</option>
                            <option value="August">August</option>
                            <option value="September">September</option>
                            <option value="October">October</option>
                            <option value="November">November</option>
                            <option value="December">December</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Year</label>
                          <input
                            type="number"
                            className="form-input"
                            value={editedRecordData.year}
                            onChange={(e) => setEditedRecordData({ ...editedRecordData, year: e.target.value })}
                            placeholder="2024"
                            min="2020"
                            max="2100"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Percentage Growth (%)</label>
                          <input
                            type="number"
                            className="form-input"
                            value={editedRecordData.percentageGrowth}
                            onChange={(e) =>
                              isPartnerUser(selectedInvestor)
                                ? handleEditedRecordPartnerGrowthChange('percentageGrowth', e.target.value)
                                : setEditedRecordData({ ...editedRecordData, percentageGrowth: e.target.value })
                            }
                            placeholder="2.0"
                            step="0.01"
                            min="-100"
                            max="100"
                          />
                        </div>
                        {isPartnerUser(selectedInvestor) && (
                          <div className="form-group">
                            <label className="form-label">Growth Amount (€)</label>
                            <input
                              type="number"
                              className="form-input"
                              value={editedRecordData.growthAmount ?? ''}
                              onChange={(e) =>
                                handleEditedRecordPartnerGrowthChange('growthAmount', e.target.value)
                              }
                              placeholder="0.00"
                              step="0.01"
                            />
                          </div>
                        )}
                        {isPartnerUser(selectedInvestor) && (
                          <div className="form-group">
                            <label className="form-label">Ending Balance (€)</label>
                            <input
                              type="number"
                              className="form-input"
                              value={editedRecordData.endingBalance ?? ''}
                              onChange={(e) => handleEditedRecordEndingBalanceChange(e.target.value)}
                              placeholder="Override calculated balance"
                              step="0.01"
                            />
                          </div>
                        )}
                      </div>

                      <div className="form-row investor-cashflow-row">
                        <div className="form-group form-group--cashflow">
                          <label className="form-label">Deposit entries (€)</label>
                          <div className="cashflow-entry-list">
                            {(editedRecordData.depositEntries || [{ amount: '', date: '' }]).map((entry, index) => (
                              <div className="cashflow-entry-row" key={`edit-record-deposit-entry-${index}`}>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={entry.amount || ''}
                                  onChange={(e) => handleEditCashflowEntryChange('deposit', index, 'amount', e.target.value)}
                                  placeholder="0.00"
                                  step="0.01"
                                  min="0"
                                />
                                <input
                                  type="date"
                                  className="form-input"
                                  value={entry.date || ''}
                                  onChange={(e) => handleEditCashflowEntryChange('deposit', index, 'date', e.target.value)}
                                />
                                {index === (editedRecordData.depositEntries || [{ amount: '', date: '' }]).length - 1 && (
                                  <div className="cashflow-entry-actions">
                                    <button
                                      type="button"
                                      className="cashflow-entry-action-btn"
                                      onClick={() => handleAddEditCashflowEntry('deposit')}
                                      aria-label="Add another deposit"
                                    >
                                      +
                                    </button>
                                    {(editedRecordData.depositEntries || [{ amount: '', date: '' }]).length > 1 && (
                                      <button
                                        type="button"
                                        className="cashflow-entry-action-btn"
                                        onClick={() => handleRemoveEditCashflowEntry('deposit', index)}
                                        aria-label="Remove deposit entry"
                                      >
                                        -
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="form-group form-group--cashflow">
                          <label className="form-label">Withdrawal entries (€)</label>
                          <div className="cashflow-entry-list">
                            {(editedRecordData.withdrawalEntries || [{ amount: '', date: '' }]).map((entry, index) => (
                              <div className="cashflow-entry-row" key={`edit-record-withdrawal-entry-${index}`}>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={entry.amount || ''}
                                  onChange={(e) => handleEditCashflowEntryChange('withdrawal', index, 'amount', e.target.value)}
                                  placeholder="0.00"
                                  step="0.01"
                                  min="0"
                                />
                                <input
                                  type="date"
                                  className="form-input"
                                  value={entry.date || ''}
                                  onChange={(e) => handleEditCashflowEntryChange('withdrawal', index, 'date', e.target.value)}
                                />
                                {index === (editedRecordData.withdrawalEntries || [{ amount: '', date: '' }]).length - 1 && (
                                  <div className="cashflow-entry-actions">
                                    <button
                                      type="button"
                                      className="cashflow-entry-action-btn"
                                      onClick={() => handleAddEditCashflowEntry('withdrawal')}
                                      aria-label="Add another withdrawal"
                                    >
                                      +
                                    </button>
                                    {(editedRecordData.withdrawalEntries || [{ amount: '', date: '' }]).length > 1 && (
                                      <button
                                        type="button"
                                        className="cashflow-entry-action-btn"
                                        onClick={() => handleRemoveEditCashflowEntry('withdrawal', index)}
                                        aria-label="Remove withdrawal entry"
                                      >
                                        -
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="form-row investor-monthly-save-row">
                        <div className="form-group investor-edit-record-actions">
                          <button
                            type="button"
                            onClick={handleUpdateRecord}
                            disabled={
                              loadingEdit ||
                              !canUpdateExistingRecord(
                                editedRecordData,
                                selectedInvestor,
                                selectedInvestor?.investmentData?.monthlyHistory?.[editingRecord?.index]
                              )
                            }
                            className="btn-submit btn-submit--edit-record"
                          >
                            {loadingEdit ? 'Updating...' : 'Update Record'}
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteRecord}
                            disabled={loadingEdit}
                            className="btn-delete investor-edit-record-eliminate-btn"
                          >
                            {loadingEdit ? 'Working...' : 'Eliminate'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* View Performance Table */}
              {showViewPerformance && selectedInvestor.investmentData && (
                <div className="performance-view-section">
                  {selectedInvestor.investmentData.secondaryInvestment ? (
                    (() => {
                      const mh = selectedInvestor.investmentData.monthlyHistory || []
                      const primaryRows = mh
                        .map((record, index) => ({ record, index }))
                        .filter(({ record }) => record.tranche === TRANCHE_PRIMARY)
                      const secondaryRows = mh
                        .map((record, index) => ({ record, index }))
                        .filter(({ record }) => record.tranche === TRANCHE_SECONDARY)
                      const legacyRows = mh
                        .map((record, index) => ({ record, index }))
                        .filter(({ record }) => !record.tranche)
                      if (mh.length === 0) {
                        return <p className="no-history">No performance history recorded yet.</p>
                      }
                      const renderTable = (rows, title) => (
                        <div className="performance-tranche-block" key={title}>
                          <h4 className="performance-tranche-title">{title}</h4>
                          {rows.length > 0 ? (
                            <div className="history-table">
                              <div className="history-header">
                                <div>Month/Year</div>
                                <div>Growth %</div>
                                <div>Growth Amount</div>
                                <div>Deposit</div>
                                <div>Withdrawal</div>
                                <div>Ending Balance</div>
                              </div>
                              {rows
                                .slice()
                                .reverse()
                                .map(({ record, index }) => (
                                <div
                                  key={`${title}-${index}`}
                                  className={`history-row ${canEditPerformance ? 'clickable' : ''}`}
                                  onClick={
                                    canEditPerformance ? () => handleRecordClick(record, index) : undefined
                                  }
                                >
                                  <div>
                                    {record.month} {record.year}
                                  </div>
                                  <div>{formatPercentageGrowthDisplay(record.percentageGrowth)}%</div>
                                  <div>
                                    €
                                    {getRecordNetGrowthAmount(record).toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                                  </div>
                                  <div>
                                    {record.depositAmount > 0
                                      ? `€${record.depositAmount.toLocaleString('en-US', {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2
                                        })}`
                                      : '-'}
                                  </div>
                                  <div>
                                    {record.withdrawalAmount > 0
                                      ? `€${record.withdrawalAmount.toLocaleString('en-US', {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2
                                        })}`
                                      : '-'}
                                  </div>
                                  <div>
                                    €
                                    {record.endingBalance.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                                  </div>
                                </div>
                                ))}
                            </div>
                          ) : (
                            <p className="no-history no-history-tranche">No entries for this tranche yet.</p>
                          )}
                        </div>
                      )
                      return (
                        <div className="performance-tranche-groups">
                          {renderTable(primaryRows, 'Conservative (2%)')}
                          {renderTable(secondaryRows, 'Moderate (4%)')}
                          {legacyRows.length > 0 &&
                            renderTable(legacyRows, 'Combined (legacy, before per-tranche logging)')}
                        </div>
                      )
                    })()
                  ) : selectedInvestor.investmentData.monthlyHistory &&
                    selectedInvestor.investmentData.monthlyHistory.length > 0 ? (
                    <div className="history-table">
                      <div className="history-header">
                        <div>Month/Year</div>
                        <div>Growth %</div>
                        <div>Growth Amount</div>
                        <div>Deposit</div>
                        <div>Withdrawal</div>
                        <div>Ending Balance</div>
                      </div>
                      {selectedInvestor.investmentData.monthlyHistory
                        .map((record, index) => ({ record, index }))
                        .reverse()
                        .map(({ record, index }) => (
                        <div
                          key={index}
                          className={`history-row ${canEditPerformance ? 'clickable' : ''}`}
                          onClick={canEditPerformance ? () => handleRecordClick(record, index) : undefined}
                        >
                          <div>
                            {record.month} {record.year}
                          </div>
                          <div>{formatPercentageGrowthDisplay(record.percentageGrowth)}%</div>
                          <div>
                            €
                            {getRecordNetGrowthAmount(record).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </div>
                          <div>
                            {record.depositAmount > 0
                              ? `€${record.depositAmount.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}`
                              : '-'}
                          </div>
                          <div>
                            {record.withdrawalAmount > 0
                              ? `€${record.withdrawalAmount.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}`
                              : '-'}
                          </div>
                          <div>
                            €
                            {record.endingBalance.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </div>
                        </div>
                        ))}
                    </div>
                  ) : (
                    <p className="no-history">No performance history recorded yet.</p>
                  )}
                </div>
              )}

              {/* Add Performance Form - Only show for admins with full permissions, and not for Traders */}
              {showAddPerformance && canAddPerformance && !(selectedInvestor.statuses && selectedInvestor.statuses.includes('Trader')) && (
                <div className="add-performance-section add-performance-section--investor-monthly">
                  <div className="monthly-update-form">
                    {selectedInvestor.investmentData?.secondaryInvestment && (
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Apply performance to</label>
                          <select
                            className="form-input"
                            value={monthlyUpdate.performanceScope || 'primary'}
                            onChange={(e) => {
                              const nextScope = e.target.value
                              const defaults = getDefaultMonthlyPerformanceFormValues(
                                selectedInvestor.investmentData,
                                nextScope
                              )
                              setMonthlyUpdate((prev) => ({
                                ...prev,
                                performanceScope: nextScope,
                                month: defaults.month,
                                year: defaults.year,
                                percentageGrowth: defaults.percentageGrowth
                              }))
                            }}
                          >
                            <option value="primary">Conservative (2%)</option>
                            <option value="secondary">Moderate (4%)</option>
                          </select>
                        </div>
                      </div>
                    )}
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Month</label>
                        <select
                          className="form-input"
                          value={monthlyUpdate.month}
                          onChange={(e) => handleMonthlyUpdateFieldChange('month', e.target.value)}
                        >
                          <option value="">Select Month</option>
                          <option value="January">January</option>
                          <option value="February">February</option>
                          <option value="March">March</option>
                          <option value="April">April</option>
                          <option value="May">May</option>
                          <option value="June">June</option>
                          <option value="July">July</option>
                          <option value="August">August</option>
                          <option value="September">September</option>
                          <option value="October">October</option>
                          <option value="November">November</option>
                          <option value="December">December</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Year</label>
                        <input
                          type="number"
                          className="form-input"
                          value={monthlyUpdate.year}
                          onChange={(e) => handleMonthlyUpdateFieldChange('year', e.target.value)}
                          placeholder="2024"
                          min="2020"
                          max="2100"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Percentage Growth (%)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={monthlyUpdate.percentageGrowth}
                          onChange={(e) =>
                            isPartnerUser(selectedInvestor)
                              ? handleMonthlyPartnerGrowthChange('percentageGrowth', e.target.value)
                              : handleMonthlyUpdateFieldChange('percentageGrowth', e.target.value)
                          }
                          placeholder="2.0"
                          step="0.01"
                          min="-100"
                          max="100"
                        />
                        {!isPartnerUser(selectedInvestor) &&
                          monthlyUpdate.percentageGrowth &&
                          selectedInvestor.investmentData && (
                          <small className="form-help">
                            Equivalent to: €{(getAdminPerformancePreviewStartingBalance(selectedInvestor.investmentData, monthlyUpdate.performanceScope || 'primary') * (parseFloat(monthlyUpdate.percentageGrowth) / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </small>
                        )}
                      </div>
                      {isPartnerUser(selectedInvestor) && (
                        <div className="form-group">
                          <label className="form-label">Growth Amount (€)</label>
                          <input
                            type="number"
                            className="form-input"
                            value={monthlyUpdate.growthAmount ?? ''}
                            onChange={(e) => handleMonthlyPartnerGrowthChange('growthAmount', e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>
                      )}
                    </div>

                    <div className="form-row investor-cashflow-row">
                      <div className="form-group form-group--cashflow">
                        <label className="form-label">Deposit entries (€)</label>
                        <div className="cashflow-entry-list">
                          {(monthlyUpdate.depositEntries || [{ amount: '', date: '' }]).map((entry, index) => (
                            <div className="cashflow-entry-row" key={`investor-deposit-entry-${index}`}>
                              <input
                                type="number"
                                className="form-input"
                                value={entry.amount || ''}
                                onChange={(e) => handleMonthlyCashflowEntryChange('deposit', index, 'amount', e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                              />
                              <input
                                type="date"
                                className="form-input"
                                value={entry.date || ''}
                                onChange={(e) => handleMonthlyCashflowEntryChange('deposit', index, 'date', e.target.value)}
                              />
                              {index === (monthlyUpdate.depositEntries || [{ amount: '', date: '' }]).length - 1 && (
                                <div className="cashflow-entry-actions">
                                  <button
                                    type="button"
                                    className="cashflow-entry-action-btn"
                                    onClick={() => handleAddMonthlyCashflowEntry('deposit')}
                                    aria-label="Add another deposit"
                                  >
                                    +
                                  </button>
                                  {(monthlyUpdate.depositEntries || [{ amount: '', date: '' }]).length > 1 && (
                                    <button
                                      type="button"
                                      className="cashflow-entry-action-btn"
                                      onClick={() => handleRemoveMonthlyCashflowEntry('deposit', index)}
                                      aria-label="Remove deposit entry"
                                    >
                                      -
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="form-group form-group--cashflow">
                        <label className="form-label">Withdrawal entries (€)</label>
                        <div className="cashflow-entry-list">
                          {(monthlyUpdate.withdrawalEntries || [{ amount: '', date: '' }]).map((entry, index) => (
                            <div className="cashflow-entry-row" key={`investor-withdrawal-entry-${index}`}>
                              <input
                                type="number"
                                className="form-input"
                                value={entry.amount || ''}
                                onChange={(e) => handleMonthlyCashflowEntryChange('withdrawal', index, 'amount', e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                              />
                              <input
                                type="date"
                                className="form-input"
                                value={entry.date || ''}
                                onChange={(e) => handleMonthlyCashflowEntryChange('withdrawal', index, 'date', e.target.value)}
                              />
                              {index === (monthlyUpdate.withdrawalEntries || [{ amount: '', date: '' }]).length - 1 && (
                                <div className="cashflow-entry-actions">
                                  <button
                                    type="button"
                                    className="cashflow-entry-action-btn"
                                    onClick={() => handleAddMonthlyCashflowEntry('withdrawal')}
                                    aria-label="Add another withdrawal"
                                  >
                                    +
                                  </button>
                                  {(monthlyUpdate.withdrawalEntries || [{ amount: '', date: '' }]).length > 1 && (
                                    <button
                                      type="button"
                                      className="cashflow-entry-action-btn"
                                      onClick={() => handleRemoveMonthlyCashflowEntry('withdrawal', index)}
                                      aria-label="Remove withdrawal entry"
                                    >
                                      -
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="form-row investor-monthly-save-row">
                      <div className="form-group investor-monthly-save-group">
                        <button
                          type="button"
                          onClick={handleAddPerformance}
                          disabled={loadingMonthlyUpdate || !canSaveNewMonthlyUpdate(monthlyUpdate, selectedInvestor)}
                          className="btn-submit btn-submit--investor-monthly-save"
                        >
                          {loadingMonthlyUpdate ? 'Saving...' : 'Save Monthly Update'}
                        </button>
                      </div>
                    </div>

                    {monthlyUpdate.percentageGrowth && selectedInvestor.investmentData && (() => {
                      const currentBalance = getAdminPerformancePreviewStartingBalance(
                        selectedInvestor.investmentData,
                        monthlyUpdate.performanceScope || 'primary'
                      )
                      const percentageGrowth = parseFloat(monthlyUpdate.percentageGrowth) || 0
                      const baseGrowth = currentBalance * (percentageGrowth / 100)
                      const normalizedDepositEntries = (monthlyUpdate.depositEntries || [])
                        .map((entry) => ({ amount: parseFloat(entry?.amount) || 0, date: entry?.date || null }))
                        .filter((entry) => entry.amount > 0 || entry.date)
                      const normalizedWithdrawalEntries = (monthlyUpdate.withdrawalEntries || [])
                        .map((entry) => ({ amount: parseFloat(entry?.amount) || 0, date: entry?.date || null }))
                        .filter((entry) => entry.amount > 0 || entry.date)
                      const depositAmount = normalizedDepositEntries.reduce((sum, entry) => sum + entry.amount, 0)
                      const withdrawalAmount = normalizedWithdrawalEntries.reduce((sum, entry) => sum + entry.amount, 0)

                      const depositGrowth = normalizedDepositEntries.reduce((sum, entry) => (
                        sum + calculateProratedDepositGrowth(
                          entry.amount,
                          percentageGrowth,
                          entry.date,
                          monthlyUpdate.month,
                          monthlyUpdate.year
                        )
                      ), 0)

                      const withdrawalGrowth = normalizedWithdrawalEntries.reduce((sum, entry) => (
                        sum + calculateWithdrawalGrowthLoss(
                          entry.amount,
                          percentageGrowth,
                          entry.date,
                          monthlyUpdate.month,
                          monthlyUpdate.year
                        )
                      ), 0)

                      const finalBalance = currentBalance + baseGrowth + depositAmount + depositGrowth - withdrawalAmount - withdrawalGrowth
                      const netGrowth = baseGrowth + depositGrowth - withdrawalGrowth

                      return (
                        <div className="update-preview">
                          <h5>Update Preview:</h5>
                          <div className="preview-grid">
                            <div className="preview-item">
                              <span>Starting Balance:</span>
                              <span>€{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="preview-item">
                              <span>Base Growth ({monthlyUpdate.percentageGrowth}%):</span>
                              <span>€{baseGrowth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            {depositAmount > 0 && (
                              <>
                                <div className="preview-item">
                                  <span>Deposit:</span>
                                  <span>+€{depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                {depositGrowth > 0 && (
                                  <div className="preview-item">
                                    <span>Deposit Growth:</span>
                                    <span>+€{depositGrowth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                )}
                              </>
                            )}
                            {withdrawalAmount > 0 && (
                              <>
                                <div className="preview-item">
                                  <span>Withdrawal:</span>
                                  <span>-€{withdrawalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                {withdrawalGrowth > 0 && (
                                  <div className="preview-item">
                                    <span>Withdrawal Growth Loss:</span>
                                    <span>-€{withdrawalGrowth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                )}
                              </>
                            )}
                            <div className="preview-item">
                              <span>Net Growth Amount:</span>
                              <span>€{netGrowth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="preview-item preview-total">
                              <span>Final Balance:</span>
                              <span>€{finalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="no-selection">
              <p>Select an investor from the list to view and manage their portfolio</p>
            </div>
          )}
        </div>
      </div>

      {showPartnerManagement && selectedInvestor && isPartnerUser(selectedInvestor) && (
        <div className="partner-management-overlay" onClick={closePartnerManagement}>
          <div className="partner-management-modal" onClick={(e) => e.stopPropagation()}>
            <div className="partner-management-header">
              <div>
                <h3>Partner Management</h3>
                <p>{selectedInvestor.displayName || selectedInvestor.email}</p>
              </div>
              <button type="button" className="partner-management-close" onClick={closePartnerManagement} aria-label="Close">
                ×
              </button>
            </div>

            <div className="partner-management-body">
              <div className="partner-management-pie-section">
                <div
                  className="partner-management-donut-wrap"
                  onMouseLeave={() => setPartnerModalDonutHoverSlice(null)}
                >
                  <svg viewBox="0 0 180 180" className="partner-management-donut" aria-label="Partner fund allocation">
                    {partnerModalDonut?.slices?.length > 0 ? (
                      partnerModalDonut.slices.map((slice) => (
                        <path
                          key={slice.id}
                          d={slice.path}
                          fill={slice.color}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className={`partner-management-donut-slice partner-management-donut-slice--${slice.id}${
                            partnerModalDonutHoverSlice && partnerModalDonutHoverSlice !== slice.id
                              ? ' is-dimmed'
                              : ''
                          }${partnerModalDonutHoverSlice === slice.id ? ' is-active' : ''}`}
                          onMouseEnter={() => setPartnerModalDonutHoverSlice(slice.id)}
                        />
                      ))
                    ) : (
                      <circle cx="90" cy="90" r="78" fill="none" stroke="#e5e7eb" strokeWidth="22" />
                    )}
                  </svg>
                  <div className="partner-management-donut-center">
                    {partnerModalDonutHoverSlice && partnerModalDonut && (() => {
                      const hoveredSlice = partnerModalDonut.slices.find((s) => s.id === partnerModalDonutHoverSlice)
                      if (!hoveredSlice) return null
                      return (
                        <span className="partner-management-donut-slice-label">{hoveredSlice.label}</span>
                      )
                    })()}
                    {!partnerModalDonutHoverSlice && (
                      <span className="partner-management-donut-slice-label">Total investor funds</span>
                    )}
                    <strong className="partner-management-donut-amount">
                      {formatEuroWhole(
                        partnerModalDonutHoverSlice && partnerModalDonut
                          ? partnerModalDonut.slices.find((s) => s.id === partnerModalDonutHoverSlice)?.balance
                          : partnerModalDonut?.totalInvestorAccounts
                      )}
                    </strong>
                  </div>
                </div>

                {partnerMonthFinancials && (
                  <div className="partner-management-month-tabs" aria-label="Current month financials">
                    <div className="partner-management-month-tabs-row" role="tablist">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={partnerModalMonthTab === 'gains'}
                        className={`partner-management-month-tab${partnerModalMonthTab === 'gains' ? ' active' : ''}`}
                        onClick={() => togglePartnerModalMonthTab('gains')}
                      >
                        <span>Gains</span>
                        <strong className={partnerMonthFinancials.partnerGains >= 0 ? 'positive' : 'negative'}>
                          {formatEuro(partnerMonthFinancials.partnerGains)}
                        </strong>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={partnerModalMonthTab === 'payouts'}
                        className={`partner-management-month-tab${partnerModalMonthTab === 'payouts' ? ' active' : ''}`}
                        onClick={() => togglePartnerModalMonthTab('payouts')}
                      >
                        <span>Payouts</span>
                        <strong className="negative">{formatEuro(partnerMonthFinancials.partnerPayouts)}</strong>
                      </button>
                    </div>
                    <div className="partner-management-month-bottom-row">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={partnerModalMonthTab === 'net'}
                        className={`partner-management-month-tab partner-management-month-tab-net${partnerModalMonthTab === 'net' ? ' active' : ''}`}
                        onClick={() => togglePartnerModalMonthTab('net')}
                      >
                        <span>Net profit</span>
                        <strong className={partnerMonthFinancials.partnerNet >= 0 ? 'positive' : 'negative'}>
                          {formatEuro(partnerMonthFinancials.partnerNet)}
                        </strong>
                        <small>{currentCalendarMonth} {currentCalendarYear}</small>
                      </button>
                      <button
                        type="button"
                        className={`partner-management-history-btn${showPartnerHistoryPanel ? ' active' : ''}`}
                        onClick={openPartnerHistoryPanel}
                      >
                        History
                      </button>
                    </div>
                  </div>
                )}
                {loadingPartnerModalData && (
                  <p className="partner-management-loading-note">Loading current month trades…</p>
                )}
              </div>

              <div className="partner-management-list-section">
                {showPartnerHistoryPanel ? (
                  <>
                    <p className="partner-management-list-label">Monthly history</p>
                    <div className="partner-management-detail-list partner-management-history-list">
                      {loadingPartnerHistory ? (
                        <p className="partner-management-empty">Loading history…</p>
                      ) : partnerHistorySummaries.length === 0 ? (
                        <p className="partner-management-empty">No monthly history available.</p>
                      ) : (
                        partnerHistorySummaries.map((summary) => (
                          <div key={summary.key} className="partner-management-history-row">
                            <div className="partner-management-history-row-main">
                              <span className="partner-management-history-month">
                                {summary.monthName} {summary.year}
                              </span>
                              <div className="partner-management-history-stats">
                                <span className="positive">{formatEuro(summary.financials.partnerGains)}</span>
                                <span className="negative">{formatEuro(summary.financials.partnerPayouts)}</span>
                                <strong className={summary.financials.partnerNet >= 0 ? 'positive' : 'negative'}>
                                  {formatEuro(summary.financials.partnerNet)}
                                </strong>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="partner-management-history-pdf-btn"
                              onClick={() => handleDownloadPartnerMonthPdf(summary)}
                            >
                              Download PDF
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : partnerModalMonthTab === 'gains' ? (
                  <>
                    <p className="partner-management-list-label">
                      {currentCalendarMonth} trades — share % varies by trade date
                    </p>
                    <div className="partner-management-detail-list">
                      {partnerMonthFinancials?.trades?.length > 0 && (
                        <div className="partner-management-detail-header partner-management-detail-header--gains">
                          <span>Trade</span>
                          <span>Firm</span>
                          <span>Share %</span>
                          <span>Partner</span>
                        </div>
                      )}
                      {partnerMonthFinancials?.trades?.length > 0 ? (
                        partnerMonthFinancials.trades.map((trade) => (
                          <div key={trade.id} className="partner-management-detail-row partner-management-detail-row--trade">
                            <span className="partner-management-detail-trade-label">
                              Day {trade.day}
                              {' · '}
                              <span className={`partner-management-detail-type partner-management-detail-type--${trade.type}`}>
                                {trade.type === 'loss' ? 'Loss' : 'Win'}
                              </span>
                            </span>
                            <span className="partner-management-detail-amount">{formatEuro(trade.netSigned)}</span>
                            <span className="partner-management-detail-pct">{(trade.gainSharePct ?? 0).toFixed(1)}%</span>
                            <span className="partner-management-detail-share">{formatEuro(trade.partnerShare)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="partner-management-empty">No trades logged for this month yet.</p>
                      )}
                    </div>
                  </>
                ) : partnerModalMonthTab === 'payouts' ? (
                  <>
                    <p className="partner-management-list-label">
                      {currentCalendarMonth} investor payouts — partner share ({partnerMonthFinancials?.partnerPayoutSharePct.toFixed(1)}%)
                    </p>
                    <div className="partner-management-detail-list">
                      {partnerMonthFinancials?.payoutEntries?.length > 0 ? (
                        partnerMonthFinancials.payoutEntries.map((entry) => (
                          <div key={entry.id} className="partner-management-payout-entry">
                            <div className="partner-management-detail-row partner-management-detail-row--payout">
                              <span className="partner-management-detail-name">{entry.name}</span>
                              <span className="partner-management-detail-amount">{formatEuro(entry.amount)}</span>
                            </div>
                            {entry.trancheBreakdown?.length > 1 && (
                              <div className="partner-management-tranche-breakdown">
                                {entry.trancheBreakdown.map((row) => (
                                  <div key={row.tranche} className="partner-management-tranche-line">
                                    <span>{row.label}</span>
                                    <span>{formatEuro(row.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="partner-management-empty">No investor payouts recorded for this month.</p>
                      )}
                      {partnerMonthFinancials && partnerMonthFinancials.payoutEntries.length > 0 && (
                        <div className="partner-management-detail-total">
                          <span className="partner-management-payout-share-label">Partner payout share</span>
                          <strong className="negative">{formatEuro(partnerMonthFinancials.partnerPayouts)}</strong>
                        </div>
                      )}
                    </div>
                  </>
                ) : partnerModalMonthTab === 'net' ? (
                  <>
                    <p className="partner-management-list-label">
                      {currentCalendarMonth} net profit breakdown
                    </p>
                    <div className="partner-management-detail-list">
                      <div className="partner-management-detail-row partner-management-detail-row-summary">
                        <span>Partner gains (weighted avg {partnerMonthFinancials?.partnerGainSharePct.toFixed(1)}%)</span>
                        <span className="positive">{formatEuro(partnerMonthFinancials?.partnerGains)}</span>
                      </div>
                      <div className="partner-management-detail-row partner-management-detail-row-summary">
                        <span>Partner payouts ({partnerMonthFinancials?.partnerPayoutSharePct.toFixed(1)}%)</span>
                        <span className="negative">{formatEuro(partnerMonthFinancials?.partnerPayouts)}</span>
                      </div>
                      <div className="partner-management-detail-total">
                        <span>Net profit</span>
                        <strong className={partnerMonthFinancials?.partnerNet >= 0 ? 'positive' : 'negative'}>
                          {formatEuro(partnerMonthFinancials?.partnerNet)}
                        </strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="partner-management-list-label">Select investors under this partner&apos;s management</p>
                    <div className="partner-management-investor-list">
                      {assignableInvestors.length === 0 ? (
                        <p className="partner-management-empty">No assignable investors.</p>
                      ) : (
                        assignableInvestors.map((inv, index) => {
                          const dotColor = PIE_SLICE_COLORS[index % PIE_SLICE_COLORS.length]
                          const balance = getInvestorDisplayBalance(inv)
                          const checked = partnerManagedIds.includes(inv.id)
                          const sharePct =
                            partnerModalDonut?.totalInvestorAccounts > 0
                              ? (balance / partnerModalDonut.totalInvestorAccounts) * 100
                              : 0
                          return (
                            <label key={inv.id} className={`partner-management-investor-row${checked ? ' selected' : ''}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePartnerManagedInvestor(inv.id)}
                                disabled={!canManagePartners}
                              />
                              <span className="partner-management-dot" style={{ backgroundColor: dotColor }} />
                              <span className="partner-management-investor-name">{inv.displayName || inv.email}</span>
                              <span className="partner-management-investor-balance">
                                {formatEuro(balance)}
                              </span>
                              <span className="partner-management-investor-share">{sharePct.toFixed(1)}%</span>
                            </label>
                          )
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="partner-management-footer">
              <button type="button" className="btn-secondary" onClick={closePartnerManagement}>
                Cancel
              </button>
              {canManagePartners && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSavePartnerManagement}
                  disabled={loadingPartnerManagement}
                >
                  {loadingPartnerManagement ? 'Saving...' : 'Save Management'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminInvestorsManagement

