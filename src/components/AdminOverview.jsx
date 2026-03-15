import React, { useState, useEffect } from 'react'
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore'
import './AdminOverview.css'

const AdminOverview = ({ user }) => {
  const [loading, setLoading] = useState(true)
  const [currentBalance, setCurrentBalance] = useState(0)
  const [totalInvestorAccounts, setTotalInvestorAccounts] = useState(0)
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

  useEffect(() => {
    loadOverviewData()
  }, [user])

  // Load saved calendar month from localStorage
  useEffect(() => {
    const savedMonth = localStorage.getItem('adminOverviewCalendarMonth')
    const savedYear = localStorage.getItem('adminOverviewCalendarYear')
    if (savedMonth !== null && savedYear !== null) {
      setCalendarMonth(parseInt(savedMonth))
      setCalendarYear(parseInt(savedYear))
    }
  }, [])

  // Save calendar month to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('adminOverviewCalendarMonth', calendarMonth.toString())
    localStorage.setItem('adminOverviewCalendarYear', calendarYear.toString())
  }, [calendarMonth, calendarYear])

  // Load daily performances when month/year changes
  useEffect(() => {
    loadDailyPerformances()
  }, [user, calendarMonth, calendarYear])

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

  const loadOverviewData = async () => {
    try {
      setLoading(true)
      const db = getFirestore()

      // Load admin portfolio current balance
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          const userStatuses = userData.statuses || []
          
          // Check if user is Admin 2 (has limited permissions)
          const isAdmin2 = userStatuses && (userStatuses.includes('Admin 2') || userStatuses.includes('Relations'))
          
          let portfolioData = null
          
          // If Admin 2, find and load the Admin's portfolio data
          if (isAdmin2) {
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
              if (statuses.includes('Admin') && !statuses.includes('Admin 2') && !statuses.includes('Relations')) {
                adminUser = { id: docSnapshot.id, ...data }
              }
            })
            
            if (adminUser && adminUser.investmentData) {
              portfolioData = adminUser.investmentData
            }
          } else {
            // For full Admin, load their own portfolio data
            if (userData.investmentData) {
              portfolioData = userData.investmentData
            }
          }
          
          // Calculate current balance
          if (portfolioData) {
            const initialInvestment = portfolioData.initialInvestment || 0
            const balance = portfolioData.currentBalance || initialInvestment
            setCurrentBalance(balance)
          } else {
            setCurrentBalance(0)
          }
        }
      }

      // Load total investor accounts
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
        if ((statuses.includes('Investor') || statuses.includes('Trader')) && 
            userData.investmentData && 
            userData.investmentData.status === 'approved') {
          const investmentData = userData.investmentData
          
          // Get the most current ending capital
          if (investmentData.currentBalance) {
            total += investmentData.currentBalance
          } else if (investmentData.monthlyHistory && investmentData.monthlyHistory.length > 0) {
            const sortedHistory = [...investmentData.monthlyHistory].sort((a, b) => {
              const yearA = parseInt(a.year) || 0
              const yearB = parseInt(b.year) || 0
              if (yearA !== yearB) return yearA - yearB
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                 'July', 'August', 'September', 'October', 'November', 'December']
              const monthA = monthNames.indexOf(a.month || '')
              const monthB = monthNames.indexOf(b.month || '')
              return monthA - monthB
            })
            const lastRecord = sortedHistory[sortedHistory.length - 1]
            if (lastRecord && lastRecord.endingBalance) {
              total += lastRecord.endingBalance
            } else if (investmentData.initialInvestment) {
              total += investmentData.initialInvestment
            }
          } else if (investmentData.initialInvestment) {
            total += investmentData.initialInvestment
          }
        }
      })
      setTotalInvestorAccounts(total)

      // Load pending consultations
      const consultationsQuery = query(
        collection(db, 'supportRequests'),
        where('status', '==', 'pending'),
        where('type', '==', 'consultation')
      )
      const consultationsSnapshot = await getDocs(consultationsQuery)
      setPendingConsultations(consultationsSnapshot.size)

      // Load user message alerts (unread chat messages)
      const messagesQuery = query(
        collection(db, 'supportRequests'),
        where('status', '==', 'pending'),
        where('type', '==', 'chat')
      )
      const messagesSnapshot = await getDocs(messagesQuery)
      setUserMessageAlerts(messagesSnapshot.size)

      // Calculate investor payout target
      await calculateInvestorPayoutTarget(db)

    } catch (error) {
      console.error('Error loading overview data:', error)
      setError('Failed to load overview data')
    } finally {
      setLoading(false)
    }
  }

  const calculateInvestorPayoutTarget = async (db) => {
    try {
      // Get current date
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() // 0-11
      
      // Get previous month
      let previousMonthIndex = currentMonth - 1
      let previousYear = currentYear
      if (previousMonthIndex < 0) {
        previousMonthIndex = 11
        previousYear = currentYear - 1
      }
      
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December']
      const previousMonthName = monthNames[previousMonthIndex]
      
      console.log(`[Investor Payout Calculation] Looking for previous month: ${previousMonthName} ${previousYear}`)
      
      // Get all investors
      const usersCollection = collection(db, 'users')
      const usersSnapshot = await getDocs(usersCollection)
      
      let totalPayoutTarget = 0
      const investorBreakdown = []
      
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
        
        // Only process investors or traders with approved investment accounts
        if ((statuses.includes('Investor') || statuses.includes('Trader')) && 
            userData.investmentData && 
            userData.investmentData.status === 'approved') {
          const investmentData = userData.investmentData
          
          // Find the previous month's record in monthlyHistory
          if (investmentData.monthlyHistory && investmentData.monthlyHistory.length > 0) {
            const previousMonthRecord = investmentData.monthlyHistory.find(record => 
              record.month === previousMonthName && 
              parseInt(record.year) === previousYear
            )
            
            if (previousMonthRecord && previousMonthRecord.endingBalance) {
              const endingBalance = previousMonthRecord.endingBalance
              
              // Get monthly return rate
              // Special case: Clara Perez Ramirez gets 3%
              let monthlyReturnRate
              if (email.toLowerCase().includes('clara') || 
                  displayName.toLowerCase().includes('clara perez ramirez') ||
                  displayName.toLowerCase().includes('clara perez')) {
                monthlyReturnRate = 0.03 // 3% for Clara Perez Ramirez
              } else {
                // Default: 2% for conservative, 4% for high risk
                monthlyReturnRate = investmentData.monthlyReturnRate || 
                                   (investmentData.riskTolerance === 'conservative' ? 0.02 : 0.04)
              }
              
              // Calculate projected return for this investor
              const investorTarget = endingBalance * monthlyReturnRate
              totalPayoutTarget += investorTarget
              
              investorBreakdown.push({
                name: displayName || email,
                email: email,
                endingBalance: endingBalance,
                monthlyReturnRate: monthlyReturnRate,
                target: investorTarget
              })
            } else {
              console.log(`[Investor Payout] No ${previousMonthName} ${previousYear} record found for ${displayName || email}`)
            }
          } else {
            console.log(`[Investor Payout] No monthlyHistory found for ${displayName || email}`)
          }
        }
      })
      
      console.log(`[Investor Payout Calculation] Total Payout Target: €${totalPayoutTarget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      console.log(`[Investor Payout Breakdown]:`, investorBreakdown)
      console.log(`[Investor Payout] Number of investors included: ${investorBreakdown.length}`)
      
      // Log each investor's contribution
      investorBreakdown.forEach(investor => {
        console.log(`  - ${investor.name}: €${investor.endingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} × ${(investor.monthlyReturnRate * 100).toFixed(0)}% = €${investor.target.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      })
      
      setInvestorPayoutTarget(totalPayoutTarget)
    } catch (error) {
      console.error('Error calculating investor payout target:', error)
      setInvestorPayoutTarget(0)
    }
  }

  const loadDailyPerformances = async () => {
    if (!user?.uid) return
    
    try {
      const db = getFirestore()
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December']
      const monthName = monthNames[calendarMonth]
      const docId = `dailyPerformance_${user.uid}_${calendarYear}_${monthName}`
      
      const perfDoc = await getDoc(doc(db, 'adminDailyPerformance', docId))
      
      if (perfDoc.exists()) {
        const data = perfDoc.data()
        setDailyPerformances(data.performances || {})
      } else {
        setDailyPerformances({})
      }
    } catch (error) {
      console.error('Error loading daily performances:', error)
      setDailyPerformances({})
    }
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
    if (!selectedDay || !dayPerformanceForm.amount || parseFloat(dayPerformanceForm.amount) <= 0) {
      return
    }

    try {
      const db = getFirestore()
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December']
      const monthName = monthNames[calendarMonth]
      const docId = `dailyPerformance_${user.uid}_${calendarYear}_${monthName}`
      
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
    if (!selectedDay) return

    try {
      const db = getFirestore()
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December']
      const monthName = monthNames[calendarMonth]
      const docId = `dailyPerformance_${user.uid}_${calendarYear}_${monthName}`
      
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

  // Calculate monthly projection (7% increase)
  const monthlyProjection = currentBalance * 0.07
  
  // Calculate progress bar percentages
  // First target marker: fixed at 1/3 (33.33%) of the bar
  const firstTargetPosition = 33.33
  // Second target: investor payout target as percentage of current balance
  const secondTargetAmount = investorPayoutTarget
  const secondTargetPercentage = currentBalance > 0 ? (secondTargetAmount / currentBalance) * 100 : 0
  
  // Calculate progress based on daily performance
  // Progress is based on how much we've gained towards the targets
  const progressAmount = totalDailyPerformance
  const progressPercentage = currentBalance > 0 ? (progressAmount / currentBalance) * 100 : 0

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
          <div className="widget-value">{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        {/* Total Investor Accounts Widget */}
        <div className="overview-widget">
          <div className="widget-header">
            <h3 className="widget-title">Total Investor Accounts</h3>
          </div>
          <div className="widget-value">{totalInvestorAccounts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
              {monthlyProjection.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div 
              className="target-label-amount target-2"
              style={{ left: '33.33%' }}
            >
              {secondTargetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="progress-bar" key={progressBarKey}>
            {/* Blue section up to first target (1/3 = 33.33%) */}
            {progressPercentage > 0 && progressPercentage <= firstTargetPosition && (
              <div 
                className="progress-bar-fill progress-bar-blue"
                style={{ width: `${Math.min(progressPercentage, firstTargetPosition)}%` }}
              ></div>
            )}
            {/* Blue section if progress exceeds first target */}
            {progressPercentage > firstTargetPosition && (
              <div 
                className="progress-bar-fill progress-bar-blue"
                style={{ width: `${firstTargetPosition}%` }}
              ></div>
            )}
            {/* Green section from first target to second target (investor payout) */}
            {progressPercentage > firstTargetPosition && secondTargetPercentage > firstTargetPosition && (
              <div 
                className="progress-bar-fill progress-bar-green"
                style={{ 
                  width: `${Math.min(progressPercentage - firstTargetPosition, Math.min(secondTargetPercentage - firstTargetPosition, 100 - firstTargetPosition))}%`,
                  left: `${firstTargetPosition}%`
                }}
              ></div>
            )}
            {/* Red section if loss (negative progress) */}
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
              onClick={() => handleMonthNavigation('prev')}
              aria-label="Previous month"
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
              onClick={() => handleMonthNavigation('next')}
              aria-label="Next month"
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
                  onClick={() => handleDayClick(day)}
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
                      onClick={() => setDayPerformanceForm({ ...dayPerformanceForm, type: 'win' })}
                    >
                      Win
                    </button>
                    <button
                      className={`type-button ${dayPerformanceForm.type === 'loss' ? 'active' : ''}`}
                      onClick={() => setDayPerformanceForm({ ...dayPerformanceForm, type: 'loss' })}
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
                    onChange={(e) => setDayPerformanceForm({ ...dayPerformanceForm, amount: e.target.value })}
                    placeholder="Enter amount"
                    className="form-input"
                  />
                </div>
              </div>
              <div className="day-modal-footer">
                <button className="btn-secondary" onClick={() => setShowDayModal(false)}>
                  Cancel
                </button>
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminOverview
