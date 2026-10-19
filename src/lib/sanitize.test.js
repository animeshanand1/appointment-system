import { describe, expect, it } from 'vitest'
import {
  cleanText,
  isValidEmail,
  isValidFullName,
  passwordProblem,
  pathSegment,
  safeInternalPath,
  sanitizeBody,
  telHref,
} from './sanitize'

// Built from char codes so the test source itself stays plain ASCII.
const ZERO_WIDTH = String.fromCharCode(0x200b)
const RTL_OVERRIDE = String.fromCharCode(0x202e)
const NUL = String.fromCharCode(0)

describe('cleanText', () => {
  it('strips control, zero-width and bidi characters and trims', () => {
    expect(cleanText(`  An${ZERO_WIDTH}na${NUL} ${RTL_OVERRIDE}Lee  `)).toBe('Anna Lee')
  })

  it('collapses line breaks on single-line fields but keeps them on multiline ones', () => {
    expect(cleanText('a\nb\tc')).toBe('a b c')
    expect(cleanText('a\nb', { multiline: true })).toBe('a\nb')
  })

  it('caps the length and tolerates non-strings', () => {
    expect(cleanText('abcdef', { maxLength: 3 })).toBe('abc')
    expect(cleanText(undefined)).toBe('')
    expect(cleanText({ toString: () => 'x' })).toBe('')
  })
})

describe('validators', () => {
  it('accepts ordinary emails and rejects malformed ones', () => {
    expect(isValidEmail('name@example.com')).toBe(true)
    expect(isValidEmail('name@example')).toBe(false)
    expect(isValidEmail('a b@example.com')).toBe(false)
    expect(isValidEmail(`${'a'.repeat(250)}@example.com`)).toBe(false)
  })

  it('accepts names in any script and rejects markup', () => {
    expect(isValidFullName("Asha O'Neil-Verma")).toBe(true)
    expect(isValidFullName('आशा वर्मा')).toBe(true)
    expect(isValidFullName('<script>alert(1)</script>')).toBe(false)
    expect(isValidFullName('A')).toBe(false)
  })

  it('enforces the password policy', () => {
    expect(passwordProblem('short1')).toMatch(/at least 8/)
    expect(passwordProblem('onlyletters')).toMatch(/letter and one number/)
    expect(passwordProblem('a1'.repeat(70))).toMatch(/at most 128/)
    expect(passwordProblem('me1@example.com', 'ME1@example.com')).toMatch(/same as your email/)
    expect(passwordProblem('Clinic2026')).toBe('')
  })
})

describe('telHref', () => {
  it('keeps only digits and a leading plus', () => {
    expect(telHref('+91 98765-43210')).toBe('tel:+919876543210')
    expect(telHref('98765 43210')).toBe('tel:9876543210')
  })

  it('refuses anything that is not a phone number', () => {
    expect(telHref('javascript:alert(1)')).toBe(null)
    expect(telHref('')).toBe(null)
    expect(telHref(null)).toBe(null)
  })
})

describe('safeInternalPath', () => {
  it('allows app paths and rejects external or protocol-relative ones', () => {
    expect(safeInternalPath('/dashboard/appointments')).toBe('/dashboard/appointments')
    expect(safeInternalPath('//evil.example', '/book')).toBe('/book')
    expect(safeInternalPath('https://evil.example', '/book')).toBe('/book')
    expect(safeInternalPath('/\\evil.example', '/book')).toBe('/book')
    expect(safeInternalPath(undefined, '/book')).toBe('/book')
  })
})

describe('pathSegment', () => {
  it('encodes ids and rejects dot segments', () => {
    expect(pathSegment('a/b?c')).toBe('a%2Fb%3Fc')
    expect(() => pathSegment('..')).toThrow()
    expect(() => pathSegment('')).toThrow()
  })
})

describe('sanitizeBody', () => {
  it('cleans strings but sends passwords and invite codes untouched', () => {
    const body = JSON.parse(
      sanitizeBody({
        fullName: ` Asha${ZERO_WIDTH} `,
        password: ` pa${ZERO_WIDTH}ss `,
        inviteCode: ' DOC-1 ',
        patientNotes: 'line 1\nline 2',
        doctorProfile: { clinicName: 'Main\nOPD' },
      })
    )
    expect(body.fullName).toBe('Asha')
    expect(body.password).toBe(` pa${ZERO_WIDTH}ss `)
    expect(body.inviteCode).toBe(' DOC-1 ')
    expect(body.patientNotes).toBe('line 1\nline 2')
    expect(body.doctorProfile.clinicName).toBe('Main OPD')
  })
})
