import { useState } from 'react'
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Stethoscope,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building,
  HeartPulse,
} from 'lucide-react'
import { register, ApiError } from '../../lib/api'
import './Signup.css'

function describeSignupError(err) {
  if (!(err instanceof ApiError)) return 'Unable to create account. Please try again.'
  if (err.code === 'EMAIL_ALREADY_REGISTERED') {
    return 'This email is already registered. Please flip back to sign in.'
  }
  if (err.code === 'INVALID_INVITE_CODE') {
    return 'Invalid physician invite code. Please contact hospital administration.'
  }
  if (err.code === 'VALIDATION_FAILED') {
    if (err.details?.some((d) => d.path === 'password')) {
      return 'Password must be at least 8 characters long and not match your email.'
    }
    if (err.details?.some((d) => d.path === 'email')) {
      return 'Please enter a valid email address.'
    }
    if (err.details?.some((d) => d.path === 'fullName')) {
      return 'Full name must be at least 2 characters.'
    }
    if (err.details?.some((d) => d.path === 'phone')) {
      return 'Phone number must contain at most 10 digits.'
    }
    return err.details?.[0]?.message || 'Please verify the highlighted fields.'
  }
  if (err.status === 429) return 'Too many attempts. Please wait a minute and try again.'
  if (err.code === 'NETWORK_ERROR') return err.message
  if (err.status >= 500) return 'The hospital server is busy. Please try again in a moment.'
  return err.message || 'Registration failed. Please try again.'
}

export default function Signup({ onFlipToLogin, onRegisterSuccess }) {
  const [role, setRole] = useState('patient') // 'patient' | 'doctor'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(true)

  // Doctor-specific fields (if registering as a hospital physician)
  const [inviteCode, setInviteCode] = useState('')
  const [specialization, setSpecialization] = useState('General Medicine')
  const [clinicName, setClinicName] = useState('Dr Sahayak Main OPD')

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleRoleChange = (newRole) => {
    setRole(newRole)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleQuickDemoFill = (targetRole) => {
    setRole(targetRole)
    setErrorMessage('')
    setSuccessMessage('')
    if (targetRole === 'patient') {
      const randNum = Math.floor(1000 + Math.random() * 9000)
      setFullName('David Miller')
      setEmail(`david.m${randNum}@example.com`)
      setPhone('9876543210')
      setPassword('Hospital@2026')
      setConfirmPassword('Hospital@2026')
      setSuccessMessage('Loaded Patient registration demo info')
    } else {
      const randNum = Math.floor(100 + Math.random() * 900)
      setFullName('Dr. Emily Watson, MD')
      setEmail(`dr.watson${randNum}@carepulse.org`)
      setPhone('9123456780')
      setPassword('Doctor@2026')
      setConfirmPassword('Doctor@2026')
      setSpecialization('Cardiology')
      setClinicName('Heart & Vascular Center')
      setInviteCode('DOC-CARE-2026')
      setSuccessMessage('Loaded Specialist demo info')
    }
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    // Client validation
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full legal name.')
      return
    }
    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address.')
      return
    }
    if (!phone.trim()) {
      setErrorMessage('Please enter your primary contact phone number.')
      return
    }
    if (!/^\d{1,10}$/.test(phone.trim())) {
      setErrorMessage('Phone number must contain digits only, up to 10 digits.')
      return
    }
    if (!password) {
      setErrorMessage('Please enter a secure password (min 8 characters).')
      return
    }
    if (password.length < 8) {
      setErrorMessage('Password must contain at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.')
      return
    }
    if (role === 'doctor' && !inviteCode.trim()) {
      setErrorMessage('Doctor invite code is required to register clinical staff.')
      return
    }
    if (!agreeTerms) {
      setErrorMessage('You must agree to patient confidentiality and terms of service.')
      return
    }

    setIsLoading(true)

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

      const payload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        role,
        timezone,
      }

      if (role === 'doctor') {
        payload.inviteCode = inviteCode.trim()
        payload.doctorProfile = {
          specialization: specialization.trim(),
          clinicName: clinicName.trim(),
        }
      }

      const user = await register(payload)
      setSuccessMessage(`Account created successfully! Welcome to Dr Sahayak, ${user.fullName}.`)

      if (onRegisterSuccess) {
        setTimeout(() => {
          onRegisterSuccess({
            role: user.role,
            identifier: user.email,
            user,
          })
        }, 800)
      }
    } catch (err) {
      setErrorMessage(describeSignupError(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="signup-card">
      {/* Top Header & Back to Login Flip Trigger */}
      <div className="signup-card__header">
        <div className="signup-card__top-bar">
          <button
            type="button"
            className="signup-card__flip-back-btn"
            onClick={onFlipToLogin}
            title="Flip back to Sign In"
          >
            <ArrowLeft size={16} />
            <span>Back to Sign In</span>
          </button>

          <span className="signup-card__security-pill">
            <ShieldCheck size={13} /> 256-Bit Vault
          </span>
        </div>

        <div className="signup-card__brand-row">
          <HeartPulse className="signup-card__brand-icon" size={24} />
          <span className="signup-card__brand-title">Dr Sahayak Portal</span>
        </div>

        <h2 className="signup-card__title">Create Patient Profile</h2>
        <p className="signup-card__subtitle">
          Register to book hospital appointments, view clinical prescriptions, and manage medical records.
        </p>
      </div>

      {/* Role Selection Tabs */}
      <div className="signup-card__role-switcher" role="tablist" aria-label="Registration Role">
        <button
          type="button"
          role="tab"
          aria-selected={role === 'patient'}
          className={`signup-card__role-btn ${role === 'patient' ? 'signup-card__role-btn--active' : ''}`}
          onClick={() => handleRoleChange('patient')}
        >
          <User size={15} />
          <span>Patient Registration</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={role === 'doctor'}
          className={`signup-card__role-btn ${role === 'doctor' ? 'signup-card__role-btn--active' : ''}`}
          onClick={() => handleRoleChange('doctor')}
        >
          <Stethoscope size={15} />
          <span>Physician / Doctor</span>
        </button>
      </div>

      {/* Quick Autofill Demo Helper */}
      <div className="signup-card__demo-strip">
        <span className="signup-card__demo-caption">Quick Demo Fill:</span>
        <div className="signup-card__demo-actions">
          <button
            type="button"
            className="signup-card__demo-pill"
            onClick={() => handleQuickDemoFill('patient')}
          >
            Patient Data
          </button>
          <button
            type="button"
            className="signup-card__demo-pill"
            onClick={() => handleQuickDemoFill('doctor')}
          >
            Doctor Data
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="signup-card__alert signup-card__alert--error" role="alert">
          <AlertCircle size={17} className="signup-card__alert-icon" />
          <span className="signup-card__alert-text">{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="signup-card__alert signup-card__alert--success" role="status">
          <CheckCircle2 size={17} className="signup-card__alert-icon" />
          <span className="signup-card__alert-text">{successMessage}</span>
        </div>
      )}

      {/* Registration Form */}
      <form className="signup-card__form" onSubmit={handleSubmit} noValidate>
        
        {/* Full Legal Name */}
        <div className="signup-card__field">
          <label htmlFor="reg-fullname" className="signup-card__label">
            Full Legal Name
          </label>
          <div className="signup-card__input-wrapper">
            <span className="signup-card__input-adornment">
              <User size={17} />
            </span>
            <input
              id="reg-fullname"
              type="text"
              autoComplete="name"
              placeholder="e.g. Sarah Jenkins"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="signup-card__input"
              required
            />
          </div>
        </div>

        {/* 2-Column Row: Email & Phone */}
        <div className="signup-card__grid-row">
          {/* Email */}
          <div className="signup-card__field">
            <label htmlFor="reg-email" className="signup-card__label">
              Email Address
            </label>
            <div className="signup-card__input-wrapper">
              <span className="signup-card__input-adornment">
                <Mail size={17} />
              </span>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="signup-card__input"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div className="signup-card__field">
            <label htmlFor="reg-phone" className="signup-card__label">
              Phone Number
            </label>
            <div className="signup-card__input-wrapper">
              <span className="signup-card__input-adornment">
                <Phone size={17} />
              </span>
              <input
                id="reg-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
                className="signup-card__input"
                required
              />
            </div>
          </div>
        </div>

        {/* Doctor Specific Section (if selected) */}
        {role === 'doctor' && (
          <div className="signup-card__doctor-section">
            <div className="signup-card__grid-row">
              <div className="signup-card__field">
                <label htmlFor="reg-specialization" className="signup-card__label">
                  Specialization
                </label>
                <div className="signup-card__input-wrapper">
                  <span className="signup-card__input-adornment">
                    <Stethoscope size={17} />
                  </span>
                  <input
                    id="reg-specialization"
                    type="text"
                    placeholder="e.g. Cardiology"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="signup-card__input"
                    required
                  />
                </div>
              </div>

              <div className="signup-card__field">
                <label htmlFor="reg-invite" className="signup-card__label">
                  Physician Invite Code
                </label>
                <div className="signup-card__input-wrapper">
                  <span className="signup-card__input-adornment">
                    <ShieldCheck size={17} />
                  </span>
                  <input
                    id="reg-invite"
                    type="text"
                    placeholder="DOC-••••-••••"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="signup-card__input"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="signup-card__field">
              <label htmlFor="reg-clinic" className="signup-card__label">
                Department / Clinic Name
              </label>
              <div className="signup-card__input-wrapper">
                <span className="signup-card__input-adornment">
                  <Building size={17} />
                </span>
                <input
                  id="reg-clinic"
                  type="text"
                  placeholder="e.g. Department of Internal Medicine"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="signup-card__input"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Row: Password & Confirm Password */}
        <div className="signup-card__grid-row">
          {/* Password */}
          <div className="signup-card__field">
            <label htmlFor="reg-pass" className="signup-card__label">
              Create Password
            </label>
            <div className="signup-card__input-wrapper">
              <span className="signup-card__input-adornment">
                <Lock size={17} />
              </span>
              <input
                id="reg-pass"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="signup-card__input"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="signup-card__visibility-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="signup-card__field">
            <label htmlFor="reg-confirm-pass" className="signup-card__label">
              Confirm Password
            </label>
            <div className="signup-card__input-wrapper">
              <span className="signup-card__input-adornment">
                <Lock size={17} />
              </span>
              <input
                id="reg-confirm-pass"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="signup-card__input"
                required
              />
            </div>
          </div>
        </div>

        {/* Terms Consent Checkbox */}
        <div className="signup-card__terms-row">
          <label className="signup-card__checkbox-label">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="signup-card__checkbox"
            />
            <span className="signup-card__checkbox-text">
              I agree to the Dr Sahayak <a href="#terms" className="signup-card__link">Terms of Service</a> &{' '}
              <a href="#privacy" className="signup-card__link">Patient Privacy Policy</a>.
            </span>
          </label>
        </div>

        {/* Submit Registration Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`signup-card__submit-btn ${isLoading ? 'signup-card__submit-btn--loading' : ''}`}
        >
          {isLoading ? (
            <>
              <span className="signup-card__spinner" aria-hidden="true"></span>
              <span>Creating Your Account...</span>
            </>
          ) : (
            <>
              <span>Complete Registration</span>
              <ArrowRight size={17} className="signup-card__btn-arrow" />
            </>
          )}
        </button>
      </form>

      {/* Footer Switch Prompt to Flip to Login */}
      <div className="signup-card__footer">
        <p className="signup-card__footer-prompt">
          Already registered with Dr Sahayak?{' '}
          <button
            type="button"
            className="signup-card__flip-link"
            onClick={onFlipToLogin}
          >
            Sign In to Your Account
          </button>
        </p>
      </div>
    </div>
  )
}
