import React, { useState, useEffect } from 'react'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import './Portfolio.css'

const Portfolio = ({ user, onStatusUpdate }) => {
  const [isInvestor, setIsInvestor] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [investmentDataState, setInvestmentDataState] = useState(null)
  const [formData, setFormData] = useState({
    initialInvestment: '',
    startingDate: '',
    country: '',
    phoneNumber: '',
    monthlyAdditions: '0',
    riskTolerance: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    checkInvestorStatus()
  }, [user])

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
        // Check if investment is pending
        setIsPending(userData.investmentData && userData.investmentData.status === 'pending')
        
        // Load investment data if user is investor
        if (statuses.includes('Investor') && userData.investmentData) {
          setInvestmentDataState(userData.investmentData)
        }
      }
    } catch (error) {
      console.error('Error checking investor status:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load investment data when user becomes investor
  useEffect(() => {
    const loadInvestmentData = async () => {
      if (isInvestor && user && !investmentDataState) {
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
  }, [isInvestor, user, investmentDataState])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    // Validation
    if (!formData.initialInvestment || !formData.startingDate || !formData.country || !formData.phoneNumber || !formData.riskTolerance) {
      setError('Please fill in all required fields.')
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

    try {
      const db = getFirestore()
      const userDocRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userDocRef)
      
      // Calculate monthly return rate based on risk tolerance
      const monthlyReturnRate = formData.riskTolerance === 'conservative' ? 0.02 : 0.04

      // Update user document with investment data (status: pending)
      await updateDoc(userDocRef, {
        investmentData: {
          initialInvestment: parseFloat(formData.initialInvestment),
          startingDate: formData.startingDate,
          country: formData.country,
          phoneNumber: formData.phoneNumber,
          monthlyAdditions: parseFloat(formData.monthlyAdditions),
          riskTolerance: formData.riskTolerance,
          monthlyReturnRate: monthlyReturnRate,
          status: 'pending',
          initiatedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      }, { merge: true })

      setSuccess('Your investment request has been submitted and is being reviewed.')
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
        riskTolerance: ''
      })
      setShowForm(false)
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

  // User is an investor - show portfolio
  if (isInvestor && !investmentDataState) {
    return (
      <div className="portfolio-container">
        <div className="portfolio-loading">
          <div className="loading-spinner">Loading portfolio...</div>
        </div>
      </div>
    )
  }

  if (isInvestor && investmentDataState) {
    // Calculate portfolio data
    const initialInvestment = investmentDataState.initialInvestment || 0
    const monthlyReturnRate = investmentDataState.monthlyReturnRate || (investmentDataState.riskTolerance === 'conservative' ? 0.02 : 0.04)
    const monthlyAdditions = investmentDataState.monthlyAdditions || 0
    const startingDate = investmentDataState.startingDate ? new Date(investmentDataState.startingDate) : new Date()
    
    // Get current balance from investment data (will be updated by admin monthly)
    const currentBalance = investmentDataState.currentBalance || initialInvestment
    const totalDeposits = investmentDataState.totalDeposits || initialInvestment
    const totalWithdrawals = investmentDataState.totalWithdrawals || 0
    
    // Calculate graph data from monthly history + projection
    const calculateGraphData = () => {
      const data = []
      const monthlyHistory = investmentDataState.monthlyHistory || []
      
      // If we have monthly history, use it for historical data
      if (monthlyHistory.length > 0) {
        // Add initial investment as starting point
        data.push({
          month: -monthlyHistory.length,
          balance: initialInvestment,
          label: 'Start',
          isHistorical: true
        })
        
        // Add each historical month
        monthlyHistory.forEach((record, index) => {
          data.push({
            month: index - monthlyHistory.length + 1,
            balance: record.endingBalance,
            label: `${record.month.substring(0, 3)} ${record.year}`,
            isHistorical: true
          })
        })
      } else {
        // No history, start from current balance
        data.push({
          month: 0,
          balance: currentBalance,
          label: 'Now',
          isHistorical: false
        })
      }
      
      // Add projection for next 5 months from the most recent data point
      // If we have monthly history, use the last month's ending balance
      // Otherwise, use current balance
      let projectionStartingBalance = currentBalance
      if (monthlyHistory.length > 0) {
        const lastMonth = monthlyHistory[monthlyHistory.length - 1]
        projectionStartingBalance = lastMonth.endingBalance || currentBalance
      }
      
      let projectedBalance = projectionStartingBalance
      for (let month = 1; month <= 5; month++) {
        projectedBalance = projectedBalance * (1 + monthlyReturnRate) + monthlyAdditions
        data.push({
          month: monthlyHistory.length + month,
          balance: projectedBalance,
          label: `+${month}M`,
          isHistorical: false
        })
      }
      
      return data
    }

    const projectionData = calculateGraphData()
    const maxBalance = Math.max(...projectionData.map(d => d.balance))
    const minBalance = Math.min(...projectionData.map(d => d.balance))
    const range = maxBalance - minBalance || 1

    // Calculate metrics
    const monthlyHistory = investmentDataState.monthlyHistory || []
    
    // Total Gain = sum of all growth amounts from monthly history
    const totalGain = monthlyHistory.reduce((sum, record) => {
      return sum + (record.growthAmount || 0)
    }, 0)
    
    // Average Monthly Input = total deposits divided by number of deposits made
    // Count deposits: initial investment counts as 1, plus each monthly deposit
    const depositCount = 1 + monthlyHistory.filter(record => (record.depositAmount || 0) > 0).length
    const averageMonthlyInput = depositCount > 0 ? totalDeposits / depositCount : 0
    
    // Calculate total percentage gain by summing all monthly growth percentages
    const totalPercentageGain = monthlyHistory.reduce((sum, record) => {
      return sum + (record.percentageGrowth || 0)
    }, 0)
    
    // Calculate 5-month projection from the most recent data point
    // If we have monthly history, use the last month's ending balance as starting point
    // Otherwise, use current balance
    let projectionStartingBalance = currentBalance
    if (monthlyHistory.length > 0) {
      const lastMonth = monthlyHistory[monthlyHistory.length - 1]
      projectionStartingBalance = lastMonth.endingBalance || currentBalance
    }
    
    // Calculate projection for next 5 months from the starting balance
    let projectedBalance = projectionStartingBalance
    for (let month = 1; month <= 5; month++) {
      projectedBalance = projectedBalance * (1 + monthlyReturnRate) + monthlyAdditions
    }
    const projection5Months = projectedBalance

    return (
      <div className="portfolio-container">
        <div className="portfolio-content">
          <h2 className="portfolio-title">Your Portfolio</h2>
          
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
                <p className="metric-value">€{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                <p className="metric-value">€{totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                <p className="metric-value">€{totalWithdrawals.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                <p className="metric-value">€{initialInvestment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
          {investmentDataState.monthlyHistory && investmentDataState.monthlyHistory.length > 0 && (
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
                  {investmentDataState.monthlyHistory.map((record, index) => (
                    <div key={index} className="history-row">
                      <div>{record.month} {record.year}</div>
                      <div>{record.percentageGrowth}%</div>
                      <div>€{record.growthAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div>{record.depositAmount > 0 ? `€${record.depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</div>
                      <div>{record.withdrawalAmount > 0 ? `€${record.withdrawalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</div>
                      <div>€{record.endingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  ))}
                </div>
              </div>
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

  // Not an investor - show initiation widget
  if (!isInvestor) {
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
            <h2 className="widget-title">Your Investment is Being Reviewed</h2>
            <p className="widget-description">
              Your investment request has been submitted and is currently under review. Once it's accepted, your information will be displayed accordingly.
            </p>
          </div>
        ) : !showForm ? (
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
              You don't have a portfolio to display. In order to get started, you must initiate an investment.
            </p>
            <button 
              onClick={() => setShowForm(true)}
              className="widget-button"
            >
              Initiate Investment
            </button>
          </div>
        ) : (
          <div className="investment-form-container">
            <div className="form-header">
              <h2>Initiate Your Investment</h2>
              <p>Please fill in the following information to become an investor</p>
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

                <div className="form-group">
                  <label htmlFor="riskTolerance" className="form-label">
                    Risk Tolerance <span className="required">*</span>
                  </label>
                  <select
                    id="riskTolerance"
                    name="riskTolerance"
                    className="form-input"
                    value={formData.riskTolerance}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select risk tolerance</option>
                    <option value="conservative">Conservative (2% per month)</option>
                    <option value="moderate">Moderate (4% per month)</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setError('')
                    setSuccess('')
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

