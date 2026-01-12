// Script to upload careers images to Firebase Storage
// Usage: node upload-careers-images.js

const { initializeApp } = require('firebase/app')
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage')
const fs = require('fs')
const path = require('path')

const firebaseConfig = {
  apiKey: "AIzaSyAchqundE3t53H93w1fEQWURWPe_TGZVfU",
  authDomain: "opes-40bae.firebaseapp.com",
  projectId: "opes-40bae",
  storageBucket: "opes-40bae.firebasestorage.app",
  messagingSenderId: "22800874102",
  appId: "1:22800874102:web:0190110e7d3f7c80b4fd57",
  measurementId: "G-BG09SNRLJC"
}

const app = initializeApp(firebaseConfig)
const storage = getStorage(app)

async function uploadImage(localPath, storagePath) {
  try {
    const fileBuffer = fs.readFileSync(localPath)
    const storageRef = ref(storage, storagePath)
    
    console.log(`Uploading ${localPath} to ${storagePath}...`)
    await uploadBytes(storageRef, fileBuffer)
    
    const url = await getDownloadURL(storageRef)
    console.log(`✓ Uploaded successfully! URL: ${url}`)
    return url
  } catch (error) {
    console.error(`✗ Error uploading ${localPath}:`, error.message)
    return null
  }
}

async function main() {
  console.log('Starting image upload to Firebase Storage...\n')
  
  // Define images to upload
  const images = [
    {
      local: path.join(__dirname, 'images', 'careers', 'careers-banner.jpg'),
      storage: 'careers/careers-banner.jpg'
    },
    {
      local: path.join(__dirname, 'images', 'careers', 'video-widget.jpg'),
      storage: 'careers/video-widget.jpg'
    }
  ]
  
  // Check if images directory exists
  const imagesDir = path.join(__dirname, 'images', 'careers')
  if (!fs.existsSync(imagesDir)) {
    console.log('Creating images/careers directory...')
    fs.mkdirSync(imagesDir, { recursive: true })
    console.log('Please add your images to images/careers/ folder:')
    console.log('  - careers-banner.jpg')
    console.log('  - video-widget.jpg')
    return
  }
  
  // Upload each image
  for (const image of images) {
    if (fs.existsSync(image.local)) {
      await uploadImage(image.local, image.storage)
    } else {
      console.log(`⚠ File not found: ${image.local}`)
      console.log(`  Expected path: ${image.storage}`)
    }
  }
  
  console.log('\n✓ Upload complete!')
}

main().catch(console.error)
