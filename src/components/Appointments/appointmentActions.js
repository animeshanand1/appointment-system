import { ApiError } from '../../lib/api'
import { formatClock, formatLongDate } from '../BookAppointment/bookingHelpers'

export const REASON_MIN = 5
export const REASON_MAX = 300

// What the reschedule and cancel controls should say when the API refuses.
export function describeActionError(err) {
  if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.'
  switch (err.code) {
    case 'SLOT_UNAVAILABLE':
      return 'That time was just taken. Please pick another slot.'
    case 'SLOT_NOT_BOOKABLE':
      return 'That time can no longer be booked. Please pick another slot.'
    case 'PATIENT_TIME_CONFLICT':
      return 'The patient already has another appointment at that time.'
    case 'RESCHEDULE_CLOSED':
      return 'This appointment can no longer be rescheduled.'
    case 'RESCHEDULE_NOT_PENDING':
      return 'That request was already withdrawn or decided. The list has been refreshed.'
    case 'CANCELLATION_CLOSED':
      return 'This appointment can no longer be cancelled.'
    case 'REASON_REQUIRED':
      return `Please give a reason of at least ${REASON_MIN} characters.`
    case 'INVALID_STATUS_TRANSITION':
      return 'This appointment was just changed elsewhere. The list has been refreshed.'
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
    case 'CLIENT_THROTTLED':
      return err.message
  }
  if (err.status === 429) return 'Too many changes in a short time. Please wait a moment.'
  if (err.status >= 500) return 'The server is having trouble right now. Please try again shortly.'
  return err.message || 'Something went wrong. Please try again.'
}

export function describeSlot({ localDate, localStartTime }) {
  return `${formatLongDate(localDate)}, ${formatClock(localStartTime)}`
}

export const can = (appointment, action) => appointment.allowedActions?.includes(action)
