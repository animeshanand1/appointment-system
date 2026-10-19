import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Clock, Info, Phone, RefreshCw } from 'lucide-react'
import { listMyAppointments } from '../../lib/api'
import { formatClock, formatLongDate } from '../BookAppointment/bookingHelpers'
import { telHref } from '../../lib/sanitize'
import RescheduleControls from './RescheduleControls'
import './Appointments.css'
import { STATUS_LABELS, describeLoadError, pluralize, readableZone } from '../DoctorDashboard/doctorHelpers'
// Shares the workspace look with the doctor dashboard.
import '../DoctorDashboard/DoctorDashboard.css'

const PAGE_SIZE = 20

const SCOPES = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'all', label: 'All' },
]

const STATUS_FILTERS = [{ id: '', label: 'Any status' }, ...Object.entries(STATUS_LABELS).map(([id, label]) => ({ id, label }))]

// Consecutive appointments on the same day share one date heading.
function groupByDate(appointments) {
  const groups = []
  for (const appointment of appointments) {
    const last = groups[groups.length - 1]
    if (last && last.date === appointment.localDate) last.items.push(appointment)
    else groups.push({ date: appointment.localDate, items: [appointment] })
  }
  return groups
}

export function AppointmentRow({ appointment, role, selfId, onViewDoctor, onChanged }) {
  const { patient, doctor } = appointment
  const isDoctor = role === 'doctor'
  const doctorDetail = doctor ? [doctor.specialization, doctor.clinicName].filter(Boolean).join(' · ') : ''

  return (
    <li className={`doctor-dashboard__appt doctor-dashboard__appt--${appointment.status}`}>
      <div className="doctor-dashboard__appt-time">
        <Clock size={14} aria-hidden="true" />
        <strong>
          {formatClock(appointment.localStartTime)} – {formatClock(appointment.localEndTime)}
        </strong>
        {!isDoctor && appointment.timezone && (
          <span className="doctor-dashboard__hint">{readableZone(appointment.timezone)}</span>
        )}
        <span className={`doctor-dashboard__badge doctor-dashboard__badge--${appointment.status}`}>
          {STATUS_LABELS[appointment.status]}
        </span>
      </div>

      <div className="doctor-dashboard__appt-body">
        <div className="doctor-dashboard__appt-patient">
          {isDoctor ? (
            <>
              <span className="doctor-dashboard__appt-name">{patient?.fullName ?? 'Unknown patient'}</span>
              {telHref(patient?.phone) && (
                <a className="doctor-dashboard__appt-phone" href={telHref(patient.phone)}>
                  <Phone size={13} aria-hidden="true" /> {patient.phone}
                </a>
              )}
            </>
          ) : (
            <>
              <span className="doctor-dashboard__appt-name">{doctor?.fullName ?? 'Unknown doctor'}</span>
              {doctorDetail && <span className="doctor-dashboard__appt-date">{doctorDetail}</span>}
            </>
          )}
        </div>

        {/* Rendered as text, never as HTML. */}
        {appointment.patientNotes && <p className="doctor-dashboard__note">{appointment.patientNotes}</p>}

        {appointment.cancellation && (
          <p className="doctor-dashboard__cancel-note">
            Cancelled by {appointment.cancellation.byRole}
            {appointment.cancellation.reason ? `: ${appointment.cancellation.reason}` : ''}
          </p>
        )}
      </div>

      {onChanged && appointment.status === 'booked' && (
        <RescheduleControls
          appointment={appointment}
          role={role}
          doctorId={isDoctor ? selfId : doctor?.id}
          includeCancel
          onChanged={onChanged}
        />
      )}

      {!isDoctor && doctor?.id && onViewDoctor && (
        <div className="doctor-dashboard__appt-actions">
          <button
            type="button"
            className="doctor-dashboard__btn doctor-dashboard__btn--ghost"
            onClick={() => onViewDoctor(doctor.id)}
          >
            View doctor
          </button>
        </div>
      )}
    </li>
  )
}

/**
 * The signed-in user's appointments: patients see the doctors they booked,
 * doctors see their patients. Both can cancel and reschedule from here;
 * completed / no-show outcomes stay on the doctor dashboard's Agenda tab.
 * @param role "doctor" | "patient"
 * @param timezone doctor's clinic time zone, shown so the times are unambiguous
 *   (patients see each appointment's own zone instead)
 * @param onBack () => void
 * @param onBook () => void: patient's shortcut when there is nothing to show
 * @param onViewDoctor (doctorId) => void
 * @param selfId the signed-in doctor's id (their own calendar for moves)
 */
export default function MyAppointments({ role, timezone, selfId, onBack, onBook, onViewDoctor }) {
  const [scope, setScope] = useState('upcoming')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ key: null, status: 'loading', appointments: [], meta: null, error: null })
  const [notice, setNotice] = useState('')
  const latest = useRef(0)

  // A result only counts for the request that produced it, so changing a
  // filter never shows the previous list while the new one loads.
  const key = `${scope}:${status}:${page}`
  const isLoading = result.key !== key

  const load = useCallback(() => {
    const requestId = ++latest.current
    const requestKey = `${scope}:${status}:${page}`
    listMyAppointments({ scope, status: status || undefined, page, limit: PAGE_SIZE }).then(
      ({ appointments, meta }) => {
        if (requestId !== latest.current) return
        setResult({ key: requestKey, status: 'ready', appointments, meta, error: null })
      },
      (err) => {
        if (requestId !== latest.current) return
        setResult({ key: requestKey, status: 'error', appointments: [], meta: null, error: describeLoadError(err) })
      }
    )
  }, [scope, status, page])

  useEffect(() => {
    load()
  }, [load])

  const changeScope = (next) => {
    setScope(next)
    setPage(1)
  }

  const changeStatus = (next) => {
    setStatus(next)
    setPage(1)
  }

  // Show the server's copy straight away, then refetch so filters stay right.
  const handleChanged = (updated, message) => {
    if (updated) {
      setResult((prev) => ({ ...prev, appointments: prev.appointments.map((a) => (a.id === updated.id ? updated : a)) }))
    }
    setNotice(message ?? '')
    load()
  }

  const total = result.meta?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const renderList = () => {
    if (isLoading) {
      return (
        <div aria-busy="true">
          <span className="doctor-dashboard__visually-hidden">Loading appointments…</span>
          <ul className="doctor-dashboard__list" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="doctor-dashboard__skeleton" />
            ))}
          </ul>
        </div>
      )
    }
    if (result.status === 'error') {
      return (
        <div className="doctor-dashboard__panel-message doctor-dashboard__panel-message--error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{result.error}</span>
          <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--ghost" onClick={load}>
            Retry
          </button>
        </div>
      )
    }
    if (result.appointments.length === 0) {
      return (
        <p className="doctor-dashboard__panel-message">
          <Info size={16} aria-hidden="true" /> No appointments match these filters.
          {role === 'patient' && onBook && (
            <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--primary" onClick={onBook}>
              Book an appointment
            </button>
          )}
        </p>
      )
    }
    return groupByDate(result.appointments).map((group) => (
      <div key={group.date} className="doctor-dashboard__stack">
        <h3 className="doctor-dashboard__section-title">{formatLongDate(group.date)}</h3>
        <ul className="doctor-dashboard__list">
          {group.items.map((appointment) => (
            <AppointmentRow
              key={appointment.id}
              appointment={appointment}
              role={role}
              selfId={selfId}
              onViewDoctor={onViewDoctor}
              onChanged={handleChanged}
            />
          ))}
        </ul>
      </div>
    ))
  }

  return (
    <div className="doctor-dashboard">
      <main className="doctor-dashboard__main">
        <header className="doctor-dashboard__header">
          <div>
            <div className="doctor-dashboard__tag">{role === 'doctor' ? 'Doctor workspace' : 'Patient portal'}</div>
            <h1 className="doctor-dashboard__title">My appointments</h1>
            <p className="doctor-dashboard__subtitle-line">
              {timezone
                ? `Times are in clinic time (${readableZone(timezone)}).`
                : 'Times are in each doctor’s clinic time.'}
            </p>
          </div>
          {onBack && (
            <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--secondary" onClick={onBack}>
              <ArrowLeft size={14} aria-hidden="true" /> {role === 'doctor' ? 'Back to workspace' : 'Back'}
            </button>
          )}
        </header>

        <div className="doctor-dashboard__tabs" role="group" aria-label="Show appointments">
          {SCOPES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={scope === id}
              className={`doctor-dashboard__tab ${scope === id ? 'doctor-dashboard__tab--active' : ''}`}
              onClick={() => changeScope(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <section aria-label="Appointments" className="doctor-dashboard__section">
          <div className="doctor-dashboard__toolbar">
            <span className="doctor-dashboard__hint" role="status">
              {!isLoading && result.status === 'ready' ? pluralize(total, 'appointment') : ' '}
            </span>
            <div className="doctor-dashboard__date-nav">
              <label className="doctor-dashboard__visually-hidden" htmlFor="appointments-status">
                Filter by status
              </label>
              <select
                id="appointments-status"
                className="doctor-dashboard__input doctor-dashboard__input--compact"
                value={status}
                onChange={(e) => changeStatus(e.target.value)}
              >
                {STATUS_FILTERS.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
              <button type="button" className="doctor-dashboard__icon-btn" aria-label="Refresh appointments" onClick={load}>
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          <p className="doctor-dashboard__visually-hidden" role="status" aria-live="polite">
            {notice}
          </p>
          {notice && <p className="doctor-dashboard__notice" aria-hidden="true">{notice}</p>}

          {renderList()}

          {!isLoading && result.status === 'ready' && pageCount > 1 && (
            <nav className="doctor-dashboard__date-nav" aria-label="Pagination">
              <button
                type="button"
                className="doctor-dashboard__icon-btn"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="doctor-dashboard__hint">
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                className="doctor-dashboard__icon-btn"
                aria-label="Next page"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </section>
      </main>
    </div>
  )
}
