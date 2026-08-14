import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './CookieConsent.css'

const STORAGE_KEY = 'opessocius_cookie_consent'

const CookieConsent = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  const saveChoice = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // ignore storage errors
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="cookie-consent" role="dialog" aria-label="Cookie notice">
      <p className="cookie-consent-text">
        We use cookies to keep the site working properly.{' '}
        <Link to="/privacy">Privacy</Link>
      </p>
      <div className="cookie-consent-actions">
        <button
          type="button"
          className="cookie-consent-decline"
          onClick={() => saveChoice('declined')}
        >
          Continue
        </button>
        <button
          type="button"
          className="cookie-consent-accept"
          onClick={() => saveChoice('accepted')}
        >
          Accept
        </button>
      </div>
    </div>
  )
}

export default CookieConsent
