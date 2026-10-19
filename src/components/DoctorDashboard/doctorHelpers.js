import { ApiError } from '../../lib/api'

export const WEEKDAYS = [
  { iso: 1, name: 'Monday', short: 'Mon' },
  { iso: 2, name: 'Tuesday', short: 'Tue' },
  { iso: 3, name: 'Wednesday', short: 'Wed' },
  { iso: 4, name: 'Thursday', short: 'Thu' },
  { iso: 5, name: 'Friday', short: 'Fri' },
  { iso: 6, name: 'Saturday', short: 'Sat' },
  { iso: 7, name: 'Sunday', short: 'Sun' },
]

export const SLOT_DURATIONS = [10, 15, 20, 30, 45, 60]
export const MAX_BREAKS = 3
export const CANCEL_REASON_MIN = 5
export const CANCEL_REASON_MAX = 300

export const STATUS_LABELS = {
  booked: 'Booked',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
}

export const ACTION_LABELS = { complete: 'Mark completed', no_show: 'Mark no-show', cancel: 'Cancel' }
export const ACTION_STATUS = { complete: 'completed', no_show: 'no_show', cancel: 'cancelled' }

// ---------------------------------------------------------------------------
// Dates. Calendar dates are "YYYY-MM-DD" strings in the clinic's zone.
// ---------------------------------------------------------------------------

export function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// "Today" on the clinic's wall calendar, which can differ from the browser's.
export function todayInZone(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function shiftDate(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function readableZone(timeZone) {
  return timeZone?.replace(/_/g, ' ')
}

export function timeZoneOptions(current) {
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  return current && !zones.includes(current) ? [current, ...zones] : zones
}

// ---------------------------------------------------------------------------
// Weekly schedule form <-> API
// ---------------------------------------------------------------------------

const WORKDAY = { isWorking: true, shiftStart: '09:00', shiftEnd: '17:00', breaks: [{ start: '13:00', end: '14:00' }] }

// What a first-time doctor starts from: Mon-Fri, 9-5 with a lunch hour.
export function defaultSchedule(timezone) {
  return {
    revision: null,
    timezone,
    slotDurationMinutes: 30,
    bookingPolicy: { horizonDays: 30, minNoticeMinutes: 60, lateCancelWindowMinutes: 240 },
    weeklySchedule: WEEKDAYS.map(({ iso }) =>
      iso <= 5
        ? { isoWeekday: iso, ...WORKDAY, breaks: WORKDAY.breaks.map((b) => ({ ...b })) }
        : { isoWeekday: iso, isWorking: false, shiftStart: '09:00', shiftEnd: '17:00', breaks: [] }
    ),
  }
}

// Non-working days keep their last hours in the form, so switching a day back
// on doesn't lose them. The server drops them when saving.
export function toForm(availability) {
  return {
    revision: availability.revision,
    timezone: availability.timezone,
    slotDurationMinutes: availability.slotDurationMinutes,
    bookingPolicy: { ...availability.bookingPolicy },
    weeklySchedule: availability.weeklySchedule.map((day) => ({
      isoWeekday: day.isoWeekday,
      isWorking: day.isWorking,
      shiftStart: day.shiftStart ?? '09:00',
      shiftEnd: day.shiftEnd ?? '17:00',
      breaks: day.breaks.map((b) => ({ ...b })),
    })),
  }
}

const toNumber = (value) => (value === '' || value === null ? NaN : Number(value))

export function toPayload(form) {
  return {
    revision: form.revision,
    timezone: form.timezone,
    slotDurationMinutes: toNumber(form.slotDurationMinutes),
    bookingPolicy: {
      horizonDays: toNumber(form.bookingPolicy.horizonDays),
      minNoticeMinutes: toNumber(form.bookingPolicy.minNoticeMinutes),
      lateCancelWindowMinutes: toNumber(form.bookingPolicy.lateCancelWindowMinutes),
    },
    weeklySchedule: form.weeklySchedule.map((day) =>
      day.isWorking
        ? {
            isoWeekday: day.isoWeekday,
            isWorking: true,
            shiftStart: day.shiftStart,
            shiftEnd: day.shiftEnd,
            breaks: day.breaks,
          }
        : { isoWeekday: day.isoWeekday, isWorking: false, breaks: [] }
    ),
  }
}

// Compares what would be saved, so toggling a day off and on isn't "dirty".
export function isScheduleDirty(form, baseline) {
  return JSON.stringify(toPayload(form)) !== JSON.stringify(toPayload(baseline))
}

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const toHHmm = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

// Wall-clock preview of one day's slots, using the same "shift minus breaks,
// then step by slot length" rule as the server. It skips DST handling, which
// only matters on the two changeover days a year.
export function previewSlots(day, slotDurationMinutes) {
  if (!day?.isWorking || !day.shiftStart || !day.shiftEnd || !(slotDurationMinutes > 0)) return []

  let windows = [{ start: toMinutes(day.shiftStart), end: toMinutes(day.shiftEnd) }]
  for (const brk of day.breaks) {
    if (!brk.start || !brk.end) continue
    const breakStart = toMinutes(brk.start)
    const breakEnd = toMinutes(brk.end)
    windows = windows.flatMap((w) =>
      breakEnd <= w.start || breakStart >= w.end
        ? [w]
        : [
            { start: w.start, end: breakStart },
            { start: breakEnd, end: w.end },
          ].filter((part) => part.end > part.start)
    )
  }

  const slots = []
  for (const window of windows) {
    for (let cursor = window.start; cursor + slotDurationMinutes <= window.end; cursor += slotDurationMinutes) {
      slots.push({ start: toHHmm(cursor), end: toHHmm(cursor + slotDurationMinutes) })
    }
  }
  return slots
}

// ---------------------------------------------------------------------------
// Time-off
// ---------------------------------------------------------------------------

// End is exclusive, so a run of whole days ends at midnight after the last one.
export function wholeDaysRange(firstDate, lastDate) {
  return { startLocal: `${firstDate}T00:00`, endLocal: `${shiftDate(lastDate, 1)}T00:00` }
}

export function partOfDayRange(date, startTime, endTime) {
  return { startLocal: `${date}T${startTime}`, endLocal: `${date}T${endTime}` }
}

export function validateTimeOffForm(form, today) {
  const errors = {}
  if (form.mode === 'days') {
    if (!form.firstDate) errors.firstDate = 'Choose the first day.'
    if (!form.lastDate) errors.lastDate = 'Choose the last day.'
    else if (form.firstDate && form.lastDate < form.firstDate) errors.lastDate = 'The last day can’t be before the first day.'
    else if (form.lastDate < today) errors.lastDate = 'Time off can’t be entirely in the past.'
  } else {
    if (!form.date) errors.date = 'Choose a day.'
    else if (form.date < today) errors.date = 'Time off can’t be in the past.'
    if (!form.startTime) errors.startTime = 'Choose a start time.'
    if (!form.endTime) errors.endTime = 'Choose an end time.'
    else if (form.startTime && form.endTime <= form.startTime) errors.endTime = 'The end must be after the start.'
  }
  return errors
}

export function timeOffRange(form) {
  return form.mode === 'days'
    ? wholeDaysRange(form.firstDate, form.lastDate)
    : partOfDayRange(form.date, form.startTime, form.endTime)
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

// { "weeklySchedule.0.shiftEnd": "message" } from a VALIDATION_FAILED response.
export function fieldErrors(err) {
  const errors = {}
  if (err instanceof ApiError && Array.isArray(err.details)) {
    for (const detail of err.details) {
      const path = detail?.path
      // Server-supplied keys: plain strings only, and never prototype names.
      if (typeof path !== 'string' || typeof detail.message !== 'string') continue
      if (path === '__proto__' || Object.hasOwn(errors, path)) continue
      errors[path] = detail.message
    }
  }
  return errors
}

function commonMessage(err) {
  if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.'
  if (['NETWORK_ERROR', 'TIMEOUT', 'CLIENT_THROTTLED'].includes(err.code)) return err.message
  if (err.code === 'UNAUTHENTICATED') return 'Your session has expired. Please sign in again.'
  if (err.status === 429) return 'Too many requests. Please wait a moment and try again.'
  if (err.status >= 500) return 'The server is having trouble right now. Please try again shortly.'
  return null
}

export function describeLoadError(err) {
  return commonMessage(err) ?? 'Could not load this information. Please try again.'
}

export function describeSaveError(err) {
  const common = commonMessage(err)
  if (common) return common
  if (err.code === 'VALIDATION_FAILED') return 'Some details were rejected. Please review the highlighted fields.'
  if (err.code === 'DOCTOR_NOT_ACCEPTING') return err.message
  return err.message || 'Something went wrong. Please try again.'
}

// Statuses are checked against the server's own rules, so its message is
// usually the best explanation; these cover the codes worth rewording.
export function describeStatusError(err) {
  const common = commonMessage(err)
  if (common) return common
  switch (err.code) {
    case 'INVALID_STATUS_TRANSITION':
      return 'This appointment was just updated elsewhere. The list has been refreshed.'
    case 'TRANSITION_TOO_EARLY':
      return 'It’s too early to mark this appointment with that status.'
    case 'REASON_REQUIRED':
      return `Please give a reason of at least ${CANCEL_REASON_MIN} characters.`
    case 'CANCELLATION_CLOSED':
      return 'This appointment has already ended and can no longer be cancelled.'
    case 'APPOINTMENT_NOT_FOUND':
      return 'This appointment could not be found. The list has been refreshed.'
    default:
      return err.message || 'Something went wrong. Please try again.'
  }
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}
