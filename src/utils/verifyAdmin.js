// Utility to verify and fix admin user document
// This can be run from the browser console when logged in as admin

import { auth } from '../firebase/config'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

/**
 * Verifies that the current user has an admin document in Firestore
 * and creates/updates it if needed
 */
export const verifyAdminDocument = async () => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      console.error('No user is currently logged in')
      return { success: false, error: 'Not logged in' }
    }

    const db = getFirestore()
    const userDocRef = doc(db, 'users', currentUser.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      console.log('Admin user document does not exist. Creating it...')
      await setDoc(userDocRef, {
        email: currentUser.email || '',
        displayName: currentUser.displayName || '',
        profileImageUrl: currentUser.photoURL || '',
        isAdmin: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      console.log('Admin user document created successfully!')
      return { success: true, message: 'Admin document created' }
    } else {
      const userData = userDoc.data()
      if (userData.isAdmin !== true) {
        console.log('Admin user document exists but isAdmin is not true. Updating it...')
        await setDoc(userDocRef, {
          isAdmin: true,
          updatedAt: new Date().toISOString()
        }, { merge: true })
        console.log('Admin user document updated successfully!')
        return { success: true, message: 'Admin document updated' }
      } else {
        console.log('Admin user document exists and isAdmin is already true.')
        return { success: true, message: 'Admin document is correct' }
      }
    }
  } catch (error) {
    console.error('Error verifying admin document:', error)
    return { success: false, error: error.message }
  }
}

// Make it available globally for console access
if (typeof window !== 'undefined') {
  window.verifyAdminDocument = verifyAdminDocument
}


