import React, { useState } from 'react'
import {
  sendConfirmationEmail,
  sendConsultationConfirmationEmail,
  sendConsultationLinkEmail,
  sendTradeAlertNotification,
  sendWeeklyReportNotification
} from '../firebase/email'
import './EmailTestPage.css'

const EmailTestPage = () => {
  const [testEmail, setTestEmail] = useState('')
  const [testName, setTestName] = useState('Test User')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({})

  const updateResult = (testName, result) => {
    setResults(prev => ({
      ...prev,
      [testName]: result
    }))
  }

  const testConfirmationEmail = async () => {
    if (!testEmail) {
      alert('Please enter a test email address')
      return
    }
    setLoading(true)
    try {
      const result = await sendConfirmationEmail(testEmail, testName)
      updateResult('confirmation', result)
    } catch (error) {
      updateResult('confirmation', { success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testConsultationConfirmation = async () => {
    if (!testEmail) {
      alert('Please enter a test email address')
      return
    }
    setLoading(true)
    try {
      const consultationDate = new Date()
      const consultationTime = '10:00 AM'
      const result = await sendConsultationConfirmationEmail(
        testEmail,
        testName,
        consultationDate,
        consultationTime
      )
      updateResult('consultationConfirmation', result)
    } catch (error) {
      updateResult('consultationConfirmation', { success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testConsultationLink = async () => {
    if (!testEmail) {
      alert('Please enter a test email address')
      return
    }
    setLoading(true)
    try {
      const consultationDate = new Date()
      const consultationTime = '10:00 AM'
      const googleMeetLink = 'https://meet.google.com/test-link'
      const result = await sendConsultationLinkEmail(
        testEmail,
        testName,
        consultationDate,
        consultationTime,
        googleMeetLink
      )
      updateResult('consultationLink', result)
    } catch (error) {
      updateResult('consultationLink', { success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testTradeAlert = async () => {
    if (!testEmail) {
      alert('Please enter a test email address')
      return
    }
    setLoading(true)
    try {
      const alert = {
        symbol: 'AAPL',
        action: 'BUY',
        price: '$150.00',
        takeProfit: '$160.00',
        stopLoss: '$145.00'
      }
      const result = await sendTradeAlertNotification(testEmail, testName, alert)
      updateResult('tradeAlert', result)
    } catch (error) {
      updateResult('tradeAlert', { success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testWeeklyReport = async () => {
    if (!testEmail) {
      alert('Please enter a test email address')
      return
    }
    setLoading(true)
    try {
      const report = {
        title: 'Weekly Market Report - Week of January 1, 2024',
        description: 'This week\'s market analysis and insights.',
        videoUrl: 'https://example.com/video'
      }
      const result = await sendWeeklyReportNotification(testEmail, testName, report)
      updateResult('weeklyReport', result)
    } catch (error) {
      updateResult('weeklyReport', { success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testAll = async () => {
    if (!testEmail) {
      alert('Please enter a test email address')
      return
    }
    setLoading(true)
    setResults({})
    
    // Test all emails sequentially
    await testConfirmationEmail()
    await new Promise(resolve => setTimeout(resolve, 1000))
    await testConsultationConfirmation()
    await new Promise(resolve => setTimeout(resolve, 1000))
    await testConsultationLink()
    await new Promise(resolve => setTimeout(resolve, 1000))
    await testTradeAlert()
    await new Promise(resolve => setTimeout(resolve, 1000))
    await testWeeklyReport()
    
    setLoading(false)
  }

  return (
    <div className="email-test-page">
      <div className="email-test-container">
        <h1>📧 Email Server Test Page</h1>
        <p className="subtitle">Test all email functionality locally</p>

        <div className="test-form">
          <div className="form-group">
            <label htmlFor="testEmail">Test Email Address:</label>
            <input
              type="email"
              id="testEmail"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your-email@example.com"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="testName">Test Name:</label>
            <input
              type="text"
              id="testName"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="Test User"
              disabled={loading}
            />
          </div>
        </div>

        <div className="test-buttons">
          <button
            onClick={testAll}
            disabled={loading || !testEmail}
            className="btn btn-primary btn-large"
          >
            {loading ? 'Testing...' : 'Test All Emails'}
          </button>
        </div>

        <div className="test-actions">
          <h2>Individual Tests</h2>
          <div className="test-grid">
            <div className="test-card">
              <h3>Confirmation Email</h3>
              <p>Account creation confirmation</p>
              <button
                onClick={testConfirmationEmail}
                disabled={loading || !testEmail}
                className="btn btn-secondary"
              >
                Test
              </button>
              {results.confirmation && (
                <div className={`result ${results.confirmation.success ? 'success' : 'error'}`}>
                  {results.confirmation.success ? (
                    <span>✅ Sent! Message ID: {results.confirmation.messageId}</span>
                  ) : (
                    <span>❌ Error: {results.confirmation.error}</span>
                  )}
                </div>
              )}
            </div>

            <div className="test-card">
              <h3>Consultation Confirmation</h3>
              <p>Consultation appointment confirmation</p>
              <button
                onClick={testConsultationConfirmation}
                disabled={loading || !testEmail}
                className="btn btn-secondary"
              >
                Test
              </button>
              {results.consultationConfirmation && (
                <div className={`result ${results.consultationConfirmation.success ? 'success' : 'error'}`}>
                  {results.consultationConfirmation.success ? (
                    <span>✅ Sent! Message ID: {results.consultationConfirmation.messageId}</span>
                  ) : (
                    <span>❌ Error: {results.consultationConfirmation.error}</span>
                  )}
                </div>
              )}
            </div>

            <div className="test-card">
              <h3>Consultation Link</h3>
              <p>Google Meet consultation link</p>
              <button
                onClick={testConsultationLink}
                disabled={loading || !testEmail}
                className="btn btn-secondary"
              >
                Test
              </button>
              {results.consultationLink && (
                <div className={`result ${results.consultationLink.success ? 'success' : 'error'}`}>
                  {results.consultationLink.success ? (
                    <span>✅ Sent! Message ID: {results.consultationLink.messageId}</span>
                  ) : (
                    <span>❌ Error: {results.consultationLink.error}</span>
                  )}
                </div>
              )}
            </div>

            <div className="test-card">
              <h3>Trade Alert</h3>
              <p>Trade alert notification</p>
              <button
                onClick={testTradeAlert}
                disabled={loading || !testEmail}
                className="btn btn-secondary"
              >
                Test
              </button>
              {results.tradeAlert && (
                <div className={`result ${results.tradeAlert.success ? 'success' : 'error'}`}>
                  {results.tradeAlert.success ? (
                    <span>✅ Sent! Message ID: {results.tradeAlert.messageId}</span>
                  ) : (
                    <span>❌ Error: {results.tradeAlert.error}</span>
                  )}
                </div>
              )}
            </div>

            <div className="test-card">
              <h3>Weekly Report</h3>
              <p>Weekly report notification</p>
              <button
                onClick={testWeeklyReport}
                disabled={loading || !testEmail}
                className="btn btn-secondary"
              >
                Test
              </button>
              {results.weeklyReport && (
                <div className={`result ${results.weeklyReport.success ? 'success' : 'error'}`}>
                  {results.weeklyReport.success ? (
                    <span>✅ Sent! Message ID: {results.weeklyReport.messageId}</span>
                  ) : (
                    <span>❌ Error: {results.weeklyReport.error}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="env-check">
          <h2>Environment Variables Check</h2>
          <div className="env-status">
            <div className="env-item">
              <span className="env-label">VITE_BREVO_API_KEY:</span>
              <span className={import.meta.env.VITE_BREVO_API_KEY ? 'env-ok' : 'env-missing'}>
                {import.meta.env.VITE_BREVO_API_KEY ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div className="env-item">
              <span className="env-label">VITE_BREVO_SENDER_EMAIL:</span>
              <span className={import.meta.env.VITE_BREVO_SENDER_EMAIL ? 'env-ok' : 'env-missing'}>
                {import.meta.env.VITE_BREVO_SENDER_EMAIL ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div className="env-item">
              <span className="env-label">VITE_BREVO_SENDER_NAME:</span>
              <span className={import.meta.env.VITE_BREVO_SENDER_NAME ? 'env-ok' : 'env-missing'}>
                {import.meta.env.VITE_BREVO_SENDER_NAME ? `✅ ${import.meta.env.VITE_BREVO_SENDER_NAME}` : '⚠️ Using default'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailTestPage
