export const EMAIL_LOGO_URL = 'https://europe-west1-opessocius-6741d.cloudfunctions.net/emailBrandLogo?v=2'

const paragraphStyle = 'margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#FFFFFF;'
const mutedStyle = 'margin:0 0 8px 0;font-size:12px;line-height:1.5;color:#B8C4D6;'

/**
 * Build the standard Opessocius email HTML shell.
 * @param {object} options
 * @param {string} options.subject - Used for the document title
 * @param {string} options.heading - Main h1 inside the card
 * @param {string} options.body - Inner HTML for the main content area
 * @param {string} [options.greeting] - Optional greeting line (e.g. "Hi Name,")
 * @param {{ label: string, href: string }} [options.cta] - Optional CTA button
 * @param {string} [options.footerNote] - Optional muted note above copyright
 */
export const buildEmailHtml = ({ subject, heading, body, greeting, cta, footerNote }) => {
  const greetingBlock = greeting
    ? `<p style="${paragraphStyle}">${greeting}</p>`
    : ''

  const ctaBlock = cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px 0;">
        <tr>
          <td align="center" bgcolor="#FFFFFF" style="border-radius:12px;background-color:#FFFFFF;box-shadow:0 8px 24px rgba(0,0,0,0.28);">
            <a href="${cta.href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:15px 32px;font-size:15px;font-weight:700;line-height:1.2;letter-spacing:0.04em;color:#12355B;text-decoration:none;border-radius:12px;border:1px solid rgba(255,255,255,0.95);">
              ${cta.label}
            </a>
          </td>
        </tr>
      </table>`
    : ''

  const footerNoteBlock = footerNote
    ? `<p style="${mutedStyle}">${footerNote}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#E8ECF1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#E8ECF1;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#12355B;background-image:linear-gradient(180deg, #1B4A78 0%, #12355B 42%, #0B243F 100%);border-radius:18px;border-collapse:separate;overflow:hidden;border:1px solid rgba(255,255,255,0.10);box-shadow:0 18px 40px rgba(11,36,63,0.28);">
          <tr>
            <td align="center" style="padding:30px 28px 8px 28px;background:transparent;">
              <img src="${EMAIL_LOGO_URL}" width="48" height="48" alt="Opessocius" style="display:block;width:48px;height:48px;border:0;outline:none;text-decoration:none;margin:0 auto;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 28px 20px 28px;background:transparent;">
              <p style="margin:0;font-size:18px;font-weight:600;letter-spacing:0.08em;color:#FFFFFF;">
                Opessocius
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 12px 28px;background:transparent;">
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:700;color:#FFFFFF;">${heading}</h1>
              ${greetingBlock}
              ${body}
              ${ctaBlock}
              ${footerNoteBlock}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 28px 26px 28px;border-top:1px solid rgba(255,255,255,0.14);background:transparent;">
              <p style="margin:20px 0 0 0;font-size:12px;line-height:1.5;font-weight:400;letter-spacing:0.02em;color:#B8C4D6;">
                © ${new Date().getFullYear()} Opessocius. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export const emailParagraph = (text, marginBottom = '16px') =>
  `<p style="margin:0 0 ${marginBottom} 0;font-size:15px;line-height:1.6;color:#FFFFFF;">${text}</p>`

export const emailMutedParagraph = (text) =>
  `<p style="${mutedStyle}">${text}</p>`

export const emailDetailBox = (content) =>
  `<div style="background:rgba(255,255,255,0.08);padding:16px 18px;border-radius:12px;margin:16px 0;border:1px solid rgba(255,255,255,0.12);">${content}</div>`

export const emailList = (items) =>
  `<ul style="margin:0 0 16px 0;padding-left:20px;font-size:15px;line-height:1.8;color:#FFFFFF;">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`
