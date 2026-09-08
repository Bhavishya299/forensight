import { useId } from 'react'

const Select = ({ label, hint, error, options = [], className = '', id, ...props }) => {
  const autoId = useId()
  const selectId = id || `field-${autoId}`
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="mb-1 block text-xs font-medium text-slate-300">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className="h-9 w-full rounded-md border border-ink-600 bg-ink-700/40 px-3 text-sm text-slate-100 shadow-sm transition-colors focus:border-cyan-brand/60 focus:outline-none focus:ring-1 focus:ring-cyan-brand/40"
        aria-invalid={error ? 'true' : undefined}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-ink-800">
            {opt.label}
          </option>
        ))}
      </select>
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  )
}

export default Select