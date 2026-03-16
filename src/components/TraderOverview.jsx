import React, { useState, useEffect, useRef } from 'react'
import { getFirestore, doc, getDoc, setDoc, Timestamp, onSnapshot } from 'firebase/firestore'
import './TraderOverview.css'

const TraderOverview = ({ user }) => {
  const [loading, setLoading] = useState(true)
  const [currentBalance, setCurrentBalance] = useState(0)
  const [error, setError] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [dailyPerformances, setDailyPerformances] = useState({})
  const [selectedDay, setSelectedDay] = useState(null)
  const [showDayModal, setShowDayModal] = useState(false)
  const [dayPerformanceForm, setDayPerformanceForm] = useState({ type: 'win', amount: '' })
  const [totalDailyPerformance, setTotalDailyPerformance] = useState(0)
  const [progressBarKey, setProgressBarKey] = useState(0)
  const dailyPerfUnsubscribeRef = useRef(null)

  useEffect(() => {
    loadOverviewData()
  }, [user])

  // Load daily performances when month/year changes
  useEffect(() => {
    loadDailyPerformances()
    return () => {
      if (dailyPerfUnsubscribeRef.current) {
        dailyPerfUnsubscribeRef.current()
        dailyPerfUnsubscribeRef.current = null
      }
    }
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

      if (user?.uid) {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          const investmentData = userData.investmentData
          if (investmentData) {
            const initialInvestment = investmentData.initialInvestment || 0
            const balance = investmentData.currentBalance || initialInvestment
            setCurrentBalance(balance)
          } else {
            setCurrentBalance(0)
          }
        }
      }
    } catch (error) {
      console.error('Error loading trader overview data:', error)
      setError('Failed to load overview data')
    } finally {
      setLoading(false)
    }
  }

  const loadDailyPerformances = () => {
    if (!user?.uid) return

    if (dailyPerfUnsubscribeRef.current) {
      dailyPerfUnsubscribeRef.current()
      dailyPerfUnsubscribeRef.current = null
    }

    const db = getFirestore()
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const monthName = monthNames[calendarMonth]
    const docId = `dailyPerformance_${user.uid}_${calendarYear}_${monthName}`
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

  // Progress based on daily performance vs 7% projection
  const progressAmount = totalDailyPerformance
  let progressPercentage = 0

  if (monthlyProjection > 0 && progressAmount !== 0) {
    if (progressAmount < 0) {
      progressPercentage = -Math.min(Math.abs(progressAmount) / monthlyProjection * 100, 100)
    } else {
      progressPercentage = Math.min((progressAmount / monthlyProjection) * 100, 100)
    }
  }

  const hideCurrentProgressLabel =
    progressAmount !== 0 &&
    monthlyProjection > 0 &&
    Math.abs(progressAmount - monthlyProjection) <= 200

  if (loading) {
    return (
      <div className="trader-overview-loading">
        <div className="loading-spinner">Loading overview...</div>
      </div>
    )
  }

  return (
    <div className="trader-overview-container">
      <h2 className="trader-overview-title">Overview</h2>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="overview-widgets-grid">
        <div className="overview-widget">
          <div className="widget-header">
            <h3 className="widget-title">Current Balance</h3>
          </div>
          <div className="widget-value">
            {currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="overview-widget">
          <div className="widget-header">
            <h3 className="widget-title">Net P&L This Month</h3>
          </div>
          <div className={`widget-value ${progressAmount >= 0 ? 'positive' : 'negative'}`}>
            {progressAmount >= 0 ? '+' : '-'}
            {Math.abs(progressAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="overview-widget">
          <div className="widget-header">
            <h3 className="widget-title">Target (7% of Balance)</h3>
          </div>
          <div className="widget-value">
            {monthlyProjection.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

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
              {monthlyProjection.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            {progressAmount !== 0 && !hideCurrentProgressLabel && progressPercentage > 0 && progressPercentage <= 100 && (
              <div
                className="current-progress-label"
                style={{ left: `${Math.min(Math.max(progressPercentage, 5), 95)}%` }}
              >
                {progressAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            )}
          </div>
          <div className="progress-bar" key={progressBarKey}>
            {progressPercentage > 0 && (
              <div 
                className="progress-bar-fill progress-bar-blue"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              ></div>
            )}
            {progressPercentage < 0 && (
              <div 
                className="progress-bar-fill progress-bar-red"
                style={{ width: `${Math.min(Math.abs(progressPercentage), 100)}%` }}
              ></div>
            )}
          </div>
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
  )
}

export default TraderOverview

