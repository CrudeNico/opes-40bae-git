import React, { useState, useEffect, useRef } from 'react'
import { auth } from '../firebase/config'
import { updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, verifyBeforeUpdateEmail } from 'firebase/auth'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'
import './Settings.css'

const Settings = ({ user }) => {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPasswordEmail, setCurrentPasswordEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPasswordEmail, setShowCurrentPasswordEmail] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [profileImage, setProfileImage] = useState(null)
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [loadingImage, setLoadingImage] = useState(false)
  const [loadingDisplayName, setLoadingDisplayName] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '')
      setEmail(user.email || '')
      // Only use photoURL from Auth, don't try to load from Firestore on mount
      setProfileImageUrl(user.photoURL || '')
      loadNotificationSettings()
    }
  }, [user])

  const loadNotificationSettings = async () => {
    try {
      const db = getFirestore()
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const statuses = userData.statuses || []
        const isCommunityMember = statuses.includes('Community')
        const notifications = userData.notifications || {}
        
        // Check if both are enabled, or default to enabled for Community members
        const tradeAlerts = notifications.tradeAlerts !== undefined 
          ? notifications.tradeAlerts 
          : isCommunityMember
        const weeklyReports = notifications.weeklyReports !== undefined 
          ? notifications.weeklyReports 
          : isCommunityMember
        
        // Combined notification is enabled if both are enabled
        const bothEnabled = tradeAlerts && weeklyReports
        setNotificationsEnabled(bothEnabled)
        
        // If user is Community member and preferences don't exist, save defaults
        if (isCommunityMember && userData.notifications === undefined) {
          await setDoc(doc(db, 'users', user.uid), {
            notifications: {
              tradeAlerts: true,
              weeklyReports: true
            }
          }, { merge: true })
        }
      }
    } catch (error) {
      console.error('Error loading notification settings:', error)
    }
  }

  const handleNotificationToggle = async () => {
    setLoadingNotifications(true)
    try {
      const db = getFirestore()
      const newValue = !notificationsEnabled
      setNotificationsEnabled(newValue)
      
      // Update both trade alerts and weekly reports to the same value
      await setDoc(doc(db, 'users', user.uid), {
        notifications: {
          tradeAlerts: newValue,
          weeklyReports: newValue
        }
      }, { merge: true })
      
      setSuccess(`Community notifications ${newValue ? 'enabled' : 'disabled'}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error updating notification settings:', error)
      setError('Failed to update notification settings')
      // Revert on error
      setNotificationsEnabled(!notificationsEnabled)
    } finally {
      setLoadingNotifications(false)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      setProfileImage(file)
      setError('')
      // Preview the image
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImageUrl(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageUpload = async () => {
    if (!profileImage) {
      setError('Please select an image first')
      return
    }

    setLoadingImage(true)
    setError('')
    setSuccess('')

    try {
      const storage = getStorage()
      // Sanitize filename to avoid issues - remove all special characters except dots and hyphens
      const sanitizedName = profileImage.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\s+/g, '_')
      const imageRef = ref(storage, `profile-images/${user.uid}/${Date.now()}_${sanitizedName}`)
      
      // Upload without metadata to avoid CORS preflight issues
      // Firebase Storage will automatically detect content type
      await uploadBytes(imageRef, profileImage)
      
      const downloadURL = await getDownloadURL(imageRef)

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        photoURL: downloadURL
      })

      // Reload user to get updated profile
      await auth.currentUser.reload()

      // Save to Firestore database (secondary storage, non-blocking)
      try {
        const db = getFirestore()
        await setDoc(doc(db, 'users', user.uid), {
          profileImageUrl: downloadURL,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      } catch (firestoreError) {
        // Firestore save is optional - profile is already updated in Auth
        // This error is often caused by browser extensions blocking requests
        console.warn('Could not save to Firestore (this is optional):', firestoreError.message)
      }

      // Update local state
      setProfileImageUrl(downloadURL)
      setProfileImage(null)
      setSuccess('Profile image updated successfully!')
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Reload page after a short delay to update sidebar with new image
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Error uploading image:', error)
      
      // Check for CORS or network errors
      const isCorsError = error.message?.includes('CORS') || 
                         error.message?.includes('blocked') ||
                         error.message?.includes('ERR_FAILED') ||
                         error.name === 'NetworkError' ||
                         error.code === 'storage/unauthorized'
      
      // Suppress console errors for CORS (they're handled by user-facing messages)
      if (!isCorsError) {
        console.error('Error uploading image:', error)
      }
      
      if (isCorsError) {
        setError('Upload failed: Firebase Storage security rules need to be configured. Go to Firebase Console → Storage → Rules and add rules to allow authenticated uploads. See console for details.')
        console.error('FIREBASE STORAGE RULES NEED TO BE CONFIGURED:')
        console.error('1. Go to Firebase Console: https://console.firebase.google.com/project/opes-40bae/storage/rules')
        console.error('2. Add these rules:')
        console.error(`
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profile-images/{userId}/{allPaths=**} {
      allow write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null;
    }
  }
}`)
      } else if (error.code === 'storage/quota-exceeded') {
        setError('Storage quota exceeded. Please contact support.')
      } else if (error.code === 'storage/canceled') {
        setError('Upload was canceled. Please try again.')
      } else {
        setError(`Failed to upload image: ${error.message || 'Please try again.'}`)
      }
      
      // Reset loading state and exit early on error
      setLoadingImage(false)
      return
    }
    
    // Only set loading to false if we reach here (success case)
    setLoadingImage(false)
  }

  const handleUpdateDisplayName = async (e) => {
    e.preventDefault()
    setLoadingDisplayName(true)
    setError('')
    setSuccess('')

    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName
      })

      // Save to Firestore (non-blocking, optional)
      try {
        const db = getFirestore()
        await setDoc(doc(db, 'users', user.uid), {
          displayName: displayName,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      } catch (firestoreError) {
        // Firestore save is optional - profile is already updated in Auth
        console.warn('Could not save to Firestore (this is optional):', firestoreError.message)
      }

      setSuccess('Display name updated successfully!')
    } catch (error) {
      console.error('Error updating display name:', error)
      setError('Failed to update display name. Please try again.')
    } finally {
      setLoadingDisplayName(false)
    }
  }

  const handleUpdateEmail = async (e) => {
    e.preventDefault()
    setLoadingEmail(true)
    setError('')
    setSuccess('')

    if (!currentPasswordEmail) {
      setError('Please enter your current password to change email')
      setLoadingEmail(false)
      return
    }

    try {
      // Check if user has email/password provider (not Google-only)
      const providers = user.providerData || []
      const hasEmailPassword = providers.some(provider => provider.providerId === 'password')
      
      if (!hasEmailPassword) {
        setError('Email cannot be changed for Google-authenticated accounts. Please use your Google account settings to change your email.')
        setLoadingEmail(false)
        return
      }
      
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPasswordEmail)
      await reauthenticateWithCredential(auth.currentUser, credential)

      // Update email - Firebase requires verification before changing email
      // This automatically sends a verification email to the new address
      await verifyBeforeUpdateEmail(auth.currentUser, email)

      // Note: Email won't be updated until user verifies the new email
      // Firebase automatically sends a verification email to the new address
      setCurrentPasswordEmail('')
      setSuccess('A verification email has been sent to your new email address. Please check your inbox (and spam folder) and click the verification link to complete the email change.')
    } catch (error) {
      console.error('Error updating email:', error)
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setError('Incorrect password. Please try again.')
      } else if (error.code === 'auth/email-already-in-use') {
        setError('This email is already in use.')
      } else if (error.code === 'auth/requires-recent-login') {
        setError('For security, please log out and log back in, then try again.')
      } else {
        setError(`Failed to update email: ${error.message || 'Please try again.'}`)
      }
    } finally {
      setLoadingEmail(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setLoadingPassword(true)
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      setLoadingPassword(false)
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      setLoadingPassword(false)
      return
    }

    try {
      // Check if user has email/password provider (not Google-only)
      const providers = user.providerData || []
      const hasEmailPassword = providers.some(provider => provider.providerId === 'password')
      
      if (!hasEmailPassword) {
        setError('Password cannot be changed for Google-authenticated accounts. Please use your Google account settings to change your password.')
        setLoadingPassword(false)
        return
      }
      
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(auth.currentUser, credential)

      // Update password
      await updatePassword(auth.currentUser, newPassword)

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Password updated successfully!')
    } catch (error) {
      console.error('Error updating password:', error)
      if (error.code === 'auth/wrong-password') {
        setError('Incorrect current password. Please try again.')
      } else {
        setError('Failed to update password. Please try again.')
      }
    } finally {
      setLoadingPassword(false)
    }
  }

  return (
    <div className="settings-container">
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <div className="settings-grid">
        <div className="settings-section">
          <h2 className="settings-section-title">Profile Picture</h2>
          <div className="profile-image-section">
            <div className="profile-image-preview">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="Profile" />
              ) : (
                <div className="profile-placeholder-large">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="profile-image-actions">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                className="file-input"
                id="profile-image-input"
              />
              <label htmlFor="profile-image-input" className="file-input-label">
                Choose Image
              </label>
              {profileImage && (
                <button
                  onClick={handleImageUpload}
                  disabled={loadingImage}
                  className="btn-upload"
                >
                  {loadingImage ? 'Uploading...' : 'Upload Image'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Display Name</h2>
          <form onSubmit={handleUpdateDisplayName} className="settings-form">
            <div className="form-group">
              <label htmlFor="displayName" className="form-label">Full Name</label>
              <input
                type="text"
                id="displayName"
                className="form-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
          <button type="submit" className="btn-save" disabled={loadingDisplayName}>
            {loadingDisplayName ? 'Saving...' : 'Save Changes'}
          </button>
          </form>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Email Address</h2>
          <form onSubmit={handleUpdateEmail} className="settings-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="currentPasswordEmail" className="form-label">Current Password</label>
              <div className="input-wrapper password-input-wrapper">
                <input
                  type={showCurrentPasswordEmail ? 'text' : 'password'}
                  id="currentPasswordEmail"
                  className="form-input"
                  value={currentPasswordEmail}
                  onChange={(e) => setCurrentPasswordEmail(e.target.value)}
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowCurrentPasswordEmail(!showCurrentPasswordEmail);
                  }}
                  aria-label={showCurrentPasswordEmail ? 'Hide password' : 'Show password'}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {showCurrentPasswordEmail ? (
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
              <p className="form-help">Enter your current password to change your email</p>
            </div>
          <button type="submit" className="btn-save" disabled={loadingEmail}>
            {loadingEmail ? 'Updating...' : 'Update Email'}
          </button>
          </form>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Password</h2>
          <form onSubmit={handleUpdatePassword} className="settings-form">
            <div className="form-group">
              <label htmlFor="currentPassword" className="form-label">Current Password</label>
              <div className="input-wrapper password-input-wrapper">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  id="currentPassword"
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowCurrentPassword(!showCurrentPassword);
                  }}
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {showCurrentPassword ? (
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
              <label htmlFor="newPassword" className="form-label">New Password</label>
              <div className="input-wrapper password-input-wrapper">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowNewPassword(!showNewPassword);
                  }}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {showNewPassword ? (
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
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
          <button type="submit" className="btn-save" disabled={loadingPassword}>
            {loadingPassword ? 'Updating...' : 'Update Password'}
          </button>
          </form>
        </div>

        {/* Notifications Section */}
        <div className="settings-section">
          <h2 className="settings-section-title">Notifications</h2>
          <div className="settings-section-content">
            <div className="notification-item">
              <div className="notification-info">
                <h3 className="notification-title">Community Notifications</h3>
                <p className="notification-description">
                  {notificationsEnabled 
                    ? "You will receive email notifications for new trade alerts and weekly reports posted in the community."
                    : "Enable to receive email notifications for new trade alerts and weekly reports posted in the community."
                  }
                </p>
              </div>
              <label className="ios-toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={handleNotificationToggle}
                  disabled={loadingNotifications}
                />
                <span className="ios-toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings

