import { useState } from 'react'
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, UserCog } from 'lucide-react'
import { ApiError, changePassword, updateMe } from '../../lib/api'
import { LIMITS, cleanText, isValidFullName, passwordProblem } from '../../lib/sanitize'
import { timeZoneOptions } from '../DoctorDashboard/doctorHelpers'
import '../DoctorDashboard/DoctorDashboard.css'
import './Account.css'

const GENDERS = [
  { id: '', label: 'Not specified' },
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'other', label: 'Other' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say' },
]

function describeError(err) {
  if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.'
  if (['NETWORK_ERROR', 'TIMEOUT', 'CLIENT_THROTTLED'].includes(err.code)) return err.message
  if (err.status === 429) return 'Too many attempts. Please wait a few minutes.'
  if (err.code === 'VALIDATION_FAILED') return err.details?.[0]?.message ?? 'Please check the highlighted fields.'
  return err.message || 'Something went wrong. Please try again.'
}

const toForm = (user) => ({
  fullName: user.fullName ?? '',
  phone: user.phone ?? '',
  timezone: user.timezone ?? '',
  dateOfBirth: user.patientProfile?.dateOfBirth ?? '',
  gender: user.patientProfile?.gender ?? '',
})

function Banner({ banner }) {
  if (!banner) return null
  const isError = banner.type === 'error'
  return (
    <div
      className={`doctor-dashboard__banner ${isError ? 'doctor-dashboard__banner--error' : 'doctor-dashboard__banner--success'}`}
      role={isError ? 'alert' : 'status'}
    >
      {isError ? <AlertCircle size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
      <span>{banner.message}</span>
    </div>
  )
}

function ProfileForm({ user, onUserUpdated }) {
  const isPatient = user.role === 'patient'
  const [form, setForm] = useState(() => toForm(user))
  const [baseline, setBaseline] = useState(() => toForm(user))
  const [banner, setBanner] = useState(null)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline)
  const patch = (changes) => setForm((prev) => ({ ...prev, ...changes }))
  const today = new Date().toISOString().slice(0, 10)

  const save = async (e) => {
    e.preventDefault()
    if (saving || !dirty) return
    const fullName = cleanText(form.fullName, { maxLength: LIMITS.fullName.max })
    const phone = form.phone.replace(/\D/g, '')
    if (!isValidFullName(fullName)) {
      setBanner({ type: 'error', message: "Name must be 2-100 letters and may include spaces and . , ' -" })
      return
    }
    if (phone && phone.length !== 10) {
      setBanner({ type: 'error', message: 'Phone number must be 10 digits.' })
      return
    }

    // Send only what changed; an emptied optional field is cleared with null.
    const changes = {}
    if (fullName !== baseline.fullName) changes.fullName = fullName
    if (phone !== baseline.phone) changes.phone = phone || null
    if (form.timezone && form.timezone !== baseline.timezone) changes.timezone = form.timezone
    if (isPatient) {
      const profile = {}
      if (form.dateOfBirth !== baseline.dateOfBirth) profile.dateOfBirth = form.dateOfBirth || null
      if (form.gender !== baseline.gender) profile.gender = form.gender || null
      if (Object.keys(profile).length) changes.patientProfile = profile
    }
    if (Object.keys(changes).length === 0) return

    setSaving(true)
    setBanner(null)
    try {
      const updated = await updateMe(changes)
      const next = toForm(updated)
      setForm(next)
      setBaseline(next)
      onUserUpdated(updated)
      setBanner({ type: 'success', message: 'Profile saved.' })
    } catch (err) {
      setBanner({ type: 'error', message: describeError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="doctor-dashboard__card" onSubmit={save} noValidate>
      <div className="doctor-dashboard__card-head">
        <h2 className="doctor-dashboard__section-title">
          <UserCog size={18} aria-hidden="true" /> Profile
        </h2>
      </div>
      <Banner banner={banner} />

      <div className="doctor-dashboard__grid">
        <div className="doctor-dashboard__field">
          <label htmlFor="account-name" className="doctor-dashboard__label">Full name</label>
          <input
            id="account-name"
            className="doctor-dashboard__input"
            autoComplete="name"
            maxLength={LIMITS.fullName.max}
            value={form.fullName}
            onChange={(e) => patch({ fullName: e.target.value })}
          />
        </div>
        <div className="doctor-dashboard__field">
          <label htmlFor="account-email" className="doctor-dashboard__label">Email</label>
          <input id="account-email" className="doctor-dashboard__input" value={user.email} readOnly aria-describedby="account-email-hint" />
          <span id="account-email-hint" className="doctor-dashboard__hint">Contact the hospital to change your sign-in email.</span>
        </div>
        <div className="doctor-dashboard__field">
          <label htmlFor="account-phone" className="doctor-dashboard__label">Phone</label>
          <input
            id="account-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            className="doctor-dashboard__input"
            maxLength={10}
            value={form.phone}
            onChange={(e) => patch({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
          />
        </div>
        <div className="doctor-dashboard__field">
          <label htmlFor="account-tz" className="doctor-dashboard__label">Time zone</label>
          <select
            id="account-tz"
            className="doctor-dashboard__input"
            value={form.timezone}
            onChange={(e) => patch({ timezone: e.target.value })}
          >
            {!form.timezone && <option value="">Not set</option>}
            {timeZoneOptions(form.timezone).map((zone) => (
              <option key={zone} value={zone}>
                {zone.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        {isPatient && (
          <>
            <div className="doctor-dashboard__field">
              <label htmlFor="account-dob" className="doctor-dashboard__label">Date of birth</label>
              <input
                id="account-dob"
                type="date"
                className="doctor-dashboard__input"
                min="1900-01-01"
                max={today}
                value={form.dateOfBirth}
                onChange={(e) => patch({ dateOfBirth: e.target.value })}
              />
            </div>
            <div className="doctor-dashboard__field">
              <label htmlFor="account-gender" className="doctor-dashboard__label">Gender</label>
              <select
                id="account-gender"
                className="doctor-dashboard__input"
                value={form.gender}
                onChange={(e) => patch({ gender: e.target.value })}
              >
                {GENDERS.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {user.role === 'doctor' && (
        <p className="doctor-dashboard__note">Your clinic details, bio and schedule are edited on the doctor dashboard.</p>
      )}

      <div className="doctor-dashboard__savebar">
        <button type="submit" className="doctor-dashboard__btn doctor-dashboard__btn--primary" disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  )
}

function PasswordForm({ user, onUserUpdated }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [banner, setBanner] = useState(null)
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    if (saving) return
    const problem = passwordProblem(next, user.email)
    if (!current) return setBanner({ type: 'error', message: 'Enter your current password.' })
    if (problem) return setBanner({ type: 'error', message: problem })
    if (next !== confirm) return setBanner({ type: 'error', message: 'The new passwords don’t match.' })
    if (next === current) return setBanner({ type: 'error', message: 'Choose a password you haven’t used here before.' })

    setSaving(true)
    setBanner(null)
    try {
      const updated = await changePassword({ currentPassword: current, newPassword: next })
      setCurrent('')
      setNext('')
      setConfirm('')
      onUserUpdated(updated)
      setBanner({ type: 'success', message: 'Password changed. You’ve been signed out on your other devices.' })
    } catch (err) {
      setBanner({
        type: 'error',
        message: err?.code === 'INVALID_CREDENTIALS' ? 'Your current password is incorrect.' : describeError(err),
      })
    } finally {
      setSaving(false)
    }
  }

  const type = show ? 'text' : 'password'
  return (
    <form className="doctor-dashboard__card" onSubmit={save} noValidate>
      <div className="doctor-dashboard__card-head">
        <h2 className="doctor-dashboard__section-title">
          <KeyRound size={18} aria-hidden="true" /> Password
        </h2>
        <button
          type="button"
          className="doctor-dashboard__icon-btn"
          aria-label={show ? 'Hide passwords' : 'Show passwords'}
          onClick={() => setShow((value) => !value)}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <Banner banner={banner} />
      {/* Lets password managers pair the new password with this account. */}
      <input type="text" autoComplete="username" value={user.email} readOnly hidden />
      <div className="doctor-dashboard__grid doctor-dashboard__grid--3">
        <div className="doctor-dashboard__field">
          <label htmlFor="pw-current" className="doctor-dashboard__label">Current password</label>
          <input
            id="pw-current"
            type={type}
            autoComplete="current-password"
            className="doctor-dashboard__input"
            maxLength={LIMITS.password.max}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="doctor-dashboard__field">
          <label htmlFor="pw-new" className="doctor-dashboard__label">New password</label>
          <input
            id="pw-new"
            type={type}
            autoComplete="new-password"
            className="doctor-dashboard__input"
            maxLength={LIMITS.password.max}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <span className="doctor-dashboard__hint">8+ characters with a letter and a number</span>
        </div>
        <div className="doctor-dashboard__field">
          <label htmlFor="pw-confirm" className="doctor-dashboard__label">Repeat new password</label>
          <input
            id="pw-confirm"
            type={type}
            autoComplete="new-password"
            className="doctor-dashboard__input"
            maxLength={LIMITS.password.max}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
      </div>
      <div className="doctor-dashboard__savebar">
        <button type="submit" className="doctor-dashboard__btn doctor-dashboard__btn--primary" disabled={saving}>
          {saving ? 'Changing…' : 'Change password'}
        </button>
      </div>
    </form>
  )
}

/**
 * Signed-in user's own settings: profile and password.
 * @param onUserUpdated (userDTO) => void, so the navbar and session pick up changes
 */
export default function AccountPage({ currentUser, onUserUpdated, onBack }) {
  const user = currentUser.user
  return (
    <div className="doctor-dashboard">
      <main className="doctor-dashboard__main account-page">
        <header className="doctor-dashboard__header">
          <div>
            <div className="doctor-dashboard__tag">Account</div>
            <h1 className="doctor-dashboard__title">Settings</h1>
            <p className="doctor-dashboard__subtitle-line">Signed in as {user.email}</p>
          </div>
          <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--secondary" onClick={onBack}>
            <ArrowLeft size={14} aria-hidden="true" /> Back to dashboard
          </button>
        </header>
        <ProfileForm user={user} onUserUpdated={onUserUpdated} />
        <PasswordForm user={user} onUserUpdated={onUserUpdated} />
      </main>
    </div>
  )
}
