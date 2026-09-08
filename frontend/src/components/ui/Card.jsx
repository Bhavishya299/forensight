const Card = ({
  title,
  subtitle,
  icon,
  status,
  footer,
  children,
  className = '',
  bodyClassName = '',
  as: Component = 'section',
}) => {
  return (
    <Component
      className={[
        'rounded-lg border border-ink-600/70 bg-ink-850 shadow-sm',
        className,
      ].join(' ')}
    >
      {(title || subtitle || icon || status) && (
        <header className="flex items-start justify-between gap-4 border-b border-ink-600/70 px-4 py-3">
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-brand/10 text-cyan-brand">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="truncate text-sm font-semibold text-slate-100">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</p>
              )}
            </div>
          </div>
          {status && <div className="shrink-0">{status}</div>}
        </header>
      )}
      <div className={['px-4 py-4', bodyClassName].join(' ')}>{children}</div>
      {footer && (
        <footer className="border-t border-ink-600/70 px-4 py-3">{footer}</footer>
      )}
    </Component>
  )
}

export default Card
