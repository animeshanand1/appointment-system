import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  Briefcase,
  CalendarPlus,
  Clock,
  Info,
  MapPin,
  RefreshCw,
  Stethoscope,
} from 'lucide-react'
import { ApiError, getDoctor } from '../../lib/api'
import { departmentName, describeLoadError, formatClock, formatLongDate } from '../BookAppointment/bookingHelpers'
import './DoctorProfile.css'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const readableZone = (tz) => tz?.replace(/_/g, ' ')

// "Dr. Arjun Rao" -> "AR": skips the title so every doctor doesn't get "D".
const initialsOf = (fullName = '') =>
  fullName
    .replace(/^dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

const describeProfileError = (err) =>
  err instanceof ApiError && err.code === 'DOCTOR_NOT_FOUND'
    ? { notFound: true, message: 'This doctor profile is not available. They may no longer be listed.' }
    : { notFound: false, message: describeLoadError(err) }

/**
 * Public, patient-facing profile of one doctor (GET /api/doctors/:id).
 * @param doctorId id to load
 * @param onBack () => void
 * @param onBook (doctor) => void: opens the booking form with this doctor chosen
 */
export default function DoctorProfile({ doctorId, onBack, onBook }) {
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState({ key: null, doctor: null, error: null })

  const isLoading = state.key !== `${doctorId}:${reloadKey}`

  useEffect(() => {
    let cancelled = false
    const key = `${doctorId}:${reloadKey}`
    getDoctor(doctorId).then(
      (doctor) => {
        if (!cancelled) setState({ key, doctor, error: null })
      },
      (err) => {
        if (!cancelled) setState({ key, doctor: null, error: describeProfileError(err) })
      }
    )
    return () => {
      cancelled = true
    }
  }, [doctorId, reloadKey])

  const backBar = (
    <div className="doctor-profile__back-bar">
      <div className="doctor-profile__back-bar-container">
        <button type="button" className="doctor-profile__back-btn" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back</span>
        </button>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="doctor-profile">
        {backBar}
        <main className="doctor-profile__main" aria-busy="true">
          <span className="doctor-profile__visually-hidden">Loading doctor profile…</span>
          <div className="doctor-profile__skeleton doctor-profile__skeleton--hero" aria-hidden="true" />
          <div className="doctor-profile__skeleton" aria-hidden="true" />
        </main>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="doctor-profile">
        {backBar}
        <main className="doctor-profile__main">
          <div className="doctor-profile__message doctor-profile__message--error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{state.error.message}</span>
            {state.error.notFound ? (
              <button type="button" className="doctor-profile__btn doctor-profile__btn--ghost" onClick={onBack}>
                Go back
              </button>
            ) : (
              <button
                type="button"
                className="doctor-profile__btn doctor-profile__btn--ghost"
                onClick={() => setReloadKey((k) => k + 1)}
              >
                <RefreshCw size={14} aria-hidden="true" /> Retry
              </button>
            )}
          </div>
        </main>
      </div>
    )
  }

  const doctor = state.doctor
  const qualifications = doctor.qualifications ?? []
  const hasSchedule = doctor.weeklyHours.length > 0
  const canBook = doctor.isAcceptingAppointments && hasSchedule
  const workingDays = doctor.weeklyHours.filter((day) => day.windows.length > 0).length

  return (
    <div className="doctor-profile">
      {backBar}

      <main className="doctor-profile__main">
        <header className="doctor-profile__hero">
          <div className="doctor-profile__avatar" aria-hidden="true">
            {initialsOf(doctor.fullName)}
          </div>
          <div className="doctor-profile__identity">
            <div className="doctor-profile__tag">
              <Stethoscope size={14} aria-hidden="true" /> {departmentName(doctor.specialization)}
            </div>
            <h1 className="doctor-profile__name">{doctor.fullName}</h1>
            {qualifications.length > 0 && <p className="doctor-profile__quals">{qualifications.join(' · ')}</p>}
            <span
              className={`doctor-profile__pill ${canBook ? 'doctor-profile__pill--on' : 'doctor-profile__pill--off'}`}
            >
              {canBook ? 'Accepting appointments' : 'Not accepting appointments'}
            </span>
          </div>
          <div className="doctor-profile__cta">
            <button
              type="button"
              className="doctor-profile__btn doctor-profile__btn--primary"
              onClick={() => onBook(doctor)}
              disabled={!canBook}
            >
              <CalendarPlus size={16} aria-hidden="true" />
              <span>Book appointment</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            {!canBook && (
              <p className="doctor-profile__cta-note">
                <Info size={13} aria-hidden="true" /> Bookings are paused for this doctor right now.
              </p>
            )}
          </div>
        </header>

        <dl className="doctor-profile__facts">
          <div className="doctor-profile__fact">
            <dt>
              <Briefcase size={14} aria-hidden="true" /> Experience
            </dt>
            <dd>{doctor.experienceYears != null ? `${doctor.experienceYears} years` : '—'}</dd>
          </div>
          <div className="doctor-profile__fact">
            <dt>
              <Clock size={14} aria-hidden="true" /> Consultation
            </dt>
            <dd>{doctor.slotDurationMinutes ? `${doctor.slotDurationMinutes} min` : '—'}</dd>
          </div>
          <div className="doctor-profile__fact">
            <dt>
              <Award size={14} aria-hidden="true" /> OPD days
            </dt>
            <dd>{hasSchedule ? `${workingDays} per week` : '—'}</dd>
          </div>
        </dl>

        <div className="doctor-profile__layout">
          <div className="doctor-profile__column">
            <section className="doctor-profile__card" aria-labelledby="doctor-profile-about">
              <h2 id="doctor-profile-about" className="doctor-profile__section-title">
                About
              </h2>
              {doctor.bio ? (
                <p className="doctor-profile__bio">{doctor.bio}</p>
              ) : (
                <p className="doctor-profile__empty">This doctor hasn’t added a profile summary yet.</p>
              )}
            </section>

            {qualifications.length > 0 && (
              <section className="doctor-profile__card" aria-labelledby="doctor-profile-quals">
                <h2 id="doctor-profile-quals" className="doctor-profile__section-title">
                  Qualifications
                </h2>
                <ul className="doctor-profile__chips">
                  {qualifications.map((qualification) => (
                    <li key={qualification} className="doctor-profile__chip">
                      {qualification}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(doctor.clinicName || doctor.clinicAddress) && (
              <section className="doctor-profile__card" aria-labelledby="doctor-profile-clinic">
                <h2 id="doctor-profile-clinic" className="doctor-profile__section-title">
                  Clinic
                </h2>
                <p className="doctor-profile__clinic">
                  <MapPin size={16} aria-hidden="true" />
                  <span>
                    {doctor.clinicName && <strong>{doctor.clinicName}</strong>}
                    {doctor.clinicAddress && <span className="doctor-profile__address">{doctor.clinicAddress}</span>}
                  </span>
                </p>
              </section>
            )}
          </div>

          <aside className="doctor-profile__card doctor-profile__hours" aria-labelledby="doctor-profile-hours">
            <h2 id="doctor-profile-hours" className="doctor-profile__section-title">
              Weekly OPD hours
            </h2>
            {hasSchedule ? (
              <>
                <ul className="doctor-profile__hours-list">
                  {doctor.weeklyHours.map((day) => (
                    <li key={day.isoWeekday} className="doctor-profile__hours-row">
                      <span className="doctor-profile__hours-day">{WEEKDAYS[day.isoWeekday - 1]}</span>
                      {day.windows.length > 0 ? (
                        <span className="doctor-profile__hours-times">
                          {day.windows.map((w) => (
                            <span key={w.start}>
                              {formatClock(w.start)} – {formatClock(w.end)}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="doctor-profile__hours-off">Closed</span>
                      )}
                    </li>
                  ))}
                </ul>
                {doctor.timezone && (
                  <p className="doctor-profile__note">Clinic time ({readableZone(doctor.timezone)}).</p>
                )}
                {doctor.bookingWindow && (
                  <p className="doctor-profile__note">
                    Bookable up to {formatLongDate(doctor.bookingWindow.lastBookableDate)}.
                  </p>
                )}
              </>
            ) : (
              <p className="doctor-profile__empty">This doctor hasn’t published their OPD hours yet.</p>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
