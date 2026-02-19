import React, { useState, useEffect, useRef } from 'react'
import { auth } from '../firebase/config'
import { updateProfile } from 'firebase/auth'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'
import './Settings.css'

const AdminSettings = ({ user, onProfileUpdate }) => {
  const [profileImage, setProfileImage] = useState(null)
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [loadingImage, setLoadingImage] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [darkModeEnabled, setDarkModeEnabled] = useState(false)
  const [loadingDarkMode, setLoadingDarkMode] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (user) {
      // Only use photoURL from Auth, don't try to load from Firestore on mount
      setProfileImageUrl(user.photoURL || '')
      loadDarkModeSettings()
    }
  }, [user])

  const loadDarkModeSettings = async () => {
    try {
      const db = getFirestore()
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const darkMode = userData.darkMode !== undefined ? userData.darkMode : true // Default to true for admin
        setDarkModeEnabled(darkMode)
        applyDarkMode(darkMode)
      } else {
        // If user doc doesn't exist, default to dark mode for admin
        setDarkModeEnabled(true)
        applyDarkMode(true)
      }
    } catch (error) {
      console.error('Error loading dark mode settings:', error)
      // Default to dark mode on error
      setDarkModeEnabled(true)
      applyDarkMode(true)
    }
  }

  const applyDarkMode = (enabled) => {
    if (enabled) {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
  }

  const handleDarkModeToggle = async () => {
    setLoadingDarkMode(true)
    try {
      const db = getFirestore()
      const newValue = !darkModeEnabled
      setDarkModeEnabled(newValue)
      applyDarkMode(newValue)
      
      // Save preference to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        darkMode: newValue
      }, { merge: true })
      
      setSuccess(`Dark mode ${newValue ? 'enabled' : 'disabled'}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error updating dark mode settings:', error)
      setError('Failed to update dark mode settings')
      // Revert on error
      setDarkModeEnabled(!darkModeEnabled)
      applyDarkMode(!darkModeEnabled)
    } finally {
      setLoadingDarkMode(false)
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
      
      // Call onProfileUpdate callback if provided
      if (onProfileUpdate) {
        onProfileUpdate()
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
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'A'}
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
                id="admin-profile-image-input"
              />
              <label htmlFor="admin-profile-image-input" className="file-input-label">
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

        {/* Dark Mode Section */}
        <div className="settings-section">
          <h2 className="settings-section-title">Dark Mode</h2>
          <div className="settings-section-content">
            <div className="notification-item">
              <div className="notification-info">
                <h3 className="notification-title">Dark Mode</h3>
                <p className="notification-description">
                  {darkModeEnabled 
                    ? "Dark mode is currently enabled. The interface uses a dark color scheme for reduced eye strain."
                    : "Enable dark mode to switch to a dark color scheme for reduced eye strain, especially in low-light conditions."
                  }
                </p>
              </div>
              <label className="ios-toggle-switch">
                <input
                  type="checkbox"
                  checked={darkModeEnabled}
                  onChange={handleDarkModeToggle}
                  disabled={loadingDarkMode}
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

export default AdminSettings
