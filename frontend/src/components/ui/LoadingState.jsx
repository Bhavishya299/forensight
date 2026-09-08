import { Loader2 } from 'lucide-react'

const LoadingState = ({
  label = 'Loading investigation data...',
  className = '',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      ].join(' ')}
    >
      <Loader2 className="h-6 w-6 animate-spin text-cyan-brand" />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  )
}

export default LoadingState
