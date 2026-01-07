import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase/config'
import { signOutUser } from '../firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'
import AdminUsersManagement from '../components/AdminUsersManagement'
import AdminInvestorsManagement from '../components/AdminInvestorsManagement'
import AdminNewsManagement from '../components/AdminNewsManagement'
import './AdminDashboardPage.css'

const AdminDashboardPage = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Check if user is admin
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
            
            if (statuses.includes('Admin')) {
              setUser(currentUser)
            } else {
              // User is not admin, redirect to regular dashboard
              navigate('/dashboard')
            }
          } else {
            // User document doesn't exist - this shouldn't happen for admins
            // But let's create it just in case (this will be handled by auth.js on next login)
            console.warn('Admin user document does not exist. This should be created automatically.')
            navigate('/dashboard')
          }
        } catch (error) {
          console.error('Error checking admin status:', error)
          // On error, redirect to regular dashboard for security
          navigate('/dashboard')
        }
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
    { id: 'dashboard', title: 'Admin Dashboard' },
    { id: 'users', title: 'Manage Users' },
    { id: 'investors', title: 'Investors' },
    { id: 'news', title: 'News' },
    { id: 'settings', title: 'Admin Settings' },
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
    return null // Will redirect
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
              <img src={user.photoURL} alt={user.displayName || 'Admin'} />
            ) : (
              <div className="profile-placeholder">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
          </div>
          <div className="profile-info">
            <h3 className="profile-name">{user.displayName || 'Admin'}</h3>
            <p className="profile-email">{user.email}</p>
            <span className="admin-badge">Admin</span>
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
            {sections.find(s => s.id === activeSection)?.title || 'Admin Dashboard'}
          </h1>
          <div className="content-body">
                {activeSection === 'users' ? (
                  <AdminUsersManagement />
                ) : activeSection === 'investors' ? (
                  <AdminInvestorsManagement />
                ) : activeSection === 'news' ? (
                  <AdminNewsManagement />
                ) : activeSection === 'settings' ? (
                  <p>Admin specific settings will go here.</p>
                ) : (
                  <p>Welcome to the {sections.find(s => s.id === activeSection)?.title.toLowerCase() || 'admin dashboard'} section.</p>
                )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboardPage

