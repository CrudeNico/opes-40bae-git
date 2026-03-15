import React, { useState, useEffect } from 'react'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import './AdminEmails.css'

const AdminEmails = () => {
  // Load saved form data from localStorage on mount
  const loadSavedFormData = () => {
    try {
      const saved = localStorage.getItem('adminEmailFormData')
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          recipientEmails: parsed.recipientEmails || [],
          emailInput: parsed.emailInput || '',
          sendToAllInvestors: parsed.sendToAllInvestors || false,
          emailData: parsed.emailData || { subject: '', content: '' },
          attachedFiles: parsed.attachedFiles || []
        }
      }
    } catch (error) {
      console.error('Error loading saved form data:', error)
    }
    return {
      recipientEmails: [],
      emailInput: '',
      sendToAllInvestors: false,
      emailData: { subject: '', content: '' },
      attachedFiles: []
    }
  }

  const savedData = loadSavedFormData()
  const [recipientEmails, setRecipientEmails] = useState(savedData.recipientEmails)
  const [emailInput, setEmailInput] = useState(savedData.emailInput)
  const [sendToAllInvestors, setSendToAllInvestors] = useState(savedData.sendToAllInvestors)
  const [emailData, setEmailData] = useState(savedData.emailData)
  const [attachedFiles, setAttachedFiles] = useState(savedData.attachedFiles)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    try {
      const formDataToSave = {
        recipientEmails,
        emailInput,
        sendToAllInvestors,
        emailData,
        attachedFiles
      }
      const dataString = JSON.stringify(formDataToSave)
      // Check localStorage size (limit is typically 5-10MB)
      if (dataString.length > 4 * 1024 * 1024) { // 4MB limit to be safe
        console.warn('Form data is too large for localStorage. Some data may not be saved.')
        // Save without files if too large
        const formDataWithoutFiles = {
          recipientEmails,
          emailInput,
          sendToAllInvestors,
          emailData,
          attachedFiles: []
        }
        localStorage.setItem('adminEmailFormData', JSON.stringify(formDataWithoutFiles))
        setError('File attachments are too large to save. Please re-attach files before sending.')
        setTimeout(() => setError(''), 5000)
      } else {
        localStorage.setItem('adminEmailFormData', dataString)
      }
    } catch (error) {
      console.error('Error saving form data to localStorage:', error)
      // If saving fails (e.g., quota exceeded), try saving without files
      try {
        const formDataWithoutFiles = {
          recipientEmails,
          emailInput,
          sendToAllInvestors,
          emailData,
          attachedFiles: []
        }
        localStorage.setItem('adminEmailFormData', JSON.stringify(formDataWithoutFiles))
        setError('Could not save file attachments. Please re-attach files before sending.')
        setTimeout(() => setError(''), 5000)
      } catch (e) {
        console.error('Error saving form data without files:', e)
      }
    }
  }, [recipientEmails, emailInput, sendToAllInvestors, emailData, attachedFiles])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setEmailData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Handle email input change - detect spaces and create chips
  const handleEmailInputChange = (e) => {
    const value = e.target.value
    setEmailInput(value)
  }

  // Handle key press - detect Enter or Space to create chips
  const handleEmailInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const email = emailInput.trim()
      
      if (email) {
        if (isValidEmail(email)) {
          // Check if email already exists
          if (!recipientEmails.some(r => r.email.toLowerCase() === email.toLowerCase())) {
            setRecipientEmails(prev => [...prev, { email, id: Date.now().toString() }])
            setEmailInput('')
            setError('')
          } else {
            setError('This email is already in the recipients list')
            setTimeout(() => setError(''), 3000)
            setEmailInput('')
          }
        } else {
          setError('Please enter a valid email address')
          setTimeout(() => setError(''), 3000)
          setEmailInput('')
        }
      }
    }
  }

  // Remove email from recipients list
  const handleRemoveEmail = (id) => {
    setRecipientEmails(prev => prev.filter(r => r.id !== id))
  }

  // Clear all form data manually
  const handleClearForm = () => {
    setRecipientEmails([])
    setEmailInput('')
    setSendToAllInvestors(false)
    setEmailData({
      subject: '',
      content: ''
    })
    setAttachedFiles([])
    localStorage.removeItem('adminEmailFormData')
    setError('')
    setSuccess('Form cleared')
    setTimeout(() => setSuccess(''), 3000)
  }

  // Toggle "All Investors" option
  const handleToggleAllInvestors = () => {
    setSendToAllInvestors(prev => !prev)
    // Clear manual emails when selecting all investors
    if (!sendToAllInvestors) {
      setRecipientEmails([])
      setEmailInput('')
    }
  }

  // Helper function to read file as base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    setError('')

    try {
      const filePromises = files.map(async (file) => {
        // Check file size (limit to 25MB per file for Brevo)
        const maxSize = 25 * 1024 * 1024 // 25MB
        if (file.size > maxSize) {
          throw new Error(`File "${file.name}" exceeds 25MB limit`)
        }

        // Read file as base64 for email attachment
        const base64Content = await fileToBase64(file)
        
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          base64: base64Content
        }
      })

      const selectedFiles = await Promise.all(filePromises)
      setAttachedFiles(prev => [...prev, ...selectedFiles])
      setSuccess(`Successfully selected ${files.length} file(s)`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error processing files:', error)
      setError(error.message || `Failed to process files: ${error.message}`)
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const handleRemoveFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSendEmail = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSending(true)

    try {
      // Validate inputs
      if (!emailData.subject.trim()) {
        setError('Please enter email subject')
        setSending(false)
        return
      }

      if (!emailData.content.trim()) {
        setError('Please enter email content')
        setSending(false)
        return
      }

      let emailList = []

      // If "All Investors" is selected, fetch all investor emails
      if (sendToAllInvestors) {
        const db = getFirestore()
        const usersCollection = collection(db, 'users')
        const usersSnapshot = await getDocs(usersCollection)
        
        usersSnapshot.forEach((docSnapshot) => {
          const userData = docSnapshot.data()
          const statuses = userData.statuses || []
          const email = userData.email
          
          // Include users who are investors or traders with approved investment accounts
          if ((statuses.includes('Investor') || statuses.includes('Trader')) && 
              userData.investmentData && 
              userData.investmentData.status === 'approved' &&
              email &&
              isValidEmail(email)) {
            
            // Exclude specific users
            if (email !== 'nicolas.fernandez@opessocius.support' &&
                userData.displayName !== 'Nicolas De Rodrigo' &&
                email !== 'marcoscollab@gmail.com' &&
                userData.displayName !== 'Marcos De Rodrigo' &&
                email !== 'ndrf1806@gmail.com' &&
                userData.displayName !== 'Nicolas') {
              emailList.push(email)
            }
          }
        })

        if (emailList.length === 0) {
          setError('No investors found with valid email addresses')
          setSending(false)
          return
        }
      } else {
        // Use manually added emails
        if (recipientEmails.length === 0) {
          setError('Please add at least one recipient email or select "All Investors"')
          setSending(false)
          return
        }
        emailList = recipientEmails.map(r => r.email)
      }

      // Get Brevo API credentials
      const apiKey = import.meta.env.VITE_BREVO_API_KEY
      const senderEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL
      const senderName = import.meta.env.VITE_BREVO_SENDER_NAME || 'Opessocius Asset Management'

      if (!apiKey || !senderEmail) {
        setError('Email service not configured. Please check environment variables.')
        setSending(false)
        return
      }

      // Format email content - just convert line breaks to HTML
      // Files will be attached directly to the email, not shown as links
      const formattedContent = emailData.content.replace(/\n/g, '<br>')
      const emailContent = formattedContent

      // Build attachments array for Brevo API (base64 encoded)
      const attachments = attachedFiles.map(file => ({
        name: file.name,
        content: file.base64
      }))

      // Create email HTML with same layout as other emails
      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1429 100%);
                color: #ffffff;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .header h1 {
                color: #ffffff;
                margin: 0;
              }
              .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e5e7eb;
                border-top: none;
                border-radius: 0 0 8px 8px;
              }
              .content h2 {
                color: #1f2937;
                margin-top: 0;
              }
              .content p {
                color: #374151;
                margin: 1em 0;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 12px;
                color: #6b7280;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Opessocius Asset Management</h1>
            </div>
            <div class="content">
              <h2>${emailData.subject}</h2>
              <div style="white-space: pre-wrap; color: #374151; line-height: 1.6;">${emailContent}</div>
            </div>
            <div class="footer">
              <p>This is an automated email from Opessocius Asset Management. Please do not reply to this message.</p>
              <p>&copy; ${new Date().getFullYear()} Opessocius Asset Management. All rights reserved.</p>
            </div>
          </body>
        </html>
      `

      const plainTextContent = emailData.content

      // Build email payload
      const emailPayload = {
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: emailList.map(email => ({ email })),
        subject: emailData.subject,
        htmlContent: emailHtml,
        textContent: plainTextContent
      }

      // Add attachments if any files are attached
      if (attachments.length > 0) {
        emailPayload.attachment = attachments
      }

      // Send email via Brevo API
      const url = 'https://api.brevo.com/v3/smtp/email'
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify(emailPayload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Brevo API error:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData
        })
        
        // Provide more helpful error messages
        let errorMessage = 'Failed to send email'
        if (response.status === 401) {
          if (errorData.message && errorData.message.includes('not enabled')) {
            errorMessage = 'API Key is not enabled. Please check your Brevo account settings and ensure SMTP permissions are enabled for your API key.'
          } else {
            errorMessage = 'Unauthorized: Invalid API key. Please verify your VITE_BREVO_API_KEY in GitHub Secrets matches your Brevo API key.'
          }
        } else if (errorData.message) {
          errorMessage = `Failed to send email: ${errorData.message}`
        } else {
          errorMessage = `Failed to send email: ${response.status} ${response.statusText}`
        }
        
        throw new Error(errorMessage)
      }

      setSuccess(`Email sent successfully to ${emailList.length} recipient(s)!`)
      
      // Reset form and clear localStorage
      setRecipientEmails([])
      setEmailInput('')
      setSendToAllInvestors(false)
      setEmailData({
        subject: '',
        content: ''
      })
      setAttachedFiles([])
      localStorage.removeItem('adminEmailFormData')
      
      setTimeout(() => setSuccess(''), 5000)
    } catch (error) {
      console.error('Error sending email:', error)
      setError(error.message || 'Failed to send email. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="admin-emails-container">
      <h2 className="admin-emails-title">Send Email to Users</h2>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSendEmail} className="admin-email-form">
        <div className="form-group">
          <label htmlFor="emailInput" className="form-label">
            Recipient Email(s) <span className="required">*</span>
            <span className="form-help">Type email addresses separated by spaces. Each email will appear as a bubble.</span>
          </label>
          
          <div className="email-input-container">
            <input
              type="text"
              id="emailInput"
              className="form-input email-input-field"
              value={emailInput}
              onChange={handleEmailInputChange}
              onKeyDown={handleEmailInputKeyDown}
              placeholder="Type email addresses and press Enter or Space"
              disabled={sendToAllInvestors}
            />
            <button
              type="button"
              onClick={handleToggleAllInvestors}
              className={`btn-all-investors ${sendToAllInvestors ? 'active' : ''}`}
            >
              All Investors
            </button>
          </div>

          {sendToAllInvestors && (
            <div className="all-investors-indicator">
              <span className="indicator-text">✓ Email will be sent to all investors</span>
            </div>
          )}

          {recipientEmails.length > 0 && (
            <div className="recipients-list">
              <div className="recipients-header">
                <span className="recipients-count">{recipientEmails.length} recipient(s)</span>
                <button
                  type="button"
                  onClick={() => setRecipientEmails([])}
                  className="btn-clear-all"
                >
                  Clear All
                </button>
              </div>
              <div className="recipients-chips">
                {recipientEmails.map((recipient) => (
                  <div key={recipient.id} className="email-chip">
                    <span className="chip-email">{recipient.email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(recipient.id)}
                      className="chip-remove"
                      title="Remove email"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="subject" className="form-label">
            Email Subject <span className="required">*</span>
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            className="form-input"
            value={emailData.subject}
            onChange={handleInputChange}
            placeholder="Enter email subject"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="content" className="form-label">
            Email Content <span className="required">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            className="form-textarea"
            value={emailData.content}
            onChange={handleInputChange}
            placeholder="Enter your message here..."
            rows="10"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="fileUpload" className="form-label">
            Attach Files (Optional)
            <span className="form-help">You can attach multiple files (PDFs, images, documents, etc.)</span>
          </label>
          <div className="file-upload-section">
            <label htmlFor="fileUpload" className="file-upload-button">
              {uploading ? 'Uploading...' : 'Select Files'}
            </label>
            <input
              type="file"
              id="fileUpload"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            {attachedFiles.length > 0 && (
              <div className="attached-files-list">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="attached-file-item">
                    <span className="file-name">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="remove-file-button"
                      title="Remove file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleClearForm}
            className="btn-clear-form"
            disabled={sending || uploading}
          >
            Clear Form
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={sending || uploading}
          >
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AdminEmails

