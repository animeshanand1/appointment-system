// Input hygiene shared by the forms and the API client.
//
// None of this replaces server-side validation: anything here can be bypassed
// by calling the API directly. It exists so honest input reaches the server
// in a clean, bounded shape and so data coming back is safe to put in links.

// C0/C1 control characters except tab, newline and carriage return, plus the
// zero-width and bidi-override characters used to disguise text.
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g
const LINE_BREAKS = /[\t\r\n]+/g

export const LIMITS = {
  email: 254,
  password: { min: 8, max: 128 },
  fullName: { min: 2, max: 100 },
  phone: 10,
  inviteCode: 64,
  specialization: 80,
  clinicName: 120,
  clinicAddress: 300,
  qualification: 100,
  qualifications: 10,
  bio: 1000,
  timeOffReason: 200,
}

// Strips invisible/control characters, normalizes Unicode and trims. Single-line
// fields also have tabs and line breaks collapsed to a space.
export function cleanText(value, { maxLength, multiline = false } = {}) {
  if (typeof value !== 'string') return ''
  let text = value.normalize('NFC').replace(UNSAFE_CHARS, '')
  if (!multiline) text = text.replace(LINE_BREAKS, ' ')
  text = text.trim()
  return maxLength ? text.slice(0, maxLength) : text
}

// Deliberately simple: one @, no spaces, a dot in the domain. The server is
// the authority; this only catches typos before a round trip.
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/

export function isValidEmail(value) {
  return typeof value === 'string' && value.length <= LIMITS.email && EMAIL_RE.test(value)
}

export function normalizeEmail(value) {
  return cleanText(value, { maxLength: LIMITS.email }).toLowerCase()
}

// Letters (any script), spaces and the punctuation real names use.
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .,'-]*$/u

export function isValidFullName(value) {
  return value.length >= LIMITS.fullName.min && value.length <= LIMITS.fullName.max && NAME_RE.test(value)
}

// Returns an error message, or '' when the password is acceptable.
export function passwordProblem(password, email = '') {
  if (password.length < LIMITS.password.min) return `Password must contain at least ${LIMITS.password.min} characters.`
  if (password.length > LIMITS.password.max) return `Password must be at most ${LIMITS.password.max} characters.`
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return 'Password must include at least one letter and one number.'
  if (email && password.toLowerCase() === email.toLowerCase()) return 'Password must not be the same as your email.'
  if (/^(.)\1+$/.test(password)) return 'Password must not be a single repeated character.'
  return ''
}

// A tel: link built only from digits and a leading +, so a phone number from
// the API can never become a different URL scheme or carry extra parameters.
export function telHref(phone) {
  if (typeof phone !== 'string') return null
  const digits = phone.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')
  return /^\+?\d{3,15}$/.test(digits) ? `tel:${digits}` : null
}

// Only same-app absolute paths ("/book"), never "//host" or "https://…", so
// navigation state can't be turned into an open redirect.
export function safeInternalPath(path, fallback = '/') {
  if (typeof path !== 'string') return fallback
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return fallback
  return path
}

// An id used as one URL path segment. "." and ".." would be resolved by the
// URL parser and point the request at a different endpoint.
export function pathSegment(id) {
  const value = String(id ?? '')
  if (!value || value === '.' || value === '..' || value.length > 128) {
    throw new TypeError('Invalid resource id')
  }
  return encodeURIComponent(value)
}

// JSON.stringify replacer that applies cleanText to every string in a request
// body. Passwords and invite codes are sent exactly as typed.
const VERBATIM_KEYS = new Set(['password', 'inviteCode'])
const MULTILINE_KEYS = new Set(['patientNotes', 'bio', 'reason'])

export function sanitizeBody(body) {
  return JSON.stringify(body, function replacer(key, value) {
    if (typeof value !== 'string' || VERBATIM_KEYS.has(key)) return value
    return cleanText(value, { multiline: MULTILINE_KEYS.has(key) })
  })
}
