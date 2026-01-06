import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  GoogleAuthProvider
} from 'firebase/auth'
import { auth } from './config'

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

