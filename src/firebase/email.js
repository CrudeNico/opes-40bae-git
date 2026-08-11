/**
 * Email service using Resend
 * Sends confirmation emails to users after account creation
 * Sends notification emails for trade alerts and weekly reports
 */

import {
  buildEmailHtml,
  emailDetailBox,
  emailList,
  emailMutedParagraph,
  emailParagraph
} from '../utils/emailLayout.js'

const getEmailConfig = () => {
  const apiKey = import.meta.env.VITE_RESEND_API_KEY
  const senderEmail = import.meta.env.VITE_RESEND_SENDER_EMAIL
  const senderName = import.meta.env.VITE_RESEND_SENDER_NAME || 'Opessocius Asset Management'
  return { apiKey, senderEmail, senderName }
}

const formatResendError = (status, errorData = {}) => {
  if (status === 401 || status === 403) {
    return 'Unauthorized: Invalid API key. Please verify your VITE_RESEND_API_KEY.'
  }
  return errorData.message || errorData.error || `Failed to send email (${status})`
}

const emailFooterNote = 'This is an automated email. Please do not reply to this message.'

/**
 * Send an email via Resend API
 * @param {object} options
 * @param {string} options.to
 * @param {string} [options.toName]
 * @param {string} options.subject
 * @param {string} options.html
 * @param {string} [options.text]
 * @param {Array<{filename: string, content: string}>} [options.attachments]
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendResendEmail = async ({ to, toName, subject, html, text, attachments }) => {
  try {
    const { apiKey, senderEmail, senderName } = getEmailConfig()

    if (import.meta.env.DEV) {
      console.log('Email config check:', {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        apiKeyPrefix: apiKey?.substring(0, 10) || 'none',
        hasSenderEmail: !!senderEmail,
        senderEmail
      })
    }

    if (!apiKey || !senderEmail) {
      console.error('Resend API key or sender email not configured')
      return { success: false, error: 'Email service not configured' }
    }

    const payload = {
      from: `${senderName} <${senderEmail}>`,
      to: [to],
      subject,
      html,
      ...(text ? { text } : {}),
      ...(attachments?.length ? { attachments } : {})
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Resend API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        to,
        toName
      })
      return {
        success: false,
        error: formatResendError(response.status, errorData)
      }
    }

    const result = await response.json()
    return { success: true, messageId: result.id }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

/**
 * Send account confirmation email to user
 */
export const sendConfirmationEmail = async (userEmail, userName) => {
  const name = userName || 'Valued Client'
  const subject = 'Opessocius account confirmation'

  return sendResendEmail({
    to: userEmail,
    toName: name,
    subject,
    html: buildEmailHtml({
      subject,
      heading: 'Welcome to Opessocius',
      greeting: `Dear ${name},`,
      body: [
        emailParagraph('Thank you for creating your account! We\'re excited to confirm that your investor portal account has been successfully created.'),
        emailParagraph('Your account is now active and ready to use. You can:'),
        emailList([
          'Access your portfolio and track performance',
          'Manage your investments with ease',
          'View real-time market data and insights'
        ]),
        emailParagraph('If you have any questions or need assistance, please don\'t hesitate to contact our support team.'),
        emailParagraph('Best regards,<br>The Opessocius Team', '0')
      ].join(''),
      cta: { label: 'Go to Dashboard', href: 'https://opessocius.com/dashboard' },
      footerNote: emailFooterNote
    }),
    text: `Welcome to Opessocius

Dear ${name},

Thank you for creating your account! We're excited to confirm that your investor portal account has been successfully created.

Your account is now active and ready to use. You can:
- Access your portfolio and track performance
- Manage your investments with ease
- View real-time market data and insights

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The Opessocius Team

---
${emailFooterNote}
© ${new Date().getFullYear()} Opessocius. All rights reserved.`
  })
}

/**
 * Send Google Meet consultation link to user
 */
export const sendConsultationLinkEmail = async (userEmail, userName, consultationDate, consultationTime, googleMeetLink) => {
  const name = userName || 'Valued Client'
  const dateStr = consultationDate?.toDate ?
    consultationDate.toDate().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }) :
    'Date TBD'
  const subject = 'Your Consultation Meeting Link - Opessocius'

  return sendResendEmail({
    to: userEmail,
    toName: name,
    subject,
    html: buildEmailHtml({
      subject,
      heading: 'Your Consultation Meeting Link',
      greeting: `Hello ${name},`,
      body: [
        emailParagraph('Your consultation meeting has been scheduled. Please find the details below:'),
        emailDetailBox([
          emailParagraph(`<strong>Date:</strong> ${dateStr}`, '8px'),
          emailParagraph(`<strong>Time:</strong> ${consultationTime || 'Time TBD'}`, '0')
        ].join('')),
        emailParagraph('Click the button below to join your consultation meeting:'),
        emailMutedParagraph(`Or copy and paste this link: ${googleMeetLink}`),
        emailParagraph('We look forward to speaking with you!', '8px'),
        emailParagraph('Best regards,<br>The Opessocius Team', '0')
      ].join(''),
      cta: { label: 'Join Meeting', href: googleMeetLink },
      footerNote: emailFooterNote
    }),
    text: `Your Consultation Meeting Link

Hello ${name},

Your consultation meeting has been scheduled. Please find the details below:

Date: ${dateStr}
Time: ${consultationTime || 'Time TBD'}

Join your consultation meeting by clicking this link:
${googleMeetLink}

We look forward to speaking with you!

Best regards,
The Opessocius Team

---
${emailFooterNote}
© ${new Date().getFullYear()} Opessocius. All rights reserved.`
  })
}

/**
 * Send consultation confirmation email to user
 */
export const sendConsultationConfirmationEmail = async (userEmail, userName, consultationDate, consultationTime) => {
  const name = userName || 'Valued Client'
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
  const subject = 'Consultation Scheduled - Opessocius'

  return sendResendEmail({
    to: userEmail,
    toName: name,
    subject,
    html: buildEmailHtml({
      subject,
      heading: 'Consultation Scheduled',
      greeting: `Hello ${name},`,
      body: [
        emailParagraph('Thank you for scheduling a consultation with us. Your appointment has been confirmed!'),
        emailDetailBox([
          emailParagraph(`<strong>Date:</strong> ${dateStr}`, '8px'),
          emailParagraph(`<strong>Time:</strong> ${consultationTime || 'Time TBD'}`, '0')
        ].join('')),
        emailDetailBox([
          emailParagraph('<strong>Meeting Link Information</strong>', '8px'),
          emailParagraph('You will receive an email with your meeting link <strong>5 minutes before</strong> your scheduled consultation time. Please check your inbox (and spam folder) at that time.', '0')
        ].join('')),
        emailParagraph('Our team is looking forward to speaking with you. If you have any questions or need to reschedule, please contact us through your account dashboard.'),
        emailParagraph('Best regards,<br>The Opessocius Team', '0')
      ].join(''),
      footerNote: emailFooterNote
    }),
    text: `Consultation Scheduled

Hello ${name},

Thank you for scheduling a consultation with us. Your appointment has been confirmed!

Date: ${dateStr}
Time: ${consultationTime || 'Time TBD'}

Meeting Link Information:
You will receive an email with your meeting link 5 minutes before your scheduled consultation time. Please check your inbox (and spam folder) at that time.

Our team is looking forward to speaking with you. If you have any questions or need to reschedule, please contact us through your account dashboard.

Best regards,
The Opessocius Team

---
${emailFooterNote}
© ${new Date().getFullYear()} Opessocius. All rights reserved.`
  })
}

/**
 * Send trade alert notification email to users who have it enabled
 */
export const sendTradeAlertNotification = async (userEmail, userName, alert) => {
  const name = userName || 'Valued Client'
  const subject = 'New Trade Alert - Opessocius'

  return sendResendEmail({
    to: userEmail,
    toName: name,
    subject,
    html: buildEmailHtml({
      subject,
      heading: 'New Trade Alert',
      greeting: `Hello ${name},`,
      body: [
        emailParagraph('A new trade alert has been posted in the community. Please log in to view the details.'),
        emailDetailBox([
          emailParagraph(`<strong>Symbol:</strong> ${alert.symbol || 'N/A'}`, '8px'),
          emailParagraph(`<strong>Action:</strong> ${alert.action || 'N/A'}`, '8px'),
          emailParagraph(`<strong>Price:</strong> ${alert.price || 'N/A'}`, alert.takeProfit || alert.stopLoss ? '8px' : '0'),
          alert.takeProfit ? emailParagraph(`<strong>Take Profit:</strong> ${alert.takeProfit}`, alert.stopLoss ? '8px' : '0') : '',
          alert.stopLoss ? emailParagraph(`<strong>Stop Loss:</strong> ${alert.stopLoss}`, '0') : ''
        ].filter(Boolean).join('')),
        emailParagraph('Best regards,<br>The Opessocius Team', '0')
      ].join(''),
      cta: { label: 'View Trade Alert', href: 'https://opessocius.com/dashboard' },
      footerNote: emailFooterNote
    }),
    text: `New Trade Alert

Hello ${name},

A new trade alert has been posted in the community. Please log in to view the details.

Symbol: ${alert.symbol || 'N/A'}
Action: ${alert.action || 'N/A'}
Price: ${alert.price || 'N/A'}
${alert.takeProfit ? `Take Profit: ${alert.takeProfit}` : ''}
${alert.stopLoss ? `Stop Loss: ${alert.stopLoss}` : ''}

View Trade Alert: https://opessocius.com/dashboard

Best regards,
The Opessocius Team

---
${emailFooterNote}
© ${new Date().getFullYear()} Opessocius. All rights reserved.`
  })
}

/**
 * Send weekly report notification email to users who have it enabled
 */
export const sendWeeklyReportNotification = async (userEmail, userName, report) => {
  const name = userName || 'Valued Client'
  const subject = 'New Weekly Report Available - Opessocius'

  return sendResendEmail({
    to: userEmail,
    toName: name,
    subject,
    html: buildEmailHtml({
      subject,
      heading: 'New Weekly Report Available',
      greeting: `Hello ${name},`,
      body: [
        emailParagraph(`A new weekly report${report.videoUrl ? ' and video' : ''} has been posted in the community. Please log in to view it.`),
        emailDetailBox([
          emailParagraph(`<strong>${report.title || 'Weekly Report'}</strong>`, report.description ? '8px' : '0'),
          report.description ? emailParagraph(report.description, '0') : ''
        ].filter(Boolean).join('')),
        emailParagraph('Best regards,<br>The Opessocius Team', '0')
      ].join(''),
      cta: { label: 'View Weekly Report', href: 'https://opessocius.com/dashboard' },
      footerNote: emailFooterNote
    }),
    text: `New Weekly Report Available

Hello ${name},

A new weekly report${report.videoUrl ? ' and video' : ''} has been posted in the community. Please log in to view it.

${report.title || 'Weekly Report'}
${report.description || ''}

View Weekly Report: https://opessocius.com/dashboard

Best regards,
The Opessocius Team

---
${emailFooterNote}
© ${new Date().getFullYear()} Opessocius. All rights reserved.`
  })
}
