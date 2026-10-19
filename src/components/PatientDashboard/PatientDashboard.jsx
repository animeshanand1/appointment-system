import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CalendarPlus, History, ListChecks, RefreshCw, Stethoscope, UserCog } from 'lucide-react'
import { listMyAppointments } from '../../lib/api'
import { formatClock, formatLongDate } from '../BookAppointment/bookingHelpers'
import { describeLoadError, readableZone } from '../DoctorDashboard/doctorHelpers'
import { AppointmentRow } from '../Appointments/MyAppointments'
import RescheduleControls from '../Appointments/RescheduleControls'
import '../DoctorDashboard/DoctorDashboard.css'
import '../Appointments/Appointments.css'

function relativeStart(startAt, now = Date.now()) {
  const minutes = Math.round((new Date(startAt).getTime() - now) / 60000)
  if (minutes < 60) return minutes <= 0 ? 'starting now' : `in ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `in ${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  return days === 1 ? 'tomorrow' : `in ${days} days`
}

function greeting(now = new Date()) {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * The patient's home after signing in: the next appointment front and centre
 * (with cancel / reschedule), the rest of what's coming up, and recent visits.
 */
export default function PatientDashboard({ currentUser, onBook, onBookDoctor, onViewAll, onViewDoctor, onAccount }) {
  const [state, setState] = useState({ status: 'loading', upcoming: [], past: [], error: null })
  const [notice, setNotice] = useState('')
  const latest = useRef(0)
  const firstName = (currentUser.user?.fullName ?? '').split(' ')[0]

  const load = useCallback(() => {
    const requestId = ++latest.current
    Promise.all([
      listMyAppointments({ scope: 'upcoming', status: 'booked', limit: 6 }),
      listMyAppointments({ scope: 'past', limit: 3 }),
    ]).then(
      ([upcoming, past]) => {
        if (requestId !== latest.current) return
        setState({ status: 'ready', upcoming: upcoming.appointments, past: past.appointments, error: null })
      },
      (err) => {
        if (requestId !== latest.current) return
        setState((prev) => ({ ...prev, status: prev.status === 'ready' ? 'ready' : 'error', error: describeLoadError(err) }))
      }
    )
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleChanged = (_updated, message) => {
    setNotice(message ?? '')
    load()
  }

  const [next, ...later] = state.upcoming
  const pendingRequests = state.upcoming.filter((a) => a.rescheduleRequest?.status === 'pending').length

  return (
    <div className="doctor-dashboard">
      <main className="doctor-dashboard__main">
        <header className="doctor-dashboard__header">
          <div>
            <div className="doctor-dashboard__tag">Patient portal</div>
            <h1 className="doctor-dashboard__title">
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="doctor-dashboard__subtitle-line">
              {state.status === 'ready'
                ? state.upcoming.length === 0
                  ? 'You have no upcoming appointments.'
                  : `You have ${state.upcoming.length === 6 ? '6 or more' : state.upcoming.length} upcoming appointment${state.upcoming.length === 1 ? '' : 's'}.`
                : ' '}
              {pendingRequests > 0 && ` ${pendingRequests} reschedule request${pendingRequests === 1 ? ' is' : 's are'} waiting for the doctor.`}
            </p>
          </div>
          <button type="button" className="doctor-dashboard__icon-btn" aria-label="Refresh" onClick={load}>
            <RefreshCw size={15} />
          </button>
        </header>

        <p className="doctor-dashboard__visually-hidden" role="status" aria-live="polite">
          {notice}
        </p>
        {notice && <p className="doctor-dashboard__notice" aria-hidden="true">{notice}</p>}

        {state.status === 'error' && (
          <div className="doctor-dashboard__panel-message doctor-dashboard__panel-message--error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{state.error}</span>
            <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--ghost" onClick={load}>
              Retry
            </button>
          </div>
        )}

        <div className="patient-home__grid">
          <div className="doctor-dashboard__stack">
            {state.status === 'loading' && (
              <div className="doctor-dashboard__skeleton-block" aria-busy="true">
                <span className="doctor-dashboard__visually-hidden">Loading your appointments…</span>
                <div className="doctor-dashboard__skeleton patient-home__skeleton" />
                <div className="doctor-dashboard__skeleton" />
              </div>
            )}

            {state.status === 'ready' && next && (
              <section className="patient-home__next" aria-labelledby="next-appointment">
                <span id="next-appointment" className="patient-home__next-label">
                  Next appointment
                </span>
                <span className="patient-home__countdown">{relativeStart(next.startAt)}</span>
                <div>
                  <div className="patient-home__next-when">
                    {formatLongDate(next.localDate)}, {formatClock(next.localStartTime)}
                  </div>
                  <div className="patient-home__next-who">
                    {next.doctor?.fullName}
                    {next.doctor?.clinicName ? ` · ${next.doctor.clinicName}` : ''} · {readableZone(next.timezone)}
                  </div>
                </div>
                <RescheduleControls
                  appointment={next}
                  role="patient"
                  doctorId={next.doctor?.id}
                  includeCancel
                  onChanged={handleChanged}
                />
              </section>
            )}

            {state.status === 'ready' && !next && (
              <section className="patient-home__empty">
                <Stethoscope size={28} aria-hidden="true" />
                <h2 className="doctor-dashboard__section-title">Nothing booked yet</h2>
                <p className="doctor-dashboard__note">Pick a department and a doctor, then choose a time that suits you.</p>
                <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--primary" onClick={onBook}>
                  <CalendarPlus size={15} aria-hidden="true" /> Book an appointment
                </button>
              </section>
            )}

            {later.length > 0 && (
              <section className="doctor-dashboard__section" aria-labelledby="later-heading">
                <h2 id="later-heading" className="doctor-dashboard__section-title">
                  Also coming up
                </h2>
                <ul className="doctor-dashboard__list">
                  {later.map((appointment) => (
                    <AppointmentRow
                      key={appointment.id}
                      appointment={appointment}
                      role="patient"
                      onViewDoctor={onViewDoctor}
                      onChanged={handleChanged}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="doctor-dashboard__stack">
            <nav className="patient-home__quick" aria-label="Shortcuts">
              <button type="button" className="patient-home__quick-link" onClick={onBook}>
                <CalendarPlus size={20} aria-hidden="true" />
                <span>
                  Book an appointment <small>Choose a doctor and a free time</small>
                </span>
              </button>
              <button type="button" className="patient-home__quick-link" onClick={onViewAll}>
                <ListChecks size={20} aria-hidden="true" />
                <span>
                  All my appointments <small>Upcoming, past and cancelled</small>
                </span>
              </button>
              <button type="button" className="patient-home__quick-link" onClick={onAccount}>
                <UserCog size={20} aria-hidden="true" />
                <span>
                  Account settings <small>Profile, phone and password</small>
                </span>
              </button>
            </nav>

            {state.past.length > 0 && (
              <section className="doctor-dashboard__card" aria-labelledby="recent-heading">
                <h2 id="recent-heading" className="doctor-dashboard__section-title">
                  <History size={16} aria-hidden="true" /> Recent visits
                </h2>
                <ul className="doctor-dashboard__mini-list">
                  {state.past.map((appointment) => (
                    <li key={appointment.id}>
                      <div>
                        <strong>{appointment.doctor?.fullName}</strong>
                        <div className="doctor-dashboard__hint">
                          {formatLongDate(appointment.localDate)} · {appointment.status.replace('_', '-')}
                        </div>
                      </div>
                      {appointment.doctor?.id && (
                        <button
                          type="button"
                          className="doctor-dashboard__btn doctor-dashboard__btn--ghost"
                          onClick={() => onBookDoctor(appointment.doctor)}
                        >
                          Book again
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
