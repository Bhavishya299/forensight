import { AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react'

const VARIANT_CONFIG = {
  info: {
    classes: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
    icon: Info,
  },
  warning: {
    classes: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    icon: AlertTriangle,
  },
  success: {
    classes: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    icon: CheckCircle2,
  },
  error: {
    classes: 'border-red-500/30 bg-red-500/10 text-red-200',
    icon: XCircle,
  },
}

const AlertBanner = ({ variant = 'info', title, children, dismissible, onDismiss }) => {
  const config = VARIANT_CONFIG[variant]
  const Icon = config.icon
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${config.classes}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="mt-0.5">{children}</div>}
      </div>
    </div>
  )
}

export default AlertBanner
