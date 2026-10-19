import { useEffect, useState } from 'react'
import { AlertCircle, ArrowRightLeft, Check, Info, X } from 'lucide-react'
import {
  cancelAppointment,
  decideRescheduleRequest,
  getDoctorSlots,
  requestReschedule,
  rescheduleAppointment,
  withdrawRescheduleRequest,
} from '../../lib/api'
import { dayReasonMessage, formatClock, groupSlots } from '../BookAppointment/bookingHelpers'
import { todayInZone } from '../DoctorDashboard/doctorHelpers'
import { REASON_MAX, REASON_MIN, can, describeActionError, describeSlot } from './appointmentActions'

/**
 * Pick a new date and a free slot on the same doctor's calendar.
 * @param mode "request" (patient asks) | "move" (doctor moves directly)
 */
function SlotPicker({ appointment, doctorId, mode, onDone, onClose }) {
  const today = todayInZone(appointment.timezone)
  const [date, setDate] = useState(appointment.localDate < today ? today : appointment.localDate)
  const [day, setDay] = useState({ date: null, status: 'loading', data: null })
  const [startAt, setStartAt] = useState('')
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const reasonRequired = mode === 'move'
  const trimmed = reason.trim()

  useEffect(() => {
    let cancelled = false
    getDoctorSlots(doctorId, date).then(
      (data) => !cancelled && setDay({ date, status: 'ready', data }),
      (err) => !cancelled && setDay({ date, status: 'error', data: null, error: describeActionError(err) })
    )
    return () => {
      cancelled = true
    }
  }, [doctorId, date])

  const loading = day.date !== date
  const free = (day.data?.slots ?? []).filter((s) => s.status === 'available' && s.startAt !== appointment.startAt)
  const canSubmit = startAt && !pending && (!reasonRequired || trimmed.length >= REASON_MIN)

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setPending(true)
    setError('')
    try {
      const updated =
        mode === 'move'
          ? await rescheduleAppointment(appointment.id, { startAt, reason: trimmed })
          : await requestReschedule(appointment.id, { startAt, reason: trimmed || undefined })
      onDone(updated, mode === 'move' ? 'Appointment moved. The patient will get an email.' : 'Request sent. The doctor will review it.')
    } catch (err) {
      setError(describeActionError(err))
      if (err.code === 'SLOT_UNAVAILABLE' || err.code === 'SLOT_NOT_BOOKABLE') {
        setStartAt('')
        setDay((prev) => ({ ...prev, date: null }))
        getDoctorSlots(doctorId, date).then((data) => setDay({ date, status: 'ready', data }), () => {})
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="doctor-dashboard__cancel-panel appt-actions__panel" onSubmit={submit} aria-label="Choose a new time">
      <div className="appt-actions__panel-head">
        <strong>{mode === 'move' ? 'Move this appointment' : 'Ask to move this appointment'}</strong>
        <button type="button" className="doctor-dashboard__icon-btn" aria-label="Close" onClick={onClose}>
          <X size={15} />
        </button>
      </div>

      <label className="doctor-dashboard__label" htmlFor={`resched-date-${appointment.id}`}>
        New date
      </label>
      <input
        id={`resched-date-${appointment.id}`}
        type="date"
        className="doctor-dashboard__input doctor-dashboard__input--date"
        min={today}
        value={date}
        onChange={(e) => {
          if (!e.target.value) return
          setDate(e.target.value)
          setStartAt('')
        }}
      />

      <div className="appt-actions__slots" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <p className="doctor-dashboard__hint">Loading free times…</p>
        ) : day.status === 'error' ? (
          <p className="doctor-dashboard__inline-error">
            <AlertCircle size={14} aria-hidden="true" /> {day.error}
          </p>
        ) : free.length === 0 ? (
          <p className="doctor-dashboard__hint">
            <Info size={13} aria-hidden="true" />{' '}
            {day.data?.reason ? dayReasonMessage(day.data.reason) : 'No free times on this date. Try another day.'}
          </p>
        ) : (
          groupSlots(free).map((group) => (
            <fieldset key={group.label} className="appt-actions__slot-group">
              <legend className="doctor-dashboard__hint">{group.label}</legend>
              {group.slots.map((slot) => (
                <button
                  key={slot.startAt}
                  type="button"
                  aria-pressed={startAt === slot.startAt}
                  className={`appt-actions__slot ${startAt === slot.startAt ? 'appt-actions__slot--on' : ''}`}
                  onClick={() => setStartAt(slot.startAt)}
                >
                  {formatClock(slot.slotStartTime)}
                </button>
              ))}
            </fieldset>
          ))
        )}
      </div>

      <label className="doctor-dashboard__label" htmlFor={`resched-reason-${appointment.id}`}>
        {reasonRequired ? 'Reason (the patient will see this)' : 'Reason (optional)'}
      </label>
      <textarea
        id={`resched-reason-${appointment.id}`}
        rows={2}
        maxLength={REASON_MAX}
        className="doctor-dashboard__textarea"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {reasonRequired && trimmed.length < REASON_MIN && (
        <span className="doctor-dashboard__hint">At least {REASON_MIN} characters</span>
      )}

      {error && (
        <p className="doctor-dashboard__inline-error" role="alert">
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </p>
      )}

      <div className="doctor-dashboard__inline-actions">
        <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--ghost" onClick={onClose}>
          Keep current time
        </button>
        <button type="submit" className="doctor-dashboard__btn doctor-dashboard__btn--primary" disabled={!canSubmit}>
          {pending ? 'Saving…' : mode === 'move' ? 'Move appointment' : 'Send request'}
        </button>
      </div>
    </form>
  )
}

// The doctor's approve / decline panel for a pending patient request.
function DecisionPanel({ appointment, onDone, onClose }) {
  const request = appointment.rescheduleRequest
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')

  const decide = async (decision) => {
    setPending(decision)
    setError('')
    try {
      const updated = await decideRescheduleRequest(appointment.id, {
        requestId: request.id,
        decision,
        note: note.trim() || undefined,
      })
      onDone(updated, decision === 'approve' ? 'Request approved. The appointment has moved.' : 'Request declined.')
    } catch (err) {
      setError(describeActionError(err))
      if (err.status === 409) onDone(null)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="doctor-dashboard__cancel-panel appt-actions__panel" role="group" aria-label="Reschedule request">
      <div className="appt-actions__panel-head">
        <strong>Patient asked for {describeSlot(request)}</strong>
        <button type="button" className="doctor-dashboard__icon-btn" aria-label="Close" onClick={onClose}>
          <X size={15} />
        </button>
      </div>
      {request.reason && <p className="doctor-dashboard__note">“{request.reason}”</p>}
      <label className="doctor-dashboard__label" htmlFor={`decision-note-${appointment.id}`}>
        Note to the patient (optional)
      </label>
      <textarea
        id={`decision-note-${appointment.id}`}
        rows={2}
        maxLength={REASON_MAX}
        className="doctor-dashboard__textarea"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {error && (
        <p className="doctor-dashboard__inline-error" role="alert">
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </p>
      )}
      <div className="doctor-dashboard__inline-actions">
        {can(appointment, 'reject_reschedule') && (
          <button
            type="button"
            className="doctor-dashboard__btn doctor-dashboard__btn--danger-outline"
            disabled={Boolean(pending)}
            onClick={() => decide('reject')}
          >
            {pending === 'reject' ? 'Declining…' : 'Decline'}
          </button>
        )}
        {can(appointment, 'approve_reschedule') && (
          <button
            type="button"
            className="doctor-dashboard__btn doctor-dashboard__btn--primary"
            disabled={Boolean(pending)}
            onClick={() => decide('approve')}
          >
            <Check size={14} aria-hidden="true" /> {pending === 'approve' ? 'Approving…' : 'Approve and move'}
          </button>
        )}
      </div>
    </div>
  )
}

// Patient cancel (reason optional) or doctor cancel (reason required).
function CancelPanel({ appointment, role, onDone, onClose }) {
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const trimmed = reason.trim()
  const required = role === 'doctor'

  const confirm = async () => {
    setPending(true)
    setError('')
    try {
      const { appointment: updated } = await cancelAppointment(appointment.id, trimmed || undefined)
      onDone(updated, 'Appointment cancelled.')
    } catch (err) {
      setError(describeActionError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="doctor-dashboard__cancel-panel" role="group" aria-label="Cancel appointment">
      <label htmlFor={`cancel-${appointment.id}`} className="doctor-dashboard__label">
        {required ? 'Reason for cancelling (the patient will see this)' : 'Reason (optional, the doctor will see this)'}
      </label>
      <textarea
        id={`cancel-${appointment.id}`}
        rows={2}
        maxLength={REASON_MAX}
        className="doctor-dashboard__textarea"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        autoFocus
      />
      {error && (
        <p className="doctor-dashboard__inline-error" role="alert">
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </p>
      )}
      <div className="doctor-dashboard__inline-actions">
        <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--ghost" disabled={pending} onClick={onClose}>
          Keep appointment
        </button>
        <button
          type="button"
          className="doctor-dashboard__btn doctor-dashboard__btn--danger"
          disabled={pending || (required && trimmed.length < REASON_MIN)}
          onClick={confirm}
        >
          {pending ? 'Cancelling…' : 'Cancel appointment'}
        </button>
      </div>
    </div>
  )
}

/**
 * The reschedule (and optionally cancel) actions an appointment allows for
 * this user, driven by the server's allowedActions.
 * @param role "patient" | "doctor"
 * @param doctorId whose calendar to pick from
 * @param includeCancel show a Cancel action (the doctor agenda has its own)
 * @param onChanged (updatedAppointment | null, message?) => void; null means "reload"
 */
export default function RescheduleControls({ appointment, role, doctorId, includeCancel = false, onChanged }) {
  const [open, setOpen] = useState(null) // 'pick' | 'decide' | 'cancel'
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const request = appointment.rescheduleRequest
  const hasPending = request?.status === 'pending'

  const done = (updated, message) => {
    setOpen(null)
    onChanged(updated, message)
  }

  const withdraw = async () => {
    setPending(true)
    setError('')
    try {
      done(await withdrawRescheduleRequest(appointment.id), 'Request withdrawn.')
    } catch (err) {
      setError(describeActionError(err))
      if (err.status === 409) onChanged(null)
    } finally {
      setPending(false)
    }
  }

  const pickMode = role === 'doctor' ? 'move' : 'request'
  const canPick = can(appointment, role === 'doctor' ? 'reschedule' : 'request_reschedule')
  const canDecide = can(appointment, 'approve_reschedule') || can(appointment, 'reject_reschedule')
  const canCancel = includeCancel && can(appointment, 'cancel')

  return (
    <div className="appt-actions">
      {hasPending && (
        <p className="appt-actions__status">
          <ArrowRightLeft size={14} aria-hidden="true" />
          {role === 'doctor' ? 'Patient asked to move this to ' : 'You asked to move this to '}
          <strong>{describeSlot(request)}</strong>
          {role === 'patient' && ' · waiting for the doctor'}
        </p>
      )}
      {!hasPending && request && ['approved', 'rejected'].includes(request.status) && role === 'patient' && (
        <p className={`appt-actions__status appt-actions__status--${request.status}`}>
          {request.status === 'approved' ? 'Your reschedule request was approved.' : 'Your reschedule request was declined.'}
          {request.decisionNote ? ` “${request.decisionNote}”` : ''}
        </p>
      )}

      {!open && (canPick || canDecide || canCancel || can(appointment, 'withdraw_reschedule')) && (
        <div className="doctor-dashboard__appt-actions">
          {canDecide && hasPending && (
            <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--primary" onClick={() => setOpen('decide')}>
              Review request
            </button>
          )}
          {can(appointment, 'withdraw_reschedule') && (
            <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--ghost" disabled={pending} onClick={withdraw}>
              {pending ? 'Withdrawing…' : 'Withdraw request'}
            </button>
          )}
          {canPick && (
            <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--secondary" onClick={() => setOpen('pick')}>
              <ArrowRightLeft size={14} aria-hidden="true" />{' '}
              {role === 'doctor' ? 'Move' : hasPending ? 'Change request' : 'Reschedule'}
            </button>
          )}
          {canCancel && (
            <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--danger-outline" onClick={() => setOpen('cancel')}>
              Cancel
            </button>
          )}
        </div>
      )}

      {open === 'pick' && (
        <SlotPicker appointment={appointment} doctorId={doctorId} mode={pickMode} onDone={done} onClose={() => setOpen(null)} />
      )}
      {open === 'decide' && hasPending && <DecisionPanel appointment={appointment} onDone={done} onClose={() => setOpen(null)} />}
      {open === 'cancel' && <CancelPanel appointment={appointment} role={role} onDone={done} onClose={() => setOpen(null)} />}

      {error && (
        <p className="doctor-dashboard__inline-error" role="alert">
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  )
}
