import { useState } from 'react'
import {
  HeartPulse,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Stethoscope,
  ShieldCheck,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import './Login.css'
import Signup from '../Signup/Signup'
import { login, logout, ApiError } from '../../lib/api'

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
  if (err.status === 429) return 'Too many login attempts. Please wait a minute and try again.'
  if (err.code === 'NETWORK_ERROR') return err.message
  if (err.status >= 500) return 'The server is having trouble right now. Please try again shortly.'
  return err.message || 'Unable to sign in. Please try again.'
}

export default function Login({ onLoginSuccess, hideUtilityBar = false }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [selectedRole, setSelectedRole] = useState('patient') 
  const [identifier, setIdentifier] = useState('sarah.jenkins@carepulse.org')
  const [password, setPassword] = useState('patient@2026')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Role metadata configurations
  const roleConfig = {
    patient: {
      title: 'Patient Portal Login',
      subtitle: 'Schedule appointments, view diagnostics, and track treatments.',
      identifierLabel: 'Email or Medical Record Number (MRN)',
      identifierPlaceholder: 'e.g. sarah.jenkins@carepulse.org or MRN-88201',
      demoEmail: 'sarah.jenkins@carepulse.org',
      demoPass: 'patient@2026',
      badge: 'Patient Access',
    },
    doctor: {
      title: 'Specialist & Doctor Login',
      subtitle: 'Access clinical rounds, OPD queue, and medical consultations.',
      identifierLabel: 'Hospital Physician ID or Email',
      identifierPlaceholder: 'e.g. dr.chen@carepulse.org or DOC-4091',
      demoEmail: 'dr.chen@carepulse.org',
      demoPass: 'doctor@2026',
      badge: 'Clinical Staff',
    }
  }

  const handleRoleChange = (role) => {
    setSelectedRole(role)
    setErrorMessage('')
    setSuccessMessage('')
    setIdentifier(roleConfig[role].demoEmail)
    setPassword(roleConfig[role].demoPass)
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
    setSelectedRole(role)
    setIdentifier(roleConfig[role].demoEmail)
    setPassword(roleConfig[role].demoPass)
    setErrorMessage('')
    setSuccessMessage(`Loaded ${roleConfig[role].badge} demo credentials`)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or hospital identifier.')
      return
    }

    if (!password) {
      setErrorMessage('Please enter your portal password.')
      return
    }

    setIsLoading(true)

    try {
      // The API authenticates by email/password alone; it doesn't know which
      // tab the person picked. MRN-style identifiers aren't supported yet, so
      // this only succeeds for an email + password pair.
      const user = await login({ email: identifier.trim().toLowerCase(), password })

      if (user.role !== selectedRole) {
        // Session cookie is already set for the real role; clear it so a
        // wrong-tab login doesn't leave them signed in under this tab.
        await logout().catch(() => {})
        setErrorMessage(
          `This account is registered as a ${roleConfig[user.role]?.badge ?? user.role}. ` +
            `Switch tabs and sign in there.`
        )
        return
      }

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
              <span className="login-portal__utility-status">OPD & Telehealth Services Online</span>
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
              <span className="login-portal__accreditation-pill">
                <ShieldCheck size={14} /> JCI & NABH Accredited
              </span>
            </div>

            <div className="login-portal__showcase-body">
              <div className="login-portal__hero-badge">
                <Sparkles size={14} /> Smart Healthcare & Appointment System
              </div>
              <h1 className="login-portal__showcase-title">
                Compassionate Care, Seamlessly Scheduled.
              </h1>
              <p className="login-portal__showcase-desc">
                Connect with over 250+ top specialists, book same-day outpatient appointments,
                access verified clinical laboratory reports, and manage follow-ups securely in one unified portal.
              </p>

              {/* Live Hospital Stats */}
              <div className="login-portal__stats-grid">
                <div className="login-portal__stat-item">
                  <div className="login-portal__stat-value">99.4%</div>
                  <div className="login-portal__stat-label">On-Time Appointments</div>
                </div>
                <div className="login-portal__stat-item">
                  <div className="login-portal__stat-value">&lt; 15 min</div>
                  <div className="login-portal__stat-label">Average OPD Wait</div>
                </div>
                <div className="login-portal__stat-item">
                  <div className="login-portal__stat-value">250+</div>
                  <div className="login-portal__stat-label">Senior Consultants</div>
                </div>
              </div>

              {/* Verified Feature Highlights */}
              <ul className="login-portal__feature-list">
                <li className="login-portal__feature-item">
                  <CheckCircle2 className="login-portal__feature-icon" size={18} />
                  <span>Instant slot confirmation with SMS & WhatsApp reminders</span>
                </li>
                <li className="login-portal__feature-item">
                  <CheckCircle2 className="login-portal__feature-icon" size={18} />
                  <span>Encrypted digital health records accessible 24/7</span>
                </li>
                <li className="login-portal__feature-item">
                  <CheckCircle2 className="login-portal__feature-icon" size={18} />
                  <span>Integrated electronic prescriptions and diagnostic booking</span>
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

              {/* One-Click Quick Demo Autofill Strip */}
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
                      type="text"
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
                    <a href="#forgot" className="login-portal__forgot-link">
                      Forgot Password?
                    </a>
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
            <a href="#privacy" className="login-portal__footer-link">Privacy Policy</a>
            <span className="login-portal__footer-sep">|</span>
            <a href="#terms" className="login-portal__footer-link">Terms of Service</a>
            <span className="login-portal__footer-sep">|</span>
            <a href="#support" className="login-portal__footer-link">Helpdesk & IT Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
