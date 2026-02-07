/**
 * Email service using Brevo (Sendinblue)
 * Sends confirmation emails to users after account creation
 * Sends notification emails for trade alerts and weekly reports
 */

/**
 * Send account confirmation email to user
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's full name
 * @returns {Promise} - Success status
 */
export const sendConfirmationEmail = async (userEmail, userName) => {
  try {
    const apiKey = import.meta.env.VITE_BREVO_API_KEY
    const senderEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL
    const senderName = import.meta.env.VITE_BREVO_SENDER_NAME || 'Opessocius Asset Management'

    // Debug logging (remove in production if needed)
    if (process.env.NODE_ENV === 'development') {
      console.log('Email config check:', {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        apiKeyPrefix: apiKey?.substring(0, 10) || 'none',
        hasSenderEmail: !!senderEmail,
        senderEmail: senderEmail
      })
    }

    if (!apiKey || !senderEmail) {
      console.error('Brevo API key or sender email not configured')
      return { success: false, error: 'Email service not configured' }
    }

    // Brevo API endpoint
    const url = 'https://api.brevo.com/v3/smtp/email'

    // Email content
    const emailData = {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [
        {
          email: userEmail,
          name: userName || userEmail
        }
      ],
      subject: 'Opessocius account confirmation',
      htmlContent: `
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
              }
              .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e5e7eb;
                border-top: none;
                border-radius: 0 0 8px 8px;
              }
              .button {
                display: inline-block;
                background: #14b8a6;
                color: #ffffff;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
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
              <h1>Welcome to Opessocius Asset Management</h1>
            </div>
            <div class="content">
              <h2>Thank you for creating your account!</h2>
              <p>Dear ${userName || 'Valued Client'},</p>
              <p>We're excited to confirm that your investor portal account has been successfully created.</p>
              <p>Your account is now active and ready to use. You can:</p>
              <ul>
                <li>Access your portfolio and track performance</li>
                <li>Manage your investments with ease</li>
                <li>View real-time market data and insights</li>
              </ul>
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              <p>Best regards,<br>The Opessocius Asset Management Team</p>
            </div>
            <div class="footer">
              <p>This is an automated confirmation email. Please do not reply to this message.</p>
              <p>&copy; ${new Date().getFullYear()} Opessocius Asset Management. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      textContent: `
Welcome to Opessocius Asset Management

Thank you for creating your account!

Dear ${userName || 'Valued Client'},

We're excited to confirm that your investor portal account has been successfully created.

Your account is now active and ready to use. You can:
- Access your portfolio and track performance
- Manage your investments with ease
- View real-time market data and insights

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The Opessocius Asset Management Team

---
This is an automated confirmation email. Please do not reply to this message.
© ${new Date().getFullYear()} Opessocius Asset Management. All rights reserved.
      `
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Brevo API error:', errorData)
      return { 
        success: false, 
        error: errorData.message || 'Failed to send email' 
      }
    }

    const result = await response.json()
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

/**
 * Send Google Meet consultation link to user
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's full name
 * @param {Date} consultationDate - Date of consultation
 * @param {string} consultationTime - Time of consultation
 * @param {string} googleMeetLink - Google Meet link
 * @returns {Promise} - Success status
 */
export const sendConsultationLinkEmail = async (userEmail, userName, consultationDate, consultationTime, googleMeetLink) => {
  try {
    const apiKey = import.meta.env.VITE_BREVO_API_KEY
    const senderEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL
    const senderName = import.meta.env.VITE_BREVO_SENDER_NAME || 'Opessocius Asset Management'

    if (!apiKey || !senderEmail) {
      console.error('Brevo API key or sender email not configured')
      return { success: false, error: 'Email service not configured' }
    }

    // Format date
    const dateStr = consultationDate?.toDate ? 
      consultationDate.toDate().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }) : 
      'Date TBD'

    // Brevo API endpoint
    const url = 'https://api.brevo.com/v3/smtp/email'

    // Email content
    const emailData = {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [
        {
          email: userEmail,
          name: userName || userEmail
        }
      ],
      subject: 'Your Consultation Meeting Link - Opessocius',
      htmlContent: `
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
              }
              .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e5e7eb;
                border-top: none;
                border-radius: 0 0 8px 8px;
              }
              .button {
                display: inline-block;
                background: #3b82f6;
                color: #ffffff;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
              }
              .meeting-details {
                background: #f9fafb;
                padding: 20px;
                border-radius: 6px;
                margin: 20px 0;
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
              <h1>Your Consultation Meeting Link</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName || 'Valued Client'},</h2>
              <p>Your consultation meeting has been scheduled. Please find the details below:</p>
              
              <div class="meeting-details">
                <p><strong>Date:</strong> ${dateStr}</p>
                <p><strong>Time:</strong> ${consultationTime || 'Time TBD'}</p>
              </div>

              <p>Click the button below to join your consultation meeting:</p>
              <a href="${googleMeetLink}" class="button">Join Meeting</a>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #3b82f6;">${googleMeetLink}</p>

              <p>We look forward to speaking with you!</p>
              <p>Best regards,<br>The Opessocius Asset Management Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; ${new Date().getFullYear()} Opessocius Asset Management. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      textContent: `
Your Consultation Meeting Link

Hello ${userName || 'Valued Client'},

Your consultation meeting has been scheduled. Please find the details below:

Date: ${dateStr}
Time: ${consultationTime || 'Time TBD'}

Join your consultation meeting by clicking this link:
${googleMeetLink}

We look forward to speaking with you!

Best regards,
The Opessocius Asset Management Team

---
This is an automated email. Please do not reply to this message.
© ${new Date().getFullYear()} Opessocius Asset Management. All rights reserved.
      `
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Brevo API error:', errorData)
      return { 
        success: false, 
        error: errorData.message || 'Failed to send email' 
      }
    }

    const result = await response.json()
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

/**
 * Send consultation confirmation email to user
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's full name
 * @param {Date|Timestamp} consultationDate - Date of consultation
 * @param {string} consultationTime - Time of consultation
 * @returns {Promise} - Success status
 */
export const sendConsultationConfirmationEmail = async (userEmail, userName, consultationDate, consultationTime) => {
  try {
    const apiKey = import.meta.env.VITE_BREVO_API_KEY
    const senderEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL
    const senderName = import.meta.env.VITE_BREVO_SENDER_NAME || 'Opessocius Asset Management'

    if (!apiKey || !senderEmail) {
      console.error('Brevo API key or sender email not configured')
      return { success: false, error: 'Email service not configured' }
    }

    // Format date
    const dateStr = consultationDate?.toDate ? 
      consultationDate.toDate().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        weekday: 'long'
      }) : 
      consultationDate instanceof Date ?
        consultationDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          weekday: 'long'
        }) :
        'Date TBD'

    // Brevo API endpoint
    const url = 'https://api.brevo.com/v3/smtp/email'

    // Email content
    const emailData = {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [
        {
          email: userEmail,
          name: userName || userEmail
        }
      ],
      subject: 'Consultation Scheduled - Opessocius',
      htmlContent: `
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
              }
              .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e5e7eb;
                border-top: none;
                border-radius: 0 0 8px 8px;
              }
              .meeting-details {
                background: #f9fafb;
                padding: 20px;
                border-radius: 6px;
                margin: 20px 0;
                border-left: 4px solid #3b82f6;
              }
              .info-box {
                background: #eff6ff;
                padding: 15px;
                border-radius: 6px;
                margin: 20px 0;
                border-left: 4px solid #3b82f6;
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
              <h1>Consultation Scheduled</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName || 'Valued Client'},</h2>
              <p>Thank you for scheduling a consultation with us. Your appointment has been confirmed!</p>
              
              <div class="meeting-details">
                <p><strong>Date:</strong> ${dateStr}</p>
                <p><strong>Time:</strong> ${consultationTime || 'Time TBD'}</p>
              </div>

              <div class="info-box">
                <p><strong>📧 Meeting Link Information</strong></p>
                <p>You will receive an email with your meeting link <strong>5 minutes before</strong> your scheduled consultation time. Please check your inbox (and spam folder) at that time.</p>
              </div>

              <p>Our team is looking forward to speaking with you. If you have any questions or need to reschedule, please contact us through your account dashboard.</p>
              
              <p>Best regards,<br>The Opessocius Asset Management Team</p>
            </div>
            <div class="footer">
              <p>This is an automated confirmation email. Please do not reply to this message.</p>
              <p>&copy; ${new Date().getFullYear()} Opessocius Asset Management. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      textContent: `
Consultation Scheduled

Hello ${userName || 'Valued Client'},

Thank you for scheduling a consultation with us. Your appointment has been confirmed!

Date: ${dateStr}
Time: ${consultationTime || 'Time TBD'}

Meeting Link Information:
You will receive an email with your meeting link 5 minutes before your scheduled consultation time. Please check your inbox (and spam folder) at that time.

Our team is looking forward to speaking with you. If you have any questions or need to reschedule, please contact us through your account dashboard.

Best regards,
The Opessocius Asset Management Team

---
This is an automated confirmation email. Please do not reply to this message.
© ${new Date().getFullYear()} Opessocius Asset Management. All rights reserved.
      `
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Brevo API error (consultation confirmation):', errorData)
      return { 
        success: false, 
        error: errorData.message || 'Failed to send consultation confirmation email' 
      }
    }

    const result = await response.json()
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending consultation confirmation email:', error)
    return { success: false, error: error.message || 'Failed to send consultation confirmation email' }
  }
}

/**
 * Send trade alert notification email to users who have it enabled
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name
 * @param {object} alert - Trade alert data
 * @returns {Promise} - Success status
 */
export const sendTradeAlertNotification = async (userEmail, userName, alert) => {
  try {
    const apiKey = import.meta.env.VITE_BREVO_API_KEY
    const senderEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL
    const senderName = import.meta.env.VITE_BREVO_SENDER_NAME || 'Opessocius Asset Management'

    if (!apiKey || !senderEmail) {
      console.error('Brevo API key or sender email not configured')
      return { success: false, error: 'Email service not configured' }
    }

    const url = 'https://api.brevo.com/v3/smtp/email'

    const emailData = {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [
        {
          email: userEmail,
          name: userName || userEmail
        }
      ],
      subject: 'New Trade Alert - Opessocius',
      htmlContent: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1429 100%); color: #ffffff; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .header h1 { color: #ffffff; margin: 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .alert-details { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
              .alert-item { margin: 10px 0; }
              .alert-label { font-weight: 600; color: #1f2937; }
              .cta-button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>New Trade Alert</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName || 'Valued Client'},</h2>
              <p>A new trade alert has been posted in the community. Please log in to view the details.</p>
              
              <div class="alert-details">
                <div class="alert-item">
                  <span class="alert-label">Symbol:</span> ${alert.symbol || 'N/A'}
                </div>
                <div class="alert-item">
                  <span class="alert-label">Action:</span> ${alert.action || 'N/A'}
                </div>
                <div class="alert-item">
                  <span class="alert-label">Price:</span> ${alert.price || 'N/A'}
                </div>
                ${alert.takeProfit ? `<div class="alert-item"><span class="alert-label">Take Profit:</span> ${alert.takeProfit}</div>` : ''}
                ${alert.stopLoss ? `<div class="alert-item"><span class="alert-label">Stop Loss:</span> ${alert.stopLoss}</div>` : ''}
              </div>

              <a href="https://opes-40bae.web.app/dashboard" class="cta-button">View Trade Alert</a>
              
              <p style="margin-top: 30px;">Best regards,<br>The Opessocius Asset Management Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; ${new Date().getFullYear()} Opessocius Asset Management. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      textContent: `
        New Trade Alert

        Hello ${userName || 'Valued Client'},

        A new trade alert has been posted in the community. Please log in to view the details.

        Symbol: ${alert.symbol || 'N/A'}
        Action: ${alert.action || 'N/A'}
        Price: ${alert.price || 'N/A'}
        ${alert.takeProfit ? `Take Profit: ${alert.takeProfit}` : ''}
        ${alert.stopLoss ? `Stop Loss: ${alert.stopLoss}` : ''}

        View Trade Alert: https://opes-40bae.web.app/dashboard

        Best regards,
        The Opessocius Asset Management Team

        ---
        This is an automated email. Please do not reply to this message.
        © ${new Date().getFullYear()} Opessocius Asset Management. All rights reserved.
      `
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Brevo API error (trade alert notification):', errorData)
      return { 
        success: false, 
        error: errorData.message || 'Failed to send trade alert notification' 
      }
    }

    const result = await response.json()
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending trade alert notification:', error)
    return { success: false, error: error.message || 'Failed to send trade alert notification' }
  }
}

/**
 * Send weekly report notification email to users who have it enabled
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name
 * @param {object} report - Weekly report data
 * @returns {Promise} - Success status
 */
export const sendWeeklyReportNotification = async (userEmail, userName, report) => {
  try {
    const apiKey = import.meta.env.VITE_BREVO_API_KEY
    const senderEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL
    const senderName = import.meta.env.VITE_BREVO_SENDER_NAME || 'Opessocius Asset Management'

    if (!apiKey || !senderEmail) {
      console.error('Brevo API key or sender email not configured')
      return { success: false, error: 'Email service not configured' }
    }

    const url = 'https://api.brevo.com/v3/smtp/email'

    const emailData = {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [
        {
          email: userEmail,
          name: userName || userEmail
        }
      ],
      subject: 'New Weekly Report Available - Opessocius',
      htmlContent: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1429 100%); color: #ffffff; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .header h1 { color: #ffffff; margin: 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .report-details { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
              .cta-button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>New Weekly Report Available</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName || 'Valued Client'},</h2>
              <p>A new weekly report ${report.videoUrl ? 'and video' : ''} has been posted in the community. Please log in to view it.</p>
              
              <div class="report-details">
                <h3 style="margin-top: 0;">${report.title || 'Weekly Report'}</h3>
                ${report.description ? `<p>${report.description}</p>` : ''}
              </div>

              <a href="https://opes-40bae.web.app/dashboard" class="cta-button">View Weekly Report</a>
              
              <p style="margin-top: 30px;">Best regards,<br>The Opessocius Asset Management Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; ${new Date().getFullYear()} Opessocius Asset Management. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      textContent: `
        New Weekly Report Available

        Hello ${userName || 'Valued Client'},

        A new weekly report ${report.videoUrl ? 'and video' : ''} has been posted in the community. Please log in to view it.

        ${report.title || 'Weekly Report'}
        ${report.description || ''}

        View Weekly Report: https://opes-40bae.web.app/dashboard

        Best regards,
        The Opessocius Asset Management Team

        ---
        This is an automated email. Please do not reply to this message.
        © ${new Date().getFullYear()} Opessocius Asset Management. All rights reserved.
      `
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Brevo API error (weekly report notification):', errorData)
      return { 
        success: false, 
        error: errorData.message || 'Failed to send weekly report notification' 
      }
    }

    const result = await response.json()
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending weekly report notification:', error)
    return { success: false, error: error.message || 'Failed to send weekly report notification' }
  }
}
