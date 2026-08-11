import React, { useState, useEffect } from 'react'
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore'
import { getAdmin3Overrides, saveAdmin3UserOverride, mergeUserWithOverride } from '../utils/admin3Overrides'
import { getAdmin3SampleInvestors } from '../utils/admin3SampleUsers'
import {
  TRANCHE_PRIMARY,
  TRANCHE_SECONDARY,
  getLastTrancheEnding,
  computeDualTrancheSumBalance,
  getInvestorCombinedInitial,
  getAdminInvestorSummaryCurrentBalance,
  getAdminInvestorSummaryTotalDeposits,
  getAdminPerformancePreviewStartingBalance
} from '../utils/investorDualTranche'
import './AdminInvestorsManagement.css'

const PLACEHOLDER_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1']
const PIE_SLICE_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#ef4444', '#84cc16']

const isPartnerUser = (inv) => Array.isArray(inv?.statuses) && inv.statuses.includes('Partner')

const polarToCartesian = (cx, cy, r, deg) => {
  const rad = (deg - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

const pieSlicePath = (cx, cy, r, startDeg, endDeg) => {
  if (endDeg - startDeg >= 359.999) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
  }
  const start = polarToCartesian(cx, cy, r, endDeg)
  const end = polarToCartesian(cx, cy, r, startDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
}

function buildInvestorPieSlices(investors, getBalance) {
  const rows = investors
    .map((inv, index) => ({
      id: inv.id,
      name: inv.displayName || inv.email || 'Investor',
      balance: Math.max(0, getBalance(inv) || 0),
      color: PIE_SLICE_COLORS[index % PIE_SLICE_COLORS.length],
      isPartner: isPartnerUser(inv)
    }))
    .filter((row) => row.balance > 0)
  const total = rows.reduce((sum, row) => sum + row.balance, 0)
  let angle = -90
  return rows.map((row) => {
    const sweep = total > 0 ? (row.balance / total) * 360 : 0
    const start = angle
    const end = angle + sweep
    angle = end
    return {
      ...row,
      path: pieSlicePath(90, 90, 78, start, end),
      share: total > 0 ? (row.balance / total) * 100 : 0
    }
  })
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

  const getInvestorDisplayBalance = (investor) =>
    getAdminInvestorSummaryCurrentBalance(investor?.investmentData)

  useEffect(() => {
    loadInvestors()
  }, [])

  useEffect(() => {
    if (selectedInvestor) {
      setShowViewPerformance(false)
      setShowAddPerformance(false)
      setError('')
      setSuccess('')
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

      setInvestors(investorsList)
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
    setShowPartnerManagement(true)
    setError('')
    setSuccess('')
  }

  const closePartnerManagement = () => {
    setShowPartnerManagement(false)
    setPartnerManagedIds([])
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
      percentageGrowth: record.percentageGrowth.toString(),
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

      // Helper functions for prorated growth (same as in handleAddPerformance)
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
        const proratedRatio = (daysInMonth - dayOfMonth) / daysInMonth
        return amount * (percentageGrowth / 100) * proratedRatio
      }

      // Calculate the starting balance for this month
      // It should be the ending balance of the previous month, or initial investment if it's the first month
      let startingBalance = currentInvestmentData.initialInvestment || 0
      if (recordIndex > 0) {
        startingBalance = monthlyHistory[recordIndex - 1].endingBalance || startingBalance
      }

      // Recalculate the month's data with edited values
      const percentageGrowth = parseFloat(editedRecordData.percentageGrowth) || 0
      const growthAmount = startingBalance * (percentageGrowth / 100)
      let newBalance = startingBalance + growthAmount

      const normalizedDepositEntries = (editedRecordData.depositEntries || [])
        .map((entry) => ({ amount: parseFloat(entry?.amount) || 0, date: entry?.date || null }))
        .filter((entry) => entry.amount > 0 || entry.date)
      const normalizedWithdrawalEntries = (editedRecordData.withdrawalEntries || [])
        .map((entry) => ({ amount: parseFloat(entry?.amount) || 0, date: entry?.date || null }))
        .filter((entry) => entry.amount > 0 || entry.date)

      const depositAmount = normalizedDepositEntries.reduce((sum, entry) => sum + entry.amount, 0)
      const depositGrowth = normalizedDepositEntries.reduce((sum, entry) => (
        sum + calculateProratedGrowth(
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

      // Update the record
      const updatedRecord = {
        month: editedRecordData.month,
        year: editedRecordData.year,
        percentageGrowth: percentageGrowth,
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
      }

      // Update the history array
      const updatedHistory = [...monthlyHistory]
      updatedHistory[recordIndex] = updatedRecord

      // Recalculate all subsequent months' balances
      let runningBalance = newBalance
      for (let i = recordIndex + 1; i < updatedHistory.length; i++) {
        const prevRecord = updatedHistory[i - 1]
        const currentRecord = updatedHistory[i]
        
        // Recalculate starting from previous month's ending balance
        runningBalance = prevRecord.endingBalance
        const monthGrowth = runningBalance * (currentRecord.percentageGrowth / 100)
        runningBalance = runningBalance + monthGrowth
        
        const depEntries = Array.isArray(currentRecord.depositEntries) && currentRecord.depositEntries.length > 0
          ? currentRecord.depositEntries
          : [{ amount: currentRecord.depositAmount || 0, date: currentRecord.depositDate || null }]
        const wdEntries = Array.isArray(currentRecord.withdrawalEntries) && currentRecord.withdrawalEntries.length > 0
          ? currentRecord.withdrawalEntries
          : [{ amount: currentRecord.withdrawalAmount || 0, date: currentRecord.withdrawalDate || null }]
        const depAmount = depEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
        const wdAmount = wdEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
        const depGrowth = depEntries.reduce((sum, entry) => (
          sum + calculateProratedGrowth(
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
        
        updatedHistory[i] = {
          ...currentRecord,
          startingBalance: prevRecord.endingBalance,
          endingBalance: runningBalance,
          depositAmount: depAmount,
          depositDate: depEntries[0]?.date || null,
          withdrawalAmount: wdAmount,
          withdrawalDate: wdEntries[0]?.date || null,
          depositGrowth: depGrowth,
          withdrawalGrowthLoss: wdGrowth,
          depositEntries: depEntries,
          withdrawalEntries: wdEntries
        }
      }

      // Update current balance to be the last month's ending balance
      const finalBalance = updatedHistory.length > 0 
        ? updatedHistory[updatedHistory.length - 1].endingBalance 
        : currentInvestmentData.initialInvestment || 0

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

      // Helper function to get days in a month
      const getDaysInMonth = (month, year) => {
        const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month)
        return new Date(year, monthIndex + 1, 0).getDate()
      }

      // Helper function to calculate prorated growth based on day of month
      const calculateProratedGrowth = (amount, percentageGrowth, date, month, year) => {
        if (!date || !month || !year || amount === 0) return 0
        
        const depositDate = new Date(date)
        const dayOfMonth = depositDate.getDate()
        const daysInMonth = getDaysInMonth(month, parseInt(year))
        
        // If deposit is on day 1, get full month's growth
        // If deposit is on day 15, get half month's growth (15/30 or 15/31)
        // If deposit is on day 31, get no growth (31/31 = 1, but we want 0 since it's the last day)
        // Formula: (daysInMonth - dayOfMonth + 1) / daysInMonth
        // Day 1: (30-1+1)/30 = 1.0 (full growth)
        // Day 15: (30-15+1)/30 = 0.533 (about half)
        // Day 31: (31-31+1)/31 = 0.032 (almost no growth, but we'll set it to 0 for day 31)
        
        let daysRemaining = daysInMonth - dayOfMonth + 1
        // If it's the last day of the month, no growth
        if (dayOfMonth === daysInMonth) {
          daysRemaining = 0
        }
        
        const proratedRatio = daysRemaining / daysInMonth
        return amount * (percentageGrowth / 100) * proratedRatio
      }

      // Calculate new balance based on percentage growth
      const percentageGrowth = parseFloat(monthlyUpdate.percentageGrowth) || 0
      const growthAmount = currentBalance * (percentageGrowth / 100)
      let newBalance = currentBalance + growthAmount

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
      
      // Calculate withdrawal growth loss (negative impact - they lose growth on the amount withdrawn)
      // If withdrawal is on day 1, they lose full month's growth (money withdrawn at start, earned no growth)
      // If withdrawal is on day 15, they lose about half month's growth (money was there for half the month)
      // If withdrawal is on day 31 (last day), they lose no growth (money was there almost the whole month)
      // Formula: (daysInMonth - dayOfMonth) / daysInMonth
      // Day 1: (31-1)/31 = 30/31 = 97% loss (almost full)
      // Day 15: (31-15)/31 = 16/31 = 52% loss (about half)
      // Day 31: (31-31)/31 = 0/31 = 0% loss (zero)
      const calculateWithdrawalGrowthLoss = (amount, percentageGrowth, date, month, year) => {
        if (!date || !month || !year || amount === 0) return 0
        
        const withdrawalDate = new Date(date)
        const dayOfMonth = withdrawalDate.getDate()
        const daysInMonth = getDaysInMonth(month, parseInt(year))
        
        // Calculate days remaining in month after withdrawal
        const daysRemaining = daysInMonth - dayOfMonth
        const proratedRatio = daysRemaining / daysInMonth
        return amount * (percentageGrowth / 100) * proratedRatio
      }
      
      const depositGrowth = normalizedDepositEntries.reduce((sum, entry) => (
        sum + calculateProratedGrowth(
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
      }

      // Get existing monthly history
      const existingHistory = currentInvestmentData.monthlyHistory || []
      const updatedHistory = [...existingHistory, monthlyRecord]

      const finalCombinedBalance =
        scope === 'account'
          ? newBalance
          : computeDualTrancheSumBalance(updatedHistory, primaryInit, secondaryInit)

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
      setMonthlyUpdate({
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
      setShowAddPerformance(false)

      // Reload investors and update selected investor
      await loadInvestors()
      const updatedUserDoc = await getDoc(userDocRef)
      if (updatedUserDoc.exists()) {
        const updatedUserData = updatedUserDoc.data()
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

  const partnerPieSlices = buildInvestorPieSlices(investors, getInvestorDisplayBalance)
  const partnerPieTotal = partnerPieSlices.reduce((sum, row) => sum + row.balance, 0)
  const partnerManagedTotal = partnerPieSlices
    .filter((row) => partnerManagedIds.includes(row.id))
    .reduce((sum, row) => sum + row.balance, 0)
  const partnerManagedPct = partnerPieTotal > 0 ? (partnerManagedTotal / partnerPieTotal) * 100 : 0
  const assignableInvestors = selectedInvestor ? getAssignableInvestors(selectedInvestor.id) : []

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
                return (
                <div
                  key={investor.id}
                  className={`investor-card ${selectedInvestor?.id === investor.id ? 'selected' : ''}${partner ? ' investor-card-partner' : ''}`}
                  onClick={() => handleInvestorSelect(investor)}
                >
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
                <div className="portfolio-summary-section">
                  <h3 className="section-title">Current Portfolio Summary</h3>
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
                            onChange={(e) => setEditedRecordData({ ...editedRecordData, percentageGrowth: e.target.value })}
                            placeholder="2.0"
                            step="0.01"
                            min="-100"
                            max="100"
                          />
                        </div>
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
                            disabled={loadingEdit || !editedRecordData.month || !editedRecordData.year || !editedRecordData.percentageGrowth}
                            className="btn-submit btn-submit--edit-record"
                          >
                            {loadingEdit ? 'Updating...' : 'Update Record'}
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
                            onChange={(e) =>
                              setMonthlyUpdate({ ...monthlyUpdate, performanceScope: e.target.value })
                            }
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
                          onChange={(e) => handleMonthlyUpdateFieldChange('percentageGrowth', e.target.value)}
                          placeholder="2.0"
                          step="0.01"
                          min="-100"
                          max="100"
                        />
                        {monthlyUpdate.percentageGrowth && selectedInvestor.investmentData && (
                          <small className="form-help">
                            Equivalent to: €{(getAdminPerformancePreviewStartingBalance(selectedInvestor.investmentData, monthlyUpdate.performanceScope || 'primary') * (parseFloat(monthlyUpdate.percentageGrowth) / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </small>
                        )}
                      </div>
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
                          disabled={loadingMonthlyUpdate || !monthlyUpdate.month || !monthlyUpdate.year || !monthlyUpdate.percentageGrowth}
                          className="btn-submit btn-submit--investor-monthly-save"
                        >
                          {loadingMonthlyUpdate ? 'Saving...' : 'Save Monthly Update'}
                        </button>
                      </div>
                    </div>

                    {monthlyUpdate.percentageGrowth && selectedInvestor.investmentData && (() => {
                      // Calculate prorated growth for preview
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
                        sum + calculateProratedGrowth(
                          entry.amount,
                          percentageGrowth,
                          entry.date,
                          monthlyUpdate.month,
                          monthlyUpdate.year
                        )
                      ), 0)
                      
                      const calculateWithdrawalGrowthLoss = (amount, percentageGrowth, date, month, year) => {
                        if (!date || !month || !year || amount === 0) return 0
                        
                        const withdrawalDate = new Date(date)
                        const dayOfMonth = withdrawalDate.getDate()
                        const daysInMonth = getDaysInMonth(month, parseInt(year))
                        
                        // For withdrawals: (daysInMonth - dayOfMonth) / daysInMonth
                        // Day 1: (31-1)/31 = 30/31 = 97% loss (almost full)
                        // Day 15: (31-15)/31 = 16/31 = 52% loss (about half)
                        // Day 31: (31-31)/31 = 0/31 = 0% loss (zero)
                        const daysRemaining = daysInMonth - dayOfMonth
                        const proratedRatio = daysRemaining / daysInMonth
                        return amount * (percentageGrowth / 100) * proratedRatio
                      }
                      
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

                      return (
                        <div className="update-preview">
                          <h5>Update Preview:</h5>
                          <div className="preview-grid">
                            <div className="preview-item">
                              <span>Starting Balance:</span>
                              <span>€{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="preview-item">
                              <span>Growth ({monthlyUpdate.percentageGrowth}%):</span>
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
                <svg viewBox="0 0 180 180" className="partner-management-pie" aria-label="Investor fund allocation">
                  <circle cx="90" cy="90" r="78" fill="#f3f4f6" />
                  {partnerPieSlices.map((slice) => {
                    const selected = partnerManagedIds.includes(slice.id)
                    const dimmed = partnerManagedIds.length > 0 && !selected
                    return (
                      <path
                        key={slice.id}
                        d={slice.path}
                        fill={slice.color}
                        stroke={selected ? '#eab308' : '#ffffff'}
                        strokeWidth={selected ? 3 : 1.5}
                        opacity={dimmed ? 0.35 : 1}
                      />
                    )
                  })}
                </svg>
                <div className="partner-management-summary">
                  <div className="partner-management-summary-row">
                    <span>Total investor funds</span>
                    <strong>
                      €{partnerPieTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="partner-management-summary-row partner-management-summary-row-managed">
                    <span>Managed by partner</span>
                    <strong>
                      €{partnerManagedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {' '}
                      ({partnerManagedPct.toFixed(1)}%)
                    </strong>
                  </div>
                </div>
              </div>

              <div className="partner-management-list-section">
                <p className="partner-management-list-label">Select investors under this partner&apos;s management</p>
                <div className="partner-management-investor-list">
                  {assignableInvestors.length === 0 ? (
                    <p className="partner-management-empty">No assignable investors.</p>
                  ) : (
                    assignableInvestors.map((inv) => {
                      const slice = partnerPieSlices.find((row) => row.id === inv.id)
                      const balance = getInvestorDisplayBalance(inv)
                      const checked = partnerManagedIds.includes(inv.id)
                      return (
                        <label key={inv.id} className={`partner-management-investor-row${checked ? ' selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePartnerManagedInvestor(inv.id)}
                            disabled={!canManagePartners}
                          />
                          <span className="partner-management-dot" style={{ backgroundColor: slice?.color || '#9ca3af' }} />
                          <span className="partner-management-investor-name">{inv.displayName || inv.email}</span>
                          <span className="partner-management-investor-balance">
                            €{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {slice && (
                            <span className="partner-management-investor-share">{slice.share.toFixed(1)}%</span>
                          )}
                        </label>
                      )
                    })
                  )}
                </div>
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

