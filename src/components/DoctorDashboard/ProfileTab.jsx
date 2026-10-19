import { useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { updateMyProfile } from '../../lib/api'
import { departmentName } from '../BookAppointment/bookingHelpers'
import { describeSaveError, fieldErrors } from './doctorHelpers'

const toForm = (profile) => ({
  experienceYears: profile.experienceYears ?? '',
  clinicName: profile.clinicName ?? '',
  clinicAddress: profile.clinicAddress ?? '',
  qualifications: (profile.qualifications ?? []).join(', '),
  bio: profile.bio ?? '',
})

// Empty text clears the field on the server.
const toPayload = (form) => ({
  experienceYears: form.experienceYears === '' ? null : Number(form.experienceYears),
  clinicName: form.clinicName.trim(),
  clinicAddress: form.clinicAddress.trim(),
  qualifications: form.qualifications
    .split(',')
    .map((q) => q.trim())
    .filter(Boolean),
  bio: form.bio.trim(),
})

export default function ProfileTab({ user, onSaved }) {
  const profile = user.doctorProfile ?? {}
  const [form, setForm] = useState(() => toForm(profile))
  const [baseline, setBaseline] = useState(() => toForm(profile))
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState(null)
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline)
  const patch = (changes) => setForm((prev) => ({ ...prev, ...changes }))

  const save = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setBanner(null)
    setErrors({})
    try {
      const updated = await updateMyProfile(toPayload(form))
      const next = toForm(updated)
      setForm(next)
      setBaseline(next)
      setBanner({ type: 'success', message: 'Profile saved.' })
      onSaved()
    } catch (err) {
      setErrors(fieldErrors(err))
      setBanner({ type: 'error', message: describeSaveError(err) })
    } finally {
      setSaving(false)
    }
  }

  const renderError = (field) =>
    errors[field] && (
      <p id={`profile-${field}-error`} className="doctor-dashboard__error">
        <AlertCircle size={13} aria-hidden="true" /> {errors[field]}
      </p>
    )
  const fieldProps = (field) => ({
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `profile-${field}-error` : undefined,
  })

  return (
    <form className="doctor-dashboard__card" onSubmit={save} noValidate>
      <div className="doctor-dashboard__card-head">
        <h2 className="doctor-dashboard__section-title">Profile</h2>
      </div>
      <p className="doctor-dashboard__note">
        Patients see this when choosing a doctor. Your name and department ({departmentName(profile.specialization)}) are
        set by the hospital.
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

      <div className="doctor-dashboard__grid">
        <div className="doctor-dashboard__field">
          <label htmlFor="profile-experience" className="doctor-dashboard__label">Years of experience</label>
          <input
            id="profile-experience"
            type="number"
            min={0}
            max={70}
            className="doctor-dashboard__input"
            value={form.experienceYears}
            onChange={(e) => patch({ experienceYears: e.target.value })}
            {...fieldProps('experienceYears')}
          />
          {renderError('experienceYears')}
        </div>
        <div className="doctor-dashboard__field">
          <label htmlFor="profile-clinic" className="doctor-dashboard__label">Clinic name</label>
          <input
            id="profile-clinic"
            type="text"
            maxLength={120}
            className="doctor-dashboard__input"
            value={form.clinicName}
            onChange={(e) => patch({ clinicName: e.target.value })}
            {...fieldProps('clinicName')}
          />
          {renderError('clinicName')}
        </div>
      </div>

      <div className="doctor-dashboard__field">
        <label htmlFor="profile-address" className="doctor-dashboard__label">Clinic address</label>
        <input
          id="profile-address"
          type="text"
          maxLength={300}
          className="doctor-dashboard__input"
          value={form.clinicAddress}
          onChange={(e) => patch({ clinicAddress: e.target.value })}
          {...fieldProps('clinicAddress')}
        />
        {renderError('clinicAddress')}
      </div>

      <div className="doctor-dashboard__field">
        <label htmlFor="profile-qualifications" className="doctor-dashboard__label">
          Qualifications <span className="doctor-dashboard__hint">(separate with commas, up to 10)</span>
        </label>
        <input
          id="profile-qualifications"
          type="text"
          className="doctor-dashboard__input"
          placeholder="MBBS, MD (Cardiology)"
          value={form.qualifications}
          onChange={(e) => patch({ qualifications: e.target.value })}
          {...fieldProps('qualifications')}
        />
        {renderError('qualifications')}
      </div>

      <div className="doctor-dashboard__field">
        <div className="doctor-dashboard__label-row">
          <label htmlFor="profile-bio" className="doctor-dashboard__label">About you</label>
          <span className="doctor-dashboard__hint">{form.bio.trim().length}/1000</span>
        </div>
        <textarea
          id="profile-bio"
          rows={5}
          maxLength={1000}
          className="doctor-dashboard__textarea"
          value={form.bio}
          onChange={(e) => patch({ bio: e.target.value })}
          {...fieldProps('bio')}
        />
        {renderError('bio')}
      </div>

      <div className="doctor-dashboard__savebar">
        <button type="submit" className="doctor-dashboard__btn doctor-dashboard__btn--primary" disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  )
}
