import { defineString } from 'firebase-functions/params'

export const RESEND_API_KEY = defineString('RESEND_API_KEY')
export const RESEND_SENDER_EMAIL = defineString('RESEND_SENDER_EMAIL', {
  default: 'noreply@opessocius.com'
})
export const RESEND_SENDER_NAME = defineString('RESEND_SENDER_NAME', {
  default: 'Opessocius Asset Management'
})

export async function sendViaResend({ to, subject, html, text, attachments, apiKey, senderEmail, senderName }) {
  const payload = {
    from: `${senderName} <${senderEmail}>`,
    to: Array.isArray(to) ? to : [to],
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
    const message = errorData.message || errorData.error || `Resend API error (${response.status})`
    throw new Error(message)
  }

  const result = await response.json()
  return { success: true, messageId: result.id }
}
