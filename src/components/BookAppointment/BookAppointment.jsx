import { useEffect, useEffectEvent, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Stethoscope,
  CalendarDays,
  Clock,
  User,
  FileText,
  Building2,
  AlertCircle,
  CheckCircle2,
  CalendarPlus,
  ChevronDown,
  Lock,
  Check,
  RefreshCw,
  Info,
} from 'lucide-react'
import { bookAppointment, getDoctorSlots, listDoctors } from '../../lib/api'
import { cleanText } from '../../lib/sanitize'
import {
  DEPARTMENTS,
  FIELD_ORDER,
  REASON_MAX,
  dayReasonMessage,
  departmentName,
  describeBookingError,
  describeLoadError,
  formatClock,
  formatLongDate,
  groupSlots,
  patientLocalTime,
  todayISO,
  validateBooking,
} from './bookingHelpers'
import './BookAppointment.css'

const EMPTY_VALUES = { department: '', doctorId: '', date: '', slotStartAt: '', reason: '', consent: false }
const IDLE = { status: 'idle', error: null }
const FIELD_IDS = {
  department: 'book-department',
  doctorId: 'book-doctor',
  date: 'book-date',
  reason: 'book-reason',
  consent: 'book-consent',
}

const readableZone = (tz) => tz?.replace(/_/g, ' ')

export default function BookAppointment({
  currentUser,
  onBack,
  onRequireAuth,
  onViewDoctor,
  initialDepartment = '',
  initialDraft = null,
}) {
  const [values, setValues] = useState(() => ({
    ...EMPTY_VALUES,
    ...(initialDraft ?? { department: initialDepartment || '' }),
  }))
  const [touched, setTouched] = useState({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [doctors, setDoctors] = useState(() => ({
    ...IDLE,
    status: values.department ? 'loading' : 'idle',
    list: [],
  }))
  const [slotsState, setSlotsState] = useState(() => ({
    ...IDLE,
    status: values.doctorId && values.date ? 'loading' : 'idle',
    day: null,
  }))
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [notice, setNotice] = useState('')
  const [confirmation, setConfirmation] = useState(null)

  // Only the latest request for each resource may write state, so a slow
  // response for a previous doctor or date never overwrites the current one.
  const doctorsRequest = useRef(0)
  const slotsRequest = useRef(0)

  const today = todayISO()
  const errors = validateBooking(values, today)
  const errorCount = Object.keys(errors).length
  const isPatient = currentUser?.role === 'patient'
  const selectedDoctor = doctors.list.find((d) => d.id === values.doctorId)
  const day = slotsState.day
  const selectedSlot = day?.slots.find((s) => s.startAt === values.slotStartAt)
  const availableCount = day?.slots.filter((s) => s.status === 'available').length ?? 0
  const patientName = currentUser?.user?.fullName ?? currentUser?.identifier

  const requestDoctors = (department) => {
    const id = ++doctorsRequest.current
    listDoctors({ specialization: department }).then(
      (list) => {
        if (id === doctorsRequest.current) setDoctors({ status: 'ready', list, error: null })
      },
      (err) => {
        if (id === doctorsRequest.current) setDoctors({ status: 'error', list: [], error: describeLoadError(err) })
      }
    )
  }

  const loadDoctors = (department) => {
    setDoctors({ status: 'loading', list: [], error: null })
    requestDoctors(department)
  }

  const requestSlots = (doctorId, date, selectedStartAt = '') => {
    const id = ++slotsRequest.current
    getDoctorSlots(doctorId, date).then(
      (freshDay) => {
        if (id !== slotsRequest.current) return
        setSlotsState({ status: 'ready', day: freshDay, error: null })
        const stillOpen = freshDay.slots.some((s) => s.startAt === selectedStartAt && s.status === 'available')
        if (selectedStartAt && !stillOpen) {
          setValues((prev) => (prev.slotStartAt === selectedStartAt ? { ...prev, slotStartAt: '' } : prev))
          setNotice('Your selected time is no longer available. Please choose another slot.')
        }
      },
      (err) => {
        if (id === slotsRequest.current) setSlotsState({ status: 'error', day: null, error: describeLoadError(err) })
      }
    )
  }

  const loadSlots = (doctorId, date, selectedStartAt) => {
    setSlotsState({ status: 'loading', day: null, error: null })
    requestSlots(doctorId, date, selectedStartAt)
  }

  const resetSlots = () => {
    slotsRequest.current++
    setSlotsState({ status: 'idle', day: null, error: null })
  }

  // A draft restored after sign-in is re-checked against fresh slots.
  const restoreDraft = useEffectEvent(() => {
    if (values.department) requestDoctors(values.department)
    if (values.doctorId && values.date) requestSlots(values.doctorId, values.date, values.slotStartAt)
  })

  useEffect(() => {
    restoreDraft()
  }, [])

  const markTouched = (field) => setTouched((prev) => ({ ...prev, [field]: true }))

  const clearFeedback = () => {
    setSubmitError(null)
    setNotice('')
  }

  const handleDepartmentChange = (department) => {
    setValues((prev) => ({ ...prev, department, doctorId: '', slotStartAt: '' }))
    clearFeedback()
    resetSlots()
    if (department) {
      loadDoctors(department)
    } else {
      doctorsRequest.current++
      setDoctors({ status: 'idle', list: [], error: null })
    }
  }

  const handleDoctorChange = (doctorId) => {
    setValues((prev) => ({ ...prev, doctorId, slotStartAt: '' }))
    clearFeedback()
    if (doctorId && values.date && values.date >= today) loadSlots(doctorId, values.date)
    else resetSlots()
  }

  const handleDateChange = (date) => {
    setValues((prev) => ({ ...prev, date, slotStartAt: '' }))
    clearFeedback()
    if (values.doctorId && date && date >= today) loadSlots(values.doctorId, date)
    else resetSlots()
  }

  const handleSlotSelect = (startAt) => {
    setValues((prev) => ({ ...prev, slotStartAt: startAt }))
    markTouched('slot')
    clearFeedback()
  }

  const focusFirstInvalid = () => {
    const first = FIELD_ORDER.find((field) => errors[field])
    const el =
      first === 'slot'
        ? document.querySelector('.book-appointment__slot-input:not(:disabled)') ?? document.getElementById('book-date')
        : document.getElementById(FIELD_IDS[first])
    el?.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitAttempted(true)
    clearFeedback()

    if (errorCount > 0) {
      focusFirstInvalid()
      return
    }

    if (!currentUser) {
      onRequireAuth?.(values)
      return
    }

    if (!isPatient) {
      setSubmitError(describeBookingError({ code: 'FORBIDDEN_ROLE' }))
      return
    }

    setSubmitting(true)
    try {
      const result = await bookAppointment({
        doctorId: values.doctorId,
        startAt: values.slotStartAt,
        patientNotes: cleanText(values.reason, { maxLength: REASON_MAX, multiline: true }),
      })
      setConfirmation(result)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      const outcome = describeBookingError(err)
      setSubmitError(outcome)
      // The server message already explains the cleared field; a second
      // "please fix" summary for it would just repeat it.
      if (outcome.clearSlot || outcome.refreshDoctors) {
        setSubmitAttempted(false)
        setTouched((prev) => ({ ...prev, slot: false, doctorId: false }))
      }
      if (outcome.refreshDoctors) {
        setValues((prev) => ({ ...prev, doctorId: '', slotStartAt: '' }))
        resetSlots()
        loadDoctors(values.department)
      } else {
        if (outcome.clearSlot) setValues((prev) => ({ ...prev, slotStartAt: '' }))
        if (outcome.refreshSlots) loadSlots(values.doctorId, values.date)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleBookAnother = () => {
    setValues((prev) => ({ ...EMPTY_VALUES, department: prev.department, doctorId: prev.doctorId, date: prev.date }))
    setTouched({})
    setSubmitAttempted(false)
    clearFeedback()
    setConfirmation(null)
    if (values.doctorId && values.date) loadSlots(values.doctorId, values.date)
  }

  const fieldError = (field) => (touched[field] || submitAttempted ? errors[field] : undefined)

  const inputClass = (field, base = 'book-appointment__input') =>
    `${base} ${fieldError(field) ? `${base}--invalid` : ''}`

  const ariaProps = (field, id = FIELD_IDS[field]) => ({
    'aria-invalid': Boolean(fieldError(field)),
    'aria-describedby': fieldError(field) ? `${id}-error` : undefined,
  })

  const renderError = (field, id = FIELD_IDS[field]) =>
    fieldError(field) && (
      <p id={`${id}-error`} className="book-appointment__error">
        <AlertCircle size={13} /> {fieldError(field)}
      </p>
    )

  const backLabel = currentUser ? 'Back to Dashboard' : 'Back to Home'

  const doctorPlaceholder = {
    idle: 'Select a department first',
    loading: 'Loading doctors...',
    error: 'Could not load doctors',
    ready: doctors.list.length ? 'Choose an attending physician...' : 'No doctors available',
  }[doctors.status]

  const renderSlotPanel = () => {
    if (!values.doctorId || !values.date) {
      return (
        <p className="book-appointment__panel-message">
          <Info size={16} /> Select a doctor and a date to see open time slots.
        </p>
      )
    }
    if (values.date < today) {
      return (
        <p className="book-appointment__panel-message">
          <Info size={16} /> {dayReasonMessage('PAST_DATE')}
        </p>
      )
    }
    if (slotsState.status === 'loading') {
      return (
        <div className="book-appointment__slots" aria-busy="true">
          <span className="book-appointment__visually-hidden">Loading available times...</span>
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="book-appointment__slot-skeleton" aria-hidden="true" />
          ))}
        </div>
      )
    }
    if (slotsState.status === 'error') {
      return (
        <div className="book-appointment__panel-message book-appointment__panel-message--error">
          <AlertCircle size={16} />
          <span>{slotsState.error}</span>
          <button
            type="button"
            className="book-appointment__inline-btn"
            onClick={() => loadSlots(values.doctorId, values.date, values.slotStartAt)}
          >
            Retry
          </button>
        </div>
      )
    }
    if (!day) return null
    if (day.slots.length === 0) {
      return (
        <p className="book-appointment__panel-message">
          <Info size={16} /> {dayReasonMessage(day.reason, selectedDoctor?.fullName)}
        </p>
      )
    }

    return (
      <>
        {availableCount === 0 && (
          <p className="book-appointment__panel-message">
            <Info size={16} /> Every slot on this day is taken. Please try another date.
          </p>
        )}
        <div
          className={`book-appointment__slot-groups ${fieldError('slot') ? 'book-appointment__slots--invalid' : ''}`}
          role="radiogroup"
          aria-labelledby="book-slot-label"
          {...ariaProps('slot', 'book-slot')}
        >
          {groupSlots(day.slots).map((group) => (
            <div key={group.label} className="book-appointment__slot-group">
              <span className="book-appointment__slot-group-label">{group.label}</span>
              <div className="book-appointment__slots">
                {group.slots.map((slot) => {
                  const isActive = values.slotStartAt === slot.startAt
                  const isOpen = slot.status === 'available'
                  return (
                    <label
                      key={slot.startAt}
                      title={slot.status === 'booked' ? 'Already booked' : isOpen ? undefined : 'No longer bookable'}
                      className={[
                        'book-appointment__slot',
                        isActive && 'book-appointment__slot--active',
                        slot.status === 'booked' && 'book-appointment__slot--booked',
                        slot.status === 'unavailable' && 'book-appointment__slot--unavailable',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <input
                        type="radio"
                        name="slot"
                        value={slot.startAt}
                        checked={isActive}
                        disabled={!isOpen}
                        aria-label={`${formatClock(slot.slotStartTime)}${isOpen ? '' : `, ${slot.status}`}`}
                        onChange={() => handleSlotSelect(slot.startAt)}
                        className="book-appointment__slot-input book-appointment__visually-hidden"
                      />
                      {isActive && <Check size={13} aria-hidden="true" />}
                      {slot.status === 'booked' && <Lock size={12} aria-hidden="true" />}
                      <span aria-hidden="true">{formatClock(slot.slotStartTime)}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="book-appointment__slot-footer">
          <ul className="book-appointment__legend" aria-label="Slot legend">
            <li><span className="book-appointment__legend-swatch" /> Available</li>
            <li><span className="book-appointment__legend-swatch book-appointment__legend-swatch--active" /> Selected</li>
            <li><Lock size={11} aria-hidden="true" /> Booked</li>
            <li><span className="book-appointment__legend-swatch book-appointment__legend-swatch--unavailable" /> Unavailable</li>
          </ul>
          <button
            type="button"
            className="book-appointment__inline-btn"
            onClick={() => loadSlots(values.doctorId, values.date, values.slotStartAt)}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
        {day.timezone && (
          <p className="book-appointment__timezone-note">Times are shown in clinic time ({readableZone(day.timezone)}).</p>
        )}
      </>
    )
  }

  if (confirmation) {
    const { appointment, replayed } = confirmation
    const yourTime = patientLocalTime(appointment.startAt, appointment.timezone)
    return (
      <div className="book-appointment">
        <div className="book-appointment__back-bar">
          <div className="book-appointment__back-bar-container">
            <button type="button" className="book-appointment__back-btn" onClick={onBack}>
              <ArrowLeft size={16} />
              <span>{backLabel}</span>
            </button>
          </div>
        </div>
        <main className="book-appointment__main">
          <section className="book-appointment__confirmation" role="status" aria-live="polite">
            <div className="book-appointment__confirmation-icon">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="book-appointment__confirmation-title">Appointment Confirmed</h1>
            <p className="book-appointment__confirmation-desc">
              {replayed
                ? 'You had already booked this slot, so no duplicate appointment was created.'
                : `Your appointment with ${appointment.doctor?.fullName} is booked.`}
            </p>

            <dl className="book-appointment__confirmation-list">
              <div className="book-appointment__confirmation-row">
                <dt>Doctor</dt>
                <dd>{appointment.doctor?.fullName}</dd>
              </div>
              <div className="book-appointment__confirmation-row">
                <dt>Department</dt>
                <dd>{departmentName(appointment.doctor?.specialization)}</dd>
              </div>
              <div className="book-appointment__confirmation-row">
                <dt>Date & Time</dt>
                <dd>
                  {formatLongDate(appointment.localDate)}, {formatClock(appointment.localStartTime)} –{' '}
                  {formatClock(appointment.localEndTime)}
                  <span className="book-appointment__subtext">Clinic time ({readableZone(appointment.timezone)})</span>
                </dd>
              </div>
              {yourTime && (
                <div className="book-appointment__confirmation-row">
                  <dt>Your Time</dt>
                  <dd>{yourTime}</dd>
                </div>
              )}
              {appointment.patientNotes && (
                <div className="book-appointment__confirmation-row">
                  <dt>Reason</dt>
                  <dd>{appointment.patientNotes}</dd>
                </div>
              )}
              <div className="book-appointment__confirmation-row">
                <dt>Status</dt>
                <dd className="book-appointment__status-pill">Booked</dd>
              </div>
            </dl>

            <div className="book-appointment__confirmation-actions">
              <button type="button" className="book-appointment__secondary-btn" onClick={onBack}>
                {backLabel}
              </button>
              <button type="button" className="book-appointment__submit-btn" onClick={handleBookAnother}>
                Book Another Appointment
              </button>
            </div>
          </section>
        </main>
      </div>
    )
  }

  const yourSelectedTime = selectedSlot ? patientLocalTime(selectedSlot.startAt, day?.timezone) : null

  return (
    <div className="book-appointment">
      {/* Back Navigation Bar */}
      <div className="book-appointment__back-bar">
        <div className="book-appointment__back-bar-container">
          <button type="button" className="book-appointment__back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>{backLabel}</span>
          </button>
        </div>
      </div>

      <main className="book-appointment__main">
        <div className="book-appointment__header">
          <div className="book-appointment__tag">
            <CalendarPlus size={14} /> OPD Appointment Booking
          </div>
          <h1 className="book-appointment__title">Book an Appointment</h1>
          <p className="book-appointment__subtitle">
            Choose a specialist, then pick one of their open time slots. Slots update live as patients book.
          </p>
        </div>

        <div className="book-appointment__layout">
          <form className="book-appointment__form" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
            {submitAttempted && errorCount > 0 && (
              <div className="book-appointment__alert" role="alert">
                <AlertCircle size={18} />
                <span>
                  Please fix {errorCount} highlighted {errorCount === 1 ? 'field' : 'fields'} before booking.
                </span>
              </div>
            )}

            {submitError && (
              <div className="book-appointment__alert" role="alert">
                <AlertCircle size={18} />
                <span>{submitError.message}</span>
                {submitError.signIn && onRequireAuth && (
                  <button type="button" className="book-appointment__inline-btn" onClick={() => onRequireAuth(values)}>
                    Sign In
                  </button>
                )}
              </div>
            )}

            {/* Step 1: Specialist */}
            <fieldset className="book-appointment__section">
              <legend className="book-appointment__section-title">
                <span className="book-appointment__step">1</span> Choose Specialist
              </legend>

              <div className="book-appointment__row">
                <div className="book-appointment__field">
                  <div className="book-appointment__label-row">
                    <label htmlFor="book-department" className="book-appointment__label">
                      Department
                    </label>
                    <span className="book-appointment__field-hint">{DEPARTMENTS.length} Specialties</span>
                  </div>
                  <div className="book-appointment__input-wrap book-appointment__input-wrap--select">
                    <Building2 size={16} className="book-appointment__input-icon" />
                    <select
                      id="book-department"
                      className={`${inputClass('department', 'book-appointment__select')} ${!values.department ? 'book-appointment__select--placeholder' : ''}`}
                      value={values.department}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      onBlur={() => markTouched('department')}
                      {...ariaProps('department')}
                    >
                      <option value="">Select clinical department...</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="book-appointment__select-arrow" />
                  </div>
                  {renderError('department')}
                </div>

                <div className="book-appointment__field">
                  <div className="book-appointment__label-row">
                    <label htmlFor="book-doctor" className="book-appointment__label">
                      Doctor
                    </label>
                    {doctors.status === 'ready' && doctors.list.length > 0 && (
                      <span className="book-appointment__field-hint book-appointment__field-hint--active">
                        {doctors.list.length} available
                      </span>
                    )}
                  </div>
                  <div
                    className={`book-appointment__input-wrap book-appointment__input-wrap--select ${doctors.status !== 'ready' || !doctors.list.length ? 'book-appointment__input-wrap--disabled' : ''}`}
                  >
                    <Stethoscope size={16} className="book-appointment__input-icon" />
                    <select
                      id="book-doctor"
                      className={`${inputClass('doctorId', 'book-appointment__select')} ${!values.doctorId ? 'book-appointment__select--placeholder' : ''}`}
                      value={values.doctorId}
                      onChange={(e) => handleDoctorChange(e.target.value)}
                      onBlur={() => markTouched('doctorId')}
                      disabled={doctors.status !== 'ready' || doctors.list.length === 0}
                      {...ariaProps('doctorId')}
                    >
                      <option value="">{doctorPlaceholder}</option>
                      {doctors.list.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.fullName}
                          {doc.experienceYears ? ` · ${doc.experienceYears} yrs` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="book-appointment__select-arrow" />
                  </div>
                  {doctors.status === 'error' && (
                    <p className="book-appointment__error">
                      <AlertCircle size={13} /> {doctors.error}{' '}
                      <button
                        type="button"
                        className="book-appointment__inline-btn"
                        onClick={() => loadDoctors(values.department)}
                      >
                        Retry
                      </button>
                    </p>
                  )}
                  {selectedDoctor && onViewDoctor && (
                    <button
                      type="button"
                      className="book-appointment__inline-btn"
                      onClick={() => onViewDoctor(selectedDoctor.id, values)}
                    >
                      <User size={13} /> View {selectedDoctor.fullName}'s profile
                    </button>
                  )}
                  {doctors.status === 'ready' && doctors.list.length === 0 && (
                    <p className="book-appointment__hint">
                      No doctors in this department are taking bookings right now.
                    </p>
                  )}
                  {renderError('doctorId')}
                </div>
              </div>
            </fieldset>

            {/* Step 2: Date & Slot */}
            <fieldset className="book-appointment__section">
              <legend className="book-appointment__section-title">
                <span className="book-appointment__step">2</span> Pick Date & Time
              </legend>

              <div className="book-appointment__field book-appointment__field--narrow">
                <label htmlFor="book-date" className="book-appointment__label">Appointment Date</label>
                <div className="book-appointment__input-wrap">
                  <CalendarDays size={16} className="book-appointment__input-icon" />
                  <input
                    id="book-date"
                    type="date"
                    min={today}
                    className={inputClass('date')}
                    value={values.date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    onBlur={() => markTouched('date')}
                    {...ariaProps('date')}
                  />
                </div>
                {renderError('date')}
              </div>

              <div className="book-appointment__field">
                <span id="book-slot-label" className="book-appointment__label">
                  <Clock size={14} /> Available Time Slots
                </span>
                {renderSlotPanel()}
                <p className="book-appointment__visually-hidden" role="status" aria-live="polite">
                  {notice}
                </p>
                {notice && (
                  <p className="book-appointment__notice" aria-hidden="true">
                    <Info size={14} /> {notice}
                  </p>
                )}
                {renderError('slot', 'book-slot')}
              </div>
            </fieldset>

            {/* Step 3: Visit Details */}
            <fieldset className="book-appointment__section">
              <legend className="book-appointment__section-title">
                <span className="book-appointment__step">3</span> Visit Details
              </legend>

              <div className="book-appointment__patient-card">
                <span className="book-appointment__patient-avatar">
                  <User size={16} />
                </span>
                {currentUser ? (
                  <span className="book-appointment__patient-copy">
                    <span className="book-appointment__patient-label">Booking for</span>
                    <span className="book-appointment__patient-name">{patientName}</span>
                    {currentUser.identifier && currentUser.identifier !== patientName && (
                      <span className="book-appointment__patient-email">{currentUser.identifier}</span>
                    )}
                  </span>
                ) : (
                  <span className="book-appointment__patient-copy">
                    <span className="book-appointment__patient-name">You're not signed in</span>
                    <span className="book-appointment__patient-email">
                      Pick your slot now. We'll ask you to sign in with your patient account before confirming.
                    </span>
                  </span>
                )}
              </div>

              {currentUser && !isPatient && (
                <p className="book-appointment__notice">
                  <Info size={14} /> Doctor accounts can't book appointments. Sign in with a patient account to book.
                </p>
              )}

              <div className="book-appointment__field">
                <div className="book-appointment__label-row">
                  <label htmlFor="book-reason" className="book-appointment__label">
                    <FileText size={14} /> Reason for Visit
                  </label>
                  <span
                    className={`book-appointment__counter ${
                      values.reason.trim().length > REASON_MAX ? 'book-appointment__counter--over' : ''
                    }`}
                  >
                    {values.reason.trim().length}/{REASON_MAX}
                  </span>
                </div>
                <textarea
                  id="book-reason"
                  rows={4}
                  maxLength={REASON_MAX * 2}
                  placeholder="Briefly describe your symptoms or the purpose of this visit. Your doctor will see this."
                  className={inputClass('reason', 'book-appointment__textarea')}
                  value={values.reason}
                  onChange={(e) => setValues((prev) => ({ ...prev, reason: e.target.value }))}
                  onBlur={() => markTouched('reason')}
                  {...ariaProps('reason')}
                />
                {renderError('reason')}
              </div>

              <div className="book-appointment__field">
                <label className="book-appointment__consent">
                  <input
                    id="book-consent"
                    type="checkbox"
                    className="book-appointment__checkbox"
                    checked={values.consent}
                    onChange={(e) => {
                      setValues((prev) => ({ ...prev, consent: e.target.checked }))
                      markTouched('consent')
                    }}
                    {...ariaProps('consent')}
                  />
                  <span>
                    I confirm these details are accurate and agree to the hospital's appointment and
                    cancellation policy.
                  </span>
                </label>
                {renderError('consent')}
              </div>
            </fieldset>

            <button
              type="submit"
              className="book-appointment__submit-btn"
              disabled={submitting || (Boolean(currentUser) && !isPatient)}
            >
              {submitting ? (
                <>
                  <span className="book-appointment__spinner" aria-hidden="true" />
                  <span>Booking...</span>
                </>
              ) : (
                <>
                  <span>{currentUser ? 'Confirm Appointment' : 'Sign In to Confirm'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Live Summary Panel */}
          <aside className="book-appointment__summary" aria-label="Appointment Summary">
            <h2 className="book-appointment__summary-title">Appointment Summary</h2>
            <dl className="book-appointment__summary-list">
              <div className="book-appointment__summary-row">
                <dt>Department</dt>
                <dd>{values.department ? departmentName(values.department) : '—'}</dd>
              </div>
              <div className="book-appointment__summary-row">
                <dt>Doctor</dt>
                <dd>{selectedDoctor?.fullName ?? '—'}</dd>
              </div>
              <div className="book-appointment__summary-row">
                <dt>Date</dt>
                <dd>{values.date && !errors.date ? formatLongDate(values.date) : '—'}</dd>
              </div>
              <div className="book-appointment__summary-row">
                <dt>Time</dt>
                <dd>
                  {selectedSlot
                    ? `${formatClock(selectedSlot.slotStartTime)} – ${formatClock(selectedSlot.slotEndTime)}`
                    : '—'}
                  {selectedSlot && day?.timezone && (
                    <span className="book-appointment__subtext">Clinic time ({readableZone(day.timezone)})</span>
                  )}
                </dd>
              </div>
              {yourSelectedTime && (
                <div className="book-appointment__summary-row">
                  <dt>Your Time</dt>
                  <dd>{yourSelectedTime}</dd>
                </div>
              )}
              <div className="book-appointment__summary-row">
                <dt>Patient</dt>
                <dd>{currentUser ? patientName : 'Sign in required'}</dd>
              </div>
            </dl>
            <p className="book-appointment__summary-note">
              Please arrive 15 minutes early and carry a valid photo ID.
            </p>
          </aside>
        </div>
      </main>
    </div>
  )
}
