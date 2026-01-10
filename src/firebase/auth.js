import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  confirmPasswordReset as confirmPasswordResetFirebase,
  verifyPasswordResetCode as verifyPasswordResetCodeFirebase
} from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore'
import { auth } from './config'

// Export onAuthStateChanged for use in components
export { onAuthStateChanged }

/**
 * Send welcome message to a new user
 * @param {string} userId - User's UID
 * @param {string} userEmail - User's email
 * @param {string} userName - User's display name
 */
const sendWelcomeMessage = async (userId, userEmail, userName) => {
  try {
    const db = getFirestore()
    const welcomeMessage = {
      userId: userId,
      userName: userName || userEmail,
      userEmail: userEmail,
      message: '', // Empty message - only show admin response
      status: 'read',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      type: 'system',
      isSystemMessage: true,
      adminResponse: {
        message: 'Welcome to your account.\n\nOn the left, you will find the calendar, where you can schedule meetings regarding your investments. This chat log is available to contact customer support 24/7.',
        createdAt: Timestamp.now()
      }
    }
    
    await addDoc(collection(db, 'supportMessages'), welcomeMessage)
  } catch (error) {
    console.error('Failed to send welcome message:', error)
    // Don't throw error - account creation should succeed even if welcome message fails
  }
}

/**
 * Sign up a new user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} fullName - User's full name
 * @returns {Promise} - User credential
 */
export const signUpWithEmail = async (email, password, fullName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    
    // Update the user's display name
    if (fullName) {
      await updateProfile(userCredential.user, {
        displayName: fullName
      })
    }
    
    // Create user document in Firestore
    const db = getFirestore()
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: email,
      displayName: fullName || '',
      statuses: [], // Empty array - no statuses by default
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true })
    
    // Send welcome message
    await sendWelcomeMessage(userCredential.user.uid, email, fullName)
    
    return { success: true, user: userCredential.user }
  } catch (error) {
    // Provide user-friendly error messages
    let errorMessage = error.message
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'This email is already registered. Please use a different email or log in.'
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Please enter a valid email address.'
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak. Please use at least 6 characters.'
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your internet connection.'
    }
    return { success: false, error: errorMessage }
  }
}

/**
 * Sign in an existing user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise} - User credential
 */
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    
    // Ensure user document exists in Firestore (for existing users)
    const db = getFirestore()
    const userDocRef = doc(db, 'users', userCredential.user.uid)
    // Only update if document doesn't exist - preserve existing statuses
    const userDoc = await getDoc(userDocRef)
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        email: userCredential.user.email || email,
        displayName: userCredential.user.displayName || '',
        statuses: [], // Empty array - no statuses by default
        updatedAt: new Date().toISOString()
      }, { merge: true })
    }
    
    return { success: true, user: userCredential.user }
  } catch (error) {
    // Provide user-friendly error messages
    let errorMessage = error.message
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email. Please sign up first.'
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password. Please try again.'
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Please enter a valid email address.'
    } else if (error.code === 'auth/invalid-credential') {
      errorMessage = 'Invalid email or password. Please try again.'
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your internet connection.'
    }
    return { success: false, error: errorMessage }
  }
}

/**
 * Sign in with Google
 * @returns {Promise} - User credential
 */
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider()
    // Set custom parameters
    provider.setCustomParameters({
      prompt: 'select_account'
    })
    
    const result = await signInWithPopup(auth, provider)
    
    // Create or update user document in Firestore
    const db = getFirestore()
    const userDocRef = doc(db, 'users', result.user.uid)
    const userDoc = await getDoc(userDocRef)
    
    // Only send welcome message if this is a new user
    const isNewUser = !userDoc.exists()
    
    await setDoc(userDocRef, {
      email: result.user.email || '',
      displayName: result.user.displayName || '',
      profileImageUrl: result.user.photoURL || '',
      statuses: [], // Empty array - no statuses by default
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true })
    
    // Send welcome message only for new users
    if (isNewUser) {
      await sendWelcomeMessage(
        result.user.uid, 
        result.user.email || '', 
        result.user.displayName || ''
      )
    }
    
    return { success: true, user: result.user }
  } catch (error) {
    // Provide user-friendly error messages
    let errorMessage = error.message
    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Sign-in popup was closed. Please try again.'
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup was blocked by your browser. Please allow popups and try again.'
    } else if (error.code === 'auth/cancelled-popup-request') {
      errorMessage = 'Sign-in was cancelled. Please try again.'
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your internet connection.'
    }
    return { success: false, error: errorMessage }
  }
}

/**
 * Sign out the current user
 * @returns {Promise}
 */
export const signOutUser = async () => {
  try {
    await signOut(auth)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Send password reset email to user
 * @param {string} email - User's email
 * @returns {Promise}
 */
export const sendPasswordReset = async (email) => {
  try {
    const actionCodeSettings = {
      url: `${window.location.origin}/reset-password`,
      handleCodeInApp: true
    }
    await sendPasswordResetEmail(auth, email, actionCodeSettings)
    return { success: true }
  } catch (error) {
    let errorMessage = error.message
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email address.'
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Please enter a valid email address.'
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many password reset requests. Please try again later.'
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your internet connection.'
    }
    return { success: false, error: errorMessage }
  }
}

/**
 * Verify password reset code
 * @param {string} actionCode - Password reset code from email link
 * @returns {Promise}
 */
export const verifyPasswordResetCode = async (actionCode) => {
  try {
    const email = await verifyPasswordResetCodeFirebase(auth, actionCode)
    return { success: true, email }
  } catch (error) {
    let errorMessage = error.message
    if (error.code === 'auth/expired-action-code') {
      errorMessage = 'The password reset link has expired. Please request a new one.'
    } else if (error.code === 'auth/invalid-action-code') {
      errorMessage = 'The password reset link is invalid or has already been used.'
    }
    return { success: false, error: errorMessage }
  }
}

/**
 * Confirm password reset with new password
 * @param {string} actionCode - Password reset code from email link
 * @param {string} newPassword - New password
 * @returns {Promise}
 */
export const confirmPasswordReset = async (actionCode, newPassword) => {
  try {
    await confirmPasswordResetFirebase(auth, actionCode, newPassword)
    return { success: true }
  } catch (error) {
    let errorMessage = error.message
    if (error.code === 'auth/expired-action-code') {
      errorMessage = 'The password reset link has expired. Please request a new one.'
    } else if (error.code === 'auth/invalid-action-code') {
      errorMessage = 'The password reset link is invalid or has already been used.'
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak. Please use at least 6 characters.'
    }
    return { success: false, error: errorMessage }
  }
}

