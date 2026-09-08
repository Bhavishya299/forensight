import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, Loader2, UserPlus, CheckCircle2, ShieldCheck } from 'lucide-react'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import PasswordInput from '../components/auth/PasswordInput.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Button from '../components/ui/Button.jsx'
import AlertBanner from '../components/ui/AlertBanner.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const DEPARTMENTS = [
  { value: 'digital-forensics', label: 'Digital Forensics' },
  { value: 'financial', label: 'Financial Investigations' },
  { value: 'cyber', label: 'Cyber Operations' },
  { value: 'intelligence', label: 'Intelligence Analysis' },
  { value: 'media', label: 'Media Analysis' },
  { value: 'field', label: 'Field Operations' },
  { value: 'records', label: 'Records & Compliance' },
  { value: 'other', label: 'Other' },
]

function strengthLabel(password) {
  if (!password) return null
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  if (score <= 1) return { score, label: 'Weak', bar: 'bg-red-400', text: 'text-red-300' }
  if (score === 2) return { score, label: 'Fair', bar: 'bg-amber-400', text: 'text-amber-300' }
  if (score === 3) return { score, label: 'Good', bar: 'bg-cyan-brand', text: 'text-cyan-200' }
  return { score, label: 'Strong', bar: 'bg-emerald-400', text: 'text-emerald-300' }
}

const RequestAccess = () => {
  const navigate = useNavigate()
  const [values, setValues] = useState({
    fullName: '',
    email: '',
    orgId: '',
    department: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [referenceId, setReferenceId] = useState(null)

  const setField = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validate = () => {
    const next = {}
    if (!values.fullName.trim()) next.fullName = 'Full name is required.'
    else if (values.fullName.trim().length < 3) next.fullName = 'Enter your full legal name.'

    if (!values.email.trim()) next.email = 'Official email is required.'
    else if (!EMAIL_RE.test(values.email.trim())) next.email = 'Enter a valid official email address.'

    if (!values.orgId.trim()) next.orgId = 'Employee / organization ID is required.'
    else if (values.orgId.trim().length < 3) next.orgId = 'Enter at least 3 characters.'
    else if (!/^[A-Za-z0-9-]+$/.test(values.orgId.trim()))
      next.orgId = 'Only letters, numbers and dashes are allowed.'

    if (!values.department) next.department = 'Select your department.'

    if (!values.password) next.password = 'Password is required.'
    else if (values.password.length < 8)
      next.password = 'Password must be at least 8 characters.'
    else if (!/\d/.test(values.password))
      next.password = 'Password must include at least one number.'

    if (!values.confirmPassword) next.confirmPassword = 'Confirm your password.'
    else if (values.confirmPassword !== values.password)
      next.confirmPassword = 'Passwords do not match.'

    return next
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    window.setTimeout(() => {
      setReferenceId(`RA-${Date.now().toString(36).toUpperCase()}`)
      setSubmitting(false)
      setSubmitted(true)
    }, 900)
  }

  const passwordStrength = strengthLabel(values.password)
  const showResetForm = !submitted

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-ink-600/70 bg-ink-850 p-6 shadow-lg">
          <div className="mb-5 flex items-center gap-2 text-cyan-brand">
            {submitted ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            )}
            <h1 className="text-sm font-semibold uppercase tracking-widest text-cyan-100">
              Request Access
            </h1>
          </div>

          {showResetForm ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Input
                id="ra-full-name"
                label="Full Name"
                type="text"
                autoComplete="name"
                placeholder="e.g. Aarav Sharma"
                value={values.fullName}
                onChange={setField('fullName')}
                error={errors.fullName}
                disabled={submitting}
              />

              <Input
                id="ra-email"
                label="Official Email"
                type="email"
                autoComplete="email"
                placeholder="name@organization.gov"
                value={values.email}
                onChange={setField('email')}
                error={errors.email}
                disabled={submitting}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  id="ra-org-id"
                  label="Employee / Organization ID"
                  type="text"
                  autoComplete="organization"
                  placeholder="e.g. EMP-8841"
                  value={values.orgId}
                  onChange={setField('orgId')}
                  error={errors.orgId}
                  disabled={submitting}
                />

                <Select
                  id="ra-department"
                  label="Department"
                  options={[{ value: '', label: 'Select department' }, ...DEPARTMENTS]}
                  value={values.department}
                  onChange={setField('department')}
                  error={errors.department}
                  disabled={submitting}
                />
              </div>

              <PasswordInput
                id="ra-password"
                label="Password"
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                hint="Minimum 8 characters with at least one number."
                value={values.password}
                onChange={setField('password')}
                error={errors.password}
                disabled={submitting}
              />

              {passwordStrength && !errors.password && (
                <div className="flex items-center gap-3">
                  <span className="flex flex-1 gap-1" aria-hidden="true">
                    {[1, 2, 3, 4].map((segment) => (
                      <span
                        key={segment}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          segment <= passwordStrength.score
                            ? passwordStrength.bar
                            : 'bg-ink-600'
                        }`}
                      />
                    ))}
                  </span>
                  <span className={`w-12 text-right text-[11px] font-medium ${passwordStrength.text}`}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}

              <PasswordInput
                id="ra-confirm-password"
                label="Confirm Password"
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={values.confirmPassword}
                onChange={setField('confirmPassword')}
                error={errors.confirmPassword}
                disabled={submitting}
              />

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Submitting request…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Submit Request
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <AlertBanner variant="success" title="Request submitted">
                Your access request has been received and routed for review. You will receive a
                notification once access is granted.
              </AlertBanner>
              <div className="rounded-md border border-ink-600 bg-ink-800/60 px-3 py-2">
                <p className="text-[11px] text-slate-500">
                  Request reference: <span className="font-mono text-cyan-100">{referenceId}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="flex-1" onClick={() => navigate('/login')}>
                  Return to sign in
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSubmitted(false)
                    setValues({
                      fullName: '',
                      email: '',
                      orgId: '',
                      department: '',
                      password: '',
                      confirmPassword: '',
                    })
                    setErrors({})
                  }}
                >
                  Submit another request
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-slate-500">
            Authorized personnel only. Access and activity may be logged. Requests are reviewed
            before access is granted.
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}

export default RequestAccess