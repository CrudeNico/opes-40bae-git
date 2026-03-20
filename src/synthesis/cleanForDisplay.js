/**
 * Synthesis: clean message data for display in chat.
 * Raw data stays in Firebase; we transform it here before rendering.
 */

// Emoji regex - matches most Unicode emoji ranges
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F1E0}-\u{1F1FF}\u{2300}-\u{23FF}\u{2B50}\u{231A}\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2614}\u{2615}\u{2648}-\u{2653}\u{267F}\u{2693}\u{26A1}\u{26AA}\u{26AB}\u{26BD}\u{26BE}\u{26C4}\u{26C5}\u{26CE}\u{26D4}\u{26EA}\u{26F2}\u{26F3}\u{26F5}\u{26FA}\u{26FD}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2728}\u{2733}\u{2734}\u{2744}\u{2747}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2763}\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]|[\u{FE00}-\u{FE0F}]/gu

// Date-like patterns (username that's just a date)
const DATE_PATTERNS = [
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,           // 3/20/2025, 03/20/25
  /^\d{4}-\d{2}-\d{2}$/,                    // 2025-03-20
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4}$/i,  // Mar 20, 2025
  /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{2,4}$/i,   // 20 Mar 2025
  /^\d{1,2}:\d{2}\s*(AM|PM)?$/i,           // 3:45 PM (time only)
]

// Patterns to strip from username (e.g. "Peter Frey 1:41pm" → "Peter Frey")
const STRIP_FROM_NAME = [
  /\s+\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?\s*$/i,   // 1:41pm, 2:44 PM, 14:30:00
  /\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/,            // 3/20/2025
  /\s+\d{4}-\d{2}-\d{2}\s*$/,                     // 2025-03-20
  /\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4}\s*$/i,
  /\s+\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{2,4}\s*$/i,
]

function removeEmojis(str) {
  if (!str || typeof str !== 'string') return str || ''
  return str.replace(EMOJI_REGEX, '').trim()
}

function looksLikeDate(str) {
  if (!str || typeof str !== 'string') return true
  const trimmed = str.trim()
  if (!trimmed) return true
  return DATE_PATTERNS.some((re) => re.test(trimmed))
}

/**
 * Remove date/time suffixes from username (e.g. "Peter Frey 1:41pm" → "Peter Frey").
 * Firebase/source data sometimes includes timestamps in the username; we show time from createdAt instead.
 */
function stripDateAndTimeFromName(str) {
  if (!str || typeof str !== 'string') return str || ''
  let result = str
  let changed = true
  while (changed) {
    changed = false
    for (const re of STRIP_FROM_NAME) {
      const next = result.replace(re, '').trim()
      if (next !== result) {
        result = next
        changed = true
        break
      }
    }
  }
  return result.trim()
}

/**
 * Generate a stable "Member_xxx" username for users without a real name.
 * Same original author string always produces the same result across messages.
 */
function stableAnonymousName(originalAuthor) {
  const seed = String(originalAuthor || 'anonymous')
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + c
    hash = hash & hash
  }
  const short = Math.abs(hash).toString(36).substring(0, 8)
  return `Member_${short}`
}

/**
 * Clean a message for display in the chat UI.
 * @param {Object} msg - Raw message from Firestore
 * @returns {Object} Cleaned message for display
 */
export function cleanMessageForDisplay(msg) {
  if (!msg) return msg

  let displayName = msg.userName || msg.userEmail || ''
  const originalAuthor = displayName || msg.userName || ''

  if (msg.isAdmin) {
    displayName = 'Admin 1'
  } else {
    // Armando "The Professor" → Admin 3
    const rawName = (displayName || originalAuthor || '').toLowerCase()
    if (rawName.includes('armando') && rawName.includes('the professor')) {
      displayName = 'Admin 3'
    } else {
      // Remove emojis from username
      displayName = removeEmojis(displayName)
      // Strip date/time that got mixed into username (e.g. "Peter Frey 1:41pm" → "Peter Frey")
      displayName = stripDateAndTimeFromName(displayName)

      // If no username, or only a date/time, use stable anonymous name
      if (!displayName || looksLikeDate(displayName)) {
        displayName = stableAnonymousName(originalAuthor)
      }
    }
  }

  // Normalize message: remove all line breaks and extra spaces so text flows as one line
  let displayMessage = msg.message
  if (displayMessage && typeof displayMessage === 'string') {
    displayMessage = displayMessage
      .replace(/[\r\n\u2028\u2029\u000B\u000C]+/g, ' ') // all line/paragraph separators
      .replace(/\s+/g, ' ')
      .trim()
  }

  return {
    ...msg,
    message: displayMessage ?? msg.message,
    displayName,
    // Don't show images or documents (filtered at source; hide if any slip through)
    imageUrl: null,
    fileUrl: null,
    fileName: null,
  }
}

/**
 * Clean an array of messages for display.
 */
export function cleanMessagesForDisplay(messages) {
  if (!Array.isArray(messages)) return []
  return messages.map(cleanMessageForDisplay)
}
