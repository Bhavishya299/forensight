const EmptyState = ({
  icon,
  title = 'No data',
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className,
      ].join(' ')}
    >
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ink-700 text-cyan-brand">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export default EmptyState
