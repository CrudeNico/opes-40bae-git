import React, { useState, useEffect } from 'react'
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore'
import './AdminInvestorsManagement.css'

const AdminInvestorsManagement = () => {
  const [investors, setInvestors] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedInvestor, setSelectedInvestor] = useState(null)
  const [showViewPerformance, setShowViewPerformance] = useState(false)
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
  const [editingRecord, setEditingRecord] = useState(null)
  const [editedRecordData, setEditedRecordData] = useState({})
  const [loadingEdit, setLoadingEdit] = useState(false)

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
      const usersCollection = collection(db, 'users')
      const usersSnapshot = await getDocs(usersCollection)
      
      const investorsList = []
      usersSnapshot.forEach((docSnapshot) => {
        const userData = docSnapshot.data()
        const statuses = userData.statuses || []
        
        // Only include users who are investors with approved investment accounts
        if (statuses.includes('Investor') && userData.investmentData && userData.investmentData.status === 'approved') {
          investorsList.push({
            id: docSnapshot.id,
            displayName: userData.displayName || '',
            email: userData.email || '',
            profileImageUrl: userData.profileImageUrl || '',
            investmentData: userData.investmentData || null,
            ...userData
          })
        }
      })

      // Sort by display name
      investorsList.sort((a, b) => {
        return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '')
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
    setEditingRecord(null)
    setEditedRecordData({})
  }

  const handleRecordClick = (record, index) => {
    setEditingRecord({ ...record, index })
    setEditedRecordData({
      month: record.month,
      year: record.year.toString(),
      percentageGrowth: record.percentageGrowth.toString(),
      depositAmount: record.depositAmount?.toString() || '',
      depositDate: record.depositDate || '',
      withdrawalAmount: record.withdrawalAmount?.toString() || '',
      withdrawalDate: record.withdrawalDate || ''
    })
    setShowViewPerformance(false)
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
      const currentInvestmentData = userData.investmentData || {}
      const monthlyHistory = currentInvestmentData.monthlyHistory || []

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

      const depositAmount = parseFloat(editedRecordData.depositAmount) || 0
      const depositGrowth = calculateProratedGrowth(
        depositAmount, 
        percentageGrowth, 
        editedRecordData.depositDate, 
        editedRecordData.month, 
        editedRecordData.year
      )
      newBalance += depositAmount + depositGrowth

      const withdrawalAmount = parseFloat(editedRecordData.withdrawalAmount) || 0
      const withdrawalGrowthLoss = calculateWithdrawalGrowthLoss(
        withdrawalAmount, 
        percentageGrowth, 
        editedRecordData.withdrawalDate, 
        editedRecordData.month, 
        editedRecordData.year
      )
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
        depositDate: editedRecordData.depositDate || null,
        withdrawalAmount: withdrawalAmount,
        withdrawalDate: editedRecordData.withdrawalDate || null,
        updatedAt: new Date().toISOString()
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
        
        // Add deposits and withdrawals for this month
        if (currentRecord.depositAmount > 0 && currentRecord.depositDate) {
          const depGrowth = calculateProratedGrowth(
            currentRecord.depositAmount,
            currentRecord.percentageGrowth,
            currentRecord.depositDate,
            currentRecord.month,
            currentRecord.year
          )
          runningBalance += currentRecord.depositAmount + depGrowth
        }
        
        if (currentRecord.withdrawalAmount > 0 && currentRecord.withdrawalDate) {
          const wdGrowth = calculateWithdrawalGrowthLoss(
            currentRecord.withdrawalAmount,
            currentRecord.percentageGrowth,
            currentRecord.withdrawalDate,
            currentRecord.month,
            currentRecord.year
          )
          runningBalance -= currentRecord.withdrawalAmount + wdGrowth
        }
        
        updatedHistory[i] = {
          ...currentRecord,
          startingBalance: prevRecord.endingBalance,
          endingBalance: runningBalance
        }
      }

      // Update current balance to be the last month's ending balance
      const finalBalance = updatedHistory.length > 0 
        ? updatedHistory[updatedHistory.length - 1].endingBalance 
        : currentInvestmentData.initialInvestment || 0

      // Recalculate total deposits and withdrawals
      const totalDeposits = (currentInvestmentData.initialInvestment || 0) + 
        updatedHistory.reduce((sum, r) => sum + (r.depositAmount || 0), 0)
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

      await updateDoc(userDocRef, {
        investmentData: updatedInvestmentData,
        updatedAt: new Date().toISOString()
      })

      setSuccess(`Monthly record for ${editedRecordData.month} ${editedRecordData.year} updated successfully!`)
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

      // Add deposit if provided
      const depositAmount = parseFloat(monthlyUpdate.depositAmount) || 0
      const newTotalDeposits = totalDeposits + depositAmount
      
      // Calculate deposit growth based on day of month
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

      // Update investment data
      const updatedInvestmentData = {
        ...currentInvestmentData,
        currentBalance: newBalance,
        totalDeposits: newTotalDeposits,
        totalWithdrawals: newTotalWithdrawals,
        monthlyHistory: updatedHistory,
        lastUpdated: new Date().toISOString()
      }

      await updateDoc(userDocRef, {
        investmentData: updatedInvestmentData,
        updatedAt: new Date().toISOString()
      })

      setSuccess(`Monthly update for ${monthlyUpdate.month} ${monthlyUpdate.year} saved successfully!`)
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

  return (
    <div className="admin-investors-management">
      <div className="investors-layout">
        {/* Investors List */}
        <div className="investors-list-panel">
          <h2 className="panel-title">Investors</h2>
          <div className="investors-list">
            {investors.length === 0 ? (
              <p className="no-investors">No investors found</p>
            ) : (
              investors.map((investor) => (
                <div
                  key={investor.id}
                  className={`investor-card ${selectedInvestor?.id === investor.id ? 'selected' : ''}`}
                  onClick={() => handleInvestorSelect(investor)}
                >
                  <div className="investor-card-image">
                    {investor.profileImageUrl ? (
                      <img src={investor.profileImageUrl} alt={investor.displayName || investor.email} />
                    ) : (
                      <div className="investor-card-placeholder">
                        {(investor.displayName || investor.email || 'I').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="investor-card-info">
                    <h3 className="investor-card-name">{investor.displayName || 'No name'}</h3>
                    <p className="investor-card-email">{investor.email}</p>
                    {investor.investmentData && (
                      <div className="investor-balance">
                        <span className="balance-label">Balance:</span>
                        <span className="balance-value">
                          €{(investor.investmentData.currentBalance || investor.investmentData.initialInvestment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Investor Details Panel */}
        <div className="investor-details-panel">
          {selectedInvestor ? (
            <div className="investor-details">
              <h2 className="panel-title">{selectedInvestor.displayName || selectedInvestor.email}</h2>
              
              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              {/* Portfolio Summary */}
              {selectedInvestor.investmentData && (
                <div className="portfolio-summary-section">
                  <h3 className="section-title">Current Portfolio Summary</h3>
                  <div className="portfolio-summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Current Balance:</span>
                      <span className="summary-value">€{(selectedInvestor.investmentData.currentBalance || selectedInvestor.investmentData.initialInvestment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Initial Investment:</span>
                      <span className="summary-value">€{(selectedInvestor.investmentData.initialInvestment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Total Deposits:</span>
                      <span className="summary-value">€{(selectedInvestor.investmentData.totalDeposits || selectedInvestor.investmentData.initialInvestment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Total Withdrawals:</span>
                      <span className="summary-value">€{(selectedInvestor.investmentData.totalWithdrawals || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
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
                <button
                  onClick={() => {
                    setShowAddPerformance(true)
                    setShowViewPerformance(false)
                  }}
                  className="btn-action btn-add"
                >
                  Add New Performance
                </button>
              </div>

              {/* View Performance Table */}
              {showViewPerformance && selectedInvestor.investmentData && (
                <div className="performance-view-section">
                  <h3 className="section-title">Monthly Performance History</h3>
                  {selectedInvestor.investmentData.monthlyHistory && selectedInvestor.investmentData.monthlyHistory.length > 0 ? (
                    <div className="history-table">
                      <div className="history-header">
                        <div>Month/Year</div>
                        <div>Growth %</div>
                        <div>Growth Amount</div>
                        <div>Deposit</div>
                        <div>Withdrawal</div>
                        <div>Ending Balance</div>
                      </div>
                      {selectedInvestor.investmentData.monthlyHistory.map((record, index) => (
                        <div 
                          key={index} 
                          className="history-row clickable"
                          onClick={() => handleRecordClick(record, index)}
                        >
                          <div>{record.month} {record.year}</div>
                          <div>{record.percentageGrowth}%</div>
                          <div>€{record.growthAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          <div>{record.depositAmount > 0 ? `€${record.depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</div>
                          <div>{record.withdrawalAmount > 0 ? `€${record.withdrawalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</div>
                          <div>€{record.endingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-history">No performance history recorded yet.</p>
                  )}
                </div>
              )}

              {/* Add Performance Form */}
              {showAddPerformance && (
                <div className="add-performance-section">
                  <h3 className="section-title">Add Monthly Performance</h3>
                  <div className="monthly-update-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Month</label>
                        <select
                          className="form-input"
                          value={monthlyUpdate.month}
                          onChange={(e) => setMonthlyUpdate({ ...monthlyUpdate, month: e.target.value })}
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
                          onChange={(e) => setMonthlyUpdate({ ...monthlyUpdate, year: e.target.value })}
                          placeholder="2024"
                          min="2020"
                          max="2100"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Percentage Growth (%)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={monthlyUpdate.percentageGrowth}
                          onChange={(e) => setMonthlyUpdate({ ...monthlyUpdate, percentageGrowth: e.target.value })}
                          placeholder="2.0"
                          step="0.01"
                          min="-100"
                          max="100"
                        />
                        {monthlyUpdate.percentageGrowth && selectedInvestor.investmentData && (
                          <small className="form-help">
                            Equivalent to: €{((selectedInvestor.investmentData.currentBalance || selectedInvestor.investmentData.initialInvestment || 0) * (parseFloat(monthlyUpdate.percentageGrowth) / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </small>
                        )}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Deposit Amount (€)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={monthlyUpdate.depositAmount}
                          onChange={(e) => setMonthlyUpdate({ ...monthlyUpdate, depositAmount: e.target.value })}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Deposit Date</label>
                        <input
                          type="date"
                          className="form-input"
                          value={monthlyUpdate.depositDate}
                          onChange={(e) => setMonthlyUpdate({ ...monthlyUpdate, depositDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Withdrawal Amount (€)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={monthlyUpdate.withdrawalAmount}
                          onChange={(e) => setMonthlyUpdate({ ...monthlyUpdate, withdrawalAmount: e.target.value })}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Withdrawal Date</label>
                        <input
                          type="date"
                          className="form-input"
                          value={monthlyUpdate.withdrawalDate}
                          onChange={(e) => setMonthlyUpdate({ ...monthlyUpdate, withdrawalDate: e.target.value })}
                        />
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

                      const currentBalance = selectedInvestor.investmentData.currentBalance || selectedInvestor.investmentData.initialInvestment || 0
                      const percentageGrowth = parseFloat(monthlyUpdate.percentageGrowth) || 0
                      const baseGrowth = currentBalance * (percentageGrowth / 100)
                      const depositAmount = parseFloat(monthlyUpdate.depositAmount) || 0
                      const withdrawalAmount = parseFloat(monthlyUpdate.withdrawalAmount) || 0
                      
                      const depositGrowth = calculateProratedGrowth(
                        depositAmount, 
                        percentageGrowth, 
                        monthlyUpdate.depositDate, 
                        monthlyUpdate.month, 
                        monthlyUpdate.year
                      )
                      
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
                      
                      const withdrawalGrowth = calculateWithdrawalGrowthLoss(
                        withdrawalAmount, 
                        percentageGrowth, 
                        monthlyUpdate.withdrawalDate, 
                        monthlyUpdate.month, 
                        monthlyUpdate.year
                      )
                      
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
                            {monthlyUpdate.depositAmount && (
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
                            {monthlyUpdate.withdrawalAmount && (
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
                      onClick={handleAddPerformance}
                      disabled={loadingMonthlyUpdate || !monthlyUpdate.month || !monthlyUpdate.year || !monthlyUpdate.percentageGrowth}
                      className="btn-submit"
                    >
                      {loadingMonthlyUpdate ? 'Saving...' : 'Save Monthly Update'}
                    </button>
                  </div>
                </div>
              )}

              {/* Edit Record Modal */}
              {editingRecord && (
                <div className="edit-record-modal">
                  <div className="modal-backdrop" onClick={() => {
                    setEditingRecord(null)
                    setEditedRecordData({})
                  }}></div>
                  <div className="modal-content">
                    <div className="modal-header">
                      <h3>Edit Monthly Record</h3>
                      <button 
                        className="modal-close"
                        onClick={() => {
                          setEditingRecord(null)
                          setEditedRecordData({})
                        }}
                      >
                        ×
                      </button>
                    </div>
                    
                    {error && <div className="alert alert-error">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    <div className="edit-record-form">
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
                      </div>

                      <div className="form-row">
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

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Deposit Amount (€)</label>
                          <input
                            type="number"
                            className="form-input"
                            value={editedRecordData.depositAmount}
                            onChange={(e) => setEditedRecordData({ ...editedRecordData, depositAmount: e.target.value })}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Deposit Date</label>
                          <input
                            type="date"
                            className="form-input"
                            value={editedRecordData.depositDate}
                            onChange={(e) => setEditedRecordData({ ...editedRecordData, depositDate: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Withdrawal Amount (€)</label>
                          <input
                            type="number"
                            className="form-input"
                            value={editedRecordData.withdrawalAmount}
                            onChange={(e) => setEditedRecordData({ ...editedRecordData, withdrawalAmount: e.target.value })}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Withdrawal Date</label>
                          <input
                            type="date"
                            className="form-input"
                            value={editedRecordData.withdrawalDate}
                            onChange={(e) => setEditedRecordData({ ...editedRecordData, withdrawalDate: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="modal-actions">
                        <button
                          onClick={() => {
                            setEditingRecord(null)
                            setEditedRecordData({})
                          }}
                          className="btn-cancel"
                          disabled={loadingEdit}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUpdateRecord}
                          disabled={loadingEdit || !editedRecordData.month || !editedRecordData.year || !editedRecordData.percentageGrowth}
                          className="btn-submit"
                        >
                          {loadingEdit ? 'Updating...' : 'Update Record'}
                        </button>
                      </div>
                    </div>
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
    </div>
  )
}

export default AdminInvestorsManagement

