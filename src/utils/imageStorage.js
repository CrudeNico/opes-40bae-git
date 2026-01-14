// Utility functions for loading images from Firebase Storage
import { storage } from '../firebase/config'
import { ref, getDownloadURL } from 'firebase/storage'

/**
 * Get the download URL for an image in Firebase Storage
 * @param {string} imagePath - Path to the image in storage (e.g., 'careers/banner.jpg')
 * @returns {Promise<string>} - The download URL of the image
 */
export const getImageUrl = async (imagePath) => {
  try {
    const imageRef = ref(storage, imagePath)
    const url = await getDownloadURL(imageRef)
    return url
  } catch (error) {
    // Log 403 errors for debugging (unauthorized access)
    if (error.code === 'storage/unauthorized') {
      console.warn(`Storage access denied (403) for path: ${imagePath}. Check storage rules and file path.`)
      return null
    }
    // Silently handle missing files (404) - they may not be uploaded yet
    if (error.code === 'storage/object-not-found') {
      return null
    }
    // Log other unexpected errors
    console.error('Error getting file URL:', error)
    return null
  }
}

/**
 * Get multiple image URLs at once
 * @param {string[]} imagePaths - Array of image paths
 * @returns {Promise<Object>} - Object with image paths as keys and URLs as values
 */
export const getImageUrls = async (imagePaths) => {
  const urls = {}
  await Promise.all(
    imagePaths.map(async (path) => {
      const url = await getImageUrl(path)
      if (url) {
        urls[path] = url
      }
    })
  )
  return urls
}
