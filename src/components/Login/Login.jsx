import { useState } from 'react'
import {
  HeartPulse,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Stethoscope,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import './Login.css'
import Signup from '../Signup/Signup'
import { login, logout, ApiError } from '../../lib/api'
import { LIMITS, isValidEmail, normalizeEmail } from '../../lib/sanitize'
import { EMAIL } from '../Landing/landingData'

// Seeded demo accounts for local development only. Vite replaces
// import.meta.env.DEV with false in production builds, so these strings
// are dropped from the shipped bundle and the form starts empty.
const DEMO_CREDENTIALS = import.meta.env.DEV
  ? {
      patient: { email: 'sarah.jenkins@carepulse.org', password: 'patient@2026' },
      doctor: { email: 'dr.chen@carepulse.org', password: 'doctor@2026' },
    }
  : null

// Maps backend error codes (docs/architecture/04-api-specification.md §4.1) to
// copy that fits this form. Falls back to the server's own message.
function describeLoginError(err) {
  if (!(err instanceof ApiError)) return 'Unable to sign in. Please try again.'
  if (err.code === 'INVALID_CREDENTIALS') return 'Incorrect email or password. Please try again.'
  if (err.code === 'VALIDATION_FAILED') {
    return err.details?.some((d) => d.path === 'email')
      ? 'Please enter a valid email address.'
      : 'Please check your details and try again.'
  }
  if (err.code === 'CLIENT_THROTTLED') return err.message
  if (err.status === 429) return 'Too many login attempts. Please wait a minute and try again.'
  if (err.code === 'TIMEOUT') return err.message
  if (err.code === 'NETWORK_ERROR') return err.message
  if (err.status >= 500) return 'The server is having trouble right now. Please try again shortly.'
  return err.message || 'Unable to sign in. Please try again.'
}

export default function Login({ onLoginSuccess, onForgotPassword, hideUtilityBar = false }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [selectedRole, setSelectedRole] = useState('patient') 
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Role metadata configurations
  const roleConfig = {
    patient: {
      title: 'Patient Portal Login',
      subtitle: 'Schedule appointments, view diagnostics, and track treatments.',
      identifierLabel: 'Email Address',
      identifierPlaceholder: 'e.g. name@example.com',
      badge: 'Patient Access',
    },
    doctor: {
      title: 'Specialist & Doctor Login',
      subtitle: 'Access clinical rounds, OPD queue, and medical consultations.',
      identifierLabel: 'Hospital Email',
      identifierPlaceholder: 'e.g. name@example.com',
      badge: 'Clinical Staff',
    }
  }

  const handleRoleChange = (role) => {
    setSelectedRole(role)
    setErrorMessage('')
    setSuccessMessage('')
    // Don't carry a typed password across to the other portal.
    setPassword('')
  }

  const handleFlipToSignup = () => {
    setIsFlipped(true)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleFlipToLogin = () => {
    setIsFlipped(false)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleQuickDemoFill = (role) => {
    if (!DEMO_CREDENTIALS) return
    setSelectedRole(role)
    setIdentifier(DEMO_CREDENTIALS[role].email)
    setPassword(DEMO_CREDENTIALS[role].password)
    setErrorMessage('')
    setSuccessMessage(`Loaded ${roleConfig[role].badge} demo credentials`)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (isLoading) return

    const email = normalizeEmail(identifier)
    if (!email) {
      setErrorMessage('Please enter your email address.')
      return
    }
    if (!isValidEmail(email)) {
      setErrorMessage('Please enter a valid email address.')
      return
    }

    if (!password) {
      setErrorMessage('Please enter your portal password.')
      return
    }
    if (password.length > LIMITS.password.max) {
      setErrorMessage('Incorrect email or password. Please try again.')
      return
    }

    setIsLoading(true)

    try {
      // The API authenticates by email/password alone; it doesn't know which
      // tab the person picked.
      const user = await login({ email, password })

      // Admins sign in from either tab and land on the admin workspace.
      if (user.role !== selectedRole && user.role !== 'admin') {
        // Session cookie is already set for the real role; clear it so a
        // wrong-tab login doesn't leave them signed in under this tab.
        await logout().catch(() => {})
        setErrorMessage(
          `This account is registered as a ${roleConfig[user.role]?.badge ?? 'different role'}. ` +
            `Switch tabs and sign in there.`
        )
        return
      }

      setPassword('')

      setSuccessMessage(`Welcome back! Authenticated as ${roleConfig[selectedRole].badge}.`)
      if (onLoginSuccess) {
        onLoginSuccess({ role: user.role, identifier: user.email, user })
      }
    } catch (err) {
      setErrorMessage(describeLoginError(err))
    } finally {
      setIsLoading(false)
    }
  }

  const activeRoleData = roleConfig[selectedRole]

  return (
    <div className="login-portal">
      {/* Top Utility & Emergency Bar (hidden when global Navbar is active) */}
      {!hideUtilityBar && (
        <header className="login-portal__utility-bar">
          <div className="login-portal__utility-container">
            <div className="login-portal__utility-left">
              <span className="login-portal__utility-pulse"></span>
              <span className="login-portal__utility-status">Outpatient clinics Mon–Sat, 8 am – 8 pm</span>
            </div>
            <div className="login-portal__utility-right">
              <a href="tel:18004273785" className="login-portal__emergency-link">
                <PhoneCall className="login-portal__emergency-icon" size={14} />
                <span>24/7 Emergency Dispatch: <strong>1-800-CARE-911</strong></span>
              </a>
            </div>
          </div>
        </header>
      )}

      {/* Main Container */}
      <main className="login-portal__main">
        <div className="login-portal__container">
          
          {/* Visual Showcase Panel (Desktop/Tablet) */}
          <section className="login-portal__showcase" aria-label="Dr Sahayak Features">
            <div className="login-portal__showcase-glow"></div>
            
            <div className="login-portal__showcase-header">
              <div className="login-portal__brand-tag">
                <HeartPulse className="login-portal__brand-icon" size={24} />
                <span className="login-portal__brand-name">Dr Sahayak</span>
              </div>
            </div>

            <div className="login-portal__showcase-body">
              <div className="login-portal__hero-badge">
                <Sparkles size={14} /> Online appointment booking
              </div>
              <h1 className="login-portal__showcase-title">
                Compassionate Care, Seamlessly Scheduled.
              </h1>
              <p className="login-portal__showcase-desc">
                Book the consultant you want at a time that’s really free on their calendar, get an
                email confirmation and a reminder the day before, and move or cancel online.
              </p>

              {/* Plain facts about the service */}
              <div className="login-portal__stats-grid">
                <div className="login-portal__stat-item">
                  <div className="login-portal__stat-value">6</div>
                  <div className="login-portal__stat-label">Departments</div>
                </div>
                <div className="login-portal__stat-item">
                  <div className="login-portal__stat-value">Mon–Sat</div>
                  <div className="login-portal__stat-label">Outpatient clinics</div>
                </div>
                <div className="login-portal__stat-item">
                  <div className="login-portal__stat-value">24/7</div>
                  <div className="login-portal__stat-label">Emergency unit</div>
                </div>
              </div>

              {/* Verified Feature Highlights */}
              <ul className="login-portal__feature-list">
                <li className="login-portal__feature-item">
                  <CheckCircle2 className="login-portal__feature-icon" size={18} />
                  <span>Email confirmation, plus a reminder the day before</span>
                </li>
                <li className="login-portal__feature-item">
                  <CheckCircle2 className="login-portal__feature-icon" size={18} />
                  <span>Choose your doctor by name and see their real free times</span>
                </li>
                <li className="login-portal__feature-item">
                  <CheckCircle2 className="login-portal__feature-icon" size={18} />
                  <span>Ask to reschedule or cancel from your account</span>
                </li>
              </ul>
            </div>

          </section>

          {/* Interactive 3D Flipper Panel: Front is Login, Back is Signup */}
          <section className="login-portal__form-panel">
            <div className={`login-portal__flipper-wrapper ${isFlipped ? 'login-portal__flipper-wrapper--flipped' : ''}`}>
              <div className="login-portal__flipper">
                {/* Front Face: Login Card */}
                <div
                  className="login-portal__flipper-face login-portal__flipper-face--front"
                  aria-hidden={isFlipped}
                >
                  <div className="login-portal__form-card">
                    {/* Form Card Header */}
                    <div className="login-portal__card-header">
                <div className="login-portal__card-brand-mobile">
                  <HeartPulse className="login-portal__brand-icon" size={26} />
                  <span className="login-portal__brand-name">Dr Sahayak</span>
                </div>

                <div className="login-portal__card-badge">
                  <span className="login-portal__badge-dot"></span>
                  {activeRoleData.badge}
                </div>
                <h2 className="login-portal__card-title">{activeRoleData.title}</h2>
                <p className="login-portal__card-subtitle">{activeRoleData.subtitle}</p>
              </div>

              {/* Role Switcher Tabs */}
              <div className="login-portal__role-switcher" role="tablist" aria-label="Portal Role Selector">
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedRole === 'patient'}
                  className={`login-portal__role-btn ${selectedRole === 'patient' ? 'login-portal__role-btn--active' : ''}`}
                  onClick={() => handleRoleChange('patient')}
                >
                  <User size={16} className="login-portal__role-icon" />
                  <span>Patient</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedRole === 'doctor'}
                  className={`login-portal__role-btn ${selectedRole === 'doctor' ? 'login-portal__role-btn--active' : ''}`}
                  onClick={() => handleRoleChange('doctor')}
                >
                  <Stethoscope size={16} className="login-portal__role-icon" />
                  <span>Doctor</span>
                </button>
              </div>

              {/* One-Click Quick Demo Autofill Strip (development builds only) */}
              {DEMO_CREDENTIALS && (
                <div className="login-portal__demo-strip">
                  <span className="login-portal__demo-caption">Quick Demo Fill:</span>
                  <div className="login-portal__demo-actions">
                    <button
                      type="button"
                      className="login-portal__demo-pill"
                      onClick={() => handleQuickDemoFill('patient')}
                    >
                      Patient
                    </button>
                    <button
                      type="button"
                      className="login-portal__demo-pill"
                      onClick={() => handleQuickDemoFill('doctor')}
                    >
                      Doctor
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications / Alerts */}
              {errorMessage && (
                <div className="login-portal__alert login-portal__alert--error" role="alert">
                  <AlertCircle size={18} className="login-portal__alert-icon" />
                  <span className="login-portal__alert-text">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="login-portal__alert login-portal__alert--success" role="status">
                  <CheckCircle2 size={18} className="login-portal__alert-icon" />
                  <span className="login-portal__alert-text">{successMessage}</span>
                </div>
              )}

              <form className="login-portal__form" onSubmit={handleSubmit} noValidate>
                
                {/* Field 1: Identifier */}
                <div className="login-portal__field">
                  <label htmlFor="portal-identifier" className="login-portal__label">
                    {activeRoleData.identifierLabel}
                  </label>
                  <div className="login-portal__input-wrapper">
                    <span className="login-portal__input-adornment">
                      <Mail size={18} />
                    </span>
                    <input
                      id="portal-identifier"
                      name="identifier"
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={LIMITS.email}
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={activeRoleData.identifierPlaceholder}
                      className="login-portal__input"
                      required
                    />
                  </div>
                </div>

                {/* Field 2: Password */}
                <div className="login-portal__field">
                  <div className="login-portal__label-row">
                    <label htmlFor="portal-password" className="login-portal__label">
                      Password
                    </label>
                    <button type="button" className="login-portal__forgot-link" onClick={onForgotPassword}>
                      Forgot Password?
                    </button>
                  </div>
                  <div className="login-portal__input-wrapper">
                    <span className="login-portal__input-adornment">
                      <Lock size={18} />
                    </span>
                    <input
                      id="portal-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      maxLength={LIMITS.password.max}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="login-portal__input"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="login-portal__visibility-toggle"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`login-portal__submit-btn ${isLoading ? 'login-portal__submit-btn--loading' : ''}`}
                >
                  {isLoading ? (
                    <>
                      <span className="login-portal__spinner" aria-hidden="true"></span>
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Portal</span>
                      <ArrowRight size={18} className="login-portal__btn-arrow" />
                    </>
                  )}
                </button>
              </form>

              {/* Patient Registration Callout - Triggers 3D Flip */}
              <div className="login-portal__register-prompt">
                <p>
                  Visiting Dr Sahayak for the first time?{' '}
                  <button
                    type="button"
                    className="login-portal__register-link"
                    onClick={handleFlipToSignup}
                  >
                    Register New Patient Profile
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Back Face: Signup Card */}
          <div
            className="login-portal__flipper-face login-portal__flipper-face--back"
            aria-hidden={!isFlipped}
          >
            <Signup
              onFlipToLogin={handleFlipToLogin}
              onRegisterSuccess={onLoginSuccess}
            />
          </div>

        </div>
      </div>
    </section>

        </div>
      </main>

      {/* Hospital Footer */}
      <footer className="login-portal__footer">
        <div className="login-portal__footer-container">
          <p className="login-portal__copyright">
            © {new Date().getFullYear()} Dr Sahayak. All medical data is protected under patient confidentiality protocols.
          </p>
          <div className="login-portal__footer-links">
            <a href="/privacy" className="login-portal__footer-link">Privacy Policy</a>
            <span className="login-portal__footer-sep">|</span>
            <a href="/terms" className="login-portal__footer-link">Terms of Use</a>
            <span className="login-portal__footer-sep">|</span>
            <a href={`mailto:${EMAIL}`} className="login-portal__footer-link">Help: {EMAIL}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
