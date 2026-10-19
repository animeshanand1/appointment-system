import { describe, expect, it } from 'vitest'
import { ApiError } from '../../lib/api'
import {
  dayReasonMessage,
  describeBookingError,
  formatClock,
  groupSlots,
  patientLocalTime,
  todayISO,
  validateBooking,
} from './bookingHelpers'

const VALID = {
  department: 'cardiology',
  doctorId: '66f0c2a9b1e4f2a7c9d31b77',
  date: '2099-01-05',
  slotStartAt: '2099-01-05T14:00:00.000Z',
  reason: 'Recurring chest tightness after exercise.',
  consent: true,
}

describe('validateBooking', () => {
  it('accepts a complete booking', () => {
    expect(validateBooking(VALID, '2099-01-01')).toEqual({})
  })

  it('requires every field', () => {
    const errors = validateBooking(
      { department: '', doctorId: '', date: '', slotStartAt: '', reason: '', consent: false },
      '2099-01-01'
    )
    expect(Object.keys(errors).sort()).toEqual(['consent', 'date', 'department', 'doctorId', 'reason', 'slot'])
  })

  it('rejects past dates using the local calendar day', () => {
    expect(validateBooking({ ...VALID, date: '2098-12-31' }, '2099-01-01').date).toMatch(/past/)
    expect(validateBooking({ ...VALID, date: '2099-01-01' }, '2099-01-01').date).toBeUndefined()
  })

  it('bounds the reason length after trimming, matching the API limit', () => {
    expect(validateBooking({ ...VALID, reason: '   short   ' }, '2099-01-01').reason).toMatch(/at least 10/)
    expect(validateBooking({ ...VALID, reason: `  ${'x'.repeat(500)}  ` }, '2099-01-01').reason).toBeUndefined()
    expect(validateBooking({ ...VALID, reason: 'x'.repeat(501) }, '2099-01-01').reason).toMatch(/under 500/)
  })
})

describe('describeBookingError', () => {
  const apiError = (code, status, details, message = 'Server message') => new ApiError(code, message, status, details)

  it('clears and refreshes the slot when it was taken or became unbookable', () => {
    for (const code of ['SLOT_UNAVAILABLE', 'SLOT_NOT_BOOKABLE']) {
      expect(describeBookingError(apiError(code, code === 'SLOT_UNAVAILABLE' ? 409 : 422))).toMatchObject({
        clearSlot: true,
        refreshSlots: true,
      })
    }
  })

  it('keeps the selection on a patient time conflict', () => {
    const outcome = describeBookingError(apiError('PATIENT_TIME_CONFLICT', 409))
    expect(outcome.message).toMatch(/already have another appointment/)
    expect(outcome.clearSlot).toBeUndefined()
  })

  it('passes through the specific booking limit from the server', () => {
    const outcome = describeBookingError(
      apiError('BOOKING_LIMIT_REACHED', 422, { limit: 2 }, 'You can hold at most 2 upcoming appointments with the same doctor')
    )
    expect(outcome.message).toBe('You can hold at most 2 upcoming appointments with the same doctor.')
    expect(outcome.refreshSlots).toBe(true)
  })

  it('asks expired sessions to sign in again', () => {
    expect(describeBookingError(apiError('UNAUTHENTICATED', 401))).toMatchObject({ signIn: true })
  })

  it('reloads doctors when the doctor stopped accepting', () => {
    expect(describeBookingError(apiError('DOCTOR_NOT_ACCEPTING', 422))).toMatchObject({ refreshDoctors: true })
  })

  it('points notes validation failures at the reason field', () => {
    const outcome = describeBookingError(
      apiError('VALIDATION_FAILED', 400, [{ path: 'patientNotes', message: 'String must contain at most 500 character(s)' }])
    )
    expect(outcome.message).toMatch(/reason for your visit/)
  })

  it('handles rate limits, server errors, network errors and unknown values', () => {
    expect(describeBookingError(apiError('RATE_LIMITED', 429)).message).toMatch(/Too many/)
    expect(describeBookingError(apiError('INTERNAL_ERROR', 500)).message).toMatch(/server is having trouble/)
    expect(describeBookingError(apiError('NETWORK_ERROR', 0, undefined, 'Unable to reach the server.')).message).toBe(
      'Unable to reach the server.'
    )
    expect(describeBookingError(new Error('boom')).message).toMatch(/Something went wrong/)
  })
})

describe('slot display helpers', () => {
  it('groups slots into morning, afternoon and evening by clinic time', () => {
    const slot = (slotStartTime) => ({ slotStartTime })
    const groups = groupSlots([slot('09:00'), slot('11:30'), slot('12:00'), slot('16:30'), slot('17:00')])
    expect(groups.map((g) => [g.label, g.slots.map((s) => s.slotStartTime)])).toEqual([
      ['Morning', ['09:00', '11:30']],
      ['Afternoon', ['12:00', '16:30']],
      ['Evening', ['17:00']],
    ])
    expect(groupSlots([slot('09:00')]).map((g) => g.label)).toEqual(['Morning'])
  })

  it('formats 24h clinic times as 12h clock times', () => {
    expect(formatClock('00:15')).toBe('12:15 AM')
    expect(formatClock('09:05')).toBe('9:05 AM')
    expect(formatClock('12:00')).toBe('12:00 PM')
    expect(formatClock('17:30')).toBe('5:30 PM')
  })

  it("only shows the patient's own time when their zone differs from the clinic's", () => {
    const startAt = '2099-01-05T14:00:00.000Z'
    expect(patientLocalTime(startAt, 'America/New_York', 'America/New_York')).toBeNull()
    expect(patientLocalTime(startAt, null, 'Asia/Kolkata')).toBeNull()
    const local = patientLocalTime(startAt, 'America/New_York', 'Asia/Kolkata')
    expect(local).toMatch(/7:30\s?pm/i)
    expect(local).toMatch(/GMT\+5:30|IST/)
  })

  it('explains every empty-day reason', () => {
    for (const reason of ['PAST_DATE', 'BEYOND_HORIZON', 'DAY_OFF', 'ON_TIME_OFF', 'NOT_ACCEPTING', 'SOMETHING_NEW']) {
      expect(dayReasonMessage(reason, 'Dr. Chen')).toBeTruthy()
    }
    expect(dayReasonMessage('DAY_OFF', 'Dr. Chen')).toMatch(/Dr. Chen doesn't hold OPD/)
  })

  it('formats today as a local YYYY-MM-DD date', () => {
    expect(todayISO(new Date(2026, 0, 9, 23, 59))).toBe('2026-01-09')
  })
})
