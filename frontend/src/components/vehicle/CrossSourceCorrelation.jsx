import { Link2, AlertOctagon } from 'lucide-react'
import SourceBadge from '../common/SourceBadge.jsx'
import EvidenceChip from '../common/EvidenceChip.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'

/*
 * Cross-source correlation summary for the active vehicle trace.
 * Rows are time/sector alignments only, explicitly marked as requiring
 * investigator verification.
 */
const CrossSourceCorrelation = ({ vehicle, correlations, whyFlagged, onOpenEvidence }) => {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2.5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300">
          <AlertOctagon className="h-3.5 w-3.5" aria-hidden="true" />
          Potential vehicle movement correlation
        </p>
        <p className="mt-1 text-sm text-slate-300">
          Vehicle {vehicle.plate} produced observations near Sector X within one minute of two
          independent synthetic records. Analytical status:{' '}
          <span className="font-medium text-amber-200">potential correlation</span>, requires
          investigator verification.
        </p>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500">
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          Potential correlations
        </p>
        <ul className="space-y-2">
          {correlations.map((c) => (
            <li
              key={`${c.time}-${c.source}`}
              className="flex flex-wrap items-center gap-2 rounded-md border border-ink-600/60 bg-ink-800/30 px-3 py-2 text-sm"
            >
              <span className="font-mono text-xs text-cyan-200">{c.time}</span>
              <SourceBadge source={c.source} />
              <span className="min-w-0 flex-1 text-xs text-slate-300">{c.detail}</span>
              <span className="rounded border border-ink-600 bg-ink-700/50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                {c.sector}
              </span>
              <EvidenceChip id={c.evidenceId} onOpen={onOpenEvidence} theme="faint" />
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Why flagged?
        </p>
        <ul className="space-y-1.5">
          {whyFlagged.map((w) => (
            <li key={w} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-brand" aria-hidden="true" />
              {w}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status="Requires verification" />
          <span className="text-xs text-slate-500">Not an assertion of ownership, identity, or destination.</span>
        </div>
      </div>
    </div>
  )
}

export default CrossSourceCorrelation