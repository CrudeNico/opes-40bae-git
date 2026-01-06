// Firebase configuration
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAchqundE3t53H93w1fEQWURWPe_TGZVfU",
  authDomain: "opes-40bae.firebaseapp.com",
  projectId: "opes-40bae",
  storageBucket: "opes-40bae.firebasestorage.app",
  messagingSenderId: "22800874102",
  appId: "1:22800874102:web:0190110e7d3f7c80b4fd57",
  measurementId: "G-BG09SNRLJC"
}

// Initialize Firebase only if it hasn't been initialized yet
// This prevents the "duplicate app" error during hot module reloading
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)
export default app

