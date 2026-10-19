import { ApiError } from '../../lib/api'

// Ids double as the API's `specialization` filter values.
export const DEPARTMENTS = [
  { id: 'cardiology', name: 'Cardiology & Heart Care' },
  { id: 'neurology', name: 'Neurology & Brain Health' },
  { id: 'pediatrics', name: 'Pediatrics & Child Wellness' },
  { id: 'orthopedics', name: 'Orthopedics & Sports Medicine' },
  { id: 'ophthalmology', name: 'Ophthalmology & Vision' },
  { id: 'internal-medicine', name: 'Internal & Preventive Care' },
]

export const REASON_MIN = 10
export const REASON_MAX = 500

export const FIELD_ORDER = ['department', 'doctorId', 'date', 'slot', 'reason', 'consent']

// Only known department ids are accepted from the URL (?department=…).
export function isDepartmentId(id) {
  return DEPARTMENTS.some((d) => d.id === id)
}

export function departmentName(id) {
  return DEPARTMENTS.find((d) => d.id === id)?.name ?? id
}

export function todayISO(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function validateBooking(values, today = todayISO()) {
  const errors = {}

  if (!values.department) errors.department = 'Please select a department.'
  if (!values.doctorId) errors.doctorId = 'Please select a doctor.'

  if (!values.date) errors.date = 'Please choose an appointment date.'
  else if (values.date < today) errors.date = 'Appointment date cannot be in the past.'

  if (!values.slotStartAt) errors.slot = 'Please select an available time slot.'

  const reason = values.reason.trim()
  if (!reason) errors.reason = 'Please briefly describe the reason for your visit.'
  else if (reason.length < REASON_MIN) errors.reason = `Please add a little more detail (at least ${REASON_MIN} characters).`
  else if (reason.length > REASON_MAX) errors.reason = `Please keep it under ${REASON_MAX} characters.`

  if (!values.consent) errors.consent = 'Please accept the hospital booking policy to continue.'

  return errors
}

// Maps API error codes (docs/architecture/04-api-specification.md §4.1) to
// what the booking form should say and do.
export function describeBookingError(err) {
  if (!(err instanceof ApiError)) return { message: 'Something went wrong. Please try again.' }

  switch (err.code) {
    case 'SLOT_UNAVAILABLE':
      return {
        message: 'That time was just booked by someone else. Please choose another slot.',
        clearSlot: true,
        refreshSlots: true,
      }
    case 'SLOT_NOT_BOOKABLE':
      return {
        message: 'That time can no longer be booked. The available slots have been refreshed.',
        clearSlot: true,
        refreshSlots: true,
      }
    case 'PATIENT_TIME_CONFLICT':
      return { message: 'You already have another appointment at this time. Please choose a different slot.' }
    case 'BOOKING_LIMIT_REACHED':
      return { message: `${err.message}.`, refreshSlots: true }
    case 'DOCTOR_NOT_ACCEPTING':
    case 'DOCTOR_NOT_FOUND':
      return {
        message: 'This doctor is no longer accepting appointments. Please choose another doctor.',
        refreshDoctors: true,
      }
    case 'UNAUTHENTICATED':
      return { message: 'Your session has expired. Please sign in again to confirm this booking.', signIn: true }
    case 'FORBIDDEN_ROLE':
      return { message: "Doctor accounts can't book appointments. Please sign in with a patient account." }
    case 'VALIDATION_FAILED': {
      const notes = err.details?.find((d) => d.path === 'patientNotes')
      if (notes) return { message: `Please check the reason for your visit: ${notes.message}` }
      return { message: 'Some booking details were rejected. Please review the form and try again.' }
    }
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
    case 'CLIENT_THROTTLED':
      return { message: err.message }
  }

  if (err.status === 429) return { message: 'Too many booking attempts. Please wait a minute and try again.' }
  if (err.status >= 500) return { message: 'The server is having trouble right now. Please try again shortly.' }
  return { message: err.message || 'Something went wrong. Please try again.' }
}

export function describeLoadError(err) {
  if (err instanceof ApiError && ['NETWORK_ERROR', 'TIMEOUT', 'CLIENT_THROTTLED'].includes(err.code)) return err.message
  if (err instanceof ApiError && err.status === 429) return 'Too many requests. Please wait a moment and try again.'
  return 'Could not load this information. Please try again.'
}

export function dayReasonMessage(reason, doctorName = 'This doctor') {
  switch (reason) {
    case 'PAST_DATE':
      return 'This date has already passed. Please choose a future date.'
    case 'BEYOND_HORIZON':
      return `${doctorName} isn't taking bookings that far ahead yet. Please choose an earlier date.`
    case 'DAY_OFF':
      return `${doctorName} doesn't hold OPD on this day. Please choose another date.`
    case 'ON_TIME_OFF':
      return `${doctorName} is on leave on this date. Please choose another date.`
    case 'NOT_ACCEPTING':
      return `${doctorName} isn't accepting appointments right now.`
    default:
      return 'No time slots are available on this date.'
  }
}

// Grouped by clinic-local start time, matching the slot panel layout in
// docs/architecture/05-frontend-architecture.md §5.4.
export function groupSlots(slots) {
  const groups = [
    { label: 'Morning', slots: slots.filter((s) => s.slotStartTime < '12:00') },
    { label: 'Afternoon', slots: slots.filter((s) => s.slotStartTime >= '12:00' && s.slotStartTime < '17:00') },
    { label: 'Evening', slots: slots.filter((s) => s.slotStartTime >= '17:00') },
  ]
  return groups.filter((g) => g.slots.length > 0)
}

export function formatClock(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export function formatLongDate(isoDate) {
  return new Date(`${isoDate}T00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// The patient's own wall-clock time for an instant, or null when the
// clinic's zone is the same as theirs and a second label would be noise.
export function patientLocalTime(startAt, clinicTimeZone, patientTimeZone = browserTimeZone()) {
  if (!clinicTimeZone || clinicTimeZone === patientTimeZone) return null
  return new Date(startAt).toLocaleString(undefined, {
    timeZone: patientTimeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  })
}
