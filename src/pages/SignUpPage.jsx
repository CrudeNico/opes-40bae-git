import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUpWithEmail, signInWithGoogle } from '../firebase/auth'
import { sendConfirmationEmail } from '../firebase/email'
import './SignUpPage.css'

const SignUpPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const result = await signUpWithEmail(email, password, fullName)
      
      if (result.success) {
        // Send confirmation email
        try {
          await sendConfirmationEmail(email, fullName)
          // Email sent successfully (we don't show error if email fails, as account is already created)
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError)
          // Account is created, so we continue even if email fails
        }
        
        // Show success popup
        setShowSuccessPopup(true)
        // Auto-dismiss popup after 5 seconds and redirect
        setTimeout(() => {
          setShowSuccessPopup(false)
          navigate('/')
        }, 5000)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClosePopup = () => {
    setShowSuccessPopup(false)
    navigate('/')
  }

  const handleGoogleSignUp = async () => {
    setError('')
    setLoading(true)

    try {
      const result = await signInWithGoogle()
      
      if (result.success) {
        // Send confirmation email for Google sign-up
        try {
          await sendConfirmationEmail(
            result.user.email || '', 
            result.user.displayName || ''
          )
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError)
        }
        
        // Show success popup
        setShowSuccessPopup(true)
        // Auto-dismiss popup after 5 seconds and redirect
        setTimeout(() => {
          setShowSuccessPopup(false)
          navigate('/')
        }, 5000)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signup-page">
      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="success-popup-overlay" onClick={handleClosePopup}>
          <div className="success-popup" onClick={(e) => e.stopPropagation()}>
            <button className="success-popup-close" onClick={handleClosePopup}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="success-popup-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="success-popup-title">Thank you for signing in</h3>
            <p className="success-popup-message">You will receive shortly an email confirmation of your account created.</p>
          </div>
        </div>
      )}
      
      <Link to="/" className="back-to-home">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Back to Home</span>
      </Link>
      <div className="signup-container">
        {/* Left Side - Dark Blue with gradient circles */}
        <div className="signup-left">
          <div className="signup-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
          </div>
          <div className="signup-left-content">
            <div className="signup-brand">
              <span className="brand-main">Opessocius</span>
              <span className="brand-sub">Asset Management</span>
            </div>
            <h1 className="signup-title">Open your investor portal account</h1>
            <p className="signup-subtitle">Access your portfolio, track performance, and manage your investments with ease.</p>
          </div>
        </div>

        {/* Right Side - Light Gray with Sign Up Form */}
        <div className="signup-right">
          <div className="signup-form-container">
            <h2 className="signup-form-title">Sign up</h2>
            <p className="signup-form-subtitle">Enter your details below to create your account.</p>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <form className="signup-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="fullName" className="form-label">Full Name</label>
                <div className="input-wrapper">
                  <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 10C11.8417 10 13.3333 8.50833 13.3333 6.66667C13.3333 4.825 11.8417 3.33333 10 3.33333C8.15833 3.33333 6.66667 4.825 6.66667 6.66667C6.66667 8.50833 8.15833 10 10 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16.6667 18.3333C16.6667 15.1117 13.6817 12.5 10 12.5C6.31833 12.5 3.33333 15.1117 3.33333 18.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input
                    type="text"
                    id="fullName"
                    className="form-input"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">Email</label>
                <div className="input-wrapper">
                  <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 6.66667L10 11.6667L17.5 6.66667M3.33333 15H16.6667C17.5871 15 18.3333 14.2538 18.3333 13.3333V6.66667C18.3333 5.74619 17.5871 5 16.6667 5H3.33333C2.41286 5 1.66667 5.74619 1.66667 6.66667V13.3333C1.66667 14.2538 2.41286 15 3.33333 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input
                    type="email"
                    id="email"
                    className="form-input"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <div className="input-wrapper password-input-wrapper">
                  <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.8333 9.16667H4.16667C3.24619 9.16667 2.5 9.91286 2.5 10.8333V15.8333C2.5 16.7538 3.24619 17.5 4.16667 17.5H15.8333C16.7538 17.5 17.5 16.7538 17.5 15.8333V10.8333C17.5 9.91286 16.7538 9.16667 15.8333 9.16667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5.83333 9.16667V5.83333C5.83333 4.72826 6.27232 3.66846 7.05372 2.88706C7.83512 2.10565 8.89493 1.66667 10 1.66667C11.1051 1.66667 12.1649 2.10565 12.9463 2.88706C13.7277 3.66846 14.1667 4.72826 14.1667 5.83333V9.16667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    className="form-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowPassword(!showPassword);
                    }}
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
                <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                <div className="input-wrapper password-input-wrapper">
                  <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.8333 9.16667H4.16667C3.24619 9.16667 2.5 9.91286 2.5 10.8333V15.8333C2.5 16.7538 3.24619 17.5 4.16667 17.5H15.8333C16.7538 17.5 17.5 16.7538 17.5 15.8333V10.8333C17.5 9.91286 16.7538 9.16667 15.8333 9.16667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5.83333 9.16667V5.83333C5.83333 4.72826 6.27232 3.66846 7.05372 2.88706C7.83512 2.10565 8.89493 1.66667 10 1.66667C11.1051 1.66667 12.1649 2.10565 12.9463 2.88706C13.7277 3.66846 14.1667 4.72826 14.1667 5.83333V9.16667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    className="form-input"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowConfirmPassword(!showConfirmPassword);
                    }}
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

              <button type="submit" className="signup-button" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign up'}
              </button>
            </form>

            <div className="signup-divider">
              <span className="divider-line"></span>
              <span className="divider-text">Or continue with</span>
              <span className="divider-line"></span>
            </div>

            <div className="social-login">
              <button 
                type="button"
                className="social-button google-button"
                onClick={handleGoogleSignUp}
                disabled={loading}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.6 10.2273C19.6 9.51818 19.5364 8.83636 19.4182 8.18182H10V12.05H15.3818C15.15 13.3 14.4455 14.3591 13.3864 15.0682V17.5773H16.6182C18.5091 15.8364 19.6 13.2727 19.6 10.2273Z" fill="#4285F4"/>
                  <path d="M10 20C12.7 20 14.9636 19.1045 16.6182 17.5773L13.3864 15.0682C12.4909 15.6682 11.3455 16.0227 10 16.0227C7.39545 16.0227 5.19091 14.2636 4.40455 11.9H1.06364V14.4909C2.70909 17.7591 6.09091 20 10 20Z" fill="#34A853"/>
                  <path d="M4.40455 11.9C4.20455 11.3 4.09091 10.6591 4.09091 10C4.09091 9.34091 4.20455 8.7 4.40455 8.1V5.50909H1.06364C0.386364 6.85909 0 8.38636 0 10C0 11.6136 0.386364 13.1409 1.06364 14.4909L4.40455 11.9Z" fill="#FBBC05"/>
                  <path d="M10 3.97727C11.4682 3.97727 12.7864 4.48182 13.8227 5.47273L16.6909 2.60455C14.9591 0.990909 12.6955 0 10 0C6.09091 0 2.70909 2.24091 1.06364 5.50909L4.40455 8.1C5.19091 5.73636 7.39545 3.97727 10 3.97727Z" fill="#EA4335"/>
                </svg>
                <span>Google</span>
              </button>
              <button className="social-button apple-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <span>Apple</span>
              </button>
            </div>

            <div className="signup-footer">
              <span className="footer-text">Already have an account?</span>
              <Link to="/login" className="footer-link">Log in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUpPage

