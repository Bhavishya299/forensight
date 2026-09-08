import { ChevronRight, Layers, Clock } from 'lucide-react'
import Badge from '../ui/Badge.jsx'
import VerificationStatus from '../analytics/VerificationStatus.jsx'
import EvidenceChip from '../common/EvidenceChip.jsx'
import { getAlertTypeMeta, SEVERITY_VARIANTS } from '../analytics/alertTypeMeta.js'

/*
 * Card for a single investigative lead.
 *
 * Always answers three questions — WHAT was observed, WHY it was
 * flagged, and WHICH evidence supports it. The card never asserts a
 * conclusion; the status remains a review state.
 */
const InvestigativeAlertCard = ({ alert, onOpen, onOpenEvidence }) => {
  const meta = getAlertTypeMeta(alert.type)
  const Icon = meta.icon
  const crossSource = Boolean(alert.crossSource && alert.sourceTypes.length > 1)

  return (
    <article
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen?.()
        }
      }}
      className="group flex cursor-pointer flex-col rounded-lg border border-ink-600/70 bg-ink-850 p-4 transition-colors hover:border-cyan-brand/40 hover:bg-ink-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-brand"
    >
      {/* Type + severity + status */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${meta.classes}`}
        >
          <Icon className="h-3 w-3" aria-hidden="true" />
          {meta.label}
        </span>
        <Badge variant={SEVERITY_VARIANTS[alert.severity] || 'neutral'}>
          {alert.severity} priority
        </Badge>
        {crossSource && (
          <span className="inline-flex items-center gap-1 rounded-md border border-teal-brand/30 bg-teal-brand/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-brand">
            <Layers className="h-3 w-3" aria-hidden="true" />
            Cross-source
          </span>
        )}
      </div>

      {/* Case + timestamp */}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-400">
        <span className="font-mono text-[11px] text-slate-500">Case #{alert.caseId}</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {alert.timestamp}
        </span>
      </div>

      {/* Title */}
      <h3 className="mt-2 flex items-start justify-between gap-2 text-sm font-semibold text-slate-100">
        <span className="min-w-0">{alert.title}</span>
        <ChevronRight
          className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-brand"
          aria-hidden="true"
        />
      </h3>

      {/* WHAT */}
      <p className="mt-2 text-sm text-slate-300">
        <span className="font-semibold uppercase tracking-wider text-slate-500" aria-hidden="true">
          What was observed?{' '}
        </span>
        {alert.description}
      </p>

      {/* WHY */}
      <p className="mt-2 text-sm text-slate-300">
        <span className="font-semibold uppercase tracking-wider text-slate-500" aria-hidden="true">
          Why was it flagged?{' '}
        </span>
        {alert.reason}
      </p>

      {/* Supporting evidence */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-600/50 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Supporting evidence
        </span>
        <div className="flex flex-wrap gap-1.5">
          {alert.evidenceIds.slice(0, 3).map((ev) => (
            <EvidenceChip
              key={ev}
              id={ev}
              theme={ev === alert.primaryEvidence ? 'default' : 'faint'}
              onOpen={(eid) => {
                onOpenEvidence(eid)
              }}
            />
          ))}
          {alert.evidenceIds.length > 3 && (
            <span className="text-xs text-slate-500">+{alert.evidenceIds.length - 3} more</span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <VerificationStatus status={alert.status} />
        <span
          onClick={(e) => {
            e.stopPropagation()
            onOpen?.()
          }}
          className="hidden cursor-pointer text-xs font-medium text-cyan-200 hover:text-cyan-100 sm:inline"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpen?.()
            }
          }}
        >
          View details
        </span>
      </div>
    </article>
  )
}

export default InvestigativeAlertCard