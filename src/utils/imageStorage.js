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
    console.error('Error getting image URL:', error)
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
