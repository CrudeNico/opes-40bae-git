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
    // Silently handle missing files - they may not be uploaded yet
    // Don't log 404 errors to console as they're expected for missing files
    if (error.code === 'storage/object-not-found' || error.code === 'storage/unauthorized') {
      // Silently return null for missing files
      return null
    }
    // Only log unexpected errors (not 404s)
    if (error.code !== 'storage/object-not-found') {
      console.error('Error getting file URL:', error)
    }
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
