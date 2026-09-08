import { Link } from 'react-router-dom'
import { getAlertTypeMeta } from './alertTypeMeta.js'

/*
 * Clickable analytical reference shown from an evidence record.
 *
 * References are navigation points into Alerts or Contradictions —
 * they never claim that the underlying finding is verified.
 */
const EvidenceReference = ({ caseId, kind, id, type, title }) => {
  const meta = getAlertTypeMeta(type)
  const Icon = meta.icon
  const to =
    kind === 'contradiction'
      ? `/cases/${caseId}/contradictions?c=${encodeURIComponent(id)}`
      : `/cases/${caseId}/alerts?a=${encodeURIComponent(id)}`
  const kindLabel = kind === 'contradiction' ? 'Contradiction' : 'Lead'

  return (
    <Link
      to={to}
      className="group flex items-start gap-2.5 rounded-md border border-ink-600/70 bg-ink-800/40 px-3 py-2.5 transition-colors hover:border-cyan-brand/40 hover:bg-ink-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-brand"
    >
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded ${meta.iconClasses}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          {kindLabel}
        </span>
        <span className="block truncate text-sm font-medium text-slate-200 group-hover:text-cyan-100">
          {title || type}
        </span>
      </span>
    </Link>
  )
}

export default EvidenceReference