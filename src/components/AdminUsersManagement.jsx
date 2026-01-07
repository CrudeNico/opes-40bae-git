import React, { useState, useEffect } from 'react'
import { getFirestore, collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore'
import './AdminUsersManagement.css'

const AdminUsersManagement = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userStatuses, setUserStatuses] = useState({
    Admin: false,
    Relations: false,
    Investor: false,
    Learner: false
  })
  const [investmentData, setInvestmentData] = useState(null)
  const [editingInvestment, setEditingInvestment] = useState(false)
  const [editedInvestmentData, setEditedInvestmentData] = useState({})
  const [loadingSave, setLoadingSave] = useState(false)
  const [loadingApprove, setLoadingApprove] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const availableStatuses = ['Admin', 'Relations', 'Investor', 'Learner']

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (selectedUser) {
      // Get user's current statuses from Firestore
      // Handle both old format (isAdmin as array) and new format (statuses as array)
      let currentStatuses = selectedUser.statuses || []
      // If statuses doesn't exist but isAdmin does (as array), use isAdmin
      if (currentStatuses.length === 0 && Array.isArray(selectedUser.isAdmin) && selectedUser.isAdmin.length > 0) {
        currentStatuses = selectedUser.isAdmin
      }
      // If isAdmin is boolean true, convert to array
      if (currentStatuses.length === 0 && selectedUser.isAdmin === true) {
        currentStatuses = ['Admin']
      }
      
      // Initialize status checkboxes based on user's current statuses
      const statusMap = {
        Admin: currentStatuses.includes('Admin'),
        Relations: currentStatuses.includes('Relations'),
        Investor: currentStatuses.includes('Investor'),
        Learner: currentStatuses.includes('Learner')
      }
      setUserStatuses(statusMap)
      
      // Load investment data if exists
      if (selectedUser.investmentData) {
        setInvestmentData(selectedUser.investmentData)
        setEditedInvestmentData(selectedUser.investmentData)
      } else {
        setInvestmentData(null)
        setEditedInvestmentData({})
      }
      setEditingInvestment(false)
    }
  }, [selectedUser])

  const loadUsers = async () => {
    try {
      const db = getFirestore()
      const usersCollection = collection(db, 'users')
      
      // Use query to ensure we have proper permissions
      const usersSnapshot = await getDocs(usersCollection)
      
      const usersList = []
      usersSnapshot.forEach((docSnapshot) => {
        const userData = docSnapshot.data()
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
        
        usersList.push({
          id: docSnapshot.id,
          displayName: userData.displayName || '',
          email: userData.email || '',
          profileImageUrl: userData.profileImageUrl || '',
          statuses: statuses,
          investmentData: userData.investmentData || null,
          ...userData
        })
      })

      // Sort users: admins first, then pending investors, then by display name
      usersList.sort((a, b) => {
        const aIsAdmin = (a.statuses || []).includes('Admin')
        const bIsAdmin = (b.statuses || []).includes('Admin')
        const aIsPending = a.investmentData && a.investmentData.status === 'pending'
        const bIsPending = b.investmentData && b.investmentData.status === 'pending'

        if (aIsAdmin && !bIsAdmin) return -1
        if (!aIsAdmin && bIsAdmin) return 1
        if (aIsPending && !bIsPending) return -1
        if (!aIsPending && bIsPending) return 1
        return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '')
      })

      setUsers(usersList)
    } catch (error) {
      console.error('Error loading users:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      
      if (error.code === 'permission-denied') {
        setError('Permission denied. Please ensure you are logged in as an admin and that your admin status is set correctly in Firestore.')
      } else {
        setError('Failed to load users. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelect = (user) => {
    setSelectedUser(user)
    setError('')
    setSuccess('')
  }


  const handleStatusChange = (status) => {
    setUserStatuses(prev => ({
      ...prev,
      [status]: !prev[status]
    }))
  }

  const handleInvestmentFieldChange = (field, value) => {
    setEditedInvestmentData(prev => {
      const updated = {
        ...prev,
        [field]: value
      }
      // Update monthly return rate when risk tolerance changes
      if (field === 'riskTolerance') {
        updated.monthlyReturnRate = value === 'conservative' ? 0.02 : value === 'moderate' ? 0.04 : prev.monthlyReturnRate
      }
      return updated
    })
  }

  const handleSaveInvestment = async () => {
    if (!selectedUser || !investmentData) return

    setLoadingSave(true)
    setError('')
    setSuccess('')

    try {
      const db = getFirestore()
      await updateDoc(doc(db, 'users', selectedUser.id), {
        investmentData: {
          ...editedInvestmentData,
          updatedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      }, { merge: true })

      setSuccess('Investment data updated successfully!')
      setEditingInvestment(false)
      await loadUsers()
      
      // Update selected user
      const updatedUser = { ...selectedUser, investmentData: editedInvestmentData }
      setSelectedUser(updatedUser)
      setInvestmentData(editedInvestmentData)
    } catch (error) {
      console.error('Error updating investment:', error)
      setError('Failed to update investment data. Please try again.')
    } finally {
      setLoadingSave(false)
    }
  }

  const handleApproveInvestment = async () => {
    if (!selectedUser || !investmentData) return

    setLoadingApprove(true)
    setError('')
    setSuccess('')

    try {
      const db = getFirestore()
      const userDocRef = doc(db, 'users', selectedUser.id)
      
      // Get current user document to read existing statuses
      const userDoc = await getDoc(userDocRef)
      
      // Get current statuses
      let currentStatuses = []
      if (userDoc.exists()) {
        const userData = userDoc.data()
        currentStatuses = userData.statuses || []
        if (currentStatuses.length === 0 && Array.isArray(userData.isAdmin) && userData.isAdmin.length > 0) {
          currentStatuses = userData.isAdmin
        }
      }

      // Add Investor status if not already present
      if (!currentStatuses.includes('Investor')) {
        currentStatuses.push('Investor')
      }

      // Prepare approved investment data with all fields
      const approvedInvestmentData = {
        initialInvestment: editedInvestmentData.initialInvestment || investmentData.initialInvestment,
        startingDate: editedInvestmentData.startingDate || investmentData.startingDate,
        country: editedInvestmentData.country || investmentData.country,
        phoneNumber: editedInvestmentData.phoneNumber || investmentData.phoneNumber,
        monthlyAdditions: editedInvestmentData.monthlyAdditions !== undefined ? editedInvestmentData.monthlyAdditions : (investmentData.monthlyAdditions || 0),
        riskTolerance: editedInvestmentData.riskTolerance || investmentData.riskTolerance,
        monthlyReturnRate: editedInvestmentData.monthlyReturnRate || investmentData.monthlyReturnRate || (editedInvestmentData.riskTolerance === 'conservative' ? 0.02 : 0.04),
        status: 'approved',
        initiatedAt: investmentData.initiatedAt || new Date().toISOString(),
        approvedAt: new Date().toISOString()
      }

      // Update user document with Investor status and approved investment data
      await updateDoc(userDocRef, {
        statuses: currentStatuses,
        investmentData: approvedInvestmentData,
        updatedAt: new Date().toISOString()
      })

      setSuccess('Investment approved! User is now an investor.')
      setEditingInvestment(false)
      
      // Reload users to get fresh data
      await loadUsers()
      
      // Update selected user with new data
      const updatedUser = { 
        ...selectedUser, 
        statuses: currentStatuses,
        investmentData: approvedInvestmentData
      }
      setSelectedUser(updatedUser)
      setInvestmentData(approvedInvestmentData)
      setEditedInvestmentData(approvedInvestmentData)
      
      // Update status checkboxes
      const statusMap = {
        Admin: currentStatuses.includes('Admin'),
        Relations: currentStatuses.includes('Relations'),
        Investor: currentStatuses.includes('Investor'),
        Learner: currentStatuses.includes('Learner')
      }
      setUserStatuses(statusMap)
    } catch (error) {
      console.error('Error approving investment:', error)
      if (error.code === 'permission-denied') {
        setError('Permission denied. Please check Firestore security rules.')
      } else {
        setError(`Failed to approve investment: ${error.message}`)
      }
    } finally {
      setLoadingApprove(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!selectedUser) return

    setLoadingSave(true)
    setError('')
    setSuccess('')

    try {
      // Build array of selected statuses
      const selectedStatuses = availableStatuses.filter(status => userStatuses[status])
      
      const db = getFirestore()
      const updates = {
        statuses: selectedStatuses,
        updatedAt: new Date().toISOString()
      }

      // Update Firestore with new statuses
      // Note: We keep the old isAdmin field for backward compatibility, but statuses takes precedence
      const userDocRef = doc(db, 'users', selectedUser.id)
      await updateDoc(userDocRef, updates)

      setSuccess('User statuses updated successfully!')
      
      // Reload users to update the list
      await loadUsers()
      
      // Update selected user with new data
      const updatedUser = { ...selectedUser, statuses: selectedStatuses }
      setSelectedUser(updatedUser)
    } catch (error) {
      console.error('Error updating user:', error)
      if (error.code === 'permission-denied') {
        setError('Permission denied. Please check Firestore security rules.')
      } else {
        setError('Failed to update user statuses. Please try again.')
      }
    } finally {
      setLoadingSave(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-users-loading">
        <div className="loading-spinner">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="admin-users-management">
      <div className="users-layout">
        {/* Users List */}
        <div className="users-list-panel">
          <h2 className="panel-title">All Users</h2>
          <div className="users-list">
            {users.length === 0 ? (
              <p className="no-users">No users found</p>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className={`user-card ${selectedUser?.id === user.id ? 'selected' : ''}`}
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="user-card-image">
                    {user.profileImageUrl ? (
                      <img src={user.profileImageUrl} alt={user.displayName || user.email} />
                    ) : (
                      <div className="user-card-placeholder">
                        {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="user-card-info">
                    <h3 className="user-card-name">{user.displayName || 'No name'}</h3>
                    <p className="user-card-email">{user.email}</p>
                    <div className="user-status-badges">
                      {(user.statuses || []).map((status) => (
                        <span key={status} className={`user-status-badge status-${status.toLowerCase()}`}>
                          {status}
                        </span>
                      ))}
                      {user.investmentData && user.investmentData.status === 'pending' && (
                        <span className="user-status-badge status-pending">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* User Details Panel */}
        <div className="user-details-panel">
          {selectedUser ? (
            <div className="user-details">
              <h2 className="panel-title">Edit User Statuses</h2>
              
              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              {/* User Info Display (Read-only) */}
              <div className="user-detail-section">
                <h3 className="section-title">User Information</h3>
                <div className="user-info-display">
                  <div className="info-row">
                    <span className="info-label">Name:</span>
                    <span className="info-value">{selectedUser.displayName || 'No name'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{selectedUser.email}</span>
                  </div>
                </div>
              </div>

              {/* Investment Data Section */}
              {investmentData && investmentData.status === 'pending' && (
                <div className="user-detail-section investment-section">
                  <h3 className="section-title">Pending Investment Request</h3>
                  {!editingInvestment ? (
                    <div className="investment-display">
                      <div className="investment-info-grid">
                        <div className="info-item">
                          <span className="info-label">Initial Investment:</span>
                          <span className="info-value">${investmentData.initialInvestment?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Starting Date:</span>
                          <span className="info-value">{investmentData.startingDate || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Country:</span>
                          <span className="info-value">{investmentData.country || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Phone Number:</span>
                          <span className="info-value">{investmentData.phoneNumber || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Monthly Additions:</span>
                          <span className="info-value">${investmentData.monthlyAdditions?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Risk Tolerance:</span>
                          <span className="info-value">
                            {investmentData.riskTolerance === 'conservative' ? 'Conservative (2% per month)' : 
                             investmentData.riskTolerance === 'moderate' ? 'Moderate (4% per month)' : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="investment-actions">
                        <button
                          onClick={() => setEditingInvestment(true)}
                          className="btn-edit"
                        >
                          Edit Investment
                        </button>
                        <button
                          onClick={handleApproveInvestment}
                          disabled={loadingApprove}
                          className="btn-approve"
                        >
                          {loadingApprove ? 'Approving...' : 'Approve Investment'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="investment-edit-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Initial Investment</label>
                          <input
                            type="number"
                            className="form-input"
                            value={editedInvestmentData.initialInvestment || ''}
                            onChange={(e) => handleInvestmentFieldChange('initialInvestment', parseFloat(e.target.value))}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Starting Date</label>
                          <input
                            type="date"
                            className="form-input"
                            value={editedInvestmentData.startingDate || ''}
                            onChange={(e) => handleInvestmentFieldChange('startingDate', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Country</label>
                          <input
                            type="text"
                            className="form-input"
                            value={editedInvestmentData.country || ''}
                            onChange={(e) => handleInvestmentFieldChange('country', e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Phone Number</label>
                          <input
                            type="tel"
                            className="form-input"
                            value={editedInvestmentData.phoneNumber || ''}
                            onChange={(e) => handleInvestmentFieldChange('phoneNumber', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Monthly Additions</label>
                          <input
                            type="number"
                            className="form-input"
                            value={editedInvestmentData.monthlyAdditions || ''}
                            onChange={(e) => handleInvestmentFieldChange('monthlyAdditions', parseFloat(e.target.value))}
                            min="0"
                            max="20000"
                            step="0.01"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Risk Tolerance</label>
                          <select
                            className="form-input"
                            value={editedInvestmentData.riskTolerance || ''}
                            onChange={(e) => handleInvestmentFieldChange('riskTolerance', e.target.value)}
                          >
                            <option value="conservative">Conservative (2% per month)</option>
                            <option value="moderate">Moderate (4% per month)</option>
                          </select>
                        </div>
                      </div>
                      <div className="investment-edit-actions">
                        <button
                          onClick={() => {
                            setEditingInvestment(false)
                            setEditedInvestmentData(investmentData)
                          }}
                          className="btn-cancel"
                          disabled={loadingSave}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveInvestment}
                          disabled={loadingSave}
                          className="btn-save"
                        >
                          {loadingSave ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* User Statuses */}
              <div className="user-detail-section">
                <h3 className="section-title">User Statuses</h3>
                <p className="section-description">Select one or more statuses to grant access to different features.</p>
                <div className="statuses-list">
                  {availableStatuses.map((status) => (
                    <label key={status} className="status-checkbox-label">
                      <input
                        type="checkbox"
                        checked={userStatuses[status]}
                        onChange={() => handleStatusChange(status)}
                        className="status-checkbox-input"
                      />
                      <span className="status-checkbox-text">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveChanges}
                disabled={loadingSave || loadingApprove}
                className="btn-save"
              >
                {loadingSave ? 'Saving...' : 'Save Statuses'}
              </button>

            </div>
          ) : (
            <div className="no-selection">
              <p>Select a user from the list to view and edit their information</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminUsersManagement

