import { AlertTriangle } from 'lucide-react'
import Button from './Button.jsx'

/*
 * Friendly, non-technical error state for data-loading failures.
 * Never surfaces raw exceptions — only the class-level message and a
 * retry affordance.
 */
const ErrorState = ({
  title = 'Unable to load investigation',
  description = 'Investigation data could not be loaded.',
  onRetry,
  action,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={[
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className,
      ].join(' ')}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10 text-red-300">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>
      {(onRetry || action) && (
        <div className="mt-4">
          {action || (
            <Button variant="outline" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default ErrorState