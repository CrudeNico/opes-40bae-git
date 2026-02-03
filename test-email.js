/**
 * Email Testing Script
 * Run this script to test email functionality locally
 * 
 * Usage: node test-email.js
 * 
 * Make sure you have VITE_BREVO_API_KEY, VITE_BREVO_SENDER_EMAIL, and VITE_BREVO_SENDER_NAME
 * set in your .env file or environment variables
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '.env') })

// Set up import.meta.env for the email module (Vite-style env vars)
if (!globalThis.import) {
  globalThis.import = { meta: { env: {} } }
}
if (!globalThis.import.meta) {
  globalThis.import.meta = { env: {} }
}

// Map process.env to import.meta.env (Vite prefix)
globalThis.import.meta.env = {
  VITE_BREVO_API_KEY: process.env.VITE_BREVO_API_KEY,
  VITE_BREVO_SENDER_EMAIL: process.env.VITE_BREVO_SENDER_EMAIL,
  VITE_BREVO_SENDER_NAME: process.env.VITE_BREVO_SENDER_NAME
}

// Import email functions
const emailModule = await import('./src/firebase/email.js')

// Test email configuration
const testEmail = process.env.TEST_EMAIL || 'test@example.com'
const testName = 'Test User'

console.log('📧 Email Server Test Script')
console.log('============================\n')

// Check environment variables
console.log('Checking environment variables...')
const apiKey = process.env.VITE_BREVO_API_KEY
const senderEmail = process.env.VITE_BREVO_SENDER_EMAIL
const senderName = process.env.VITE_BREVO_SENDER_NAME || 'Opessocius Asset Management'

if (!apiKey) {
  console.error('❌ VITE_BREVO_API_KEY is not set!')
  console.error('   Please add it to your .env file: VITE_BREVO_API_KEY=your_api_key')
  process.exit(1)
}

if (!senderEmail) {
  console.error('❌ VITE_BREVO_SENDER_EMAIL is not set!')
  console.error('   Please add it to your .env file: VITE_BREVO_SENDER_EMAIL=your_email@example.com')
  process.exit(1)
}

console.log('✅ API Key:', apiKey.substring(0, 10) + '...')
console.log('✅ Sender Email:', senderEmail)
console.log('✅ Sender Name:', senderName)
console.log('✅ Test Email:', testEmail)
console.log('')

// Test 1: Confirmation Email
console.log('Test 1: Sending confirmation email...')
try {
  const result = await emailModule.sendConfirmationEmail(testEmail, testName)
  if (result.success) {
    console.log('✅ Confirmation email sent successfully!')
    console.log('   Message ID:', result.messageId)
  } else {
    console.error('❌ Failed to send confirmation email:', result.error)
  }
} catch (error) {
  console.error('❌ Error sending confirmation email:', error.message)
}
console.log('')

// Test 2: Consultation Confirmation Email
console.log('Test 2: Sending consultation confirmation email...')
try {
  const consultationDate = new Date()
  const consultationTime = '10:00 AM'
  const result = await emailModule.sendConsultationConfirmationEmail(
    testEmail,
    testName,
    consultationDate,
    consultationTime
  )
  if (result.success) {
    console.log('✅ Consultation confirmation email sent successfully!')
    console.log('   Message ID:', result.messageId)
  } else {
    console.error('❌ Failed to send consultation confirmation email:', result.error)
  }
} catch (error) {
  console.error('❌ Error sending consultation confirmation email:', error.message)
}
console.log('')

// Test 3: Consultation Link Email
console.log('Test 3: Sending consultation link email...')
try {
  const consultationDate = new Date()
  const consultationTime = '10:00 AM'
  const googleMeetLink = 'https://meet.google.com/test-link'
  const result = await emailModule.sendConsultationLinkEmail(
    testEmail,
    testName,
    consultationDate,
    consultationTime,
    googleMeetLink
  )
  if (result.success) {
    console.log('✅ Consultation link email sent successfully!')
    console.log('   Message ID:', result.messageId)
  } else {
    console.error('❌ Failed to send consultation link email:', result.error)
  }
} catch (error) {
  console.error('❌ Error sending consultation link email:', error.message)
}
console.log('')

// Test 4: Trade Alert Notification
console.log('Test 4: Sending trade alert notification...')
try {
  const alert = {
    symbol: 'AAPL',
    action: 'BUY',
    price: '$150.00',
    takeProfit: '$160.00',
    stopLoss: '$145.00'
  }
  const result = await emailModule.sendTradeAlertNotification(testEmail, testName, alert)
  if (result.success) {
    console.log('✅ Trade alert notification sent successfully!')
    console.log('   Message ID:', result.messageId)
  } else {
    console.error('❌ Failed to send trade alert notification:', result.error)
  }
} catch (error) {
  console.error('❌ Error sending trade alert notification:', error.message)
}
console.log('')

// Test 5: Weekly Report Notification
console.log('Test 5: Sending weekly report notification...')
try {
  const report = {
    title: 'Weekly Market Report - Week of January 1, 2024',
    description: 'This week\'s market analysis and insights.',
    videoUrl: 'https://example.com/video'
  }
  const result = await emailModule.sendWeeklyReportNotification(testEmail, testName, report)
  if (result.success) {
    console.log('✅ Weekly report notification sent successfully!')
    console.log('   Message ID:', result.messageId)
  } else {
    console.error('❌ Failed to send weekly report notification:', result.error)
  }
} catch (error) {
  console.error('❌ Error sending weekly report notification:', error.message)
}

console.log('\n============================')
console.log('✅ Email testing complete!')
console.log('Check your inbox at:', testEmail)
