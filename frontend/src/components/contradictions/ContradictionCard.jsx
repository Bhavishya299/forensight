import { ChevronRight, FileText, Scale, Quote } from 'lucide-react'
import Badge from '../ui/Badge.jsx'
import VerificationStatus from '../analytics/VerificationStatus.jsx'
import EvidenceChip from '../common/EvidenceChip.jsx'
import { getAlertTypeMeta, SEVERITY_VARIANTS } from '../analytics/alertTypeMeta.js'

/*
 * Card for a single potential contradiction between a stated claim and
 * independent synthetic evidence. The card is neutral — it frames the
 * item as a review candidate, not as a finding of fact.
 */
const ContradictionCard = ({ contradiction, onOpen, onOpenEvidence }) => {
  const meta = getAlertTypeMeta('Potential Contradiction')
  const Icon = meta.icon
  const independentCount = contradiction.independentEvidence.length
  const sourcesCount = contradiction.sources.length

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
      className="group flex cursor-pointer flex-col rounded-lg border border-ink-600/70 bg-ink-850 p-4 transition-colors hover:border-sky-brand/40 hover:bg-ink-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-brand"
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${meta.classes}`}
        >
          <Icon className="h-3 w-3" aria-hidden="true" />
          {meta.label}
        </span>
        <Badge variant={SEVERITY_VARIANTS[contradiction.severity] || 'neutral'}>
          {contradiction.severity} severity
        </Badge>
        <div className="ml-auto">
          <VerificationStatus status={contradiction.status} />
        </div>
      </div>

      {/* Subject */}
      <div className="mt-3 flex items-start gap-2">
        <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
        <p className="min-w-0 text-sm font-semibold text-slate-100">
          {contradiction.claimedBy}: “{contradiction.claim}”
        </p>
      </div>

      {/* Claim vs evidence */}
      <div className="mt-3 space-y-2">
        <div className="flex items-start gap-2 text-sm text-slate-300">
          <FileText className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
          <p className="min-w-0">
            <span className="mr-1 font-semibold uppercase tracking-wider text-amber-300">Claim interval:</span>
            {contradiction.startTime}–{contradiction.endTime} · {contradiction.claimedLocation}
          </p>
        </div>
        <div className="flex items-start gap-2 text-sm text-slate-300">
          <Scale className="mt-1 h-3.5 w-3.5 shrink-0 text-sky-300" aria-hidden="true" />
          <p className="min-w-0">
            <span className="mr-1 font-semibold uppercase tracking-wider text-sky-300">Independent evidence:</span>
            {contradiction.assessment}
          </p>
        </div>
      </div>

      {/* Meta + evidence chips */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-600/50 pt-3">
        <span className="text-[11px] text-slate-500">
          {independentCount} records · {sourcesCount} source types involved
        </span>
        <div className="flex flex-wrap gap-1.5">
          {contradiction.evidenceIds.map((eid) => (
            <EvidenceChip
              key={eid}
              id={eid}
              theme="faint"
              onOpen={(id) => onOpenEvidence?.(id)}
            />
          ))}
        </div>
        <ChevronRight
          className="ml-auto h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-brand"
          aria-hidden="true"
        />
      </div>
    </article>
  )
}

export default ContradictionCard