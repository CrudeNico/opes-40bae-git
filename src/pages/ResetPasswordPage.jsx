import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { verifyPasswordResetCode, confirmPasswordReset } from '../firebase/auth'
import './ResetPasswordPage.css'

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [actionCode, setActionCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Get the action code from URL parameters
    // Firebase might pass it as oobCode in query params or in hash
    // Check multiple sources: React Router searchParams, window.location.search, and hash
    const urlParams = new URLSearchParams(window.location.search)
    const hashParams = window.location.hash ? new URLSearchParams(window.location.hash.substring(1)) : new URLSearchParams()
    
    const code = searchParams.get('oobCode') || urlParams.get('oobCode') || hashParams.get('oobCode')
    const mode = searchParams.get('mode') || urlParams.get('mode') || hashParams.get('mode')

    if (!code) {
      setError('Invalid or missing password reset link.')
      setVerifying(false)
      setLoading(false)
      return
    }

    // Mode should be 'resetPassword', but if not provided, we'll verify the code anyway
    // as Firebase might not include it in the redirect
    if (mode && mode !== 'resetPassword') {
      setError('Invalid password reset link.')
      setVerifying(false)
      setLoading(false)
      return
    }

    setActionCode(code)
    verifyCode(code)
  }, [searchParams])

  const verifyCode = async (code) => {
    try {
      const result = await verifyPasswordResetCode(code)
      if (result.success) {
        setEmail(result.email)
        setError('')
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('An error occurred while verifying the reset link.')
    } finally {
      setVerifying(false)
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setSubmitting(true)

    try {
      const result = await confirmPasswordReset(actionCode, password)
      if (result.success) {
        setSuccess(true)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || verifying) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-loading">
            <div className="loading-spinner"></div>
            <p>Verifying reset link...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !email) {
    return (
      <div className="reset-password-page">
        <Link to="/" className="back-to-home">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Back to Home</span>
        </Link>
        <div className="reset-password-container">
          <div className="reset-password-error">
            <div className="error-icon">
              <svg width="48" height="48" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 9.99999C18.3333 5.39762 14.6024 1.66666 10 1.66666C5.39763 1.66666 1.66667 5.39762 1.66667 9.99999C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 6.66666V9.99999M10 13.3333H10.0083" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="error-title">Reset Link Invalid</h2>
            <p className="error-message">{error}</p>
            <Link to="/login" className="error-link">Back to Login</Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="reset-password-page">
        <Link to="/" className="back-to-home">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Back to Home</span>
        </Link>
        <div className="reset-password-container">
          <div className="reset-password-success">
            <div className="success-icon">
              <svg width="48" height="48" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 9.99999C18.3333 5.39762 14.6024 1.66666 10 1.66666C5.39763 1.66666 1.66667 5.39762 1.66667 9.99999C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.5 10L9.16667 11.6667L12.5 8.33333" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="success-title">Password Reset Successful!</h2>
            <p className="success-message">Your password has been successfully reset. You will be redirected to the login page in a few seconds.</p>
            <Link to="/login" className="success-link">Go to Login</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="reset-password-page">
      <Link to="/" className="back-to-home">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Back to Home</span>
      </Link>
      <div className="reset-password-container">
        <div className="reset-password-content">
          <h1 className="reset-password-title">Reset Your Password</h1>
          <p className="reset-password-subtitle">
            Enter your new password for <strong>{email}</strong>
          </p>

          {error && (
            <div className="reset-error-message">
              {error}
            </div>
          )}

          <form className="reset-password-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password" className="form-label">New Password</label>
              <div className="input-wrapper password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="form-input"
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {showPassword ? (
                      <>
                        <path d="M2.5 2.5L17.5 17.5M8.33333 8.33333C7.89131 8.77535 7.5 9.44102 7.5 10.2083C7.5 11.8254 8.84171 13.125 10.4167 13.125C11.1839 13.125 11.8496 12.7337 12.2917 12.2917M8.33333 8.33333L12.2917 12.2917M8.33333 8.33333L5.83333 5.83333M12.2917 12.2917L15.8333 15.8333M5.83333 5.83333C4.16667 7.08333 2.5 9.16667 2.5 10.2083C2.5 13.3333 6.25 15.8333 10.4167 15.8333C12.0833 15.8333 13.75 15.2083 15 14.375M15.8333 15.8333L15 14.375M15 14.375C16.25 13.125 17.5 11.4583 17.5 10.2083C17.5 7.08333 13.75 4.58333 9.58333 4.58333C8.33333 4.58333 7.08333 4.79167 6.25 5.20833" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </>
                    ) : (
                      <>
                        <path d="M2.5 10.2083C2.5 13.3333 6.25 15.8333 10.4167 15.8333C14.5833 15.8333 18.3333 13.3333 18.3333 10.2083C18.3333 7.08333 14.5833 4.58333 10.4167 4.58333C6.25 4.58333 2.5 7.08333 2.5 10.2083Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10.4167 12.9167C11.8417 12.9167 13 11.7583 13 10.3333C13 8.90833 11.8417 7.75 10.4167 7.75C8.99167 7.75 7.83333 8.90833 7.83333 10.3333C7.83333 11.7583 8.99167 12.9167 10.4167 12.9167Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
              <div className="input-wrapper password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  className="form-input"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {showConfirmPassword ? (
                      <>
                        <path d="M2.5 2.5L17.5 17.5M8.33333 8.33333C7.89131 8.77535 7.5 9.44102 7.5 10.2083C7.5 11.8254 8.84171 13.125 10.4167 13.125C11.1839 13.125 11.8496 12.7337 12.2917 12.2917M8.33333 8.33333L12.2917 12.2917M8.33333 8.33333L5.83333 5.83333M12.2917 12.2917L15.8333 15.8333M5.83333 5.83333C4.16667 7.08333 2.5 9.16667 2.5 10.2083C2.5 13.3333 6.25 15.8333 10.4167 15.8333C12.0833 15.8333 13.75 15.2083 15 14.375M15.8333 15.8333L15 14.375M15 14.375C16.25 13.125 17.5 11.4583 17.5 10.2083C17.5 7.08333 13.75 4.58333 9.58333 4.58333C8.33333 4.58333 7.08333 4.79167 6.25 5.20833" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </>
                    ) : (
                      <>
                        <path d="M2.5 10.2083C2.5 13.3333 6.25 15.8333 10.4167 15.8333C14.5833 15.8333 18.3333 13.3333 18.3333 10.2083C18.3333 7.08333 14.5833 4.58333 10.4167 4.58333C6.25 4.58333 2.5 7.08333 2.5 10.2083Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10.4167 12.9167C11.8417 12.9167 13 11.7583 13 10.3333C13 8.90833 11.8417 7.75 10.4167 7.75C8.99167 7.75 7.83333 8.90833 7.83333 10.3333C7.83333 11.7583 8.99167 12.9167 10.4167 12.9167Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" className="reset-password-button" disabled={submitting}>
              {submitting ? 'Resetting Password...' : 'Reset Password'}
            </button>

            <Link to="/login" className="back-to-login-link">Back to Login</Link>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage

