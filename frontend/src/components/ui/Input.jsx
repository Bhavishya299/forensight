import { useId } from 'react'

const inputBase =
  'h-9 w-full rounded-md border border-ink-600 bg-ink-700/40 px-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm transition-colors focus:border-cyan-brand/60 focus:outline-none focus:ring-1 focus:ring-cyan-brand/40 disabled:cursor-not-allowed disabled:opacity-50'

const Input = ({ label, hint, error, className = '', id, ...props }) => {
  const autoId = useId()
  const inputId = id || `field-${autoId}`
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-slate-300">
          {label}
        </label>
      )}
      <input id={inputId} className={inputBase} aria-invalid={error ? 'true' : undefined} {...props} />
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  )
}

export default Input