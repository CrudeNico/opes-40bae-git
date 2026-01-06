import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase/config'
import { signOutUser } from '../firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import './DashboardPage.css'

const DashboardPage = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
      } else {
        // User is not logged in, redirect to login
        navigate('/login')
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [navigate])

  const handleLogout = async () => {
    try {
      await signOutUser()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleReturnHome = () => {
    navigate('/')
  }

  const sections = [
    { id: 'dashboard', title: 'Dashboard' },
    { id: 'portfolio', title: 'Portfolio' },
    { id: 'trading', title: 'Trading' },
    { id: 'analytics', title: 'Analytics' },
    { id: 'settings', title: 'Settings' },
    { id: 'support', title: 'Support' }
  ]

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="dashboard-page">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Toggle Button */}
      <button 
        className={`sidebar-toggle ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Left Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Profile Section */}
        <div className="sidebar-profile">
          <div className="profile-image">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} />
            ) : (
              <div className="profile-placeholder">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="profile-info">
            <h3 className="profile-name">{user.displayName || 'User'}</h3>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSection(section.id)
                    // Close sidebar on mobile when section is selected
                    if (window.innerWidth <= 768) {
                      setSidebarOpen(false)
                    }
                  }}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom Actions */}
        <div className="sidebar-footer">
          <button className="sidebar-button return-home" onClick={handleReturnHome}>
            Return to Home
          </button>
          <button className="sidebar-button logout" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-content">
        <div className="content-wrapper">
          <h1 className="content-title">
            {sections.find(s => s.id === activeSection)?.title || 'Dashboard'}
          </h1>
          <div className="content-body">
            <p>Welcome to your {sections.find(s => s.id === activeSection)?.title.toLowerCase() || 'dashboard'} section.</p>
            {/* Content will be displayed here based on activeSection */}
          </div>
        </div>
      </main>
    </div>
  )
}

export default DashboardPage

