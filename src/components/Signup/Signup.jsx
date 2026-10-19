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
import { LIMITS, cleanText, isValidEmail, isValidFullName, normalizeEmail, passwordProblem } from '../../lib/sanitize'
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
      return 'Password must be 8–128 characters, include a letter and a number, and not match your email.'
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
  if (err.code === 'CLIENT_THROTTLED') return err.message
  if (err.status === 429) return 'Too many attempts. Please wait a minute and try again.'
  if (err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT') return err.message
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
  // Consent has to be an active choice, not a pre-ticked box.
  const [agreeTerms, setAgreeTerms] = useState(false)

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

  // Development builds only. There is deliberately no invite code here: a real
  // one in client code would let anyone register as a doctor.
  const handleQuickDemoFill = (targetRole) => {
    if (!import.meta.env.DEV) return
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
      setFullName('Emily Watson')
      setEmail(`dr.watson${randNum}@carepulse.org`)
      setPhone('9123456780')
      setPassword('Doctor@2026')
      setConfirmPassword('Doctor@2026')
      setSpecialization('Cardiology')
      setClinicName('Heart & Vascular Center')
      setSuccessMessage('Loaded Specialist demo info. Enter the invite code from administration.')
    }
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (isLoading) return

    // Client validation. The server validates again; this catches mistakes
    // early and keeps what we send clean and bounded.
    const cleanName = cleanText(fullName, { maxLength: LIMITS.fullName.max })
    const cleanEmail = normalizeEmail(email)
    const cleanPhone = phone.replace(/\D/g, '')
    const cleanInvite = cleanText(inviteCode, { maxLength: LIMITS.inviteCode })
    const cleanSpecialization = cleanText(specialization, { maxLength: LIMITS.specialization })
    const cleanClinic = cleanText(clinicName, { maxLength: LIMITS.clinicName })

    if (!cleanName) {
      setErrorMessage('Please enter your full legal name.')
      return
    }
    if (!isValidFullName(cleanName)) {
      setErrorMessage(
        `Full name must be ${LIMITS.fullName.min}–${LIMITS.fullName.max} characters and contain only letters, spaces, and . , ' -`
      )
      return
    }
    if (!isValidEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.')
      return
    }
    if (!cleanPhone) {
      setErrorMessage('Please enter your primary contact phone number.')
      return
    }
    if (!/^\d{10}$/.test(cleanPhone)) {
      setErrorMessage('Please enter a 10-digit phone number.')
      return
    }
    const weakPassword = passwordProblem(password, cleanEmail)
    if (weakPassword) {
      setErrorMessage(weakPassword)
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.')
      return
    }
    if (role === 'doctor' && !cleanInvite) {
      setErrorMessage('Doctor invite code is required to register clinical staff.')
      return
    }
    if (role === 'doctor' && !cleanSpecialization) {
      setErrorMessage('Please enter your specialization.')
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
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password,
        role: role === 'doctor' ? 'doctor' : 'patient',
        timezone,
      }

      if (role === 'doctor') {
        payload.inviteCode = cleanInvite
        payload.doctorProfile = {
          specialization: cleanSpecialization,
          clinicName: cleanClinic,
        }
      }

      const user = await register(payload)
      setPassword('')
      setConfirmPassword('')
      setInviteCode('')
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

      {/* Quick Autofill Demo Helper (development builds only) */}
      {import.meta.env.DEV && (
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
      )}

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
              maxLength={LIMITS.fullName.max}
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
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                autoComplete="email"
                maxLength={LIMITS.email}
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
                    maxLength={LIMITS.specialization}
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
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={LIMITS.inviteCode}
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
                  maxLength={LIMITS.clinicName}
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
                maxLength={LIMITS.password.max}
                placeholder="8+ characters, letters and numbers"
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
                maxLength={LIMITS.password.max}
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
