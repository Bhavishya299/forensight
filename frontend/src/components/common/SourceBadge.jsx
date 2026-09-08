import { getSourceMeta } from '../../config/sourceMeta.js'

/*
 * Source chip combining the canonical icon, normalized label, and an
 * optional record count. Uses the source's paired tint so identity is
 * never communicated by color alone.
 */
const SourceBadge = ({ source, count, className = '' }) => {
  const meta = getSourceMeta(source)
  const Icon = meta.icon
  return (
    <span
      className={[
        'inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium',
        meta.classes,
        className,
      ].join(' ')}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{meta.label}</span>
      {count != null && (
        <span className="shrink-0 text-[10px] opacity-70" aria-hidden="true">
          · {count}
        </span>
      )}
    </span>
  )
}

export default SourceBadge