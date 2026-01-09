import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'
import { setUserAsAdmin } from '../utils/setupAdmin'
import './AdminSetupPage.css'

const AdminSetupPage = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [settingUp, setSettingUp] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        // Check if user is already admin
        const db = getFirestore()
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
          if (userDoc.exists() && userDoc.data().isAdmin === true) {
            setIsAdmin(true)
            // Already admin, redirect to admin dashboard
            navigate('/admin')
          }
        } catch (error) {
          console.error('Error checking admin status:', error)
        }
      } else {
        // Not logged in, redirect to login
        navigate('/login')
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [navigate])

  const handleSetupAdmin = async () => {
    if (!user) return

    setSettingUp(true)
    setMessage('')

    try {
      const result = await setUserAsAdmin(user.uid, true)
      if (result.success) {
        setMessage('Admin status set successfully! Redirecting to admin dashboard...')
        setIsAdmin(true)
        setTimeout(() => {
          navigate('/admin')
        }, 2000)
      } else {
        setMessage(`Error: ${result.error}`)
      }
    } catch (error) {
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

  return (
    <div className="admin-setup-page">
      <div className="setup-container">
        <h1>Admin Setup</h1>
        <p>Current User: {user.email}</p>
        
        {isAdmin ? (
          <div className="setup-success">
            <p>You are already an admin. Redirecting to admin dashboard...</p>
          </div>
        ) : (
          <div className="setup-form">
            <p>Click the button below to set this user as an admin.</p>
            <button 
              onClick={handleSetupAdmin}
              disabled={settingUp}
              className="setup-button"
            >
              {settingUp ? 'Setting up...' : 'Set as Admin'}
            </button>
            {message && (
              <p className={`setup-message ${message.includes('Error') ? 'error' : 'success'}`}>
                {message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminSetupPage


