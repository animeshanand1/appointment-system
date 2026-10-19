import { useState } from 'react'
import { AlertCircle, CheckCircle2, Copy, Globe2, Info, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { saveMyAvailability } from '../../lib/api'
import { formatClock, formatLongDate } from '../BookAppointment/bookingHelpers'
import TimeOffPanel from './TimeOffPanel'
import {
  MAX_BREAKS,
  SLOT_DURATIONS,
  WEEKDAYS,
  browserTimeZone,
  defaultSchedule,
  describeSaveError,
  fieldErrors,
  isScheduleDirty,
  pluralize,
  previewSlots,
  readableZone,
  timeZoneOptions,
  toForm,
  toPayload,
} from './doctorHelpers'

const POLICY_FIELDS = [
  { key: 'horizonDays', label: 'Book up to', unit: 'days ahead', min: 1, max: 90, step: 1 },
  { key: 'minNoticeMinutes', label: 'Minimum notice', unit: 'minutes', min: 0, max: 1440, step: 5 },
  { key: 'lateCancelWindowMinutes', label: 'Late-cancellation window', unit: 'minutes before start', min: 0, max: 10080, step: 5 },
]

export default function ScheduleTab({ availability, fallbackTimezone, isOnboarding, onSaved, onReload, onReviewDate }) {
  const initial = availability ? toForm(availability) : defaultSchedule(fallbackTimezone ?? browserTimeZone())
  const [form, setForm] = useState(initial)
  const [baseline, setBaseline] = useState(initial)
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState(null) // { type: 'success' | 'error', message }
  const [saving, setSaving] = useState(false)
  const [stale, setStale] = useState(false)
  const [outOfHours, setOutOfHours] = useState([])
  const [previewIso, setPreviewIso] = useState(() => initial.weeklySchedule.find((d) => d.isWorking)?.isoWeekday ?? 1)

  const isFirstSave = form.revision === null
  const dirty = isFirstSave || isScheduleDirty(form, baseline)
  const zoneChanged = !isFirstSave && form.timezone !== baseline.timezone
  const zones = timeZoneOptions(form.timezone)
  const previewDay = form.weeklySchedule.find((d) => d.isoWeekday === previewIso)
  const preview = previewSlots(previewDay, Number(form.slotDurationMinutes))

  const patch = (changes) => setForm((prev) => ({ ...prev, ...changes }))
  const patchPolicy = (key, value) =>
    setForm((prev) => ({ ...prev, bookingPolicy: { ...prev.bookingPolicy, [key]: value === '' ? '' : Number(value) } }))
  const patchDay = (index, changes) =>
    setForm((prev) => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day, i) => (i === index ? { ...day, ...changes } : day)),
    }))
  const patchBreak = (dayIndex, breakIndex, changes) =>
    setForm((prev) => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day, i) =>
        i === dayIndex
          ? { ...day, breaks: day.breaks.map((b, j) => (j === breakIndex ? { ...b, ...changes } : b)) }
          : day
      ),
    }))

  const copyMondayToWeekdays = () =>
    setForm((prev) => {
      const monday = prev.weeklySchedule[0]
      return {
        ...prev,
        weeklySchedule: prev.weeklySchedule.map((day) =>
          day.isoWeekday >= 2 && day.isoWeekday <= 5
            ? { ...monday, isoWeekday: day.isoWeekday, breaks: monday.breaks.map((b) => ({ ...b })) }
            : day
        ),
      }
    })

  const save = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setBanner(null)
    setErrors({})
    setStale(false)
    try {
      const result = await saveMyAvailability(toPayload(form))
      const saved = toForm(result.availability)
      setForm(saved)
      setBaseline(saved)
      setOutOfHours(result.outOfHoursBookings)
      setBanner({ type: 'success', message: isFirstSave ? 'Schedule saved. Patients can now book you.' : 'Schedule saved.' })
      onSaved(result.availability)
    } catch (err) {
      if (err.code === 'STALE_REVISION') {
        setStale(true)
      } else {
        setErrors(fieldErrors(err))
        setBanner({ type: 'error', message: describeSaveError(err) })
      }
    } finally {
      setSaving(false)
    }
  }

  const errorFor = (path) => errors[path]
  const renderError = (path) =>
    errorFor(path) && (
      <p id={`err-${path}`} className="doctor-dashboard__error">
        <AlertCircle size={13} aria-hidden="true" /> {errorFor(path)}
      </p>
    )
  const invalidProps = (path) => ({
    'aria-invalid': Boolean(errorFor(path)),
    'aria-describedby': errorFor(path) ? `err-${path}` : undefined,
  })
  const inputClass = (path, extra = '') =>
    `doctor-dashboard__input ${extra} ${errorFor(path) ? 'doctor-dashboard__input--invalid' : ''}`

  return (
    <div className="doctor-dashboard__stack">
      {isOnboarding && (
        <div className="doctor-dashboard__banner doctor-dashboard__banner--info" role="note">
          <Info size={16} aria-hidden="true" />
          <span>
            <strong>Welcome!</strong> Set your weekly hours to start taking appointments. Patients can’t book you until
            you save a schedule.
          </span>
        </div>
      )}

      <form className="doctor-dashboard__card" onSubmit={save} noValidate>
        <div className="doctor-dashboard__card-head">
          <h2 className="doctor-dashboard__section-title">Weekly schedule</h2>
          <span className={`doctor-dashboard__dirty ${dirty ? 'doctor-dashboard__dirty--on' : ''}`}>
            {isFirstSave ? 'Not saved yet' : dirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
        </div>

        {stale && (
          <div className="doctor-dashboard__banner doctor-dashboard__banner--error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>Your schedule was changed in another tab or device. Reload to see the latest version before editing.</span>
            <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--secondary" onClick={onReload}>
              <RefreshCw size={14} aria-hidden="true" /> Reload
            </button>
          </div>
        )}

        {banner && (
          <div
            className={`doctor-dashboard__banner ${banner.type === 'error' ? 'doctor-dashboard__banner--error' : 'doctor-dashboard__banner--success'}`}
            role={banner.type === 'error' ? 'alert' : 'status'}
          >
            {banner.type === 'error' ? <AlertCircle size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
            <span>{banner.message}</span>
          </div>
        )}

        {outOfHours.length > 0 && (
          <div className="doctor-dashboard__banner doctor-dashboard__banner--warning" role="status">
            <AlertCircle size={16} aria-hidden="true" />
            <div className="doctor-dashboard__banner-body">
              <p>
                <strong>{pluralize(outOfHours.length, 'booked appointment')}</strong> now{' '}
                {outOfHours.length === 1 ? 'falls' : 'fall'} outside your new hours. Nothing was cancelled; review{' '}
                {outOfHours.length === 1 ? 'it' : 'them'} in your agenda.
              </p>
              <ul className="doctor-dashboard__mini-list">
                {outOfHours.map((booking) => (
                  <li key={booking.id}>
                    <span>
                      {formatLongDate(booking.localDate)}, {formatClock(booking.localStartTime)} · {booking.patientName ?? 'Patient'}
                    </span>
                    <button
                      type="button"
                      className="doctor-dashboard__link-btn"
                      onClick={() => onReviewDate(booking.localDate)}
                    >
                      Open in agenda
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="doctor-dashboard__grid">
          <div className="doctor-dashboard__field">
            <label htmlFor="sched-timezone" className="doctor-dashboard__label">
              <Globe2 size={14} aria-hidden="true" /> Clinic time zone
            </label>
            <select
              id="sched-timezone"
              className={inputClass('timezone', 'doctor-dashboard__input--select')}
              value={form.timezone}
              onChange={(e) => patch({ timezone: e.target.value })}
              {...invalidProps('timezone')}
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {readableZone(zone)}
                </option>
              ))}
            </select>
            {renderError('timezone')}
            {zoneChanged && (
              <p className="doctor-dashboard__warning">
                <Info size={13} aria-hidden="true" /> Your hours will be read in the new zone. Existing appointments keep
                their exact times, and any that no longer fit will be listed after saving.
              </p>
            )}
          </div>

          <div className="doctor-dashboard__field">
            <label htmlFor="sched-duration" className="doctor-dashboard__label">
              Appointment length
            </label>
            <select
              id="sched-duration"
              className={inputClass('slotDurationMinutes', 'doctor-dashboard__input--select')}
              value={form.slotDurationMinutes}
              onChange={(e) => patch({ slotDurationMinutes: Number(e.target.value) })}
              {...invalidProps('slotDurationMinutes')}
            >
              {SLOT_DURATIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </select>
            {renderError('slotDurationMinutes')}
          </div>
        </div>

        <fieldset className="doctor-dashboard__fieldset">
          <legend className="doctor-dashboard__label">Booking rules</legend>
          <div className="doctor-dashboard__grid doctor-dashboard__grid--3">
            {POLICY_FIELDS.map(({ key, label, unit, min, max, step }) => {
              const path = `bookingPolicy.${key}`
              return (
                <div key={key} className="doctor-dashboard__field">
                  <label htmlFor={`policy-${key}`} className="doctor-dashboard__label doctor-dashboard__label--light">
                    {label}
                  </label>
                  <div className="doctor-dashboard__with-unit">
                    <input
                      id={`policy-${key}`}
                      type="number"
                      inputMode="numeric"
                      min={min}
                      max={max}
                      step={step}
                      className={inputClass(path)}
                      value={form.bookingPolicy[key]}
                      onChange={(e) => patchPolicy(key, e.target.value)}
                      {...invalidProps(path)}
                    />
                    <span className="doctor-dashboard__unit">{unit}</span>
                  </div>
                  {renderError(path)}
                </div>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="doctor-dashboard__fieldset">
          <legend className="doctor-dashboard__label">Working hours</legend>
          {renderError('weeklySchedule')}

          <ul className="doctor-dashboard__days">
            {form.weeklySchedule.map((day, index) => {
              const weekday = WEEKDAYS[index]
              const base = `weeklySchedule.${index}`
              const slotCount = previewSlots(day, Number(form.slotDurationMinutes)).length
              return (
                <li key={day.isoWeekday} className={`doctor-dashboard__day ${day.isWorking ? '' : 'doctor-dashboard__day--off'}`}>
                  <div className="doctor-dashboard__day-head">
                    <label className="doctor-dashboard__switch">
                      <input
                        type="checkbox"
                        checked={day.isWorking}
                        onChange={(e) => patchDay(index, { isWorking: e.target.checked })}
                        aria-label={`${weekday.name} is a working day`}
                      />
                      <span className="doctor-dashboard__switch-track" aria-hidden="true" />
                      <span className="doctor-dashboard__day-name">{weekday.name}</span>
                    </label>

                    {day.isWorking ? (
                      <div className="doctor-dashboard__hours">
                        <input
                          type="time"
                          step={300}
                          aria-label={`${weekday.name} start time`}
                          className={inputClass(`${base}.shiftStart`, 'doctor-dashboard__input--time')}
                          value={day.shiftStart}
                          onChange={(e) => patchDay(index, { shiftStart: e.target.value })}
                          {...invalidProps(`${base}.shiftStart`)}
                        />
                        <span aria-hidden="true">to</span>
                        <input
                          type="time"
                          step={300}
                          aria-label={`${weekday.name} end time`}
                          className={inputClass(`${base}.shiftEnd`, 'doctor-dashboard__input--time')}
                          value={day.shiftEnd}
                          onChange={(e) => patchDay(index, { shiftEnd: e.target.value })}
                          {...invalidProps(`${base}.shiftEnd`)}
                        />
                        <span className="doctor-dashboard__slot-count">{pluralize(slotCount, 'slot')}</span>
                      </div>
                    ) : (
                      <span className="doctor-dashboard__off-label">Day off</span>
                    )}
                  </div>

                  {day.isWorking && (
                    <>
                      {renderError(`${base}.shiftStart`)}
                      {renderError(`${base}.shiftEnd`)}
                      {renderError(`${base}.isoWeekday`)}

                      {day.breaks.map((brk, breakIndex) => (
                        <div key={breakIndex} className="doctor-dashboard__break">
                          <span className="doctor-dashboard__break-label">Break</span>
                          <input
                            type="time"
                            step={300}
                            aria-label={`${weekday.name} break ${breakIndex + 1} start`}
                            className={inputClass(`${base}.breaks.${breakIndex}`, 'doctor-dashboard__input--time')}
                            value={brk.start}
                            onChange={(e) => patchBreak(index, breakIndex, { start: e.target.value })}
                            {...invalidProps(`${base}.breaks.${breakIndex}`)}
                          />
                          <span aria-hidden="true">to</span>
                          <input
                            type="time"
                            step={300}
                            aria-label={`${weekday.name} break ${breakIndex + 1} end`}
                            className={inputClass(`${base}.breaks.${breakIndex}`, 'doctor-dashboard__input--time')}
                            value={brk.end}
                            onChange={(e) => patchBreak(index, breakIndex, { end: e.target.value })}
                            {...invalidProps(`${base}.breaks.${breakIndex}`)}
                          />
                          <button
                            type="button"
                            className="doctor-dashboard__icon-btn"
                            aria-label={`Remove ${weekday.name} break ${breakIndex + 1}`}
                            onClick={() => patchDay(index, { breaks: day.breaks.filter((_, j) => j !== breakIndex) })}
                          >
                            <Trash2 size={14} />
                          </button>
                          {renderError(`${base}.breaks.${breakIndex}`)}
                        </div>
                      ))}
                      {renderError(`${base}.breaks`)}

                      {day.breaks.length < MAX_BREAKS && (
                        <button
                          type="button"
                          className="doctor-dashboard__link-btn"
                          onClick={() => patchDay(index, { breaks: [...day.breaks, { start: '13:00', end: '14:00' }] })}
                        >
                          <Plus size={13} aria-hidden="true" /> Add a break
                        </button>
                      )}
                    </>
                  )}
                </li>
              )
            })}
          </ul>

          <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--ghost" onClick={copyMondayToWeekdays}>
            <Copy size={14} aria-hidden="true" /> Copy Monday’s hours to Tuesday–Friday
          </button>
        </fieldset>

        <section className="doctor-dashboard__preview" aria-labelledby="preview-heading">
          <div className="doctor-dashboard__card-head">
            <h3 id="preview-heading" className="doctor-dashboard__subtitle">
              Slot preview
            </h3>
            <label className="doctor-dashboard__visually-hidden" htmlFor="preview-day">
              Weekday to preview
            </label>
            <select
              id="preview-day"
              className="doctor-dashboard__input doctor-dashboard__input--select doctor-dashboard__input--compact"
              value={previewIso}
              onChange={(e) => setPreviewIso(Number(e.target.value))}
            >
              {WEEKDAYS.map(({ iso, name }) => (
                <option key={iso} value={iso}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          {preview.length === 0 ? (
            <p className="doctor-dashboard__note">No slots on this day.</p>
          ) : (
            <ul className="doctor-dashboard__chips" aria-label="Slots patients will see">
              {preview.map((slot) => (
                <li key={slot.start} className="doctor-dashboard__chip">
                  {formatClock(slot.start)}
                </li>
              ))}
            </ul>
          )}
          <p className="doctor-dashboard__note">This is what patients will see on a normal week, before time off and bookings.</p>
        </section>

        <div className="doctor-dashboard__savebar">
          <button type="submit" className="doctor-dashboard__btn doctor-dashboard__btn--primary" disabled={saving || !dirty || stale}>
            {saving ? 'Saving…' : isFirstSave ? 'Save schedule and open bookings' : 'Save schedule'}
          </button>
          {!isFirstSave && dirty && !saving && (
            <button
              type="button"
              className="doctor-dashboard__btn doctor-dashboard__btn--ghost"
              onClick={() => {
                setForm(baseline)
                setErrors({})
                setBanner(null)
              }}
            >
              Discard changes
            </button>
          )}
        </div>
      </form>

      {/* Time off is read in the saved zone: that's what the server uses. */}
      <TimeOffPanel timezone={baseline.timezone} hasSchedule={!isFirstSave} />
    </div>
  )
}
