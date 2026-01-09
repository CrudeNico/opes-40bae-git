// Utility function to set up admin user
// Run this once to create the admin user and set admin status
// You can call this from the browser console or create a one-time setup page

import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '../firebase/config'

/**
 * Creates an admin user and sets admin status in Firestore
 * This should be run once to set up the initial admin account
 */
export const setupAdminUser = async (email, password, displayName = 'Admin') => {
  try {
    // Create the user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Update display name
    await updateProfile(user, {
      displayName: displayName
    })

    // Set admin status in Firestore
    const db = getFirestore()
    await setDoc(doc(db, 'users', user.uid), {
      email: email,
      displayName: displayName,
      isAdmin: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true })

    console.log('Admin user created successfully!')
    console.log('Email:', email)
    console.log('User ID:', user.uid)
    
    return { success: true, user: user }
  } catch (error) {
    console.error('Error creating admin user:', error)
    if (error.code === 'auth/email-already-in-use') {
      // User already exists, just update admin status
      console.log('User already exists. Updating admin status...')
      try {
        // Note: You'll need to sign in as this user first, or use Firebase Admin SDK
        // For now, we'll just log that the user exists
        console.log('Please sign in as this user, then we can update their admin status.')
        return { success: false, error: 'User already exists. Please sign in and update admin status manually.' }
      } catch (updateError) {
        return { success: false, error: updateError.message }
      }
    }
    return { success: false, error: error.message }
  }
}

/**
 * Sets admin status for an existing user
 * Call this after the user has signed in
 */
export const setUserAsAdmin = async (userId, isAdmin = true) => {
  try {
    const db = getFirestore()
    await setDoc(doc(db, 'users', userId), {
      isAdmin: isAdmin,
      updatedAt: new Date().toISOString()
    }, { merge: true })

    console.log(`User ${userId} admin status set to: ${isAdmin}`)
    return { success: true }
  } catch (error) {
    console.error('Error setting admin status:', error)
    return { success: false, error: error.message }
  }
}


