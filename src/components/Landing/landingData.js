import { DEPARTMENTS } from '../BookAppointment/bookingHelpers'

// Outpatient clinics run Mon–Sat, 08:00–20:00. Emergency never closes.
export const OPD_OPEN_HOUR = 8
export const OPD_CLOSE_HOUR = 20
export const EMERGENCY_PHONE = { display: '1-800-CARE-911', href: 'tel:18004273785' }
export const ADDRESS = '742 Health Boulevard, Metro Medical District, NY 10021'
export const EMAIL = 'appointments@carepulse.org'

// Consultant names match backend/scripts/seed.js.
const DEPARTMENT_DETAILS = {
  cardiology: {
    blurb: 'Chest pain, palpitations and high blood pressure. ECG, echo and stress testing happen on the same floor.',
    consultants: ['Dr. Sarah Jenkins', 'Dr. Daniel Chen', 'Dr. Michael Ortiz'],
  },
  neurology: {
    blurb: 'Migraine, seizures, memory concerns and stroke recovery, with a sleep clinic two evenings a week.',
    consultants: ['Dr. Marcus Vance', 'Dr. Elena Rostova'],
  },
  pediatrics: {
    blurb: 'Newborn checks, vaccinations, growth and development — and the fevers that never keep office hours.',
    consultants: ['Dr. Chloe Bennett', 'Dr. Amy Patel'],
  },
  orthopedics: {
    blurb: 'Joints, spine and sports injuries, from a rolled ankle to a knee-replacement consult.',
    consultants: ['Dr. Robert King', 'Dr. James Wilson'],
  },
  ophthalmology: {
    blurb: 'Eye tests, cataract and glaucoma care, and retina screening for patients living with diabetes.',
    consultants: ['Dr. Sophia Reyes', 'Dr. Arthur Dent'],
  },
  'internal-medicine': {
    blurb: "The place to start when you're not sure where to go. Diabetes, blood pressure, check-ups and referrals.",
    consultants: ['Dr. Asha Verma', 'Dr. Michael Chang'],
  },
}

export const LANDING_DEPARTMENTS = DEPARTMENTS.map((dept) => ({
  ...dept,
  ...DEPARTMENT_DETAILS[dept.id],
}))

export function isOpdDay(date) {
  return date.getDay() !== 0
}

// The next `count` clinic days, starting tomorrow.
export function upcomingOpdDays(count, from = new Date()) {
  const days = []
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1)
  while (days.length < count) {
    if (isOpdDay(cursor)) days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function opdStatus(now = new Date()) {
  const hour = now.getHours()
  if (isOpdDay(now) && hour >= OPD_OPEN_HOUR && hour < OPD_CLOSE_HOUR) {
    return { open: true, label: 'Clinics open now, until 8 pm' }
  }
  if (isOpdDay(now) && hour < OPD_OPEN_HOUR) {
    return { open: false, label: 'Clinics open today at 8 am' }
  }
  const [next] = upcomingOpdDays(1, now)
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const when =
    next.getTime() === tomorrow.getTime()
      ? 'tomorrow'
      : next.toLocaleDateString('en-US', { weekday: 'long' })
  return { open: false, label: `Clinics open ${when} at 8 am` }
}

export function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
