import { useEffect, useState } from 'react'
import { AlertCircle, CalendarOff, CheckCircle2, Info, Trash2 } from 'lucide-react'
import { createTimeOff, deleteTimeOff, listMyTimeOff } from '../../lib/api'
import { formatClock, formatLongDate } from '../BookAppointment/bookingHelpers'
import {
  describeLoadError,
  describeSaveError,
  fieldErrors,
  pluralize,
  readableZone,
  timeOffRange,
  todayInZone,
  validateTimeOffForm,
} from './doctorHelpers'

const EMPTY_FORM = { mode: 'days', firstDate: '', lastDate: '', date: '', startTime: '09:00', endTime: '12:00', reason: '' }

// "2026-12-24T09:00" -> "Thu, 24 Dec 2026, 9:00 AM"
function formatLocal(local) {
  const [date, time] = local.split('T')
  return `${formatLongDate(date)}, ${formatClock(time)}`
}

// A block from midnight to midnight reads better as whole days.
function describeBlock(block) {
  const [startDate, startTime] = block.startLocal.split('T')
  const [endDate, endTime] = block.endLocal.split('T')
  if (startTime === '00:00' && endTime === '00:00') {
    const lastDay = new Date(`${endDate}T00:00:00Z`)
    lastDay.setUTCDate(lastDay.getUTCDate() - 1)
    const last = lastDay.toISOString().slice(0, 10)
    return last === startDate ? formatLongDate(startDate) : `${formatLongDate(startDate)} – ${formatLongDate(last)}`
  }
  return startDate === endDate
    ? `${formatLongDate(startDate)}, ${formatClock(startTime)} – ${formatClock(endTime)}`
    : `${formatLocal(block.startLocal)} – ${formatLocal(block.endLocal)}`
}

export default function TimeOffPanel({ timezone, hasSchedule }) {
  const [version, setVersion] = useState(0)
  const [list, setList] = useState({ version: null, status: 'loading', blocks: [], error: null })
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [confirm, setConfirm] = useState(null) // { conflicts, range } while the doctor reviews the impact
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState(null)
  const [removeId, setRemoveId] = useState(null)

  const today = todayInZone(timezone)
  const isLoading = list.version !== version

  useEffect(() => {
    if (!hasSchedule) return undefined
    let cancelled = false
    listMyTimeOff().then(
      (blocks) => {
        if (!cancelled) setList({ version, status: 'ready', blocks, error: null })
      },
      (err) => {
        if (!cancelled) setList({ version, status: 'error', blocks: [], error: describeLoadError(err) })
      }
    )
    return () => {
      cancelled = true
    }
  }, [version, hasSchedule])

  const patch = (changes) => {
    setForm((prev) => ({ ...prev, ...changes }))
    setConfirm(null)
  }

  const reset = () => {
    setForm(EMPTY_FORM)
    setFormErrors({})
    setConfirm(null)
  }

  const create = async (range, cancelConflictingAppointments) => {
    const result = await createTimeOff({ ...range, reason: form.reason.trim(), cancelConflictingAppointments })
    const cancelled = result.cancelledAppointmentIds.length
    setBanner({
      type: 'success',
      message: cancelled
        ? `Time off added. ${pluralize(cancelled, 'appointment')} cancelled.`
        : result.conflicts.length
          ? `Time off added. ${pluralize(result.conflicts.length, 'existing appointment')} kept.`
          : 'Time off added.',
    })
    reset()
    setVersion((v) => v + 1)
  }

  const run = async (task) => {
    setBusy(true)
    setBanner(null)
    try {
      await task()
    } catch (err) {
      const first = err.details?.[0]?.message
      setBanner({ type: 'error', message: first ?? describeSaveError(err) })
      setFormErrors(fieldErrors(err))
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    const errors = validateTimeOffForm(form, today)
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    const range = timeOffRange(form)
    run(async () => {
      // Look before writing: the doctor decides what happens to bookings.
      const preview = await createTimeOff({ ...range, reason: form.reason.trim(), dryRun: true })
      if (preview.conflicts.length === 0) await create(range, false)
      else setConfirm({ conflicts: preview.conflicts, range })
    })
  }

  const remove = (id) =>
    run(async () => {
      await deleteTimeOff(id)
      setRemoveId(null)
      setBanner({ type: 'success', message: 'Time off removed.' })
      setVersion((v) => v + 1)
    })

  const renderError = (field) =>
    formErrors[field] && (
      <p id={`timeoff-${field}-error`} className="doctor-dashboard__error">
        <AlertCircle size={13} aria-hidden="true" /> {formErrors[field]}
      </p>
    )
  const fieldProps = (field) => ({
    'aria-invalid': Boolean(formErrors[field]),
    'aria-describedby': formErrors[field] ? `timeoff-${field}-error` : undefined,
    className: `doctor-dashboard__input ${formErrors[field] ? 'doctor-dashboard__input--invalid' : ''}`,
  })

  const renderList = () => {
    if (isLoading) return <p className="doctor-dashboard__note">Loading time off…</p>
    if (list.status === 'error') {
      return (
        <div className="doctor-dashboard__panel-message doctor-dashboard__panel-message--error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{list.error}</span>
          <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--ghost" onClick={() => setVersion((v) => v + 1)}>
            Retry
          </button>
        </div>
      )
    }
    if (list.blocks.length === 0) {
      return (
        <p className="doctor-dashboard__panel-message">
          <Info size={16} aria-hidden="true" /> No upcoming time off.
        </p>
      )
    }
    return (
      <ul className="doctor-dashboard__timeoff-list">
        {list.blocks.map((block) => (
          <li key={block.id} className="doctor-dashboard__timeoff">
            <div>
              <strong>{describeBlock(block)}</strong>
              {block.reason && <span className="doctor-dashboard__hint"> · {block.reason}</span>}
            </div>
            {removeId === block.id ? (
              <div className="doctor-dashboard__inline-actions">
                <span className="doctor-dashboard__hint">Remove this time off?</span>
                <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--ghost" disabled={busy} onClick={() => setRemoveId(null)}>
                  Keep
                </button>
                <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--danger" disabled={busy} onClick={() => remove(block.id)}>
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="doctor-dashboard__icon-btn"
                aria-label={`Remove time off ${describeBlock(block)}`}
                onClick={() => setRemoveId(block.id)}
              >
                <Trash2 size={15} />
              </button>
            )}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className="doctor-dashboard__card" aria-labelledby="timeoff-heading">
      <div className="doctor-dashboard__card-head">
        <h2 id="timeoff-heading" className="doctor-dashboard__section-title">
          <CalendarOff size={18} aria-hidden="true" /> Time off
        </h2>
      </div>

      {!hasSchedule ? (
        <p className="doctor-dashboard__panel-message">
          <Info size={16} aria-hidden="true" /> Save your weekly schedule first, then you can block out holidays and leave.
        </p>
      ) : (
        <>
          <p className="doctor-dashboard__note">
            Patients can’t book you during time off. Times are in clinic time ({readableZone(timezone)}).
          </p>

          {banner && (
            <div
              className={`doctor-dashboard__banner ${banner.type === 'error' ? 'doctor-dashboard__banner--error' : 'doctor-dashboard__banner--success'}`}
              role={banner.type === 'error' ? 'alert' : 'status'}
            >
              {banner.type === 'error' ? <AlertCircle size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
              <span>{banner.message}</span>
            </div>
          )}

          {renderList()}

          <form className="doctor-dashboard__timeoff-form" onSubmit={submit} noValidate aria-label="Add time off">
            <h3 className="doctor-dashboard__subtitle">Add time off</h3>

            <div className="doctor-dashboard__segmented" role="radiogroup" aria-label="Kind of time off">
              {[
                ['days', 'Whole days'],
                ['part', 'Part of a day'],
              ].map(([mode, label]) => (
                <label key={mode} className={`doctor-dashboard__segment ${form.mode === mode ? 'doctor-dashboard__segment--on' : ''}`}>
                  <input
                    type="radio"
                    name="timeoff-mode"
                    value={mode}
                    checked={form.mode === mode}
                    onChange={() => {
                      patch({ mode })
                      setFormErrors({})
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>

            {form.mode === 'days' ? (
              <div className="doctor-dashboard__grid">
                <div className="doctor-dashboard__field">
                  <label htmlFor="timeoff-first" className="doctor-dashboard__label">First day</label>
                  <input id="timeoff-first" type="date" min={today} value={form.firstDate} onChange={(e) => patch({ firstDate: e.target.value, lastDate: form.lastDate || e.target.value })} {...fieldProps('firstDate')} />
                  {renderError('firstDate')}
                </div>
                <div className="doctor-dashboard__field">
                  <label htmlFor="timeoff-last" className="doctor-dashboard__label">Last day</label>
                  <input id="timeoff-last" type="date" min={form.firstDate || today} value={form.lastDate} onChange={(e) => patch({ lastDate: e.target.value })} {...fieldProps('lastDate')} />
                  {renderError('lastDate')}
                </div>
              </div>
            ) : (
              <div className="doctor-dashboard__grid doctor-dashboard__grid--3">
                <div className="doctor-dashboard__field">
                  <label htmlFor="timeoff-date" className="doctor-dashboard__label">Day</label>
                  <input id="timeoff-date" type="date" min={today} value={form.date} onChange={(e) => patch({ date: e.target.value })} {...fieldProps('date')} />
                  {renderError('date')}
                </div>
                <div className="doctor-dashboard__field">
                  <label htmlFor="timeoff-from" className="doctor-dashboard__label">From</label>
                  <input id="timeoff-from" type="time" step={300} value={form.startTime} onChange={(e) => patch({ startTime: e.target.value })} {...fieldProps('startTime')} />
                  {renderError('startTime')}
                </div>
                <div className="doctor-dashboard__field">
                  <label htmlFor="timeoff-to" className="doctor-dashboard__label">Until</label>
                  <input id="timeoff-to" type="time" step={300} value={form.endTime} onChange={(e) => patch({ endTime: e.target.value })} {...fieldProps('endTime')} />
                  {renderError('endTime')}
                </div>
              </div>
            )}

            <div className="doctor-dashboard__field">
              <label htmlFor="timeoff-reason" className="doctor-dashboard__label">
                Reason <span className="doctor-dashboard__hint">(optional; patients see it if you cancel their appointment)</span>
              </label>
              <input id="timeoff-reason" type="text" maxLength={200} className="doctor-dashboard__input" value={form.reason} onChange={(e) => patch({ reason: e.target.value })} />
            </div>

            {confirm ? (
              <div className="doctor-dashboard__banner doctor-dashboard__banner--warning" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <div className="doctor-dashboard__banner-body">
                  <p>
                    <strong>{pluralize(confirm.conflicts.length, 'booked appointment')}</strong> fall
                    {confirm.conflicts.length === 1 ? 's' : ''} inside this time off:
                  </p>
                  <ul className="doctor-dashboard__mini-list">
                    {confirm.conflicts.map((c) => (
                      <li key={c.id}>
                        <span>
                          {formatLongDate(c.localDate)}, {formatClock(c.localStartTime)} · {c.patientName ?? 'Patient'}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="doctor-dashboard__inline-actions">
                    <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--ghost" disabled={busy} onClick={() => setConfirm(null)}>
                      Go back
                    </button>
                    <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--secondary" disabled={busy} onClick={() => run(() => create(confirm.range, false))}>
                      Add time off, keep appointments
                    </button>
                    <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--danger" disabled={busy} onClick={() => run(() => create(confirm.range, true))}>
                      Add time off and cancel {confirm.conflicts.length === 1 ? 'it' : 'them'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="doctor-dashboard__savebar">
                <button type="submit" className="doctor-dashboard__btn doctor-dashboard__btn--primary" disabled={busy}>
                  {busy ? 'Checking…' : 'Add time off'}
                </button>
              </div>
            )}
          </form>
        </>
      )}
    </section>
  )
}
