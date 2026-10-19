import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Info,
  Phone,
  RefreshCw,
} from 'lucide-react'
import { listMyAppointments, updateAppointmentStatus } from '../../lib/api'
import { formatClock, formatLongDate } from '../BookAppointment/bookingHelpers'
import { telHref } from '../../lib/sanitize'
import RescheduleControls from '../Appointments/RescheduleControls'
import '../Appointments/Appointments.css'
import {
  ACTION_LABELS,
  ACTION_STATUS,
  CANCEL_REASON_MAX,
  CANCEL_REASON_MIN,
  STATUS_LABELS,
  describeLoadError,
  describeStatusError,
  pluralize,
  readableZone,
  shiftDate,
  todayInZone,
} from './doctorHelpers'

const POLL_MS = 60 * 1000
const COUNT_KEYS = ['booked', 'completed', 'cancelled', 'no_show']
const ACTION_ORDER = ['complete', 'no_show', 'cancel']

function AppointmentItem({ appointment, isNext, showDate, pending, error, onAct, doctorId, onChanged }) {
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const trimmed = reason.trim()
  const reasonId = `cancel-reason-${appointment.id}`
  const actions = ACTION_ORDER.filter((action) => appointment.allowedActions.includes(action))
  const { patient } = appointment

  const confirmCancel = async () => {
    const ok = await onAct(appointment, 'cancelled', trimmed)
    if (ok) setCancelling(false)
  }

  return (
    <li className={`doctor-dashboard__appt doctor-dashboard__appt--${appointment.status}`}>
      <div className="doctor-dashboard__appt-time">
        <Clock size={14} aria-hidden="true" />
        <strong>
          {formatClock(appointment.localStartTime)} – {formatClock(appointment.localEndTime)}
        </strong>
        <span className={`doctor-dashboard__badge doctor-dashboard__badge--${appointment.status}`}>
          {STATUS_LABELS[appointment.status]}
        </span>
        {isNext && <span className="doctor-dashboard__badge doctor-dashboard__badge--next">Next up</span>}
      </div>

      <div className="doctor-dashboard__appt-body">
        <div className="doctor-dashboard__appt-patient">
          <span className="doctor-dashboard__appt-name">{patient?.fullName ?? 'Unknown patient'}</span>
          {telHref(patient?.phone) && (
            <a className="doctor-dashboard__appt-phone" href={telHref(patient.phone)}>
              <Phone size={13} aria-hidden="true" /> {patient.phone}
            </a>
          )}
          {showDate && (
            <span className="doctor-dashboard__appt-date">{formatLongDate(appointment.localDate)}</span>
          )}
        </div>

        {appointment.patientNotes && (
          <details className="doctor-dashboard__notes">
            <summary>
              <ChevronDown size={14} aria-hidden="true" /> Reason for visit
            </summary>
            {/* Rendered as text, never as HTML. */}
            <p>{appointment.patientNotes}</p>
          </details>
        )}

        {appointment.cancellation && (
          <p className="doctor-dashboard__cancel-note">
            Cancelled by {appointment.cancellation.byRole}
            {appointment.cancellation.reason ? `: ${appointment.cancellation.reason}` : ''}
          </p>
        )}
      </div>

      {actions.length > 0 && !cancelling && (
        <div className="doctor-dashboard__appt-actions">
          {actions.map((action) =>
            action === 'cancel' ? (
              <button
                key={action}
                type="button"
                className="doctor-dashboard__btn doctor-dashboard__btn--danger-outline"
                disabled={pending}
                onClick={() => setCancelling(true)}
              >
                {ACTION_LABELS[action]}
              </button>
            ) : (
              <button
                key={action}
                type="button"
                className={`doctor-dashboard__btn ${action === 'complete' ? 'doctor-dashboard__btn--primary' : 'doctor-dashboard__btn--secondary'}`}
                disabled={pending}
                onClick={() => onAct(appointment, ACTION_STATUS[action])}
              >
                {action === 'complete' && <CheckCircle2 size={15} aria-hidden="true" />}
                {ACTION_LABELS[action]}
              </button>
            )
          )}
        </div>
      )}

      {cancelling && (
        <div className="doctor-dashboard__cancel-panel" role="group" aria-label="Cancel appointment">
          <label htmlFor={reasonId} className="doctor-dashboard__label">
            Reason for cancelling <span className="doctor-dashboard__hint">(the patient will see this)</span>
          </label>
          <textarea
            id={reasonId}
            rows={3}
            maxLength={CANCEL_REASON_MAX}
            className="doctor-dashboard__textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <div className="doctor-dashboard__cancel-footer">
            <span className={`doctor-dashboard__hint ${trimmed.length < CANCEL_REASON_MIN ? '' : 'doctor-dashboard__hint--ok'}`}>
              {trimmed.length < CANCEL_REASON_MIN
                ? `At least ${CANCEL_REASON_MIN} characters`
                : `${trimmed.length}/${CANCEL_REASON_MAX}`}
            </span>
            <div className="doctor-dashboard__inline-actions">
              <button
                type="button"
                className="doctor-dashboard__btn doctor-dashboard__btn--ghost"
                disabled={pending}
                onClick={() => {
                  setCancelling(false)
                  setReason('')
                }}
              >
                Keep appointment
              </button>
              <button
                type="button"
                className="doctor-dashboard__btn doctor-dashboard__btn--danger"
                disabled={pending || trimmed.length < CANCEL_REASON_MIN}
                onClick={confirmCancel}
              >
                {pending ? 'Cancelling…' : 'Cancel appointment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {appointment.status === 'booked' && !cancelling && (
        <RescheduleControls appointment={appointment} role="doctor" doctorId={doctorId} onChanged={onChanged} />
      )}

      {error && (
        <p className="doctor-dashboard__inline-error" role="alert">
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </p>
      )}
    </li>
  )
}

export default function AgendaTab({ date, onDateChange, timezone, doctorId }) {
  const [view, setView] = useState('day') // 'day' | 'outcome'
  const [result, setResult] = useState({ key: null, status: 'loading', appointments: [], meta: null, outcomeCount: 0, fetchedAt: 0 })
  const [pendingId, setPendingId] = useState(null)
  const [itemError, setItemError] = useState(null)
  const [notice, setNotice] = useState('')
  const latest = useRef(0)

  const today = todayInZone(timezone)
  // A result only counts for the request that produced it, so switching day
  // never shows the previous day's list while the new one loads.
  const key = `${view}:${date}`
  const isLoading = result.key !== key

  const load = useCallback(() => {
    const requestId = ++latest.current
    const list =
      view === 'day'
        ? listMyAppointments({ date, scope: 'all', limit: 50 })
        : listMyAppointments({ scope: 'past', status: 'booked', limit: 50 })
    // Cheap count for the banner; the list itself may be showing another day.
    const outcome = listMyAppointments({ scope: 'past', status: 'booked', limit: 1 })

    Promise.all([list, outcome]).then(
      ([{ appointments, meta }, { meta: outcomeMeta }]) => {
        if (requestId !== latest.current) return
        setResult({
          key: `${view}:${date}`,
          status: 'ready',
          appointments,
          meta,
          outcomeCount: outcomeMeta.total,
          fetchedAt: Date.now(),
          error: null,
        })
      },
      (err) => {
        if (requestId !== latest.current) return
        // A failed background refresh keeps what is already on screen.
        const failedKey = `${view}:${date}`
        setResult((prev) =>
          prev.key === failedKey && prev.status === 'ready'
            ? prev
            : { ...prev, key: failedKey, status: 'error', error: describeLoadError(err) }
        )
      }
    )
  }, [view, date])

  useEffect(() => {
    load()
    const timer = setInterval(() => {
      if (!document.hidden) load()
    }, POLL_MS)
    // No need to invalidate in-flight requests here: the next load() (new day
    // or view) supersedes them through the request counter.
    return () => clearInterval(timer)
  }, [load])

  const act = async (appointment, status, reason) => {
    setPendingId(appointment.id)
    setItemError(null)
    setNotice('')
    try {
      const { appointment: updated } = await updateAppointmentStatus(appointment.id, { status, reason })
      setResult((prev) => ({
        ...prev,
        appointments: prev.appointments.map((a) => (a.id === updated.id ? updated : a)),
      }))
      setNotice(`Marked ${updated.patient?.fullName ?? 'the appointment'} as ${STATUS_LABELS[updated.status].toLowerCase()}.`)
      load()
      return true
    } catch (err) {
      setItemError({ id: appointment.id, message: describeStatusError(err) })
      // The server's word is final: a lost race means our copy is stale.
      if (err.status === 409 || err.status === 404) load()
      return false
    } finally {
      setPendingId(null)
    }
  }

  const handleChanged = (updated, message) => {
    if (updated) {
      setResult((prev) => ({ ...prev, appointments: prev.appointments.map((a) => (a.id === updated.id ? updated : a)) }))
    }
    setNotice(message ?? '')
    load()
  }

  const goToDate = (next) => {
    setView('day')
    setNotice('')
    setItemError(null)
    onDateChange(next)
  }

  const counts = result.meta?.counts
  const nextUpId =
    view === 'day' && date === today
      ? result.appointments.find((a) => a.status === 'booked' && new Date(a.endAt).getTime() >= result.fetchedAt)?.id
      : null

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
          <Info size={16} aria-hidden="true" />
          {view === 'day' ? 'No appointments on this day.' : 'Nothing is waiting for an outcome. You’re all caught up.'}
        </p>
      )
    }
    return (
      <ul className="doctor-dashboard__list">
        {result.appointments.map((appointment) => (
          <AppointmentItem
            key={appointment.id}
            appointment={appointment}
            isNext={appointment.id === nextUpId}
            showDate={view === 'outcome'}
            pending={pendingId === appointment.id}
            error={itemError?.id === appointment.id ? itemError.message : null}
            onAct={act}
            doctorId={doctorId}
            onChanged={handleChanged}
          />
        ))}
      </ul>
    )
  }

  return (
    <section aria-labelledby="agenda-heading" className="doctor-dashboard__section">
      <div className="doctor-dashboard__toolbar">
        <h2 id="agenda-heading" className="doctor-dashboard__section-title">
          {view === 'day' ? (
            <>
              <CalendarDays size={18} aria-hidden="true" /> {formatLongDate(date)}
              {date === today && <span className="doctor-dashboard__badge doctor-dashboard__badge--next">Today</span>}
            </>
          ) : (
            'Needs an outcome'
          )}
        </h2>

        <div className="doctor-dashboard__date-nav">
          <button
            type="button"
            className="doctor-dashboard__icon-btn"
            aria-label="Previous day"
            onClick={() => goToDate(shiftDate(date, -1))}
          >
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--ghost" onClick={() => goToDate(today)}>
            Today
          </button>
          <button
            type="button"
            className="doctor-dashboard__icon-btn"
            aria-label="Next day"
            onClick={() => goToDate(shiftDate(date, 1))}
          >
            <ChevronRight size={16} />
          </button>
          <label className="doctor-dashboard__visually-hidden" htmlFor="agenda-date">
            Choose a date
          </label>
          <input
            id="agenda-date"
            type="date"
            className="doctor-dashboard__input doctor-dashboard__input--date"
            value={date}
            onChange={(e) => e.target.value && goToDate(e.target.value)}
          />
          <button
            type="button"
            className="doctor-dashboard__icon-btn"
            aria-label="Refresh appointments"
            onClick={load}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <p className="doctor-dashboard__note">Times are in clinic time ({readableZone(timezone)}).</p>

      {view === 'day' && counts && (
        <dl className="doctor-dashboard__tiles" aria-label="Appointments this day">
          {COUNT_KEYS.map((statusKey) => (
            <div key={statusKey} className={`doctor-dashboard__tile doctor-dashboard__tile--${statusKey}`}>
              <dd>{counts[statusKey]}</dd>
              <dt>{STATUS_LABELS[statusKey]}</dt>
            </div>
          ))}
        </dl>
      )}

      {result.outcomeCount > 0 && view === 'day' && (
        <div className="doctor-dashboard__banner" role="status">
          <AlertCircle size={16} aria-hidden="true" />
          <span>
            {pluralize(result.outcomeCount, 'past appointment')} still {result.outcomeCount === 1 ? 'needs' : 'need'} an
            outcome (completed or no-show).
          </span>
          <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--secondary" onClick={() => setView('outcome')}>
            Review
          </button>
        </div>
      )}

      {view === 'outcome' && (
        <div className="doctor-dashboard__banner doctor-dashboard__banner--info">
          <Info size={16} aria-hidden="true" />
          <span>Past appointments that are still marked as booked, most recent first.</span>
          <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--secondary" onClick={() => setView('day')}>
            Back to the day view
          </button>
        </div>
      )}

      <p className="doctor-dashboard__visually-hidden" role="status" aria-live="polite">
        {notice}
      </p>
      {notice && (
        <p className="doctor-dashboard__notice" aria-hidden="true">
          <CheckCircle2 size={14} /> {notice}
        </p>
      )}

      {renderList()}
    </section>
  )
}
