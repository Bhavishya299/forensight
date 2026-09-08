import { useId } from 'react'

const Textarea = ({ label, hint, error, rows = 4, className = '', id, ...props }) => {
  const autoId = useId()
  const textareaId = id || `field-${autoId}`
  return (
    <div className={className}>
      {label && (
        <label htmlFor={textareaId} className="mb-1 block text-xs font-medium text-slate-300">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className="w-full rounded-md border border-ink-600 bg-ink-700/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm transition-colors focus:border-cyan-brand/60 focus:outline-none focus:ring-1 focus:ring-cyan-brand/40"
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  )
}

export default Textarea