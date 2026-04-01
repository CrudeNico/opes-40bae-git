import React, { useState, useEffect, useRef } from 'react'
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore'
import './Portfolio.css'

/** Combined initial, weighted monthly return rate, and total planned monthly additions when a secondary tranche exists. */
function getInvestorProjectionInputs(investmentData) {
  const primaryInitial = investmentData.initialInvestment || 0
  const primaryRate =
    investmentData.monthlyReturnRate ??
    (investmentData.riskTolerance === 'conservative' ? 0.02 : 0.04)
  const sec = investmentData.secondaryInvestment
  if (!sec) {
    return {
      totalInitial: primaryInitial,
      monthlyReturnRate: primaryRate,
      monthlyAdditions: investmentData.monthlyAdditions || 0
    }
  }
  const secInitial = sec.initialInvestment || 0
  const secRate = sec.monthlyReturnRate ?? 0.04
  const total = primaryInitial + secInitial
  const weightedRate =
    total > 0 ? (primaryInitial * primaryRate + secInitial * secRate) / total : primaryRate
  return {
    totalInitial: total,
    monthlyReturnRate: weightedRate,
    monthlyAdditions:
      (investmentData.monthlyAdditions || 0) + (sec.monthlyAdditions || 0)
  }
}

const TRANCHE_PRIMARY = 'primary'
const TRANCHE_SECONDARY = 'secondary'

function sortMonthlyHistoryStatic(history) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return [...(history || [])].sort((a, b) => {
    if (a.year !== b.year) return parseInt(a.year, 10) - parseInt(b.year, 10)
    return monthNames.indexOf(a.month) - monthNames.indexOf(b.month)
  })
}

/** Total view: legacy untagged rows, or merged primary+secondary by month when only tagged rows exist */
function getTotalMergedHistory(fullHistory, primaryInitial, secondaryInitial) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const sorted = sortMonthlyHistoryStatic(fullHistory)
  const untagged = sorted.filter((r) => !r.tranche)
  if (untagged.length > 0) return untagged

  const primary = sorted.filter((r) => r.tranche === TRANCHE_PRIMARY)
  const secondary = sorted.filter((r) => r.tranche === TRANCHE_SECONDARY)
  if (primary.length === 0 && secondary.length === 0) return sorted

  const keys = new Set()
  primary.forEach((r) => keys.add(`${r.month}|${r.year}`))
  secondary.forEach((r) => keys.add(`${r.month}|${r.year}`))
  const sortedKeys = [...keys].sort((ka, kb) => {
    const [ma, ya] = ka.split('|')
    const [mb, yb] = kb.split('|')
    if (parseInt(ya, 10) !== parseInt(yb, 10)) return parseInt(ya, 10) - parseInt(yb, 10)
    return monthNames.indexOf(ma) - monthNames.indexOf(mb)
  })

  let lastP = primaryInitial
  let lastS = secondaryInitial
  const combined = []
  for (const key of sortedKeys) {
    const [m, y] = key.split('|')
    const pr = primary.find((r) => r.month === m && String(r.year) === String(y))
    const sr = secondary.find((r) => r.month === m && String(r.year) === String(y))
    if (pr) lastP = pr.endingBalance
    if (sr) lastS = sr.endingBalance
    combined.push({
      month: m,
      year: y,
      growthAmount: (pr?.growthAmount || 0) + (sr?.growthAmount || 0),
      percentageGrowth: (pr?.percentageGrowth || 0) + (sr?.percentageGrowth || 0),
      endingBalance: lastP + lastS,
      depositAmount: (pr?.depositAmount || 0) + (sr?.depositAmount || 0),
      withdrawalAmount: (pr?.withdrawalAmount || 0) + (sr?.withdrawalAmount || 0),
      isCombinedMerge: true
    })
  }
  return combined
}

function buildGraphProjectionData({
  monthlyHistory,
  initialBalance,
  currentBalance,
  monthlyReturnRate,
  monthlyAdditions
}) {
  const data = []
  const sortedHistory = sortMonthlyHistoryStatic(monthlyHistory)

  const getMonthNumber = (monthName) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return monthNames.indexOf(monthName) + 1
  }

  const formatLabel = (month, year) => {
    const monthNum = typeof month === 'string' ? getMonthNumber(month) : month
    const yearStr = year.toString()
    const yearShort = yearStr.length >= 2 ? yearStr.slice(-2) : yearStr
    return `${monthNum}/${yearShort}`
  }

  if (sortedHistory.length > 0) {
    data.push({
      month: -sortedHistory.length,
      balance: initialBalance,
      label: 'Start',
      isHistorical: true
    })
    sortedHistory.forEach((record, index) => {
      data.push({
        month: index - sortedHistory.length + 1,
        balance: record.endingBalance,
        label: formatLabel(record.month, record.year),
        isHistorical: true
      })
    })
  } else {
    data.push({
      month: 0,
      balance: currentBalance,
      label: 'Now',
      isHistorical: false
    })
  }

  let projectionStartingBalance = currentBalance
  let lastMonthRecord = null
  if (sortedHistory.length > 0) {
    lastMonthRecord = sortedHistory[sortedHistory.length - 1]
    projectionStartingBalance = lastMonthRecord.endingBalance || currentBalance
  }

  let projectedBalance = projectionStartingBalance
  for (let month = 1; month <= 5; month++) {
    projectedBalance = projectedBalance * (1 + monthlyReturnRate) + monthlyAdditions

    let projectionMonth = 0
    let projectionYear = 0
    if (lastMonthRecord) {
      const lastMonthNum = getMonthNumber(lastMonthRecord.month)
      const lastYear = parseInt(lastMonthRecord.year, 10)
      projectionMonth = lastMonthNum + month
      projectionYear = lastYear
      while (projectionMonth > 12) {
        projectionMonth -= 12
        projectionYear += 1
      }
    } else {
      const now = new Date()
      projectionMonth = now.getMonth() + 1 + month
      projectionYear = now.getFullYear()
      while (projectionMonth > 12) {
        projectionMonth -= 12
        projectionYear += 1
      }
    }

    data.push({
      month: sortedHistory.length + month,
      balance: projectedBalance,
      label: formatLabel(projectionMonth, projectionYear),
      isHistorical: false
    })
  }

  return data.sort((a, b) => a.month - b.month)
}

const Portfolio = ({ user, onStatusUpdate }) => {
  const [isInvestor, setIsInvestor] = useState(false)
  const [isTrader, setIsTrader] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState(null) // 'investor' or 'trader'
  const [submitting, setSubmitting] = useState(false)
  const [investmentDataState, setInvestmentDataState] = useState(null)
  const [formData, setFormData] = useState({
    initialInvestment: '',
    startingDate: '',
    country: '',
    phoneNumber: '',
    monthlyAdditions: '0',
    riskTolerance: '',
    includeSecondInvestment: false,
    secondaryInitialInvestment: '',
    secondaryStartingDate: '',
    secondaryMonthlyAdditions: '0'
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [riskDropdownOpen, setRiskDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [showAddPerformance, setShowAddPerformance] = useState(false)
  const [monthlyUpdate, setMonthlyUpdate] = useState({
    month: '',
    year: '',
    percentageGrowth: '',
    depositAmount: '',
    depositDate: '',
    withdrawalAmount: '',
    withdrawalDate: ''
  })
  const [loadingMonthlyUpdate, setLoadingMonthlyUpdate] = useState(false)
  const [editingRecordIndex, setEditingRecordIndex] = useState(null)
  const [editedRecordData, setEditedRecordData] = useState({
    month: '',
    year: '',
    percentageGrowth: '',
    depositAmount: '',
    depositDate: '',
    withdrawalAmount: '',
    withdrawalDate: ''
  })
  const [loadingEdit, setLoadingEdit] = useState(false)
  /** 'total' | 'conservative' | 'moderate' — dual-tranche investors only */
  const [portfolioTrancheView, setPortfolioTrancheView] = useState('total')

  useEffect(() => {
    checkInvestorStatus()
  }, [user])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setRiskDropdownOpen(false)
      }
    }

    if (riskDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [riskDropdownOpen])

  const checkInvestorStatus = async () => {
    try {
      const db = getFirestore()
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        // Check both old format (isAdmin as array) and new format (statuses as array)
        let statuses = userData.statuses || []
        if (statuses.length === 0 && Array.isArray(userData.isAdmin) && userData.isAdmin.length > 0) {
          statuses = userData.isAdmin
        }
        if (statuses.length === 0 && userData.isAdmin === true) {
          statuses = ['Admin']
        }
        
        setIsInvestor(statuses.includes('Investor'))
        setIsTrader(statuses.includes('Trader'))
        // Check if investment is pending
        setIsPending(userData.investmentData && userData.investmentData.status === 'pending')
        
        // Load investment data if user is investor or trader
        if ((statuses.includes('Investor') || statuses.includes('Trader')) && userData.investmentData) {
          setInvestmentDataState(userData.investmentData)
        }
      }
    } catch (error) {
      console.error('Error checking investor status:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load investment data when user becomes investor or trader
  useEffect(() => {
    const loadInvestmentData = async () => {
      if ((isInvestor || isTrader) && user && !investmentDataState) {
        try {
          const db = getFirestore()
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.investmentData) {
              setInvestmentDataState(userData.investmentData)
            }
          }
        } catch (error) {
          console.error('Error loading investment data:', error)
        }
      }
    }
    loadInvestmentData()
  }, [isInvestor, isTrader, user, investmentDataState])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleMonthlyUpdateChange = (e) => {
    const { name, value } = e.target
    setMonthlyUpdate(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Helper function to sort monthly history
  const sortMonthlyHistory = (history) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December']
    return [...history].sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year
      }
      const monthA = monthNames.indexOf(a.month)
      const monthB = monthNames.indexOf(b.month)
      return monthA - monthB
    })
  }

  const handleAddMonthlyPerformance = async (e) => {
    e.preventDefault()
    
    if (!isTrader || !investmentDataState) {
      setError('You do not have permission to add monthly performance.')
      return
    }

    setLoadingMonthlyUpdate(true)
    setError('')
    setSuccess('')

    try {
      const db = getFirestore()
      const userDocRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) {
        setError('User document not found')
        return
      }

      const userData = userDoc.data()
      const currentInvestmentData = userData.investmentData || {}
      const currentBalance = currentInvestmentData.currentBalance || currentInvestmentData.initialInvestment || 0
      const totalDeposits = currentInvestmentData.totalDeposits || currentInvestmentData.initialInvestment || 0
      const totalWithdrawals = currentInvestmentData.totalWithdrawals || 0

      // Helper function to get days in a month
      const getDaysInMonth = (month, year) => {
        const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month)
        return new Date(year, monthIndex + 1, 0).getDate()
      }

      // Helper function to calculate prorated growth
      const calculateProratedGrowth = (amount, percentageGrowth, date, month, year) => {
        if (!date || !month || !year || amount === 0) return 0
        
        const depositDate = new Date(date)
        const dayOfMonth = depositDate.getDate()
        const daysInMonth = getDaysInMonth(month, parseInt(year))
        
        let daysRemaining = daysInMonth - dayOfMonth + 1
        if (dayOfMonth === daysInMonth) {
          daysRemaining = 0
        }
        
        const proratedRatio = daysRemaining / daysInMonth
        return amount * (percentageGrowth / 100) * proratedRatio
      }

      const calculateWithdrawalGrowthLoss = (amount, percentageGrowth, date, month, year) => {
        if (!date || !month || !year || amount === 0) return 0
        
        const withdrawalDate = new Date(date)
        const dayOfMonth = withdrawalDate.getDate()
        const daysInMonth = getDaysInMonth(month, parseInt(year))
        
        const daysRemaining = daysInMonth - dayOfMonth
        const proratedRatio = daysRemaining / daysInMonth
        return amount * (percentageGrowth / 100) * proratedRatio
      }

      // Calculate new balance based on percentage growth
      const percentageGrowth = parseFloat(monthlyUpdate.percentageGrowth) || 0
      const growthAmount = currentBalance * (percentageGrowth / 100)
      let newBalance = currentBalance + growthAmount

      // Add deposit if provided
      const depositAmount = parseFloat(monthlyUpdate.depositAmount) || 0
      const newTotalDeposits = totalDeposits + depositAmount
      
      const depositGrowth = calculateProratedGrowth(
        depositAmount, 
        percentageGrowth, 
        monthlyUpdate.depositDate, 
        monthlyUpdate.month, 
        monthlyUpdate.year
      )
      
      newBalance += depositAmount + depositGrowth

      // Subtract withdrawal if provided
      const withdrawalAmount = parseFloat(monthlyUpdate.withdrawalAmount) || 0
      const newTotalWithdrawals = totalWithdrawals + withdrawalAmount
      
      const withdrawalGrowth = calculateWithdrawalGrowthLoss(
        withdrawalAmount, 
        percentageGrowth, 
        monthlyUpdate.withdrawalDate, 
        monthlyUpdate.month, 
        monthlyUpdate.year
      )
      
      newBalance -= withdrawalAmount + withdrawalGrowth

      // Create monthly record
      const monthlyRecord = {
        month: monthlyUpdate.month,
        year: monthlyUpdate.year,
        percentageGrowth: percentageGrowth,
        growthAmount: growthAmount,
        depositGrowth: depositGrowth,
        withdrawalGrowth: withdrawalGrowth,
        startingBalance: currentBalance,
        endingBalance: newBalance,
        depositAmount: depositAmount,
        depositDate: monthlyUpdate.depositDate || null,
        withdrawalAmount: withdrawalAmount,
        withdrawalDate: monthlyUpdate.withdrawalDate || null,
        updatedAt: new Date().toISOString()
      }

      // Get existing monthly history
      const existingHistory = currentInvestmentData.monthlyHistory || []
      const updatedHistory = [...existingHistory, monthlyRecord]
      
      // Sort the history chronologically
      const sortedHistory = sortMonthlyHistory(updatedHistory)

      // Recalculate all balances from the beginning
      let runningBalance = currentInvestmentData.initialInvestment || 0
      const recalculatedHistory = sortedHistory.map((record, index) => {
        if (index === 0) {
          runningBalance = record.startingBalance
        } else {
          runningBalance = sortedHistory[index - 1].endingBalance
        }
        
        const recalculatedGrowth = runningBalance * (record.percentageGrowth / 100)
        const recalculatedDepositGrowth = calculateProratedGrowth(
          record.depositAmount || 0,
          record.percentageGrowth,
          record.depositDate,
          record.month,
          record.year
        )
        const recalculatedWithdrawalGrowth = calculateWithdrawalGrowthLoss(
          record.withdrawalAmount || 0,
          record.percentageGrowth,
          record.withdrawalDate,
          record.month,
          record.year
        )
        
        runningBalance = runningBalance + recalculatedGrowth + (record.depositAmount || 0) + recalculatedDepositGrowth - (record.withdrawalAmount || 0) - recalculatedWithdrawalGrowth
        
        return {
          ...record,
          startingBalance: runningBalance - recalculatedGrowth - (record.depositAmount || 0) - recalculatedDepositGrowth + (record.withdrawalAmount || 0) + recalculatedWithdrawalGrowth,
          growthAmount: recalculatedGrowth,
          depositGrowth: recalculatedDepositGrowth,
          withdrawalGrowth: recalculatedWithdrawalGrowth,
          endingBalance: runningBalance
        }
      })

      // Update investment data
      const updatedInvestmentData = {
        ...currentInvestmentData,
        monthlyHistory: recalculatedHistory,
        currentBalance: recalculatedHistory.length > 0 ? recalculatedHistory[recalculatedHistory.length - 1].endingBalance : newBalance,
        totalDeposits: newTotalDeposits,
        totalWithdrawals: newTotalWithdrawals,
        updatedAt: new Date().toISOString()
      }

      // Update user document
      await updateDoc(userDocRef, {
        investmentData: updatedInvestmentData
      })

      // Reload investment data
      setInvestmentDataState(updatedInvestmentData)
      setSuccess('Monthly performance added successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('')
      }, 3000)
      
      // Reset form
      setMonthlyUpdate({
        month: '',
        year: '',
        percentageGrowth: '',
        depositAmount: '',
        depositDate: '',
        withdrawalAmount: '',
        withdrawalDate: ''
      })
      setShowAddPerformance(false)
    } catch (error) {
      console.error('Error adding monthly performance:', error)
      setError('Failed to add monthly performance. Please try again.')
    } finally {
      setLoadingMonthlyUpdate(false)
    }
  }

  const handleRecordClick = (record, index) => {
    if (!isTrader) return
    
    // Find the original index in the sorted history
    const sortedHistory = sortMonthlyHistory(investmentDataState.monthlyHistory || [])
    const originalIndex = investmentDataState.monthlyHistory.findIndex(r => 
      r.month === record.month && r.year === record.year
    )
    
    setEditingRecordIndex(originalIndex >= 0 ? originalIndex : index)
    setEditedRecordData({
      month: record.month || '',
      year: record.year ? record.year.toString() : '',
      percentageGrowth: record.percentageGrowth ? record.percentageGrowth.toString() : '',
      depositAmount: record.depositAmount ? record.depositAmount.toString() : '',
      depositDate: record.depositDate || '',
      withdrawalAmount: record.withdrawalAmount ? record.withdrawalAmount.toString() : '',
      withdrawalDate: record.withdrawalDate || ''
    })
    setShowAddPerformance(false)
    setError('')
    setSuccess('')
  }

  const handleDeleteRecord = async (record, index) => {
    if (!isTrader || !investmentDataState) {
      setError('You do not have permission to delete monthly performance.')
      return
    }

    try {
      const db = getFirestore()
      const userDocRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        setError('User document not found')
        return
      }

      const userData = userDoc.data()
      const currentInvestmentData = userData.investmentData || {}
      const existingHistory = sortMonthlyHistory(currentInvestmentData.monthlyHistory || [])

      // Find the record to delete by month/year
      const recordIndex = existingHistory.findIndex(r =>
        r.month === record.month && r.year === record.year
      )

      if (recordIndex === -1) {
        setError('Could not find the record to delete.')
        return
      }

      const historyWithoutRecord = [
        ...existingHistory.slice(0, recordIndex),
        ...existingHistory.slice(recordIndex + 1)
      ]

      // Recalculate balances after deletion
      const getDaysInMonth = (month, year) => {
        const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month)
        return new Date(year, monthIndex + 1, 0).getDate()
      }

      const calculateProratedGrowth = (amount, percentageGrowth, date, month, year) => {
        if (!date || !month || !year || amount === 0) return 0
        const depositDate = new Date(date)
        const dayOfMonth = depositDate.getDate()
        const daysInMonth = getDaysInMonth(month, parseInt(year))
        let daysRemaining = daysInMonth - dayOfMonth + 1
        if (dayOfMonth === daysInMonth) {
          daysRemaining = 0
        }
        const proratedRatio = daysRemaining / daysInMonth
        return amount * (percentageGrowth / 100) * proratedRatio
      }

      const calculateWithdrawalGrowthLoss = (amount, percentageGrowth, date, month, year) => {
        if (!date || !month || !year || amount === 0) return 0
        const withdrawalDate = new Date(date)
        const dayOfMonth = withdrawalDate.getDate()
        const daysInMonth = getDaysInMonth(month, parseInt(year))
        const daysRemaining = daysInMonth - dayOfMonth
        const proratedRatio = daysRemaining / daysInMonth
        return amount * (percentageGrowth / 100) * proratedRatio
      }

      const sortedHistory = sortMonthlyHistory(historyWithoutRecord)
      let runningBalance = currentInvestmentData.initialInvestment || 0

      const recalculatedHistory = sortedHistory.map((rec, idx) => {
        if (idx === 0) {
          runningBalance = rec.startingBalance || runningBalance
        } else {
          runningBalance = sortedHistory[idx - 1].endingBalance
        }

        const recalculatedGrowth = runningBalance * (rec.percentageGrowth / 100)
        const recalculatedDepositGrowth = calculateProratedGrowth(
          rec.depositAmount || 0,
          rec.percentageGrowth,
          rec.depositDate,
          rec.month,
          rec.year
        )
        const recalculatedWithdrawalGrowth = calculateWithdrawalGrowthLoss(
          rec.withdrawalAmount || 0,
          rec.percentageGrowth,
          rec.withdrawalDate,
          rec.month,
          rec.year
        )

        runningBalance =
          runningBalance +
          recalculatedGrowth +
          (rec.depositAmount || 0) +
          recalculatedDepositGrowth -
          (rec.withdrawalAmount || 0) -
          recalculatedWithdrawalGrowth

        return {
          ...rec,
          startingBalance:
            runningBalance -
            recalculatedGrowth -
            (rec.depositAmount || 0) -
            recalculatedDepositGrowth +
            (rec.withdrawalAmount || 0) +
            recalculatedWithdrawalGrowth,
          growthAmount: recalculatedGrowth,
          depositGrowth: recalculatedDepositGrowth,
          withdrawalGrowth: recalculatedWithdrawalGrowth,
          endingBalance: runningBalance
        }
      }
      )

      const totalDeposits =
        (currentInvestmentData.initialInvestment || 0) +
        recalculatedHistory.reduce((sum, r) => sum + (r.depositAmount || 0), 0)
      const totalWithdrawals =
        recalculatedHistory.reduce((sum, r) => sum + (r.withdrawalAmount || 0), 0)

      const updatedInvestmentData = {
        ...currentInvestmentData,
        monthlyHistory: recalculatedHistory,
        currentBalance:
          recalculatedHistory.length > 0
            ? recalculatedHistory[recalculatedHistory.length - 1].endingBalance
            : currentInvestmentData.initialInvestment || 0,
        totalDeposits,
        totalWithdrawals,
        updatedAt: new Date().toISOString()
      }

      await updateDoc(userDocRef, {
        investmentData: updatedInvestmentData
      })

      setInvestmentDataState(updatedInvestmentData)
      setEditingRecordIndex(null)
      setEditedRecordData({
        month: '',
        year: '',
        percentageGrowth: '',
        depositAmount: '',
        depositDate: '',
        withdrawalAmount: '',
        withdrawalDate: ''
      })
      setSuccess('Monthly performance record deleted successfully.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error deleting monthly performance record:', error)
      setError('Failed to delete monthly performance record. Please try again.')
    }
  }

  const handleUpdateRecord = async (e) => {
    e.preventDefault()
    
    if (!isTrader || editingRecordIndex === null || !investmentDataState) {
      setError('You do not have permission to edit monthly performance.')
      return
    }

    setLoadingEdit(true)
    setError('')
    setSuccess('')

    try {
      const db = getFirestore()
      const userDocRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) {
        setError('User document not found')
        return
      }

      const userData = userDoc.data()
      const currentInvestmentData = userData.investmentData || {}
      const existingHistory = sortMonthlyHistory(currentInvestmentData.monthlyHistory || [])

      // Helper functions
      const getDaysInMonth = (month, year) => {
        const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month)
        return new Date(year, monthIndex + 1, 0).getDate()
      }

      const calculateProratedGrowth = (amount, percentageGrowth, date, month, year) => {
        if (!date || !month || !year || amount === 0) return 0
        const depositDate = new Date(date)
        const dayOfMonth = depositDate.getDate()
        const daysInMonth = getDaysInMonth(month, parseInt(year))
        let daysRemaining = daysInMonth - dayOfMonth + 1
        if (dayOfMonth === daysInMonth) {
          daysRemaining = 0
        }
        const proratedRatio = daysRemaining / daysInMonth
        return amount * (percentageGrowth / 100) * proratedRatio
      }

      const calculateWithdrawalGrowthLoss = (amount, percentageGrowth, date, month, year) => {
        if (!date || !month || !year || amount === 0) return 0
        const withdrawalDate = new Date(date)
        const dayOfMonth = withdrawalDate.getDate()
        const daysInMonth = getDaysInMonth(month, parseInt(year))
        const daysRemaining = daysInMonth - dayOfMonth
        const proratedRatio = daysRemaining / daysInMonth
        return amount * (percentageGrowth / 100) * proratedRatio
      }

      // Get the starting balance for the record being edited
      let startingBalance = currentInvestmentData.initialInvestment || 0
      if (editingRecordIndex > 0) {
        startingBalance = existingHistory[editingRecordIndex - 1].endingBalance || startingBalance
      }

      // Calculate new values for the edited record
      const percentageGrowth = parseFloat(editedRecordData.percentageGrowth) || 0
      const growthAmount = startingBalance * (percentageGrowth / 100)
      const depositAmount = parseFloat(editedRecordData.depositAmount) || 0
      const withdrawalAmount = parseFloat(editedRecordData.withdrawalAmount) || 0
      
      const depositGrowth = calculateProratedGrowth(
        depositAmount, 
        percentageGrowth, 
        editedRecordData.depositDate, 
        editedRecordData.month, 
        editedRecordData.year
      )
      
      const withdrawalGrowth = calculateWithdrawalGrowthLoss(
        withdrawalAmount, 
        percentageGrowth, 
        editedRecordData.withdrawalDate, 
        editedRecordData.month, 
        editedRecordData.year
      )

      const endingBalance = startingBalance + growthAmount + depositAmount + depositGrowth - withdrawalAmount - withdrawalGrowth

      // Update the record at the editing index
      const updatedRecord = {
        month: editedRecordData.month,
        year: editedRecordData.year,
        percentageGrowth: percentageGrowth,
        growthAmount: growthAmount,
        depositGrowth: depositGrowth,
        withdrawalGrowth: withdrawalGrowth,
        startingBalance: startingBalance,
        endingBalance: endingBalance,
        depositAmount: depositAmount,
        depositDate: editedRecordData.depositDate || null,
        withdrawalAmount: withdrawalAmount,
        withdrawalDate: editedRecordData.withdrawalDate || null,
        updatedAt: new Date().toISOString()
      }

      // Update the record at the editing index
      existingHistory[editingRecordIndex] = updatedRecord

      // Sort the history chronologically (in case month/year was changed)
      const sortedHistory = sortMonthlyHistory(existingHistory)

      // Recalculate ALL records in chronological order from the beginning
      let runningBalance = currentInvestmentData.initialInvestment || 0
      const recalculatedHistory = sortedHistory.map((record, index) => {
        if (index === 0) {
          runningBalance = currentInvestmentData.initialInvestment || 0
        } else {
          runningBalance = sortedHistory[index - 1].endingBalance
        }
        
        const recalculatedGrowth = runningBalance * (record.percentageGrowth / 100)
        const recalculatedDepositGrowth = calculateProratedGrowth(
          record.depositAmount || 0,
          record.percentageGrowth,
          record.depositDate,
          record.month,
          record.year
        )
        const recalculatedWithdrawalGrowth = calculateWithdrawalGrowthLoss(
          record.withdrawalAmount || 0,
          record.percentageGrowth,
          record.withdrawalDate,
          record.month,
          record.year
        )
        
        runningBalance = runningBalance + recalculatedGrowth + (record.depositAmount || 0) + recalculatedDepositGrowth - (record.withdrawalAmount || 0) - recalculatedWithdrawalGrowth
        
        return {
          ...record,
          startingBalance: runningBalance - recalculatedGrowth - (record.depositAmount || 0) - recalculatedDepositGrowth + (record.withdrawalAmount || 0) + recalculatedWithdrawalGrowth,
          growthAmount: recalculatedGrowth,
          depositGrowth: recalculatedDepositGrowth,
          withdrawalGrowth: recalculatedWithdrawalGrowth,
          endingBalance: runningBalance
        }
      })

      // Recalculate total deposits and withdrawals
      const totalDeposits = (currentInvestmentData.initialInvestment || 0) + 
        recalculatedHistory.reduce((sum, r) => sum + (r.depositAmount || 0), 0)
      const totalWithdrawals = recalculatedHistory.reduce((sum, r) => sum + (r.withdrawalAmount || 0), 0)

      // Update investment data
      const updatedInvestmentData = {
        ...currentInvestmentData,
        monthlyHistory: recalculatedHistory,
        currentBalance: recalculatedHistory.length > 0 ? recalculatedHistory[recalculatedHistory.length - 1].endingBalance : runningBalance,
        totalDeposits: totalDeposits,
        totalWithdrawals: totalWithdrawals,
        updatedAt: new Date().toISOString()
      }

      // Update user document
      await updateDoc(userDocRef, {
        investmentData: updatedInvestmentData
      })

      // Reload investment data
      setInvestmentDataState(updatedInvestmentData)
      setSuccess('Monthly record updated successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('')
      }, 3000)
      
      // Reset edit state
      setEditingRecordIndex(null)
      setEditedRecordData({
        month: '',
        year: '',
        percentageGrowth: '',
        depositAmount: '',
        depositDate: '',
        withdrawalAmount: '',
        withdrawalDate: ''
      })
    } catch (error) {
      console.error('Error updating monthly record:', error)
      setError('Failed to update monthly record. Please try again.')
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    // Validation
    if (!formMode) {
      setError('Please select an account type to initiate.')
      setSubmitting(false)
      return
    }

    if (!formData.initialInvestment || !formData.startingDate || !formData.country || !formData.phoneNumber) {
      setError('Please fill in all required fields.')
      setSubmitting(false)
      return
    }

    // For investor mode, risk tolerance is required; for trader mode it is not used
    if (formMode === 'investor' && !formData.riskTolerance) {
      setError('Please select your risk tolerance.')
      setSubmitting(false)
      return
    }

    if (formMode === 'investor' && formData.includeSecondInvestment && formData.riskTolerance !== 'conservative') {
      setError('When adding a second investment, the first tranche must be Conservative (2% per month).')
      setSubmitting(false)
      return
    }

    if (isNaN(formData.initialInvestment) || parseFloat(formData.initialInvestment) <= 0) {
      setError('Please enter a valid investment amount.')
      setSubmitting(false)
      return
    }

    const monthlyAdditions = parseFloat(formData.monthlyAdditions)
    if (isNaN(monthlyAdditions) || monthlyAdditions < 0 || monthlyAdditions > 20000) {
      setError('Monthly additions must be between 0 and 20,000.')
      setSubmitting(false)
      return
    }

    if (formMode === 'investor' && formData.includeSecondInvestment) {
      if (!formData.secondaryInitialInvestment || !formData.secondaryStartingDate) {
        setError('Please complete all fields for the second investment.')
        setSubmitting(false)
        return
      }
      if (isNaN(formData.secondaryInitialInvestment) || parseFloat(formData.secondaryInitialInvestment) <= 0) {
        setError('Please enter a valid amount for the second investment.')
        setSubmitting(false)
        return
      }
      const secMonthly = parseFloat(formData.secondaryMonthlyAdditions)
      if (isNaN(secMonthly) || secMonthly < 0 || secMonthly > 20000) {
        setError('Second investment monthly additions must be between 0 and 20,000.')
        setSubmitting(false)
        return
      }
    }

    try {
      const db = getFirestore()
      const userDocRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userDocRef)
      
      const primaryRisk =
        formMode === 'investor' && formData.includeSecondInvestment
          ? 'conservative'
          : formData.riskTolerance

      // Calculate monthly return rate based on risk tolerance (Investor only)
      const monthlyReturnRate =
        formMode === 'investor'
          ? primaryRisk === 'conservative'
            ? 0.02
            : 0.04
          : 0

      // Update user document with investment data (status: pending)
      const baseInvestmentData = {
        initialInvestment: parseFloat(formData.initialInvestment),
        startingDate: formData.startingDate,
        country: formData.country,
        phoneNumber: formData.phoneNumber,
        monthlyAdditions: parseFloat(formData.monthlyAdditions),
        status: 'pending',
        initiatedAt: new Date().toISOString(),
        accountType: formMode === 'trader' ? 'Trader' : 'Investor'
      }

      const secondaryPayload =
        formMode === 'investor' && formData.includeSecondInvestment
          ? {
              secondaryInvestment: {
                initialInvestment: parseFloat(formData.secondaryInitialInvestment),
                startingDate: formData.secondaryStartingDate,
                monthlyAdditions: parseFloat(formData.secondaryMonthlyAdditions) || 0,
                riskTolerance: 'moderate',
                monthlyReturnRate: 0.04
              }
            }
          : {}

      const investmentDataToSave =
        formMode === 'investor'
          ? {
              ...baseInvestmentData,
              ...secondaryPayload,
              riskTolerance: primaryRisk,
              monthlyReturnRate: monthlyReturnRate
            }
          : {
              ...baseInvestmentData,
              monthlyReturnRate: monthlyReturnRate
            }

      await updateDoc(userDocRef, {
        investmentData: investmentDataToSave,
        updatedAt: new Date().toISOString()
      }, { merge: true })

      setSuccess(
        formMode === 'trader'
          ? 'Your tracking account request has been submitted and is being reviewed.'
          : 'Your investment request has been submitted and is being reviewed.'
      )
      setIsPending(true)
      
      // Notify parent component to update user status
      if (onStatusUpdate) {
        onStatusUpdate()
      }

      // Reset form
      setFormData({
        initialInvestment: '',
        startingDate: '',
        country: '',
        phoneNumber: '',
        monthlyAdditions: '0',
        riskTolerance: '',
        includeSecondInvestment: false,
        secondaryInitialInvestment: '',
        secondaryStartingDate: '',
        secondaryMonthlyAdditions: '0'
      })
      setShowForm(false)
      setFormMode(null)
    } catch (error) {
      console.error('Error initiating investment:', error)
      setError('Failed to initiate investment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="portfolio-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    )
  }

  // User is an investor or trader - show portfolio
  if ((isInvestor || isTrader) && !investmentDataState) {
    return (
      <div className="portfolio-container">
        <div className="portfolio-loading">
          <div className="loading-spinner">Loading portfolio...</div>
        </div>
      </div>
    )
  }

  if ((isInvestor || isTrader) && investmentDataState) {
    // Calculate portfolio data (weighted rate + combined additions when two tranches exist)
    const projectionInputs =
      investmentDataState.accountType === 'Investor'
        ? getInvestorProjectionInputs(investmentDataState)
        : {
            totalInitial: investmentDataState.initialInvestment || 0,
            monthlyReturnRate:
              investmentDataState.monthlyReturnRate ||
              (investmentDataState.riskTolerance === 'conservative' ? 0.02 : 0.04),
            monthlyAdditions: investmentDataState.monthlyAdditions || 0
          }
    const initialInvestment = projectionInputs.totalInitial
    const monthlyReturnRate = projectionInputs.monthlyReturnRate
    const monthlyAdditions = projectionInputs.monthlyAdditions
    const secondaryInv =
      investmentDataState.accountType === 'Investor' && investmentDataState.secondaryInvestment
        ? investmentDataState.secondaryInvestment
        : null
    const startingDate = investmentDataState.startingDate ? new Date(investmentDataState.startingDate) : new Date()
    
    // Get current balance from investment data (will be updated by admin monthly)
    const currentBalance = investmentDataState.currentBalance || initialInvestment
    const totalDeposits = investmentDataState.totalDeposits || initialInvestment
    const totalWithdrawals = investmentDataState.totalWithdrawals || 0
    
    const sortMonthlyHistory = sortMonthlyHistoryStatic

    const primaryInit = investmentDataState.initialInvestment || 0
    const secondaryInit = secondaryInv?.initialInvestment || 0
    const isDualInvestor =
      investmentDataState.accountType === 'Investor' && secondaryInv && !isTrader

    let graphHistory = sortMonthlyHistory(investmentDataState.monthlyHistory || [])
    let viewInitial = initialInvestment
    let viewCurrentBalance = currentBalance
    let viewMonthlyRate = monthlyReturnRate
    let viewMonthlyAdditions = monthlyAdditions
    let viewTotalDeposits = totalDeposits
    let viewTotalWithdrawals = totalWithdrawals

    if (isDualInvestor) {
      const fullH = investmentDataState.monthlyHistory || []
      if (portfolioTrancheView === 'total') {
        graphHistory = getTotalMergedHistory(fullH, primaryInit, secondaryInit)
        viewInitial = primaryInit + secondaryInit
        viewCurrentBalance = currentBalance
        viewMonthlyRate = monthlyReturnRate
        viewMonthlyAdditions = monthlyAdditions
        const primaryHist = fullH.filter((r) => r.tranche === TRANCHE_PRIMARY)
        const secondaryHist = fullH.filter((r) => r.tranche === TRANCHE_SECONDARY)
        const hasPerTrancheRows = primaryHist.length > 0 || secondaryHist.length > 0
        if (hasPerTrancheRows) {
          const depPrimary =
            primaryInit + primaryHist.reduce((s, r) => s + (r.depositAmount || 0), 0)
          const depSecondary =
            secondaryInit + secondaryHist.reduce((s, r) => s + (r.depositAmount || 0), 0)
          viewTotalDeposits = depPrimary + depSecondary
          viewTotalWithdrawals =
            primaryHist.reduce((s, r) => s + (r.withdrawalAmount || 0), 0) +
            secondaryHist.reduce((s, r) => s + (r.withdrawalAmount || 0), 0)
        } else {
          viewTotalDeposits = totalDeposits
          viewTotalWithdrawals = totalWithdrawals
        }
        if (graphHistory.length === 0) {
          viewMonthlyRate = (0.02 + 0.04) / 2
        }
      } else if (portfolioTrancheView === 'conservative') {
        graphHistory = fullH.filter((r) => r.tranche === TRANCHE_PRIMARY)
        viewInitial = primaryInit
        viewMonthlyRate = 0.02
        viewMonthlyAdditions = investmentDataState.monthlyAdditions || 0
        const sortedG = sortMonthlyHistory(graphHistory)
        const last = sortedG[sortedG.length - 1]
        viewCurrentBalance = last ? last.endingBalance : primaryInit
        viewTotalDeposits =
          primaryInit + sortedG.reduce((s, r) => s + (r.depositAmount || 0), 0)
        viewTotalWithdrawals = sortedG.reduce((s, r) => s + (r.withdrawalAmount || 0), 0)
      } else {
        graphHistory = fullH.filter((r) => r.tranche === TRANCHE_SECONDARY)
        viewInitial = secondaryInit
        viewMonthlyRate = 0.04
        viewMonthlyAdditions = secondaryInv.monthlyAdditions || 0
        const sortedG = sortMonthlyHistory(graphHistory)
        const last = sortedG[sortedG.length - 1]
        viewCurrentBalance = last ? last.endingBalance : secondaryInit
        viewTotalDeposits =
          secondaryInit + sortedG.reduce((s, r) => s + (r.depositAmount || 0), 0)
        viewTotalWithdrawals = sortedG.reduce((s, r) => s + (r.withdrawalAmount || 0), 0)
      }
    }

    const projectionData = buildGraphProjectionData({
      monthlyHistory: graphHistory,
      initialBalance: viewInitial,
      currentBalance: viewCurrentBalance,
      monthlyReturnRate: viewMonthlyRate,
      monthlyAdditions: viewMonthlyAdditions
    })
    const maxBalance = Math.max(...projectionData.map((d) => d.balance))
    const minBalance = Math.min(...projectionData.map((d) => d.balance))
    const range = maxBalance - minBalance || 1

    const monthlyHistoryForMetrics = sortMonthlyHistory(graphHistory)

    const totalGain = monthlyHistoryForMetrics.reduce(
      (sum, record) => sum + (record.growthAmount || 0),
      0
    )
    const depositCount =
      1 + monthlyHistoryForMetrics.filter((record) => (record.depositAmount || 0) > 0).length
    const averageMonthlyInput =
      depositCount > 0 ? viewTotalDeposits / depositCount : 0
    let totalPercentageGain = monthlyHistoryForMetrics.reduce(
      (sum, record) => sum + (record.percentageGrowth || 0),
      0
    )
    if (
      isDualInvestor &&
      portfolioTrancheView === 'total' &&
      monthlyHistoryForMetrics.length === 0
    ) {
      totalPercentageGain = (2 + 4) / 2
    }

    let projectionStartingBalance = viewCurrentBalance
    if (monthlyHistoryForMetrics.length > 0) {
      const lastMonth = monthlyHistoryForMetrics[monthlyHistoryForMetrics.length - 1]
      projectionStartingBalance = lastMonth.endingBalance || viewCurrentBalance
    }
    let projectedBalance = projectionStartingBalance
    for (let month = 1; month <= 5; month++) {
      projectedBalance = projectedBalance * (1 + viewMonthlyRate) + viewMonthlyAdditions
    }
    const projection5Months = projectedBalance

    const displayCurrentBalance =
      isDualInvestor && (portfolioTrancheView === 'conservative' || portfolioTrancheView === 'moderate')
        ? viewCurrentBalance
        : currentBalance
    const displayDeposits = isDualInvestor ? viewTotalDeposits : totalDeposits
    const displayWithdrawals = isDualInvestor ? viewTotalWithdrawals : totalWithdrawals
    const displayInitialForMetric =
      isDualInvestor && portfolioTrancheView === 'conservative'
        ? primaryInit
        : isDualInvestor && portfolioTrancheView === 'moderate'
          ? secondaryInit
          : initialInvestment

    const trancheFilteredHistory = isDualInvestor
      ? portfolioTrancheView === 'conservative'
        ? sortMonthlyHistory(
            (investmentDataState.monthlyHistory || []).filter((r) => r.tranche === TRANCHE_PRIMARY)
          )
        : portfolioTrancheView === 'moderate'
          ? sortMonthlyHistory(
              (investmentDataState.monthlyHistory || []).filter((r) => r.tranche === TRANCHE_SECONDARY)
            )
          : []
      : []

    return (
      <div className="portfolio-container">
        <div className="portfolio-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 className="portfolio-title">Your Portfolio</h2>
            {isTrader && (
              <button
                onClick={() => setShowAddPerformance(!showAddPerformance)}
                className="btn-add-performance"
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
              >
                {showAddPerformance ? 'Cancel' : '+ Add Monthly Performance'}
              </button>
            )}
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="alert alert-error" style={{ padding: '1rem 1.5rem', borderRadius: '0.5rem', fontSize: '0.9rem', marginBottom: '1.5rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success" style={{ padding: '1rem 1.5rem', borderRadius: '0.5rem', fontSize: '0.9rem', marginBottom: '1.5rem', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
              {success}
            </div>
          )}

          {/* Add Performance Form for Traders */}
          {showAddPerformance && isTrader && (
            <div className="add-performance-section" style={{ marginBottom: '2rem', padding: '2rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
              <h3 className="section-title" style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', margin: '0 0 1.5rem 0' }}>Add Monthly Performance</h3>
              <form onSubmit={handleAddMonthlyPerformance} className="performance-form">
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="month" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Month *</label>
                    <select
                      id="month"
                      name="month"
                      value={monthlyUpdate.month}
                      onChange={handleMonthlyUpdateChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        color: '#1f2937'
                      }}
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
                    <label htmlFor="year" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Year *</label>
                    <input
                      type="number"
                      id="year"
                      name="year"
                      value={monthlyUpdate.year}
                      onChange={handleMonthlyUpdateChange}
                      min="2020"
                      max={new Date().getFullYear() + 1}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        color: '#1f2937'
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="percentageGrowth" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Growth Percentage (%) *</label>
                    <input
                      type="number"
                      id="percentageGrowth"
                      name="percentageGrowth"
                      value={monthlyUpdate.percentageGrowth}
                      onChange={handleMonthlyUpdateChange}
                      step="0.01"
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        color: '#1f2937'
                      }}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="depositAmount" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Deposit Amount (Optional)</label>
                    <input
                      type="number"
                      id="depositAmount"
                      name="depositAmount"
                      value={monthlyUpdate.depositAmount}
                      onChange={handleMonthlyUpdateChange}
                      step="0.01"
                      min="0"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        color: '#1f2937'
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="depositDate" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Deposit Date (Optional)</label>
                    <input
                      type="date"
                      id="depositDate"
                      name="depositDate"
                      value={monthlyUpdate.depositDate}
                      onChange={handleMonthlyUpdateChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        color: '#1f2937'
                      }}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="withdrawalAmount" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Withdrawal Amount (Optional)</label>
                    <input
                      type="number"
                      id="withdrawalAmount"
                      name="withdrawalAmount"
                      value={monthlyUpdate.withdrawalAmount}
                      onChange={handleMonthlyUpdateChange}
                      step="0.01"
                      min="0"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        color: '#1f2937'
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="withdrawalDate" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Withdrawal Date (Optional)</label>
                    <input
                      type="date"
                      id="withdrawalDate"
                      name="withdrawalDate"
                      value={monthlyUpdate.withdrawalDate}
                      onChange={handleMonthlyUpdateChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        color: '#1f2937'
                      }}
                    />
                  </div>
                </div>

                {/* Update Preview */}
                {monthlyUpdate.month && monthlyUpdate.year && monthlyUpdate.percentageGrowth && (() => {
                  // Helper functions for calculations
                  const getDaysInMonth = (month, year) => {
                    const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 
                                       'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month)
                    return new Date(year, monthIndex + 1, 0).getDate()
                  }

                  const calculateProratedGrowth = (amount, percentageGrowth, date, month, year) => {
                    if (!date || !month || !year || amount === 0) return 0
                    const depositDate = new Date(date)
                    const dayOfMonth = depositDate.getDate()
                    const daysInMonth = getDaysInMonth(month, parseInt(year))
                    let daysRemaining = daysInMonth - dayOfMonth + 1
                    if (dayOfMonth === daysInMonth) {
                      daysRemaining = 0
                    }
                    const proratedRatio = daysRemaining / daysInMonth
                    return amount * (percentageGrowth / 100) * proratedRatio
                  }

                  const calculateWithdrawalGrowthLoss = (amount, percentageGrowth, date, month, year) => {
                    if (!date || !month || !year || amount === 0) return 0
                    const withdrawalDate = new Date(date)
                    const dayOfMonth = withdrawalDate.getDate()
                    const daysInMonth = getDaysInMonth(month, parseInt(year))
                    const daysRemaining = daysInMonth - dayOfMonth
                    const proratedRatio = daysRemaining / daysInMonth
                    return amount * (percentageGrowth / 100) * proratedRatio
                  }

                  const startingBalance = currentBalance
                  const percentageGrowth = parseFloat(monthlyUpdate.percentageGrowth) || 0
                  const baseGrowth = startingBalance * (percentageGrowth / 100)
                  const depositAmount = parseFloat(monthlyUpdate.depositAmount) || 0
                  const withdrawalAmount = parseFloat(monthlyUpdate.withdrawalAmount) || 0
                  
                  const depositGrowth = calculateProratedGrowth(
                    depositAmount, 
                    percentageGrowth, 
                    monthlyUpdate.depositDate, 
                    monthlyUpdate.month, 
                    monthlyUpdate.year
                  )
                  
                  const withdrawalGrowth = calculateWithdrawalGrowthLoss(
                    withdrawalAmount, 
                    percentageGrowth, 
                    monthlyUpdate.withdrawalDate, 
                    monthlyUpdate.month, 
                    monthlyUpdate.year
                  )
                  
                  const finalBalance = startingBalance + baseGrowth + depositAmount + depositGrowth - withdrawalAmount - withdrawalGrowth

                  return (
                    <div className="update-preview" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.5rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
                      <h5 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>Update Preview:</h5>
                      <div className="preview-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div className="preview-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #bae6fd', color: '#1f2937' }}>
                          <span>Starting Balance:</span>
                          <span>€{startingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="preview-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #bae6fd', color: '#1f2937' }}>
                          <span>Growth ({percentageGrowth}%):</span>
                          <span>€{baseGrowth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {depositAmount > 0 && (
                          <>
                            <div className="preview-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #bae6fd', color: '#1f2937' }}>
                              <span>Deposit:</span>
                              <span>+€{depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            {depositGrowth > 0 && (
                              <div className="preview-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #bae6fd', color: '#1f2937' }}>
                                <span>Deposit Growth:</span>
                                <span>+€{depositGrowth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            )}
                          </>
                        )}
                        {withdrawalAmount > 0 && (
                          <>
                            <div className="preview-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #bae6fd', color: '#1f2937' }}>
                              <span>Withdrawal:</span>
                              <span>-€{withdrawalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            {withdrawalGrowth > 0 && (
                              <div className="preview-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #bae6fd', color: '#1f2937' }}>
                                <span>Withdrawal Growth Loss:</span>
                                <span>-€{withdrawalGrowth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            )}
                          </>
                        )}
                        <div className="preview-item preview-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderTop: '2px solid #3b82f6', borderBottom: 'none', marginTop: '0.5rem', fontWeight: '600', fontSize: '1.1rem', color: '#1f2937' }}>
                          <span>Final Balance:</span>
                          <span>€{finalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                <button
                  type="submit"
                  className="btn-submit"
                  disabled={loadingMonthlyUpdate || !monthlyUpdate.month || !monthlyUpdate.year || !monthlyUpdate.percentageGrowth}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: loadingMonthlyUpdate ? 'not-allowed' : 'pointer',
                    opacity: loadingMonthlyUpdate ? 0.6 : 1
                  }}
                >
                  {loadingMonthlyUpdate ? 'Saving...' : 'Save Monthly Performance'}
                </button>
              </form>
            </div>
          )}
          
          {/* Investment Graph */}
          <div className="portfolio-graph-section">
            <div className="portfolio-graph-section-header">
              <div>
                <h3 className="section-subtitle">Investment Growth & Projection</h3>
                {isDualInvestor && portfolioTrancheView === 'conservative' && (
                  <p className="portfolio-view-hint">Conservative tranche — 2% per month</p>
                )}
                {isDualInvestor && portfolioTrancheView === 'moderate' && (
                  <p className="portfolio-view-hint">Moderate tranche — 4% per month</p>
                )}
                {isDualInvestor && portfolioTrancheView === 'total' && (
                  <p className="portfolio-view-hint">Combined view — metrics reflect total net worth</p>
                )}
              </div>
              {isDualInvestor && (
                <div className="portfolio-tranche-toggle" role="tablist" aria-label="Portfolio tranche view">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={portfolioTrancheView === 'total'}
                    className={portfolioTrancheView === 'total' ? 'active' : ''}
                    onClick={() => setPortfolioTrancheView('total')}
                  >
                    Total net worth
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={portfolioTrancheView === 'conservative'}
                    className={portfolioTrancheView === 'conservative' ? 'active' : ''}
                    onClick={() => setPortfolioTrancheView('conservative')}
                  >
                    2% (Conservative)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={portfolioTrancheView === 'moderate'}
                    className={portfolioTrancheView === 'moderate' ? 'active' : ''}
                    onClick={() => setPortfolioTrancheView('moderate')}
                  >
                    4% (Moderate)
                  </button>
                </div>
              )}
            </div>
            <div className="graph-container">
              <div className="graph-legend">
                {projectionData.some(p => p.isHistorical) && (
                  <div className="legend-item">
                    <div className="legend-line current"></div>
                    <span>Historical</span>
                  </div>
                )}
                <div className="legend-item">
                  <div className="legend-line projection"></div>
                  <span>5-Month Projection</span>
                </div>
              </div>
              <svg className="investment-graph" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                  const y = 50 + (ratio * 300)
                  const value = minBalance + (range * (1 - ratio))
                  return (
                    <g key={index}>
                      <line
                        x1="50"
                        y1={y}
                        x2="750"
                        y2={y}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                        strokeDasharray={ratio === 0 || ratio === 1 ? "0" : "2,2"}
                      />
                      <text
                        x="40"
                        y={y + 5}
                        fill="#6b7280"
                        fontSize="12"
                        textAnchor="end"
                      >
                        €{(value / 1000).toFixed(1)}k
                      </text>
                    </g>
                  )
                })}
                
                {/* Historical line (solid) */}
                {projectionData.some(p => p.isHistorical) && (
                  <polyline
                    points={projectionData.map((point, index) => {
                      const totalPoints = projectionData.length
                      const x = 50 + (index * (700 / Math.max(totalPoints - 1, 1)))
                      const y = 350 - ((point.balance - minBalance) / range * 300)
                      return point.isHistorical ? `${x},${y}` : null
                    }).filter(p => p !== null).join(' ')}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                  />
                )}
                
                {/* Projection line (dashed) - includes last historical point for connection */}
                {projectionData.some(p => !p.isHistorical) && (
                  <polyline
                    points={projectionData.map((point, index) => {
                      const totalPoints = projectionData.length
                      const x = 50 + (index * (700 / Math.max(totalPoints - 1, 1)))
                      const y = 350 - ((point.balance - minBalance) / range * 300)
                      // Include last historical point and all projection points
                      const lastHistoricalIndex = projectionData.map((p, i) => p.isHistorical ? i : -1).filter(i => i >= 0).pop()
                      return (!point.isHistorical || index === lastHistoricalIndex) ? `${x},${y}` : null
                    }).filter(p => p !== null).join(' ')}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeDasharray="5,5"
                  />
                )}
                
                {/* Data points */}
                {projectionData.map((point, index) => {
                  const totalPoints = projectionData.length
                  const x = 50 + (index * (700 / (totalPoints - 1)))
                  const y = 350 - ((point.balance - minBalance) / range * 300)
                  return (
                    <g key={index}>
                      <circle
                        cx={x}
                        cy={y}
                        r="6"
                        fill={point.isHistorical ? "#10b981" : "#3b82f6"}
                      />
                      <text
                        x={x}
                        y={y - 15}
                        fill="#1f2937"
                        fontSize="11"
                        textAnchor="middle"
                        fontWeight="600"
                      >
                        €{(point.balance / 1000).toFixed(1)}k
                      </text>
                      <text
                        x={x}
                        y={380}
                        fill="#6b7280"
                        fontSize="11"
                        textAnchor="middle"
                      >
                        {point.label}
                      </text>
                    </g>
                  )
                })}
                
                {/* Axis labels */}
                <text
                  x="400"
                  y="395"
                  fill="#6b7280"
                  fontSize="14"
                  textAnchor="middle"
                  fontWeight="500"
                >
                  Time
                </text>
                <text
                  x="0"
                  y="150"
                  fill="#6b7280"
                  fontSize="14"
                  textAnchor="middle"
                  fontWeight="500"
                  transform="rotate(-90 0 200)"
                >
                  Balance (€)
                </text>
              </svg>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="portfolio-metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div className="metric-content">
                <h4 className="metric-label">Current Balance</h4>
                <p className="metric-value">€{displayCurrentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                </svg>
              </div>
              <div className="metric-content">
                <h4 className="metric-label">Total Gain</h4>
                <p className={`metric-value ${totalGain >= 0 ? 'positive' : 'negative'}`}>
                  €{totalGain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>


            <div className="metric-card">
              <div className="metric-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
              </div>
              <div className="metric-content">
                <h4 className="metric-label">5-Month Projection</h4>
                <p className="metric-value">€{projection5Months.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div className="metric-content">
                <h4 className="metric-label">Average Monthly Input</h4>
                <p className="metric-value">€{averageMonthlyInput.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <div className="metric-content">
                <h4 className="metric-label">Deposits</h4>
                <p className="metric-value">€{displayDeposits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <div className="metric-content">
                <h4 className="metric-label">Withdrawals</h4>
                <p className="metric-value">€{displayWithdrawals.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
                </svg>
              </div>
              <div className="metric-content">
                <h4 className="metric-label">Initial Investment</h4>
                <p className="metric-value">€{displayInitialForMetric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.99 14.993 6-6m6 3.001c0 1.268-.63 2.39-1.593 3.069a3.746 3.746 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043 3.745 3.745 0 0 1-3.068 1.593c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 0 1-3.296-1.043 3.746 3.746 0 0 1-1.043-3.297 3.746 3.746 0 0 1-1.593-3.068c0-1.268.63-2.39 1.593-3.068a3.746 3.746 0 0 1 1.043-3.297 3.745 3.745 0 0 1 3.296-1.042 3.745 3.745 0 0 1 3.068-1.594c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.297 3.746 3.746 0 0 1 1.593 3.068ZM9.74 9.743h.008v.007H9.74v-.007Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </div>
              <div className="metric-content">
                <h4 className="metric-label">
                  {isDualInvestor &&
                  portfolioTrancheView === 'total' &&
                  monthlyHistoryForMetrics.length === 0
                    ? 'Blended monthly target (avg.)'
                    : 'Total % Gain'}
                </h4>
                <p className={`metric-value ${totalPercentageGain >= 0 ? 'positive' : 'negative'}`}>
                  {totalPercentageGain.toFixed(2)}%
                </p>
                {isDualInvestor &&
                  portfolioTrancheView === 'total' &&
                  monthlyHistoryForMetrics.length === 0 && (
                  <p className="metric-subline">Average of 2% and 4% monthly targets (no combined history yet)</p>
                )}
              </div>
            </div>
          </div>

          {/* Monthly History Section — full ledger for traders & single-tranche investors; per-tranche when dual investor selects 2% / 4%; hidden on Total for dual */}
          {isTrader &&
            investmentDataState.monthlyHistory &&
            investmentDataState.monthlyHistory.length > 0 && (
              <div className="portfolio-history-section">
                <h3 className="section-subtitle">Monthly Performance History</h3>
                <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1rem' }}>
                  Click on any row to edit the monthly performance record.
                </p>
                <div className="history-container">
                  <div className="history-table">
                    <div className="history-header">
                      <div>Month/Year</div>
                      <div>Growth %</div>
                      <div>Growth Amount</div>
                      <div>Deposit</div>
                      <div>Withdrawal</div>
                      <div>Ending Balance</div>
                    </div>
                    {sortMonthlyHistory(investmentDataState.monthlyHistory || []).map((record, index) => {
                      const originalIndex = investmentDataState.monthlyHistory.findIndex(
                        (r) => r.month === record.month && r.year === record.year
                      )
                      const recordIndex = originalIndex >= 0 ? originalIndex : index
                      return (
                        <div
                          key={index}
                          className="history-row clickable"
                          onClick={() => handleRecordClick(record, recordIndex)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div>
                            {record.month} {record.year}
                          </div>
                          <div>{record.percentageGrowth}%</div>
                          <div>
                            €
                            {(record.growthAmount || 0).toLocaleString('en-US', {
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
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

          {!isTrader && isDualInvestor && (portfolioTrancheView === 'conservative' || portfolioTrancheView === 'moderate') && (
            <div className="portfolio-history-section">
              <h3 className="section-subtitle">Monthly Performance History</h3>
              {trancheFilteredHistory.length > 0 ? (
                <div className="history-container">
                  <div className="history-table">
                    <div className="history-header">
                      <div>Month/Year</div>
                      <div>Growth %</div>
                      <div>Growth Amount</div>
                      <div>Deposit</div>
                      <div>Withdrawal</div>
                      <div>Ending Balance</div>
                    </div>
                    {trancheFilteredHistory.map((record, index) => (
                      <div key={`${record.month}-${record.year}-${index}`} className="history-row">
                        <div>
                          {record.month} {record.year}
                        </div>
                        <div>{record.percentageGrowth != null ? `${record.percentageGrowth}%` : '—'}</div>
                        <div>
                          €
                          {(record.growthAmount || 0).toLocaleString('en-US', {
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
                </div>
              ) : (
                <p className="portfolio-history-empty">
                  No monthly entries for this tranche yet. When your administrator logs performance for the{' '}
                  {portfolioTrancheView === 'conservative' ? 'conservative (2%)' : 'moderate (4%)'} tranche, they will
                  appear here.
                </p>
              )}
            </div>
          )}

          {!isTrader && !isDualInvestor && investmentDataState.monthlyHistory && investmentDataState.monthlyHistory.length > 0 && (
            <div className="portfolio-history-section">
              <h3 className="section-subtitle">Monthly Performance History</h3>
              <div className="history-container">
                <div className="history-table">
                  <div className="history-header">
                    <div>Month/Year</div>
                    <div>Growth %</div>
                    <div>Growth Amount</div>
                    <div>Deposit</div>
                    <div>Withdrawal</div>
                    <div>Ending Balance</div>
                  </div>
                  {sortMonthlyHistory(investmentDataState.monthlyHistory || []).map((record, index) => (
                    <div key={index} className="history-row">
                      <div>
                        {record.month} {record.year}
                      </div>
                      <div>{record.percentageGrowth}%</div>
                      <div>
                        €
                        {(record.growthAmount || 0).toLocaleString('en-US', {
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
              </div>
            </div>
          )}

          {/* Edit Record Widget for Traders */}
          {editingRecordIndex !== null && isTrader && investmentDataState && (
            <div className="edit-record-section" style={{ marginTop: '2rem', padding: '2rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="section-title" style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>Edit Monthly Record</h3>
                <button
                  onClick={() => {
                    setEditingRecordIndex(null)
                    setEditedRecordData({
                      month: '',
                      year: '',
                      percentageGrowth: '',
                      depositAmount: '',
                      depositDate: '',
                      withdrawalAmount: '',
                      withdrawalDate: ''
                    })
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.5rem',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleUpdateRecord} className="edit-record-form">
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="edit-month" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Month *</label>
                    <select
                      id="edit-month"
                      name="month"
                      value={editedRecordData.month}
                      onChange={(e) => setEditedRecordData({ ...editedRecordData, month: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        color: '#1f2937'
                      }}
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
                    <label htmlFor="edit-year" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Year *</label>
                    <input
                      type="number"
                      id="edit-year"
                      name="year"
                      value={editedRecordData.year}
                      onChange={(e) => setEditedRecordData({ ...editedRecordData, year: e.target.value })}
                      min="2020"
                      max={new Date().getFullYear() + 1}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        color: '#1f2937'
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-percentageGrowth" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Growth Percentage (%) *</label>
                    <input
                      type="number"
                      id="edit-percentageGrowth"
                      name="percentageGrowth"
                      value={editedRecordData.percentageGrowth}
                      onChange={(e) => setEditedRecordData({ ...editedRecordData, percentageGrowth: e.target.value })}
                      step="0.01"
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        color: '#1f2937'
                      }}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="edit-depositAmount" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Deposit Amount (Optional)</label>
                    <input
                      type="number"
                      id="edit-depositAmount"
                      name="depositAmount"
                      value={editedRecordData.depositAmount}
                      onChange={(e) => setEditedRecordData({ ...editedRecordData, depositAmount: e.target.value })}
                      step="0.01"
                      min="0"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        color: '#1f2937'
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-depositDate" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Deposit Date (Optional)</label>
                    <input
                      type="date"
                      id="edit-depositDate"
                      name="depositDate"
                      value={editedRecordData.depositDate}
                      onChange={(e) => setEditedRecordData({ ...editedRecordData, depositDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        color: '#1f2937'
                      }}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="edit-withdrawalAmount" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Withdrawal Amount (Optional)</label>
                    <input
                      type="number"
                      id="edit-withdrawalAmount"
                      name="withdrawalAmount"
                      value={editedRecordData.withdrawalAmount}
                      onChange={(e) => setEditedRecordData({ ...editedRecordData, withdrawalAmount: e.target.value })}
                      step="0.01"
                      min="0"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        color: '#1f2937'
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-withdrawalDate" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Withdrawal Date (Optional)</label>
                    <input
                      type="date"
                      id="edit-withdrawalDate"
                      name="withdrawalDate"
                      value={editedRecordData.withdrawalDate}
                      onChange={(e) => setEditedRecordData({ ...editedRecordData, withdrawalDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        color: '#1f2937'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!investmentDataState || editingRecordIndex === null) return
                      const recordToDelete = investmentDataState.monthlyHistory[editingRecordIndex]
                      if (!recordToDelete) return
                      await handleDeleteRecord(recordToDelete, editingRecordIndex)
                    }}
                    disabled={loadingEdit}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #ef4444',
                      borderRadius: '0.5rem',
                      fontSize: '0.95rem',
                      fontWeight: '500',
                      cursor: loadingEdit ? 'not-allowed' : 'pointer',
                      opacity: loadingEdit ? 0.7 : 1
                    }}
                  >
                    Delete Record
                  </button>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecordIndex(null)
                        setEditedRecordData({
                          month: '',
                          year: '',
                          percentageGrowth: '',
                          depositAmount: '',
                          depositDate: '',
                          withdrawalAmount: '',
                          withdrawalDate: ''
                        })
                      }}
                      disabled={loadingEdit}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#ffffff',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        fontWeight: '500',
                        cursor: loadingEdit ? 'not-allowed' : 'pointer',
                        opacity: loadingEdit ? 0.6 : 1
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loadingEdit || !editedRecordData.month || !editedRecordData.year || !editedRecordData.percentageGrowth}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        fontWeight: '500',
                        cursor: loadingEdit ? 'not-allowed' : 'pointer',
                        opacity: (loadingEdit || !editedRecordData.month || !editedRecordData.year || !editedRecordData.percentageGrowth) ? 0.6 : 1
                      }}
                    >
                      {loadingEdit ? 'Updating...' : 'Update Record'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Desktop View Message (Mobile Only) */}
          <div className="desktop-view-message">
            <p>To view the graph and performance history, please log in from your desktop.</p>
          </div>
        </div>
      </div>
    )
  }

  // Not an investor or trader - show initiation widgets
  if (!isInvestor && !isTrader) {
    return (
      <div className="portfolio-container">
        {isPending ? (
          <div className="investment-pending-widget">
            <div className="widget-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="widget-title">
              {investmentDataState?.accountType === 'Trader'
                ? 'Your Tracking is Being Reviewed'
                : 'Your Investment is Being Reviewed'}
            </h2>
            <p className="widget-description">
              {investmentDataState?.accountType === 'Trader'
                ? "Your tracking account request has been submitted and is currently under review. Once it's accepted, your performance tracking will be activated."
                : "Your investment request has been submitted and is currently under review. Once it's accepted, your information will be displayed accordingly."}
            </p>
          </div>
        ) : !showForm ? (
          <div className="initiation-widgets-container">
            <div className="investor-initiation-widget">
              <div className="widget-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="widget-title">You are not yet an investor</h2>
              <p className="widget-description">
                You don't have a portfolio to display. To get started as an investor, initiate an investment account.
              </p>
              <button 
                onClick={() => {
                  setFormMode('investor')
                  setShowForm(true)
                  setFormData({
                    initialInvestment: '',
                    startingDate: '',
                    country: '',
                    phoneNumber: '',
                    monthlyAdditions: '0',
                    riskTolerance: '',
                    includeSecondInvestment: false,
                    secondaryInitialInvestment: '',
                    secondaryStartingDate: '',
                    secondaryMonthlyAdditions: '0'
                  })
                  setError('')
                  setSuccess('')
                }}
                className="widget-button"
              >
                Initiate Investment
              </button>
            </div>

            <div className="trader-initiation-widget">
              <div className="widget-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 3V21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 14L11 10L15 13L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="widget-title">You are not yet a trader</h2>
              <p className="widget-description">
                You can also create a tracking account to monitor your own trading performance independently.
              </p>
              <button 
                onClick={() => {
                  setFormMode('trader')
                  setShowForm(true)
                }}
                className="widget-button"
              >
                Initiate Tracking
              </button>
            </div>
          </div>
        ) : (
          <div className="investment-form-container">
            <div className="form-header">
              <h2>{formMode === 'trader' ? 'Initiate Your Tracking Account' : 'Initiate Your Investment'}</h2>
              <p>
                {formMode === 'trader'
                  ? 'Please fill in the following information to set up your trading performance tracking account.'
                  : 'Please fill in the following information to become an investor.'}
              </p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit} className="investment-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="country" className="form-label">
                    Country <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    className="form-input"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="Enter your country"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phoneNumber" className="form-label">
                    Phone Number <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    className="form-input"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="initialInvestment" className="form-label">
                    Initial Investment Amount <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    id="initialInvestment"
                    name="initialInvestment"
                    className="form-input"
                    value={formData.initialInvestment}
                    onChange={handleInputChange}
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="startingDate" className="form-label">
                    Starting Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    id="startingDate"
                    name="startingDate"
                    className="form-input"
                    value={formData.startingDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="monthlyAdditions" className="form-label">
                    Monthly Additions
                  </label>
                  <input
                    type="number"
                    id="monthlyAdditions"
                    name="monthlyAdditions"
                    className="form-input"
                    value={formData.monthlyAdditions}
                    onChange={handleInputChange}
                    placeholder="0 - 20,000"
                    min="0"
                    max="20000"
                    step="0.01"
                  />
                  <small className="form-help">Amount you plan to add monthly (0 to 20,000)</small>
                </div>

                {formMode === 'investor' && (
                  <div className="form-group">
                    <label htmlFor="riskTolerance" className="form-label">
                      Risk Tolerance <span className="required">*</span>
                    </label>
                    <div className="custom-select-wrapper" ref={dropdownRef}>
                      <button
                        type="button"
                        className={`custom-select-button ${riskDropdownOpen ? 'open' : ''} ${!formData.riskTolerance ? 'placeholder' : ''}`}
                        onClick={() => setRiskDropdownOpen(!riskDropdownOpen)}
                        aria-expanded={riskDropdownOpen}
                        aria-haspopup="listbox"
                      >
                        <span>
                          {formData.riskTolerance === 'conservative' 
                            ? 'Conservative (2% per month)' 
                            : formData.riskTolerance === 'moderate' 
                            ? 'Moderate (4% per month)' 
                            : 'Select risk tolerance'}
                        </span>
                        <svg 
                          className="select-arrow" 
                          width="12" 
                          height="12" 
                          viewBox="0 0 12 12" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M6 9L1 4h10z" fill="#374151"/>
                        </svg>
                      </button>
                      {riskDropdownOpen && (
                        <>
                          <div 
                            className="dropdown-backdrop" 
                            onClick={() => setRiskDropdownOpen(false)}
                          />
                          <div className="custom-select-dropdown">
                            <button
                              type="button"
                              className={`dropdown-option ${formData.riskTolerance === 'conservative' ? 'selected' : ''}`}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, riskTolerance: 'conservative' }))
                                setRiskDropdownOpen(false)
                              }}
                            >
                              Conservative (2% per month)
                            </button>
                            {!formData.includeSecondInvestment && (
                              <button
                                type="button"
                                className={`dropdown-option ${formData.riskTolerance === 'moderate' ? 'selected' : ''}`}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, riskTolerance: 'moderate' }))
                                  setRiskDropdownOpen(false)
                                }}
                              >
                                Moderate (4% per month)
                              </button>
                            )}
                          </div>
                        </>
                      )}
                      {/* Hidden input for form validation */}
                      <input
                        type="hidden"
                        name="riskTolerance"
                        value={formData.riskTolerance}
                        required={formMode === 'investor'}
                      />
                    </div>
                  </div>
                )}
              </div>

              {formMode === 'investor' && (
                <div className="secondary-investment-toggle">
                  <label className="secondary-investment-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.includeSecondInvestment}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setFormData(prev => ({
                          ...prev,
                          includeSecondInvestment: checked,
                          riskTolerance: checked ? 'conservative' : prev.riskTolerance,
                          ...(checked
                            ? {}
                            : {
                                secondaryInitialInvestment: '',
                                secondaryStartingDate: '',
                                secondaryMonthlyAdditions: '0'
                              })
                        }))
                      }}
                    />
                    <span>Add a second investment (Moderate — 4% per month)</span>
                  </label>
                  <p className="form-help secondary-investment-hint">
                    When enabled, your first tranche is Conservative (2% per month). The second tranche is fixed at
                    Moderate (4% per month).
                  </p>
                </div>
              )}

              {formMode === 'investor' && formData.includeSecondInvestment && (
                <div className="secondary-investment-block">
                  <h3 className="secondary-investment-heading">Second investment</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="secondaryInitialInvestment" className="form-label">
                        Initial amount <span className="required">*</span>
                      </label>
                      <input
                        type="number"
                        id="secondaryInitialInvestment"
                        name="secondaryInitialInvestment"
                        className="form-input"
                        value={formData.secondaryInitialInvestment}
                        onChange={handleInputChange}
                        placeholder="Enter amount"
                        min="0"
                        step="0.01"
                        required={formData.includeSecondInvestment}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="secondaryStartingDate" className="form-label">
                        Starting date <span className="required">*</span>
                      </label>
                      <input
                        type="date"
                        id="secondaryStartingDate"
                        name="secondaryStartingDate"
                        className="form-input"
                        value={formData.secondaryStartingDate}
                        onChange={handleInputChange}
                        required={formData.includeSecondInvestment}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="secondaryMonthlyAdditions" className="form-label">
                        Monthly additions
                      </label>
                      <input
                        type="number"
                        id="secondaryMonthlyAdditions"
                        name="secondaryMonthlyAdditions"
                        className="form-input"
                        value={formData.secondaryMonthlyAdditions}
                        onChange={handleInputChange}
                        placeholder="0 - 20,000"
                        min="0"
                        max="20000"
                        step="0.01"
                      />
                      <small className="form-help">Amount you plan to add monthly to this tranche (0 to 20,000)</small>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Risk profile</label>
                      <div className="secondary-risk-fixed">Moderate (4% per month)</div>
                      <small className="form-help">The second tranche always uses the moderate profile.</small>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormMode(null)
                    setError('')
                    setSuccess('')
                    setFormData({
                      initialInvestment: '',
                      startingDate: '',
                      country: '',
                      phoneNumber: '',
                      monthlyAdditions: '0',
                      riskTolerance: '',
                      includeSecondInvestment: false,
                      secondaryInitialInvestment: '',
                      secondaryStartingDate: '',
                      secondaryMonthlyAdditions: '0'
                    })
                  }}
                  className="btn-cancel"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Continue'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    )
  }

  // Default return (should not reach here, but for safety)
  return null
}

export default Portfolio

