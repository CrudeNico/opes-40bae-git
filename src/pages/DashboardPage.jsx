import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase/config'
import { signOutUser } from '../firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import Settings from '../components/Settings'
import Portfolio from '../components/Portfolio'
import News from '../components/News'
import Learning from '../components/Learning'
import Community from '../components/Community'
import Support from '../components/Support'
import './DashboardPage.css'

const DashboardPage = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('portfolio')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Reload user to get latest profile data
        await currentUser.reload()
        
        // Check if user is Admin or Admin 2 - if so, redirect to admin dashboard
        const db = getFirestore()
        try {
          const userDocRef = doc(db, 'users', currentUser.uid)
          const userDoc = await getDoc(userDocRef)
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            // Handle both old format (isAdmin as array) and new format (statuses as array)
            let statuses = userData.statuses || []
            // If statuses doesn't exist but isAdmin does (as array), use isAdmin
            if (statuses.length === 0 && Array.isArray(userData.isAdmin) && userData.isAdmin.length > 0) {
              statuses = userData.isAdmin
            }
            // If isAdmin is boolean true, convert to array
            if (statuses.length === 0 && userData.isAdmin === true) {
              statuses = ['Admin']
            }
            
            // If user is Admin or Admin 2, redirect to admin dashboard
            if (statuses.includes('Admin') || statuses.includes('Admin 2') || statuses.includes('Relations')) {
              navigate('/admin')
              setLoading(false)
              return // Don't set user state, will redirect
            }
          }
        } catch (error) {
          console.error('Error checking user status:', error)
          // Continue to regular dashboard on error
        }
        
        // User is not admin/admin2, show regular dashboard
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

  const handleProfileUpdate = () => {
    // Force a reload of the user object to get updated photoURL/displayName
    if (auth.currentUser) {
      auth.currentUser.reload().then(() => {
        setUser({ ...auth.currentUser }) // Create a new object to trigger re-render
      })
    }
  }

  const sections = [
    { id: 'portfolio', title: 'Portfolio' },
    { id: 'news', title: 'News' },
    { id: 'learning', title: 'Learning' },
    { id: 'community', title: 'Community' },
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
          {activeSection === 'settings' ? (
            <Settings user={user} onProfileUpdate={handleProfileUpdate} />
          ) : activeSection === 'portfolio' ? (
            <Portfolio user={user} onStatusUpdate={handleProfileUpdate} />
          ) : activeSection === 'news' ? (
            <News />
          ) : activeSection === 'learning' ? (
            <Learning user={user} onStatusUpdate={handleProfileUpdate} />
          ) : activeSection === 'community' ? (
            <Community user={user} onStatusUpdate={handleProfileUpdate} />
          ) : activeSection === 'support' ? (
            <Support user={user} />
          ) : (
            <>
              <h1 className="content-title">
                {sections.find(s => s.id === activeSection)?.title || 'Portfolio'}
              </h1>
              <div className="content-body">
                <p>Welcome to your {sections.find(s => s.id === activeSection)?.title.toLowerCase() || 'portfolio'} section.</p>
                {/* Content will be displayed here based on activeSection */}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default DashboardPage

