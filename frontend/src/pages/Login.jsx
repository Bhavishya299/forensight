import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Fingerprint, ShieldAlert, Loader2, UserPlus, KeyRound } from 'lucide-react'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import PasswordInput from '../components/auth/PasswordInput.jsx'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import AlertBanner from '../components/ui/AlertBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import { login } from '../services/auth.js'
import api from '../services/api.js'

const DEMO_USERNAME = 'investigator'
const DEMO_PASSWORD = 'demo123'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const Login = () => {
  const navigate = useNavigate()

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [authError, setAuthError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Forgot-password modal
  const [forgotOpen, setForgotOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetError, setResetError] = useState(null)
  const [resetSending, setResetSending] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const validateLogin = () => {
    const errors = {}
    if (!loginId.trim()) errors.loginId = 'Email or username is required.'
    else if (loginId.trim().length < 3) errors.loginId = 'Enter at least 3 characters.'
    if (!password) errors.password = 'Password is required.'
    else if (password.length < 6) errors.password = 'Password must be at least 6 characters.'
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validateLogin()
    setFieldErrors(errors)
    setAuthError(null)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      await login(loginId.trim(), password)
      navigate('/dashboard')
    } catch (err) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      if (status === 423) {
        setAuthError(detail || 'Account temporarily locked. Try again later.')
      } else {
        setAuthError('Invalid email/username or password. Please verify your credentials and try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetSubmit = async () => {
    if (!resetEmail.trim()) {
      setResetError('Email is required.')
      return
    }
    if (!EMAIL_RE.test(resetEmail.trim())) {
      setResetError('Enter a valid official email address.')
      return
    }
    setResetError(null)
    setResetSending(true)
    try {
      await api.post('/auth/forgot-password', { email: resetEmail.trim() })
      setResetSent(true)
    } catch {
      setResetSent(true)
    } finally {
      setResetSending(false)
    }
  }

  const closeReset = () => {
    setForgotOpen(false)
    setResetSent(false)
    setResetEmail('')
    setResetError(null)
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm rounded-lg border border-ink-600/70 bg-ink-850 p-6 shadow-lg">
        <div className="mb-5 flex items-center gap-2 text-cyan-brand">
          <Lock className="h-4 w-4" aria-hidden="true" />
          <h1 className="text-sm font-semibold uppercase tracking-widest text-cyan-100">
            Secure Access
          </h1>
        </div>

        {authError && (
          <div className="mb-4">
            <AlertBanner variant="error" title="Sign-in failed">
              {authError}
            </AlertBanner>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            id="login-identifier"
            label="Email / Username"
            type="text"
            autoComplete="username"
            placeholder="investigator@forensight.local"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            error={fieldErrors.loginId}
            disabled={submitting}
          />

          <PasswordInput
            id="login-password"
            label="Password"
            autoComplete="current-password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            disabled={submitting}
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setResetSent(false)
                setResetError(null)
                setForgotOpen(true)
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-brand transition-colors hover:text-cyan-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-brand"
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              Forgot password?
            </button>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              <>
                <Fingerprint className="h-4 w-4" aria-hidden="true" />
                Sign in
              </>
            )}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-ink-600/70" aria-hidden="true" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            or
          </span>
          <span className="h-px flex-1 bg-ink-600/70" aria-hidden="true" />
        </div>

        <Button
          variant="secondary"
          size="md"
          className="w-full"
          onClick={() => navigate('/request-access')}
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Request access
        </Button>

        <div className="mt-4 rounded-md border border-ink-600 bg-ink-800/60 px-3 py-2">
          <p className="text-[11px] text-slate-500">
            Demo credentials: <span className="text-cyan-100">{DEMO_USERNAME}</span> /{' '}
            <span className="text-cyan-100">{DEMO_PASSWORD}</span>
          </p>
        </div>

        <div className="mt-4 flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-slate-500">
            Authorized personnel only. Access and activity may be logged.
          </p>
        </div>
      </div>

      {/* Forgot password */}
      <Modal
        open={forgotOpen}
        onClose={closeReset}
        title="Reset Password"
        size="sm"
        footer={
          resetSent ? (
            <Button variant="outline" size="sm" onClick={closeReset}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={closeReset}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleResetSubmit} disabled={resetSending}>
                {resetSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  'Send reset instructions'
                )}
              </Button>
            </>
          )
        }
      >
        {resetSent ? (
          <AlertBanner variant="success" title="Reset email sent">
            If an account exists for {resetEmail.trim()}, password reset instructions have been
            sent.
          </AlertBanner>
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-400">
              Enter the email or username associated with your account and we will send reset
              instructions.
            </p>
            <Input
              id="reset-email"
              label="Email / Username"
              type="text"
              autoComplete="username"
              placeholder="investigator@forensight.local"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              error={resetError}
              disabled={resetSending}
            />
          </div>
        )}
      </Modal>
    </AuthLayout>
  )
}

export default Login