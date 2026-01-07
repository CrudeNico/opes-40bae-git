import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import './FirstAdminSetupPage.css'

const ADMIN_EMAIL = 'nicolas.fernandez@opessocius.support'

const FirstAdminSetupPage = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [settingUp, setSettingUp] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
      } else {
        // Not logged in, redirect to login
        navigate('/login')
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [navigate])

  const handleGrantAdmin = async () => {
    if (!user) return

    // Check if user is the authorized email
    if (user.email !== ADMIN_EMAIL) {
      setMessage('Error: Only the authorized user can grant admin access.')
      return
    }

    setSettingUp(true)
    setMessage('')

    try {
      const db = getFirestore()
      const userDocRef = doc(db, 'users', user.uid)
      
      // Create or update user document with Admin status
      await setDoc(userDocRef, {
        email: user.email || '',
        displayName: user.displayName || '',
        profileImageUrl: user.photoURL || '',
        statuses: ['Admin'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true })

      setMessage('Admin status granted successfully! Redirecting to admin dashboard...')
      
      // Redirect to admin dashboard after 2 seconds
      setTimeout(() => {
        navigate('/admin')
      }, 2000)
    } catch (error) {
      console.error('Error granting admin status:', error)
      setMessage(`Error: ${error.message}`)
    } finally {
      setSettingUp(false)
    }
  }

  if (loading) {
    return (
      <div className="setup-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Check if user is authorized
  const isAuthorized = user.email === ADMIN_EMAIL

  return (
    <div className="first-admin-setup-page">
      <div className="setup-container">
        <h1>Admin Setup</h1>
        {isAuthorized ? (
          <>
            <p className="setup-description">
              Click the button below to grant yourself admin status.
            </p>
            <div className="user-info">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Name:</strong> {user.displayName || 'Not set'}</p>
            </div>
            
            <div className="setup-form">
              <button 
                onClick={handleGrantAdmin}
                disabled={settingUp}
                className="setup-button"
              >
                {settingUp ? 'Granting Admin Status...' : 'Grant Me Admin Status'}
              </button>
              {message && (
                <p className={`setup-message ${message.includes('Error') ? 'error' : 'success'}`}>
                  {message}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="setup-description error-text">
              You are not authorized to access this page.
            </p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="setup-button"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default FirstAdminSetupPage

