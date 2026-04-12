import React, { useState, useEffect } from 'react'
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore'
import { getAdmin3Overrides, saveAdmin3UserOverride } from '../utils/admin3Overrides'
import { getInvestorCombinedInitial } from '../utils/investorDualTranche'
import './AdminPortfolio.css'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatCompact(num) {
  if (num >= 1e6) return `€${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) {
    const k = num / 1e3
    return `€${k.toFixed(1)}k`.replace('.0k', 'k')
  }
  return `€${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function createSeededRandom(seed) {
  return function() {
    seed = Math.imul(1103515245, seed) + 12345
    return ((seed >>> 0) % 2147483648) / 2147483648
  }
}

function generateAdmin3PortfolioData() {
  const rand = createSeededRandom(42)
  const initialBalance = 100000
  const numMonths = 60

  // Preserve the Admin 3 UI totals exactly (these are what the user sees).
  const targetCurrentBalance = 7110000
  const targetTotalGain = 5830000
  const targetTotalDeposits = 2150000 // includes the initial investment
  const targetTotalWithdrawals = 890000

  // Base return series (we'll rescale it to hit the target totals).
  const rnd = () => -5 + rand() * 15
  const rawPcts = Array.from({ length: numMonths }, () => rnd())
  let product = 1
  rawPcts.forEach((p) => { product *= 1 + p / 100 })

  const fixedGrowthRates = {
    'February_2024': -6.30,
    'February_2025': -3,
    'March_2026': 0.42
  }

  const now = new Date()
  const monthMeta = Array.from({ length: numMonths }, (_, i) => {
    const monthsAgo = numMonths - 1 - i
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
    const month = MONTH_NAMES[d.getMonth()]
    const year = d.getFullYear()
    const key = `${month}_${year}`
    return { month, year, key, monthIndex: d.getMonth() }
  })

  // Decide which months have deposits/withdrawals.
  const depositMonths = []
  const withdrawalMonths = []
  for (let i = 0; i < numMonths; i++) {
    if (rand() < 0.35) depositMonths.push(i)
    if (rand() < 0.2) withdrawalMonths.push(i)
  }

  // Cashflows: totals must remain exact.
  const depositsToAlloc = targetTotalDeposits - initialBalance
  const withdrawalToAlloc = targetTotalWithdrawals

  // Randomize deposit/withdraw amounts but keep their sums exact.
  // Your request "20000 to 10000" is interpreted as variability magnitude around the base
  // amounts (base +/- [10k..20k] with random sign), then rescaled to exact totals.
  const randDeltaMagnitude = () => 10000 + rand() * 10000 // [10k..20k]
  const randSigned = () => (rand() < 0.5 ? -1 : 1)

  const depositAmounts = new Array(numMonths).fill(0)
  const withdrawalAmounts = new Array(numMonths).fill(0)
  const depositDayOfMonth = new Array(numMonths).fill(null)
  const withdrawalDayOfMonth = new Array(numMonths).fill(null)

  const depositBase = depositMonths.length > 0 ? depositsToAlloc / depositMonths.length : 0
  const withdrawalBase = withdrawalMonths.length > 0 ? withdrawalToAlloc / withdrawalMonths.length : 0

  if (depositMonths.length > 0) {
    const raw = depositMonths.map((i) => {
      const v = depositBase + randSigned() * randDeltaMagnitude()
      return Math.max(1000, v)
    })
    const rawSum = raw.reduce((a, b) => a + b, 0) || 1
    let scaled = raw.map((v) => (v / rawSum) * depositsToAlloc)
    scaled = scaled.map((v) => Math.round(v * 100) / 100)

    let scaledSum = scaled.reduce((a, b) => a + b, 0)
    const residual = Math.round((depositsToAlloc - scaledSum) * 100) / 100
    scaled[0] = Math.round((scaled[0] + residual) * 100) / 100

    depositMonths.forEach((monthIdx, idx) => {
      depositAmounts[monthIdx] = scaled[idx]
      depositDayOfMonth[monthIdx] = Math.floor(rand() * 28) + 1 // 1..28
    })
  }

  if (withdrawalMonths.length > 0) {
    const raw = withdrawalMonths.map((i) => {
      const v = withdrawalBase + randSigned() * randDeltaMagnitude()
      return Math.max(0, v)
    })
    const rawSum = raw.reduce((a, b) => a + b, 0) || 1
    let scaled = raw.map((v) => (v / rawSum) * withdrawalToAlloc)
    scaled = scaled.map((v) => Math.round(v * 100) / 100)

    let scaledSum = scaled.reduce((a, b) => a + b, 0)
    const residual = Math.round((withdrawalToAlloc - scaledSum) * 100) / 100
    scaled[0] = Math.round((scaled[0] + residual) * 100) / 100

    withdrawalMonths.forEach((monthIdx, idx) => {
      withdrawalAmounts[monthIdx] = scaled[idx]
      withdrawalDayOfMonth[monthIdx] = Math.floor(rand() * 28) + 1 // 1..28
    })
  }

  // Precompute the random reductions so the solver doesn't consume RNG.
  const pctReductions = new Array(numMonths).fill(0)
  for (let i = 0; i < numMonths; i++) {
    if (fixedGrowthRates[monthMeta[i].key] !== undefined) continue
    if (rand() < 0.8) pctReductions[i] = 0.5 + rand() * 1.5
  }

  function simulateWithTargetFinal(targetFinal) {
    const scale = Math.pow(targetFinal / initialBalance / product, 1 / numMonths)
    const pcts = rawPcts.map((p) => {
      const r = (1 + p / 100) * scale - 1
      return r * 100
    })

    let balance = initialBalance
    let totalDeposits = initialBalance
    let totalWithdrawals = 0
    let totalGain = 0
    const monthlyHistory = []

    for (let i = 0; i < numMonths; i++) {
      const meta = monthMeta[i]
      const daysInMonth = new Date(meta.year, meta.monthIndex + 1, 0).getDate()

      let pctBase = fixedGrowthRates[meta.key] !== undefined ? fixedGrowthRates[meta.key] : Math.min(pcts[i], 10)
      if (fixedGrowthRates[meta.key] === undefined) pctBase -= pctReductions[i]
      const pct = pctBase

      const startingBalance = balance
      const growthAmount = balance * (pct / 100)
      totalGain += Math.round(growthAmount * 100) / 100
      balance = balance + growthAmount

      const depositAmount = depositAmounts[i] || 0
      const withdrawalAmount = withdrawalAmounts[i] || 0

      const depositDay = depositDayOfMonth[i] ?? 1
      const withdrawalDay = withdrawalDayOfMonth[i] ?? 1

      const depositDate = depositAmount
        ? `${meta.year}-${String(meta.monthIndex + 1).padStart(2, '0')}-${String(depositDay).padStart(2, '0')}`
        : null
      const withdrawalDate = withdrawalAmount
        ? `${meta.year}-${String(meta.monthIndex + 1).padStart(2, '0')}-${String(withdrawalDay).padStart(2, '0')}`
        : null

      const depositGrowth = depositAmount
        ? depositAmount * (pct / 100) * Math.max(0, (daysInMonth - depositDay + 1) / daysInMonth)
        : 0
      const withdrawalGrowth = withdrawalAmount
        ? withdrawalAmount * (pct / 100) * (daysInMonth - withdrawalDay) / daysInMonth
        : 0

      balance += depositAmount + depositGrowth - withdrawalAmount - withdrawalGrowth

      totalDeposits += depositAmount
      totalWithdrawals += withdrawalAmount

      monthlyHistory.push({
        month: meta.month,
        year: meta.year.toString(),
        percentageGrowth: Math.round(pct * 100) / 100,
        growthAmount: Math.round(growthAmount * 100) / 100,
        depositAmount,
        depositDate,
        withdrawalAmount,
        withdrawalDate,
        startingBalance: Math.round(startingBalance * 100) / 100,
        endingBalance: Math.round(balance * 100) / 100,
        depositGrowth: Math.round(depositGrowth * 100) / 100,
        withdrawalGrowth: Math.round(withdrawalGrowth * 100) / 100,
        updatedAt: new Date().toISOString()
      })
    }

    return {
      endingBalance: Math.round(balance * 100) / 100,
      totalDeposits,
      totalWithdrawals,
      totalGain: Math.round(totalGain * 100) / 100,
      monthlyHistory
    }
  }

  // Find a good bracket for ending balance, then scan for the best match of BOTH totals.
  // This avoids cases where ending balance is close but Total Gain is off.
  let low = 1000000
  let high = 20000000
  for (let iter = 0; iter < 18; iter++) {
    const mid = (low + high) / 2
    const sim = simulateWithTargetFinal(mid)
    if (sim.endingBalance > targetCurrentBalance) {
      high = mid
    } else {
      low = mid
    }
  }

  const scanSteps = 61
  let bestFinal = null
  for (let s = 0; s <= scanSteps; s++) {
    const candidate = low + ((high - low) * s) / scanSteps
    const sim = simulateWithTargetFinal(candidate)
    const endErrAbs = Math.abs(sim.endingBalance - targetCurrentBalance)
    const gainErrAbs = Math.abs(sim.totalGain - targetTotalGain)
    // Normalize to keep the two targets comparable.
    const score = endErrAbs / 1000 + gainErrAbs / 1000
    if (!bestFinal || score < bestFinal.score) {
      bestFinal = { ...sim, score }
    }
  }

  // Final deterministic tuning (so the visible UI totals match exactly).
  // We only adjust the last month:
  // - `Total Gain` is based on sum(growthAmount), so we shift the last `growthAmount`.
  // - `Current Balance` depends on growthAmount + depositGrowth/withdrawalGrowth, so we
  //   compensate by shifting the last `depositGrowth` to preserve the final balance.
  const round2 = (n) => Math.round(n * 100) / 100
  if (bestFinal?.monthlyHistory?.length) {
    const history = bestFinal.monthlyHistory
    const lastIdx = history.length - 1
    const actualTotalGain = history.reduce((sum, r) => sum + (r.growthAmount || 0), 0)
    const actualCurrentBalance = history[lastIdx].endingBalance
    const gainDelta = targetTotalGain - actualTotalGain
    const endDelta = targetCurrentBalance - actualCurrentBalance

    if (Math.abs(gainDelta) > 0.01 || Math.abs(endDelta) > 0.01) {
      const newGrowthAmount = round2((history[lastIdx].growthAmount || 0) + gainDelta)
      const newDepositGrowth = round2((history[lastIdx].depositGrowth || 0) + (endDelta - gainDelta))

      history[lastIdx].growthAmount = newGrowthAmount
      history[lastIdx].depositGrowth = newDepositGrowth
      history[lastIdx].endingBalance = round2(history[lastIdx].endingBalance + endDelta)

      const sb = history[lastIdx].startingBalance || 0
      if (sb > 0) {
        history[lastIdx].percentageGrowth = round2((newGrowthAmount / sb) * 100)
      }

      bestFinal.endingBalance = history[lastIdx].endingBalance
    }
  }

  return {
    initialInvestment: initialBalance,
    currentBalance: bestFinal.endingBalance,
    totalDeposits: Math.round(bestFinal.totalDeposits * 100) / 100,
    totalWithdrawals: Math.round(bestFinal.totalWithdrawals * 100) / 100,
    monthlyHistory: bestFinal.monthlyHistory,
    monthlyReturnRate: 0.03,
    monthlyAdditions: 0
  }
}

const AdminPortfolio = ({ user, userStatuses = [] }) => {
  const isAdmin2 = userStatuses && (userStatuses.includes('Admin 2') || userStatuses.includes('Relations'))
  const isAdmin3 = userStatuses && userStatuses.includes('Admin 3')
  const canAddPerformance = !isAdmin2 && !isAdmin3
  
  const [loading, setLoading] = useState(true)
  const [portfolioData, setPortfolioData] = useState(null)
  const [showAddPerformance, setShowAddPerformance] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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
  const [editFormData, setEditFormData] = useState({
    month: '',
    year: '',
    percentageGrowth: '',
    depositAmount: '',
    depositDate: '',
    withdrawalAmount: '',
    withdrawalDate: ''
  })
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [totalInvestorAccounts, setTotalInvestorAccounts] = useState(0)
  const [loadingInvestorAccounts, setLoadingInvestorAccounts] = useState(true)
  const [portfolioOwnerId, setPortfolioOwnerId] = useState(null)

  useEffect(() => {
    if (user) {
      loadPortfolioData()
      loadTotalInvestorAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin2, isAdmin3])

  // Helper function to sort monthly history chronologically
  const sortMonthlyHistory = (history) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    
    return [...history].sort((a, b) => {
      // First sort by year
      const yearA = parseInt(a.year) || 0
      const yearB = parseInt(b.year) || 0
      if (yearA !== yearB) {
        return yearA - yearB
      }
      
      // Then sort by month
      const monthA = monthNames.indexOf(a.month || '')
      const monthB = monthNames.indexOf(b.month || '')
      return monthA - monthB
    })
  }

  const loadTotalInvestorAccounts = async () => {
    try {
      const db = getFirestore()
      const usersCollection = collection(db, 'users')
      const usersSnapshot = await getDocs(usersCollection)
      
      let total = 0
      usersSnapshot.forEach((docSnapshot) => {
        const userData = docSnapshot.data()
        const statuses = userData.statuses || []
        const email = userData.email || ''
        const displayName = userData.displayName || ''
        
        // Exclude specific users
        if (
          email === 'nicolas.fernandez@opessocius.support' || 
          displayName === 'Nicolas De Rodrigo' ||
          email === 'marcoscollab@gmail.com' ||
          displayName === 'Marcos De Rodrigo' ||
          email === 'ndrf1806@gmail.com' ||
          displayName === 'Nicolas'
        ) {
          return
        }
        
        // Only count investors or traders with approved investment accounts
        if ((statuses.includes('Investor') || statuses.includes('Trader')) && userData.investmentData && userData.investmentData.status === 'approved') {
          const investmentData = userData.investmentData
          
          // Get the most current ending capital
          // First check if there's a currentBalance
          if (investmentData.currentBalance) {
            total += investmentData.currentBalance
          } else if (investmentData.monthlyHistory && investmentData.monthlyHistory.length > 0) {
            // If no currentBalance, get the last endingBalance from monthly history
            const sortedHistory = sortMonthlyHistory(investmentData.monthlyHistory)
            const lastRecord = sortedHistory[sortedHistory.length - 1]
            if (lastRecord && lastRecord.endingBalance) {
              total += lastRecord.endingBalance
            } else {
              total += getInvestorCombinedInitial(investmentData)
            }
          } else {
            total += getInvestorCombinedInitial(investmentData)
          }
        }
      })
      
      setTotalInvestorAccounts(total)
    } catch (error) {
      console.error('Error loading total investor accounts:', error)
      setTotalInvestorAccounts(0)
    } finally {
      setLoadingInvestorAccounts(false)
    }
  }

  const loadPortfolioData = async () => {
    try {
      const db = getFirestore()
      
      if (isAdmin2 || isAdmin3) {
        const usersCollection = collection(db, 'users')
        const usersSnapshot = await getDocs(usersCollection)
        const overrides = isAdmin3 && user?.uid ? await getAdmin3Overrides(user.uid) : {}
        let adminUser = null
        usersSnapshot.forEach((docSnapshot) => {
          const userData = docSnapshot.data()
          let statuses = userData.statuses || []
          if (statuses.length === 0 && Array.isArray(userData.isAdmin) && userData.isAdmin.length > 0) statuses = userData.isAdmin
          if (statuses.length === 0 && userData.isAdmin === true) statuses = ['Admin']
          if (statuses.includes('Admin') && !statuses.includes('Admin 2') && !statuses.includes('Admin 3') && !statuses.includes('Relations')) {
            adminUser = { id: docSnapshot.id, ...userData }
          }
        })
        if (isAdmin3) {
          setPortfolioOwnerId(adminUser?.id || null)
          setPortfolioData(generateAdmin3PortfolioData())
        } else if (adminUser) {
          setPortfolioOwnerId(adminUser.id)
          let invData = adminUser.investmentData || null
          if (overrides[adminUser.id]?.investmentData) invData = overrides[adminUser.id].investmentData
          if (invData) {
            const sortedData = { ...invData, monthlyHistory: sortMonthlyHistory(invData.monthlyHistory || []) }
            setPortfolioData(sortedData)
          } else setPortfolioData(null)
        } else {
          setPortfolioOwnerId(null)
          setPortfolioData(null)
        }
      } else {
        setPortfolioOwnerId(user.uid)
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.investmentData) {
            const sortedData = {
              ...userData.investmentData,
              monthlyHistory: sortMonthlyHistory(userData.investmentData.monthlyHistory || [])
            }
            setPortfolioData(sortedData)
          } else setPortfolioData(null)
        }
      }
    } catch (error) {
      console.error('Error loading admin portfolio:', error)
      setError('Failed to load portfolio data.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setMonthlyUpdate(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleEditInputChange = (e) => {
    const { name, value } = e.target
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleEditRecord = (index) => {
    if (!canAddPerformance) {
      setError('You do not have permission to edit monthly performance.')
      return
    }
    
    const record = monthlyHistory[index]
    setEditFormData({
      month: record.month || '',
      year: record.year || '',
      percentageGrowth: record.percentageGrowth || '',
      depositAmount: record.depositAmount || '',
      depositDate: record.depositDate || '',
      withdrawalAmount: record.withdrawalAmount || '',
      withdrawalDate: record.withdrawalDate || ''
    })
    setEditingRecordIndex(index)
    setShowAddPerformance(false)
  }

  const handleCancelEdit = () => {
    setEditingRecordIndex(null)
    setEditFormData({
      month: '',
      year: '',
      percentageGrowth: '',
      depositAmount: '',
      depositDate: '',
      withdrawalAmount: '',
      withdrawalDate: ''
    })
    setError('')
    setSuccess('')
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!canAddPerformance) {
      setError('You do not have permission to edit monthly performance.')
      return
    }
    if (!portfolioData || editingRecordIndex === null) {
      setError('Invalid edit operation.')
      return
    }
    setLoadingEdit(true)
    setError('')
    setSuccess('')
    try {
      const db = getFirestore()
      const ownerId = portfolioOwnerId || user.uid
      const userDocRef = doc(db, 'users', ownerId)
      const userDoc = await getDoc(userDocRef)
      if (!userDoc.exists()) {
        setError('User document not found')
        return
      }
      const userData = userDoc.data()
      const currentInvestmentData = (isAdmin3 ? portfolioData : userData.investmentData) || {}
      // Sort the existing history first to ensure we're working with chronological order
      const existingHistory = sortMonthlyHistory(currentInvestmentData.monthlyHistory || [])
      
      // Helper functions (same as in handleAddPerformance)
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
      // It's the ending balance of the previous record, or initial investment if it's the first record
      let startingBalance = currentInvestmentData.initialInvestment || 0
      if (editingRecordIndex > 0) {
        startingBalance = existingHistory[editingRecordIndex - 1].endingBalance || startingBalance
      }

      // Calculate new values for the edited record
      const percentageGrowth = parseFloat(editFormData.percentageGrowth) || 0
      const growthAmount = startingBalance * (percentageGrowth / 100)
      const depositAmount = parseFloat(editFormData.depositAmount) || 0
      const withdrawalAmount = parseFloat(editFormData.withdrawalAmount) || 0
      
      const depositGrowth = calculateProratedGrowth(
        depositAmount, 
        percentageGrowth, 
        editFormData.depositDate, 
        editFormData.month, 
        editFormData.year
      )
      
      const withdrawalGrowth = calculateWithdrawalGrowthLoss(
        withdrawalAmount, 
        percentageGrowth, 
        editFormData.withdrawalDate, 
        editFormData.month, 
        editFormData.year
      )

      const endingBalance = startingBalance + growthAmount + depositAmount + depositGrowth - withdrawalAmount - withdrawalGrowth

      // Update the record at the editing index
      const updatedRecord = {
        month: editFormData.month,
        year: editFormData.year,
        percentageGrowth: percentageGrowth,
        growthAmount: growthAmount,
        depositGrowth: depositGrowth,
        withdrawalGrowth: withdrawalGrowth,
        startingBalance: startingBalance,
        endingBalance: endingBalance,
        depositAmount: depositAmount,
        depositDate: editFormData.depositDate || null,
        withdrawalAmount: withdrawalAmount,
        withdrawalDate: editFormData.withdrawalDate || null,
        updatedAt: new Date().toISOString()
      }

      // Update the record at the editing index
      existingHistory[editingRecordIndex] = updatedRecord

      // Sort the history chronologically (in case month/year was changed)
      const sortedHistory = sortMonthlyHistory(existingHistory)

      // Recalculate ALL records in chronological order from the beginning
      // This ensures proper calculation even if the order changed
      let runningBalance = currentInvestmentData.initialInvestment || 0
      const recalculatedHistory = sortedHistory.map((record, index) => {
        const recordPercentageGrowth = record.percentageGrowth || 0
        const recordGrowthAmount = runningBalance * (recordPercentageGrowth / 100)
        const recordDepositAmount = record.depositAmount || 0
        const recordWithdrawalAmount = record.withdrawalAmount || 0
        
        const recordDepositGrowth = calculateProratedGrowth(
          recordDepositAmount,
          recordPercentageGrowth,
          record.depositDate,
          record.month,
          record.year
        )
        
        const recordWithdrawalGrowth = calculateWithdrawalGrowthLoss(
          recordWithdrawalAmount,
          recordPercentageGrowth,
          record.withdrawalDate,
          record.month,
          record.year
        )

        const recordStartingBalance = runningBalance
        runningBalance = runningBalance + recordGrowthAmount + recordDepositAmount + recordDepositGrowth - recordWithdrawalAmount - recordWithdrawalGrowth

        return {
          ...record,
          startingBalance: recordStartingBalance,
          growthAmount: recordGrowthAmount,
          endingBalance: runningBalance,
          depositGrowth: recordDepositGrowth,
          withdrawalGrowth: recordWithdrawalGrowth,
          updatedAt: record.updatedAt || new Date().toISOString()
        }
      })

      // Recalculate totals
      let newTotalDeposits = currentInvestmentData.initialInvestment || 0
      let newTotalWithdrawals = 0
      recalculatedHistory.forEach(record => {
        newTotalDeposits += (record.depositAmount || 0)
        newTotalWithdrawals += (record.withdrawalAmount || 0)
      })

      // Update investment data
      const updatedInvestmentData = {
        ...currentInvestmentData,
        currentBalance: runningBalance,
        totalDeposits: newTotalDeposits,
        totalWithdrawals: newTotalWithdrawals,
        monthlyHistory: recalculatedHistory,
        lastUpdated: new Date().toISOString()
      }

      if (isAdmin3 && user?.uid) {
        await saveAdmin3UserOverride(user.uid, ownerId, { investmentData: updatedInvestmentData })
      } else {
        await updateDoc(userDocRef, {
          investmentData: updatedInvestmentData,
          updatedAt: new Date().toISOString()
        })
      }
      setSuccess(isAdmin3 ? 'Saved to your sandbox (changes visible only to you)' : `Monthly record for ${editFormData.month} ${editFormData.year} updated successfully!`)
      setEditingRecordIndex(null)
      setEditFormData({
        month: '',
        year: '',
        percentageGrowth: '',
        depositAmount: '',
        depositDate: '',
        withdrawalAmount: '',
        withdrawalDate: ''
      })
      
      // Reload portfolio data and total investor accounts
      await loadPortfolioData()
      await loadTotalInvestorAccounts()
    } catch (error) {
      console.error('Error updating monthly record:', error)
      setError(`Failed to update monthly record: ${error.message}`)
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleAddPerformance = async (e) => {
    e.preventDefault()
    if (!canAddPerformance) {
      setError('You do not have permission to add monthly performance.')
      return
    }
    if (!portfolioData) {
      setError('Portfolio data not found. Please initialize your portfolio first.')
      return
    }
    setLoadingMonthlyUpdate(true)
    setError('')
    setSuccess('')
    try {
      const db = getFirestore()
      const ownerId = portfolioOwnerId || user.uid
      const userDocRef = doc(db, 'users', ownerId)
      const userDoc = await getDoc(userDocRef)
      if (!userDoc.exists()) {
        setError('User document not found')
        return
      }
      const userData = userDoc.data()
      const currentInvestmentData = (isAdmin3 ? portfolioData : userData.investmentData) || {}
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

      // Update investment data
      const updatedInvestmentData = {
        ...currentInvestmentData,
        currentBalance: newBalance,
        totalDeposits: newTotalDeposits,
        totalWithdrawals: newTotalWithdrawals,
        monthlyHistory: sortedHistory,
        lastUpdated: new Date().toISOString()
      }

      if (isAdmin3 && user?.uid) {
        await saveAdmin3UserOverride(user.uid, ownerId, { investmentData: updatedInvestmentData })
      } else {
        await updateDoc(userDocRef, {
          investmentData: updatedInvestmentData,
          updatedAt: new Date().toISOString()
        })
      }
      setSuccess(isAdmin3 ? 'Saved to your sandbox (changes visible only to you)' : `Monthly update for ${monthlyUpdate.month} ${monthlyUpdate.year} saved successfully!`)
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
      
      // Reload portfolio data and total investor accounts
      await loadPortfolioData()
      await loadTotalInvestorAccounts()
    } catch (error) {
      console.error('Error updating monthly performance:', error)
      setError(`Failed to update monthly performance: ${error.message}`)
    } finally {
      setLoadingMonthlyUpdate(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-portfolio-loading">
        <div className="loading-spinner">Loading portfolio...</div>
      </div>
    )
  }

  // If no portfolio data, show initialization message
  if (!portfolioData) {
    return (
      <div className="admin-portfolio-container">
        <div className="admin-portfolio-no-data">
          <h2>Admin Portfolio</h2>
          <p>Your portfolio has not been initialized yet. Please contact system administrator or initialize your portfolio data.</p>
        </div>
      </div>
    )
  }

  // Calculate portfolio display data
  const initialInvestment = portfolioData.initialInvestment || 0
  const monthlyReturnRate = portfolioData.monthlyReturnRate || 0.03
  const monthlyAdditions = portfolioData.monthlyAdditions || 0
  const currentBalance = portfolioData.currentBalance || initialInvestment
  const totalDeposits = portfolioData.totalDeposits || initialInvestment
  const totalWithdrawals = portfolioData.totalWithdrawals || 0
  // Ensure monthly history is sorted chronologically for display
  const monthlyHistory = sortMonthlyHistory(portfolioData.monthlyHistory || [])

  // Calculate metrics
  const totalGain = monthlyHistory.reduce((sum, record) => {
    return sum + (record.growthAmount || 0)
  }, 0)

  const depositCount = 1 + monthlyHistory.filter(record => (record.depositAmount || 0) > 0).length
  const averageMonthlyInput = depositCount > 0 ? totalDeposits / depositCount : 0

  const totalPercentageGain = monthlyHistory.reduce((sum, record) => {
    return sum + (record.percentageGrowth || 0)
  }, 0)

  // Calculate 5-month projection
  let projectionStartingBalance = currentBalance
  if (monthlyHistory.length > 0) {
    const lastMonth = monthlyHistory[monthlyHistory.length - 1]
    projectionStartingBalance = lastMonth.endingBalance || currentBalance
  }
  
  let projectedBalance = projectionStartingBalance
  for (let month = 1; month <= 5; month++) {
    projectedBalance = projectedBalance * (1 + monthlyReturnRate) + monthlyAdditions
  }
  const projection5Months = projectedBalance

  // Calculate graph data
  const calculateGraphData = () => {
    const data = []
    
    // Helper function to convert month name to number
    const getMonthNumber = (monthName) => {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December']
      return monthNames.indexOf(monthName) + 1
    }
    
    // Helper function to format label as MM/YY
    const formatLabel = (month, year) => {
      const monthNum = typeof month === 'string' ? getMonthNumber(month) : month
      const yearStr = year.toString()
      const yearShort = yearStr.length >= 2 ? yearStr.slice(-2) : yearStr
      return `${monthNum}/${yearShort}`
    }
    
    if (monthlyHistory.length > 0) {
      const firstYear = monthlyHistory[0]?.year || new Date().getFullYear()
      data.push({
        month: -monthlyHistory.length,
        balance: initialInvestment,
        label: 'Start',
        year: firstYear,
        isHistorical: true
      })
      
      monthlyHistory.forEach((record, index) => {
        data.push({
          month: index - monthlyHistory.length + 1,
          balance: record.endingBalance,
          label: formatLabel(record.month, record.year),
          year: record.year,
          monthNum: getMonthNumber(record.month),
          isHistorical: true
        })
      })
    } else {
      data.push({
        month: 0,
        balance: currentBalance,
        label: 'Now',
        year: new Date().getFullYear().toString(),
        isHistorical: false
      })
    }
    
    let projectionStartingBalance = currentBalance
    let lastMonthRecord = null
    if (monthlyHistory.length > 0) {
      lastMonthRecord = monthlyHistory[monthlyHistory.length - 1]
      projectionStartingBalance = lastMonthRecord.endingBalance || currentBalance
    }
    
    let projectedBalance = projectionStartingBalance
    for (let month = 1; month <= 5; month++) {
      projectedBalance = projectedBalance * (1 + monthlyReturnRate) + monthlyAdditions
      
      // Calculate the actual month/year for projection
      let projectionMonth = 0
      let projectionYear = 0
      if (lastMonthRecord) {
        const lastMonthNum = getMonthNumber(lastMonthRecord.month)
        const lastYear = parseInt(lastMonthRecord.year)
        projectionMonth = lastMonthNum + month
        projectionYear = lastYear
        // Handle year rollover
        while (projectionMonth > 12) {
          projectionMonth -= 12
          projectionYear += 1
        }
      } else {
        // If no history, use current date + projection months
        const now = new Date()
        projectionMonth = now.getMonth() + 1 + month
        projectionYear = now.getFullYear()
        while (projectionMonth > 12) {
          projectionMonth -= 12
          projectionYear += 1
        }
      }
      
      data.push({
        month: monthlyHistory.length + month,
        balance: projectedBalance,
        label: formatLabel(projectionMonth, projectionYear),
        year: projectionYear.toString(),
        monthNum: projectionMonth,
        isHistorical: false
      })
    }
    
    return data
  }

  const projectionData = calculateGraphData()
  const maxBalance = Math.max(...projectionData.map(d => d.balance))
  const minBalance = Math.min(...projectionData.map(d => d.balance))
  const range = maxBalance - minBalance || 1

  // First point of each year for x-axis labels (one label per year)
  const yearLabelIndices = {}
  projectionData.forEach((p, i) => {
    if (p.year && yearLabelIndices[p.year] === undefined) yearLabelIndices[p.year] = i
  })

  return (
    <div className="admin-portfolio-container">
      <div className="admin-portfolio-content">
        <div className="admin-portfolio-header">
          <h2 className="admin-portfolio-title">Admin Portfolio</h2>
          {/* Only show Add Performance button if user has permission */}
          {canAddPerformance && (
            <button 
              className="btn-add-performance"
              onClick={() => {
                if (editingRecordIndex === null) {
                  setShowAddPerformance(!showAddPerformance)
                  if (showAddPerformance) {
                    setError('')
                    setSuccess('')
                  }
                }
              }}
              disabled={editingRecordIndex !== null}
            >
              {showAddPerformance ? 'Cancel' : '+ Add Monthly Performance'}
            </button>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Edit Performance Form - Only show if user has permission and a record is being edited */}
        {editingRecordIndex !== null && canAddPerformance && (
          <div className="add-performance-section edit-performance-section">
            <h3 className="section-title">Edit Monthly Performance - {monthlyHistory[editingRecordIndex]?.month} {monthlyHistory[editingRecordIndex]?.year}</h3>
            <form onSubmit={handleSaveEdit} className="performance-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-month">Month *</label>
                  <select
                    id="edit-month"
                    name="month"
                    value={editFormData.month}
                    onChange={handleEditInputChange}
                    required
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
                  <label htmlFor="edit-year">Year *</label>
                  <input
                    type="number"
                    id="edit-year"
                    name="year"
                    value={editFormData.year}
                    onChange={handleEditInputChange}
                    min="2020"
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-percentageGrowth">Growth Percentage (%) *</label>
                  <input
                    type="number"
                    id="edit-percentageGrowth"
                    name="percentageGrowth"
                    value={editFormData.percentageGrowth}
                    onChange={handleEditInputChange}
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-depositAmount">Deposit Amount (Optional)</label>
                  <input
                    type="number"
                    id="edit-depositAmount"
                    name="depositAmount"
                    value={editFormData.depositAmount}
                    onChange={handleEditInputChange}
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-depositDate">Deposit Date (Optional)</label>
                  <input
                    type="date"
                    id="edit-depositDate"
                    name="depositDate"
                    value={editFormData.depositDate}
                    onChange={handleEditInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-withdrawalAmount">Withdrawal Amount (Optional)</label>
                  <input
                    type="number"
                    id="edit-withdrawalAmount"
                    name="withdrawalAmount"
                    value={editFormData.withdrawalAmount}
                    onChange={handleEditInputChange}
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-withdrawalDate">Withdrawal Date (Optional)</label>
                  <input
                    type="date"
                    id="edit-withdrawalDate"
                    name="withdrawalDate"
                    value={editFormData.withdrawalDate}
                    onChange={handleEditInputChange}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCancelEdit}
                  disabled={loadingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={loadingEdit}
                >
                  {loadingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add Performance Form - Only show if user has permission */}
        {showAddPerformance && canAddPerformance && editingRecordIndex === null && (
          <div className="add-performance-section">
            <h3 className="section-title">Add Monthly Performance</h3>
            <form onSubmit={handleAddPerformance} className="performance-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="month">Month *</label>
                  <select
                    id="month"
                    name="month"
                    value={monthlyUpdate.month}
                    onChange={handleInputChange}
                    required
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
                  <label htmlFor="year">Year *</label>
                  <input
                    type="number"
                    id="year"
                    name="year"
                    value={monthlyUpdate.year}
                    onChange={handleInputChange}
                    min="2020"
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="percentageGrowth">Growth Percentage (%) *</label>
                  <input
                    type="number"
                    id="percentageGrowth"
                    name="percentageGrowth"
                    value={monthlyUpdate.percentageGrowth}
                    onChange={handleInputChange}
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="depositAmount">Deposit Amount (Optional)</label>
                  <input
                    type="number"
                    id="depositAmount"
                    name="depositAmount"
                    value={monthlyUpdate.depositAmount}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="depositDate">Deposit Date (Optional)</label>
                  <input
                    type="date"
                    id="depositDate"
                    name="depositDate"
                    value={monthlyUpdate.depositDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="withdrawalAmount">Withdrawal Amount (Optional)</label>
                  <input
                    type="number"
                    id="withdrawalAmount"
                    name="withdrawalAmount"
                    value={monthlyUpdate.withdrawalAmount}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="withdrawalDate">Withdrawal Date (Optional)</label>
                  <input
                    type="date"
                    id="withdrawalDate"
                    name="withdrawalDate"
                    value={monthlyUpdate.withdrawalDate}
                    onChange={handleInputChange}
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
                  <div className="update-preview">
                    <h5>Update Preview:</h5>
                    <div className="preview-grid">
                      <div className="preview-item">
                        <span>Starting Balance:</span>
                        <span>€{startingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="preview-item">
                        <span>Growth ({percentageGrowth}%):</span>
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
                      <div className="preview-item preview-total">
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
              >
                {loadingMonthlyUpdate ? 'Saving...' : 'Save Monthly Performance'}
              </button>
            </form>
          </div>
        )}

        {/* Investment Graph */}
        <div className="portfolio-graph-section">
          <h3 className="section-subtitle">Investment Growth & Projection</h3>
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
              
              {/* Historical line */}
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
              
              {/* Projection line */}
              {projectionData.some(p => !p.isHistorical) && (
                <polyline
                  points={projectionData.map((point, index) => {
                    const totalPoints = projectionData.length
                    const x = 50 + (index * (700 / Math.max(totalPoints - 1, 1)))
                    const y = 350 - ((point.balance - minBalance) / range * 300)
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
                const showAmount = index % 6 === 0
                const showYearLabel = point.year && yearLabelIndices[point.year] === index
                return (
                  <g key={index}>
                    {showAmount && (
                      <text
                        x={x}
                        y={y - 15}
                        fill="#1f2937"
                        fontSize="11"
                        textAnchor="middle"
                        fontWeight="600"
                      >
                        {formatCompact(point.balance)}
                      </text>
                    )}
                    {showYearLabel && (
                      <text
                        x={x}
                        y={380}
                        fill="#6b7280"
                        fontSize="12"
                        textAnchor="middle"
                        fontWeight="500"
                      >
                        {point.year}
                      </text>
                    )}
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
              <p className="metric-value">{formatCompact(currentBalance)}</p>
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
                {formatCompact(totalGain)}
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
              <h4 className="metric-label">Total Investor Accounts</h4>
              <p className="metric-value">
                {loadingInvestorAccounts ? 'Loading...' : formatCompact(isAdmin3 ? 1850000 : totalInvestorAccounts)}
              </p>
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
              <p className="metric-value">{formatCompact(averageMonthlyInput)}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <div className="metric-content">
              <h4 className="metric-label">Total Deposits</h4>
              <p className="metric-value">{formatCompact(totalDeposits)}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <div className="metric-content">
              <h4 className="metric-label">Total Withdrawals</h4>
              <p className="metric-value">{formatCompact(totalWithdrawals)}</p>
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
              <p className="metric-value">{formatCompact(initialInvestment)}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.99 14.993 6-6m6 3.001c0 1.268-.63 2.39-1.593 3.069a3.746 3.746 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043 3.745 3.745 0 0 1-3.068 1.593c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 0 1-3.296-1.043 3.746 3.746 0 0 1-1.043-3.297 3.746 3.746 0 0 1-1.593-3.068c0-1.268.63-2.39 1.593-3.068a3.746 3.746 0 0 1 1.043-3.297 3.745 3.745 0 0 1 3.296-1.042 3.745 3.745 0 0 1 3.068-1.594c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.297 3.746 3.746 0 0 1 1.593 3.068ZM9.74 9.743h.008v.007H9.74v-.007Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
            <div className="metric-content">
              <h4 className="metric-label">Total % Gain</h4>
              <p className={`metric-value ${totalPercentageGain >= 0 ? 'positive' : 'negative'}`}>
                {totalPercentageGain.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Monthly History Section */}
        {monthlyHistory.length > 0 && (
          <div className="portfolio-history-section">
            <h3 className="section-subtitle">Monthly Performance History</h3>
            <div className="history-container">
              <div className={`history-table ${canAddPerformance ? 'with-actions' : ''}`}>
                <div className="history-header">
                  <div>Month/Year</div>
                  <div>Growth %</div>
                  <div>Growth Amount</div>
                  <div>Deposit</div>
                  <div>Withdrawal</div>
                  <div>Ending Balance</div>
                  {canAddPerformance && <div>Actions</div>}
                </div>
                {monthlyHistory.map((record, index) => (
                  <div key={index} className={`history-row ${editingRecordIndex === index ? 'editing' : ''}`}>
                    <div>{record.month} {record.year}</div>
                    <div>{record.percentageGrowth}%</div>
                    <div>€{record.growthAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
                    <div>{record.depositAmount > 0 ? `€${record.depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</div>
                    <div>{record.withdrawalAmount > 0 ? `€${record.withdrawalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</div>
                    <div>€{record.endingBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
                    {canAddPerformance && (
                      <div>
                        <button
                          className="btn-edit-record"
                          onClick={() => handleEditRecord(index)}
                          disabled={editingRecordIndex !== null && editingRecordIndex !== index}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPortfolio

