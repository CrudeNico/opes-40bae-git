import React, { useState, useEffect } from 'react'
import { getFirestore, collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore'
import { getAdmin3Overrides, saveAdmin3UserOverride, mergeUserWithOverride } from '../utils/admin3Overrides'
import { generateAdmin3SampleUsers } from '../utils/admin3SampleUsers'
import { computeDualTrancheSumBalance, getInvestorCombinedInitial } from '../utils/investorDualTranche'
import './AdminUsersManagement.css'

/** Admins may correct submitted investment details within this window from submission (or approval if no submission date). */
const INVESTMENT_ADMIN_EDIT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

function getInvestmentRecordStartMs(investmentData) {
  if (!investmentData) return null
  const raw = investmentData.initiatedAt || investmentData.approvedAt
  if (!raw) return null
  const t = Date.parse(raw)
  return Number.isFinite(t) ? t : null
}

function isWithinAdminInvestmentEditWindow(investmentData) {
  const start = getInvestmentRecordStartMs(investmentData)
  if (start == null) return false
  return Date.now() - start <= INVESTMENT_ADMIN_EDIT_WINDOW_MS
}

function formatAdminInvestmentEditDeadline(investmentData) {
  const start = getInvestmentRecordStartMs(investmentData)
  if (start == null) return ''
  const end = new Date(start + INVESTMENT_ADMIN_EDIT_WINDOW_MS)
  return end.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const AdminUsersManagement = ({ user: currentUser, currentUserStatuses = [] }) => {
  const isAdmin2 = currentUserStatuses && (currentUserStatuses.includes('Admin 2') || currentUserStatuses.includes('Relations'))
  const isAdmin3 = currentUserStatuses && currentUserStatuses.includes('Admin 3')
  // Admin 3 can modify but saves to overrides only; Admin 2 cannot modify
  const canModifyStatuses = !isAdmin2 || isAdmin3
  const canApproveInvestments = !isAdmin2 || isAdmin3
  const canEditInvestments = !isAdmin2 || isAdmin3
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userStatuses, setUserStatuses] = useState({
    Admin: false,
    'Admin 2': false,
    'Admin 3': false,
    Investor: false,
    Trader: false,
    Learner: false,
    Community: false
  })
  const [investmentData, setInvestmentData] = useState(null)
  const [editingInvestment, setEditingInvestment] = useState(false)
  const [includeSecondaryTrancheEdit, setIncludeSecondaryTrancheEdit] = useState(false)
  const [editedInvestmentData, setEditedInvestmentData] = useState({})
  const [loadingSave, setLoadingSave] = useState(false)
  const [loadingApprove, setLoadingApprove] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingProfile, setEditingProfile] = useState(false)
  const [editedProfile, setEditedProfile] = useState({ displayName: '', email: '', profileImageUrl: '' })
  
  const availableStatuses = ['Admin', 'Admin 2', 'Admin 3', 'Investor', 'Trader', 'Learner', 'Community']
  const placeholderColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1']

  const getProfilePlaceholder = (u) => {
    if (u?.profilePlaceholder) return u.profilePlaceholder
    const key = `${u?.id || ''}${u?.displayName || ''}${u?.email || ''}`
    let hash = 0
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
    return {
      letter: (u?.displayName || u?.email || 'U').charAt(0).toUpperCase(),
      bgColor: placeholderColors[hash % placeholderColors.length]
    }
  }

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
        'Admin 2': currentStatuses.includes('Admin 2') || currentStatuses.includes('Relations'),
        'Admin 3': currentStatuses.includes('Admin 3'),
        Investor: currentStatuses.includes('Investor'),
        Trader: currentStatuses.includes('Trader'),
        Learner: currentStatuses.includes('Learner'),
        Community: currentStatuses.includes('Community')
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
      // Always reset edit mode when selecting a user - Admin 2 will never be able to enter edit mode
      setEditingInvestment(false)
      setIncludeSecondaryTrancheEdit(false)
      setEditingProfile(false)
      setEditedProfile({
        displayName: selectedUser.displayName || '',
        email: selectedUser.email || '',
        profileImageUrl: selectedUser.profileImageUrl || ''
      })
    }
  }, [selectedUser])

  const loadUsers = async () => {
    try {
      const db = getFirestore()
      const usersCollection = collection(db, 'users')
      const overrides = isAdmin3 && currentUser?.uid ? await getAdmin3Overrides(currentUser.uid) : {}

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
        
        const u = {
          id: docSnapshot.id,
          displayName: userData.displayName || '',
          email: userData.email || '',
          profileImageUrl: userData.profileImageUrl || '',
          statuses: statuses,
          investmentData: userData.investmentData || null,
          ...userData
        }
        usersList.push(mergeUserWithOverride(u, overrides[docSnapshot.id]))
      })

      if (isAdmin3) {
        const sampleUsers = generateAdmin3SampleUsers()
        sampleUsers.forEach((su) => {
          usersList.push(mergeUserWithOverride(su, overrides[su.id]))
        })
      }

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

  const handleSecondaryInvestmentFieldChange = (field, value) => {
    setEditedInvestmentData(prev => ({
      ...prev,
      secondaryInvestment: {
        riskTolerance: 'moderate',
        monthlyReturnRate: 0.04,
        ...(prev.secondaryInvestment || {}),
        [field]: value
      }
    }))
  }

  const handleSaveInvestment = async () => {
    if (!selectedUser || !investmentData) return
    
    // Prevent Admin 2 from editing investments
    if (!canEditInvestments) {
      setError('You do not have permission to edit investments.')
      return
    }

    if (investmentData.status === 'approved' && !isWithinAdminInvestmentEditWindow(investmentData)) {
      setError('The 30-day period to correct this investment has ended.')
      return
    }

    setLoadingSave(true)
    setError('')
    setSuccess('')

    try {
      const db = getFirestore()

      const requestedAccountType = investmentData.accountType || 'Investor'

      // Merge into existing investmentData so approved accounts keep performance fields (e.g. monthlyHistory).
      const updatedInvestmentData = {
        ...investmentData,
        initialInvestment: editedInvestmentData.initialInvestment ?? investmentData.initialInvestment,
        startingDate: editedInvestmentData.startingDate ?? investmentData.startingDate,
        country: editedInvestmentData.country ?? investmentData.country,
        phoneNumber: editedInvestmentData.phoneNumber ?? investmentData.phoneNumber,
        monthlyAdditions: editedInvestmentData.monthlyAdditions ?? (investmentData.monthlyAdditions || 0),
        accountType: requestedAccountType,
        status: investmentData.status,
        initiatedAt: investmentData.initiatedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      if (investmentData.status === 'approved' && investmentData.approvedAt) {
        updatedInvestmentData.approvedAt = investmentData.approvedAt
      }

      if (requestedAccountType === 'Investor') {
        const hadSecondary = !!investmentData.secondaryInvestment
        const si = editedInvestmentData.secondaryInvestment || {}
        const secAmt = si.initialInvestment
        const newSecondaryValid =
          includeSecondaryTrancheEdit &&
          Number.isFinite(secAmt) &&
          secAmt > 0 &&
          si.startingDate

        if (includeSecondaryTrancheEdit && !hadSecondary && !newSecondaryValid) {
          setError(
            'To add a second tranche, enter a positive initial amount and starting date, or turn off "Add second tranche".'
          )
          setLoadingSave(false)
          return
        }

        const saveSecondary = hadSecondary || newSecondaryValid
        if (saveSecondary) {
          updatedInvestmentData.riskTolerance = 'conservative'
          updatedInvestmentData.monthlyReturnRate = 0.02
          updatedInvestmentData.secondaryInvestment = {
            initialInvestment:
              editedInvestmentData.secondaryInvestment?.initialInvestment ??
              investmentData.secondaryInvestment?.initialInvestment ??
              0,
            startingDate:
              editedInvestmentData.secondaryInvestment?.startingDate ??
              investmentData.secondaryInvestment?.startingDate ??
              '',
            monthlyAdditions:
              editedInvestmentData.secondaryInvestment?.monthlyAdditions ??
              investmentData.secondaryInvestment?.monthlyAdditions ??
              0,
            riskTolerance: 'moderate',
            monthlyReturnRate: 0.04
          }
        } else {
          delete updatedInvestmentData.secondaryInvestment
          updatedInvestmentData.riskTolerance =
            editedInvestmentData.riskTolerance || investmentData.riskTolerance || 'conservative'
          updatedInvestmentData.monthlyReturnRate =
            editedInvestmentData.monthlyReturnRate ||
            investmentData.monthlyReturnRate ||
            (updatedInvestmentData.riskTolerance === 'conservative' ? 0.02 : 0.04)
        }

        const pInit = Number(updatedInvestmentData.initialInvestment) || 0
        const sInit = Number(updatedInvestmentData.secondaryInvestment?.initialInvestment) || 0
        const inceptionTotal = pInit + sInit
        const mh = updatedInvestmentData.monthlyHistory || []
        if (mh.length === 0) {
          updatedInvestmentData.totalDeposits = inceptionTotal
          updatedInvestmentData.currentBalance = inceptionTotal
        } else if (updatedInvestmentData.secondaryInvestment && sInit > 0) {
          updatedInvestmentData.currentBalance = computeDualTrancheSumBalance(mh, pInit, sInit)
          const td = Number(updatedInvestmentData.totalDeposits)
          if (!Number.isFinite(td) || td < inceptionTotal) {
            updatedInvestmentData.totalDeposits = inceptionTotal
          }
        }
      } else {
        // Trader: ensure no undefined fields
        updatedInvestmentData.monthlyReturnRate = investmentData.monthlyReturnRate || 0
      }

      if (isAdmin3 && currentUser?.uid) {
        await saveAdmin3UserOverride(currentUser.uid, selectedUser.id, { investmentData: updatedInvestmentData })
      } else {
        await updateDoc(doc(db, 'users', selectedUser.id), {
          investmentData: updatedInvestmentData,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      }

      setSuccess(
        isAdmin3
          ? 'Saved to your sandbox (changes visible only to you)'
          : requestedAccountType === 'Trader'
            ? 'Tracking data updated successfully!'
            : 'Investment data updated successfully!'
      )
      setEditingInvestment(false)
      await loadUsers()
      
      // Update selected user
      const updatedUser = { ...selectedUser, investmentData: updatedInvestmentData }
      setSelectedUser(updatedUser)
      setInvestmentData(updatedInvestmentData)
    } catch (error) {
      console.error('Error updating investment:', error)
      setError('Failed to update investment data. Please try again.')
    } finally {
      setLoadingSave(false)
    }
  }

  const handleApproveInvestment = async () => {
    if (!selectedUser || !investmentData) return
    
    // Prevent Admin 2 from approving investments
    if (!canApproveInvestments) {
      setError('You do not have permission to approve investments.')
      return
    }

    setLoadingApprove(true)
    setError('')
    setSuccess('')

    try {
      const db = getFirestore()
      const userDocRef = doc(db, 'users', selectedUser.id)
      
      // Get current user document to read existing statuses
      const userDoc = await getDoc(userDocRef)
      
      // Get current statuses (for Admin 3, use selectedUser which may have overrides)
      let currentStatuses = []
      if (isAdmin3 && selectedUser?.statuses) {
        currentStatuses = [...selectedUser.statuses]
      } else if (userDoc.exists()) {
        const userData = userDoc.data()
        currentStatuses = userData.statuses || []
        if (currentStatuses.length === 0 && Array.isArray(userData.isAdmin) && userData.isAdmin.length > 0) {
          currentStatuses = userData.isAdmin
        }
      }

      // Determine requested account type (Investor or Trader)
      const requestedAccountType = investmentData.accountType || 'Investor'

      // Add appropriate status if not already present
      if (requestedAccountType === 'Trader') {
        if (!currentStatuses.includes('Trader')) {
          currentStatuses.push('Trader')
        }
      } else {
        if (!currentStatuses.includes('Investor')) {
          currentStatuses.push('Investor')
        }
      }

      // Prepare approved investment data with all fields
      const approvedInvestmentData = {
        initialInvestment: editedInvestmentData.initialInvestment ?? investmentData.initialInvestment,
        startingDate: editedInvestmentData.startingDate ?? investmentData.startingDate,
        country: editedInvestmentData.country ?? investmentData.country,
        phoneNumber: editedInvestmentData.phoneNumber ?? investmentData.phoneNumber,
        monthlyAdditions: editedInvestmentData.monthlyAdditions ?? (investmentData.monthlyAdditions || 0),
        accountType: requestedAccountType,
        status: 'approved',
        initiatedAt: investmentData.initiatedAt || new Date().toISOString(),
        approvedAt: new Date().toISOString()
      }

      if (requestedAccountType === 'Investor') {
        const hadSecondary = !!investmentData.secondaryInvestment
        const si = editedInvestmentData.secondaryInvestment || {}
        const secAmt = si.initialInvestment
        const newSecondaryValid =
          includeSecondaryTrancheEdit &&
          Number.isFinite(secAmt) &&
          secAmt > 0 &&
          si.startingDate

        if (includeSecondaryTrancheEdit && !hadSecondary && !newSecondaryValid) {
          setError(
            'To add a second tranche, enter a positive initial amount and starting date, or turn off "Add second tranche".'
          )
          setLoadingApprove(false)
          return
        }

        const saveSecondary = hadSecondary || newSecondaryValid
        if (saveSecondary) {
          approvedInvestmentData.riskTolerance = 'conservative'
          approvedInvestmentData.monthlyReturnRate = 0.02
          approvedInvestmentData.secondaryInvestment = {
            initialInvestment:
              editedInvestmentData.secondaryInvestment?.initialInvestment ??
              investmentData.secondaryInvestment?.initialInvestment ??
              0,
            startingDate:
              editedInvestmentData.secondaryInvestment?.startingDate ??
              investmentData.secondaryInvestment?.startingDate ??
              '',
            monthlyAdditions:
              editedInvestmentData.secondaryInvestment?.monthlyAdditions ??
              investmentData.secondaryInvestment?.monthlyAdditions ??
              0,
            riskTolerance: 'moderate',
            monthlyReturnRate: 0.04
          }
        } else {
          approvedInvestmentData.riskTolerance =
            editedInvestmentData.riskTolerance || investmentData.riskTolerance || 'conservative'
          approvedInvestmentData.monthlyReturnRate =
            editedInvestmentData.monthlyReturnRate ||
            investmentData.monthlyReturnRate ||
            (approvedInvestmentData.riskTolerance === 'conservative' ? 0.02 : 0.04)
        }

        const pAppr = Number(approvedInvestmentData.initialInvestment) || 0
        const sAppr = Number(approvedInvestmentData.secondaryInvestment?.initialInvestment) || 0
        const inceptionAppr = pAppr + sAppr
        approvedInvestmentData.totalDeposits = inceptionAppr
        approvedInvestmentData.currentBalance = inceptionAppr
      } else {
        approvedInvestmentData.monthlyReturnRate = investmentData.monthlyReturnRate || 0
      }

      if (isAdmin3 && currentUser?.uid) {
        await saveAdmin3UserOverride(currentUser.uid, selectedUser.id, {
          statuses: currentStatuses,
          investmentData: approvedInvestmentData
        })
      } else {
        await updateDoc(userDocRef, {
          statuses: currentStatuses,
          investmentData: approvedInvestmentData,
          updatedAt: new Date().toISOString()
        })
      }

      setSuccess(
        isAdmin3
          ? 'Saved to your sandbox (changes visible only to you)'
          : requestedAccountType === 'Trader'
            ? 'Tracking account approved! User is now a trader.'
            : 'Investment approved! User is now an investor.'
      )
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
        'Admin 2': currentStatuses.includes('Admin 2') || currentStatuses.includes('Relations'),
        'Admin 3': currentStatuses.includes('Admin 3'),
        Investor: currentStatuses.includes('Investor'),
        Trader: currentStatuses.includes('Trader'),
        Learner: currentStatuses.includes('Learner'),
        Community: currentStatuses.includes('Community')
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

  const handleSaveProfile = async () => {
    if (!selectedUser) return

    setLoadingSave(true)
    setError('')
    setSuccess('')

    try {
      const profileOverride = {
        displayName: editedProfile.displayName.trim() || selectedUser.displayName,
        email: editedProfile.email.trim() || selectedUser.email,
        profileImageUrl: editedProfile.profileImageUrl.trim() || selectedUser.profileImageUrl || ''
      }

      if (isAdmin3 && currentUser?.uid) {
        await saveAdmin3UserOverride(currentUser.uid, selectedUser.id, profileOverride)
        setSuccess('Profile saved to your sandbox (changes visible only to you)')
      } else if (!selectedUser._isSample) {
        const db = getFirestore()
        await updateDoc(doc(db, 'users', selectedUser.id), {
          displayName: profileOverride.displayName,
          email: profileOverride.email,
          profileImageUrl: profileOverride.profileImageUrl || null,
          updatedAt: new Date().toISOString()
        })
        setSuccess('Profile updated successfully!')
      }

      setSelectedUser({ ...selectedUser, ...profileOverride })
      setEditingProfile(false)
      await loadUsers()
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err?.message || 'Failed to save profile.')
    } finally {
      setLoadingSave(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!selectedUser) return

    if (!canModifyStatuses) {
      setError('You do not have permission to modify user statuses.')
      return
    }

    setLoadingSave(true)
    setError('')
    setSuccess('')

    try {
      let selectedStatuses = availableStatuses.filter(status => userStatuses[status])
      if (selectedStatuses.includes('Admin 3') && !selectedStatuses.includes('Community')) {
        selectedStatuses = [...selectedStatuses, 'Community']
      }

      if (isAdmin3 && currentUser?.uid) {
        await saveAdmin3UserOverride(currentUser.uid, selectedUser.id, { statuses: selectedStatuses })
      } else {
        const db = getFirestore()
        const userDocRef = doc(db, 'users', selectedUser.id)
        await updateDoc(userDocRef, {
          statuses: selectedStatuses,
          updatedAt: new Date().toISOString()
        })
      }
      
      const savedStatuses = isAdmin3 ? selectedStatuses : (await getDoc(doc(getFirestore(), 'users', selectedUser.id))).data()?.statuses || []

      setSuccess(isAdmin3 ? 'Saved to your sandbox (changes visible only to you)' : 'User statuses updated successfully!')

      await loadUsers()

      const updatedUser = {
        ...selectedUser,
        id: selectedUser.id,
        statuses: savedStatuses
      }
      setSelectedUser(updatedUser)
      
      // Update status checkboxes immediately to reflect the saved state
      const statusMap = {
        Admin: savedStatuses.includes('Admin'),
        'Admin 2': savedStatuses.includes('Admin 2') || savedStatuses.includes('Relations'),
        'Admin 3': savedStatuses.includes('Admin 3'),
        Investor: savedStatuses.includes('Investor'),
        Learner: savedStatuses.includes('Learner'),
        Community: savedStatuses.includes('Community')
      }
      setUserStatuses(statusMap)
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
                    {!isAdmin3 && user.profileImageUrl ? (
                      <img src={user.profileImageUrl} alt={user.displayName || user.email} />
                    ) : (
                      <div
                        className="user-card-placeholder"
                        style={{ background: getProfilePlaceholder(user).bgColor }}
                      >
                        {getProfilePlaceholder(user).letter}
                      </div>
                    )}
                  </div>
                  <div className="user-card-info">
                    <h3 className="user-card-name">{user.displayName || 'No name'}</h3>
                    <p className="user-card-email">{user.email}</p>
                    <div className="user-status-badges">
                      {[...new Set(user.statuses || [])].map((status) => {
                        const statusClass = status.toLowerCase().replace(/\s+/g, '-')
                        return (
                          <span key={status} className={`user-status-badge status-${statusClass}`}>
                            {status}
                          </span>
                        )
                      })}
                      {user.investmentData && user.investmentData.status === 'pending' && (
                        <span className="user-status-badge status-pending">
                          Pending
                        </span>
                      )}
                      {user.investmentData &&
                        user.investmentData.status === 'pending' &&
                        user.investmentData.accountType !== 'Trader' &&
                        !user.investmentData.secondaryInvestment && (
                          <span
                            className="user-status-badge status-pending-single-tranche"
                            title="Pending investment with one tranche only (no second tranche requested)"
                          >
                            Single tranche
                          </span>
                        )}
                      {user.investmentData?.status === 'approved' &&
                        (user.statuses || []).includes('Investor') &&
                        isWithinAdminInvestmentEditWindow(user.investmentData) && (
                          <span
                            className="user-status-badge status-investment-editable"
                            title="Investment details can still be corrected by an admin (30 days from submission or approval date)"
                          >
                            Editable investment
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

              {/* User Info - editable */}
              <div className="user-detail-section">
                <h3 className="section-title">User Information</h3>
                {!editingProfile ? (
                  <div className="user-info-display">
                    <div className="user-info-avatar">
                      {!isAdmin3 && selectedUser.profileImageUrl ? (
                        <img src={selectedUser.profileImageUrl} alt={selectedUser.displayName || selectedUser.email} />
                      ) : (
                        <div
                          className="user-info-avatar-placeholder"
                          style={{ backgroundColor: getProfilePlaceholder(selectedUser).bgColor }}
                        >
                          {getProfilePlaceholder(selectedUser).letter}
                        </div>
                      )}
                    </div>
                    <div className="info-row">
                      <span className="info-label">Name:</span>
                      <span className="info-value">{selectedUser.displayName || 'No name'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Email:</span>
                      <span className="info-value">{selectedUser.email}</span>
                    </div>
                    {(canModifyStatuses || isAdmin3) && (
                      <button type="button" onClick={() => setEditingProfile(true)} className="btn-edit">
                        Edit Profile
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="user-info-edit">
                    <div className="form-group">
                      <label className="form-label">Profile Image URL</label>
                      <input
                        type="url"
                        className="form-input"
                        value={editedProfile.profileImageUrl}
                        onChange={(e) => setEditedProfile(p => ({ ...p, profileImageUrl: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editedProfile.displayName}
                        onChange={(e) => setEditedProfile(p => ({ ...p, displayName: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-input"
                        value={editedProfile.email}
                        onChange={(e) => setEditedProfile(p => ({ ...p, email: e.target.value }))}
                      />
                    </div>
                    <div className="investment-edit-actions">
                      <button type="button" onClick={() => { setEditingProfile(false); setEditedProfile({ displayName: selectedUser.displayName || '', email: selectedUser.email || '', profileImageUrl: selectedUser.profileImageUrl || '' }); }} className="btn-cancel" disabled={loadingSave}>
                        Cancel
                      </button>
                      <button type="button" onClick={handleSaveProfile} className="btn-save" disabled={loadingSave}>
                        {loadingSave ? 'Saving...' : 'Save Profile'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Investment / Tracking Data Section */}
              {investmentData &&
                (investmentData.status === 'pending' || investmentData.status === 'approved') && (
                <div
                  className={`user-detail-section investment-section${
                    investmentData.status === 'approved' ? ' investment-section-approved' : ''
                  }`}
                >
                  <h3 className="section-title">
                    {investmentData.status === 'pending'
                      ? investmentData.accountType === 'Trader'
                        ? 'Pending Tracking Request'
                        : 'Pending Investment Request'
                      : investmentData.accountType === 'Trader'
                        ? 'Approved Tracking'
                        : 'Approved Investment'}
                  </h3>
                  {investmentData.status === 'approved' && (
                    <p className="section-description investment-window-note">
                      {isWithinAdminInvestmentEditWindow(investmentData) ? (
                        <>
                          Investment details can be corrected until{' '}
                          <strong>{formatAdminInvestmentEditDeadline(investmentData)}</strong> (30 days from when the
                          investor submitted the request, or from approval if no submission date is stored).
                        </>
                      ) : (
                        <>
                          The 30-day window to correct investment details from the submission or approval date has
                          ended. Contact engineering if a correction is still required.
                        </>
                      )}
                    </p>
                  )}
                  {!editingInvestment ? (
                    <div className="investment-display">
                      <div className="investment-info-grid">
                        <div className="info-item">
                          <span className="info-label">
                            {investmentData.accountType !== 'Trader' && investmentData.secondaryInvestment
                              ? 'First tranche (Conservative, 2%):'
                              : 'Initial investment:'}
                          </span>
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
                        {investmentData.accountType !== 'Trader' && (
                          <div className="info-item">
                            <span className="info-label">Risk Tolerance:</span>
                            <span className="info-value">
                              {investmentData.riskTolerance === 'conservative' ? 'Conservative (2% per month)' : 
                              investmentData.riskTolerance === 'moderate' ? 'Moderate (4% per month)' : 'N/A'}
                            </span>
                          </div>
                        )}
                        {investmentData.accountType !== 'Trader' && !investmentData.secondaryInvestment && (
                          <div className="info-item">
                            <span className="info-label">Second tranche:</span>
                            <span className="info-value">Not requested — add under Edit Investment if needed</span>
                          </div>
                        )}
                        {investmentData.accountType !== 'Trader' && investmentData.secondaryInvestment && (
                          <>
                            <div className="info-item">
                              <span className="info-label">Second tranche (Moderate 4%):</span>
                              <span className="info-value">
                                ${investmentData.secondaryInvestment.initialInvestment?.toLocaleString() || 'N/A'}
                              </span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Second tranche start date:</span>
                              <span className="info-value">{investmentData.secondaryInvestment.startingDate || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Second tranche monthly additions:</span>
                              <span className="info-value">
                                ${investmentData.secondaryInvestment.monthlyAdditions?.toLocaleString() || '0'}
                              </span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Total initial (both tranches):</span>
                              <span className="info-value">
                                ${getInvestorCombinedInitial(investmentData).toLocaleString()}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                      {/* Completely hide action buttons for Admin 2 - only show if user has permissions */}
                      {!isAdmin2 && (
                        <div className="investment-actions">
                          {canEditInvestments &&
                            (investmentData.status === 'pending' ||
                              (investmentData.status === 'approved' &&
                                isWithinAdminInvestmentEditWindow(investmentData))) && (
                            <button
                              onClick={() => {
                                setIncludeSecondaryTrancheEdit(!!investmentData.secondaryInvestment)
                                setEditingInvestment(true)
                              }}
                              className="btn-edit"
                            >
                              {investmentData.accountType === 'Trader' ? 'Edit Tracking' : 'Edit Investment'}
                            </button>
                          )}
                          {canApproveInvestments && investmentData.status === 'pending' && (
                            <button
                              onClick={handleApproveInvestment}
                              disabled={loadingApprove}
                              className="btn-approve"
                            >
                              {loadingApprove
                                ? 'Approving...'
                                : investmentData.accountType === 'Trader'
                                  ? 'Approve Tracking'
                                  : 'Approve Investment'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : editingInvestment && canEditInvestments && !isAdmin2 ? (
                    <div className="investment-edit-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">
                            {investmentData.accountType !== 'Trader' &&
                            (investmentData.secondaryInvestment || includeSecondaryTrancheEdit)
                              ? 'First tranche amount (Conservative, 2%) — not including second tranche'
                              : 'Initial investment'}
                          </label>
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
                        {investmentData.accountType !== 'Trader' && (
                          <div className="form-group">
                            <label className="form-label">Risk tolerance (first tranche only)</label>
                            <select
                              className="form-input"
                              value={editedInvestmentData.riskTolerance || ''}
                              onChange={(e) => handleInvestmentFieldChange('riskTolerance', e.target.value)}
                              disabled={
                                !!investmentData.secondaryInvestment || includeSecondaryTrancheEdit
                              }
                            >
                              <option value="conservative">Conservative (2% per month)</option>
                              <option value="moderate">Moderate (4% per month)</option>
                            </select>
                            {(investmentData.secondaryInvestment || includeSecondaryTrancheEdit) && (
                              <small className="form-help">
                                With two tranches, the first tranche is always Conservative (2%); the second is
                                Moderate (4%).
                              </small>
                            )}
                          </div>
                        )}
                      </div>
                      {investmentData.accountType !== 'Trader' && !investmentData.secondaryInvestment && (
                        <div className="investment-secondary-edit-block investment-secondary-toggle-only">
                          <label className="secondary-tranche-checkbox-label">
                            <input
                              type="checkbox"
                              checked={includeSecondaryTrancheEdit}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setIncludeSecondaryTrancheEdit(checked)
                                if (checked) {
                                  setEditedInvestmentData((prev) => ({
                                    ...prev,
                                    riskTolerance: 'conservative',
                                    secondaryInvestment: {
                                      riskTolerance: 'moderate',
                                      monthlyReturnRate: 0.04,
                                      ...(prev.secondaryInvestment || {}),
                                      monthlyAdditions: prev.secondaryInvestment?.monthlyAdditions ?? 0
                                    }
                                  }))
                                } else {
                                  setEditedInvestmentData((prev) => {
                                    const next = { ...prev }
                                    delete next.secondaryInvestment
                                    return next
                                  })
                                }
                              }}
                            />
                            <span>Add second tranche (Moderate 4%)</span>
                          </label>
                        </div>
                      )}
                      {investmentData.accountType !== 'Trader' &&
                        (investmentData.secondaryInvestment || includeSecondaryTrancheEdit) && (
                        <div className="investment-secondary-edit-block">
                          <h4 className="subsection-title">Second tranche (Moderate 4%)</h4>
                          <p className="form-help secondary-tranche-edit-hint">
                            First tranche must be Conservative (2%) when two tranches are saved.
                          </p>
                          <div className="form-row">
                            <div className="form-group">
                              <label className="form-label">Initial amount</label>
                              <input
                                type="number"
                                className="form-input"
                                value={editedInvestmentData.secondaryInvestment?.initialInvestment ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value
                                  handleSecondaryInvestmentFieldChange(
                                    'initialInvestment',
                                    v === '' ? '' : parseFloat(v)
                                  )
                                }}
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Starting date</label>
                              <input
                                type="date"
                                className="form-input"
                                value={editedInvestmentData.secondaryInvestment?.startingDate || ''}
                                onChange={(e) =>
                                  handleSecondaryInvestmentFieldChange('startingDate', e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="form-row">
                            <div className="form-group">
                              <label className="form-label">Monthly additions</label>
                              <input
                                type="number"
                                className="form-input"
                                value={
                                  editedInvestmentData.secondaryInvestment?.monthlyAdditions ?? ''
                                }
                                onChange={(e) => {
                                  const v = e.target.value
                                  handleSecondaryInvestmentFieldChange(
                                    'monthlyAdditions',
                                    v === '' ? '' : parseFloat(v)
                                  )
                                }}
                                min="0"
                                max="20000"
                                step="0.01"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="investment-edit-actions">
                        <button
                          onClick={() => {
                            setEditingInvestment(false)
                            setIncludeSecondaryTrancheEdit(!!investmentData.secondaryInvestment)
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
                  ) : null}
                </div>
              )}

              {/* User Statuses */}
              <div className="user-detail-section">
                <h3 className="section-title">User Statuses</h3>
                <p className="section-description">
                  {canModifyStatuses 
                    ? 'Select one or more statuses to grant access to different features.'
                    : 'You do not have permission to modify user statuses. This feature is only available to full administrators.'}
                </p>
                <div className="statuses-list">
                  {availableStatuses.map((status) => (
                    <label key={status} className={`status-checkbox-label ${!canModifyStatuses ? 'disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={userStatuses[status]}
                        onChange={() => handleStatusChange(status)}
                        disabled={!canModifyStatuses}
                        className="status-checkbox-input"
                      />
                      <span className="status-checkbox-text">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Save Button - Only show for full admins */}
              {canModifyStatuses && (
                <button
                  onClick={handleSaveChanges}
                  disabled={loadingSave || loadingApprove}
                  className="btn-save"
                >
                  {loadingSave ? 'Saving...' : 'Save Statuses'}
                </button>
              )}

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

