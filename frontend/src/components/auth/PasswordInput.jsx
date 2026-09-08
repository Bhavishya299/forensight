import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const inputBase =
  'h-9 w-full rounded-md border border-ink-600 bg-ink-700/40 px-3 pr-10 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm transition-colors focus:border-cyan-brand/60 focus:outline-none focus:ring-1 focus:ring-cyan-brand/40 disabled:cursor-not-allowed disabled:opacity-50'

/*
 * Password field with a show / hide toggle, styled to match the shared
 * Input component. Accessible: the toggle is a labelled button and the
 * input keeps aria-invalid/error messaging handled by the label.
 */
const PasswordInput = ({ label, hint, error, className = '', id, ...props }) => {
  const autoId = useId()
  const inputId = id || `field-${autoId}`
  const [visible, setVisible] = useState(false)
  const isDisabled = Boolean(props.disabled)

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={inputBase}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          disabled={isDisabled}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  )
}

export default PasswordInput