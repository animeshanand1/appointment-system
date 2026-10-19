import { useEffect, useState } from 'react'
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Mail } from 'lucide-react'
import { ApiError, forgotPassword, resetPassword } from '../../lib/api'
import { LIMITS, isValidEmail, normalizeEmail, passwordProblem } from '../../lib/sanitize'
import './Account.css'

function describeError(err) {
  if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.'
  if (err.code === 'INVALID_RESET_TOKEN') return 'This reset link is invalid or has expired. Request a new one.'
  if (['NETWORK_ERROR', 'TIMEOUT', 'CLIENT_THROTTLED'].includes(err.code)) return err.message
  if (err.status === 429) return 'Too many attempts. Please wait a few minutes and try again.'
  if (err.code === 'VALIDATION_FAILED') return err.details?.[0]?.message ?? 'Please check what you entered.'
  return err.message || 'Something went wrong. Please try again.'
}

function Shell({ icon: Icon, title, subtitle, children, onBack }) {
  return (
    <div className="recovery">
      <div className="recovery__card">
        <button type="button" className="recovery__back" onClick={onBack}>
          <ArrowLeft size={15} aria-hidden="true" /> Back to sign in
        </button>
        <span className="recovery__icon" aria-hidden="true">
          <Icon size={22} />
        </span>
        <h1 className="recovery__title">{title}</h1>
        <p className="recovery__subtitle">{subtitle}</p>
        {children}
      </div>
    </div>
  )
}

export function ForgotPasswordPage({ onBack }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (pending) return
    const clean = normalizeEmail(email)
    if (!isValidEmail(clean)) {
      setError('Please enter a valid email address.')
      return
    }
    setPending(true)
    setError('')
    try {
      setSent(await forgotPassword(clean))
    } catch (err) {
      setError(describeError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <Shell
      icon={Mail}
      title="Forgot your password?"
      subtitle="Enter the email you signed up with and we’ll send you a link to choose a new one."
      onBack={onBack}
    >
      {sent ? (
        <div className="recovery__message recovery__message--ok" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{sent} The link works once and expires in 30 minutes. Check your spam folder if it doesn’t arrive.</span>
        </div>
      ) : (
        <form className="recovery__form" onSubmit={submit} noValidate>
          {error && (
            <div className="recovery__message recovery__message--error" role="alert">
              <AlertCircle size={18} aria-hidden="true" /> <span>{error}</span>
            </div>
          )}
          <label htmlFor="forgot-email" className="recovery__label">Email address</label>
          <input
            id="forgot-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={LIMITS.email}
            className="recovery__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <button type="submit" className="recovery__submit" disabled={pending}>
            {pending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </Shell>
  )
}

// The token arrives in ?token=. It's read once, then removed from the address
// bar so it doesn't linger in history or get shared by copy-paste.
function useResetToken() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '')
  useEffect(() => {
    if (window.location.search.includes('token=')) {
      window.history.replaceState(window.history.state, '', window.location.pathname)
    }
  }, [])
  return /^[a-f\d]{64}$/i.test(token) ? token : ''
}

export function ResetPasswordPage({ onBack, onForgot, onReset }) {
  const token = useResetToken()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState('')
  const [error, setError] = useState(token ? '' : 'This reset link is incomplete or invalid. Request a new one.')
  const [pending, setPending] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (pending || !token) return
    const problem = passwordProblem(password)
    if (problem) return setError(problem)
    if (password !== confirm) return setError('The passwords don’t match.')
    setPending(true)
    setError('')
    try {
      setDone(await resetPassword({ token, password }))
      // The server ended every session, including any in this browser.
      onReset?.()
    } catch (err) {
      setError(describeError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <Shell icon={KeyRound} title="Choose a new password" subtitle="Use 8 or more characters with at least one letter and one number." onBack={onBack}>
      {done ? (
        <div className="recovery__stack">
          <div className="recovery__message recovery__message--ok" role="status">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{done} You’ve been signed out everywhere else.</span>
          </div>
          <button type="button" className="recovery__submit" onClick={onBack}>
            Go to sign in
          </button>
        </div>
      ) : (
        <form className="recovery__form" onSubmit={submit} noValidate>
          {error && (
            <div className="recovery__message recovery__message--error" role="alert">
              <AlertCircle size={18} aria-hidden="true" /> <span>{error}</span>
            </div>
          )}
          <label htmlFor="reset-password" className="recovery__label">New password</label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            maxLength={LIMITS.password.max}
            className="recovery__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!token}
          />
          <label htmlFor="reset-confirm" className="recovery__label">Repeat new password</label>
          <input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            maxLength={LIMITS.password.max}
            className="recovery__input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={!token}
          />
          <button type="submit" className="recovery__submit" disabled={pending || !token}>
            {pending ? 'Saving…' : 'Save new password'}
          </button>
          {(!token || error.includes('expired')) && (
            <button type="button" className="recovery__link" onClick={onForgot}>
              Request a new reset link
            </button>
          )}
        </form>
      )}
    </Shell>
  )
}
