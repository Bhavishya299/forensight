import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, Clock3, Network, FileText } from 'lucide-react'
import Button from '../ui/Button.jsx'
import EvidenceChip from '../common/EvidenceChip.jsx'

/*
 * Potential critical event window callout.
 * A concentrated set of related events across independent synthetic
 * sources. Highlighted as a lead that requires verification — never
 * presented as a conclusion.
 */
const CriticalEventWindow = ({ data, eventCount, sourceCount, entityCount, onOpenEvidence }) => {
  const { id } = useParams()

  const stats = [
    { label: 'Duration', value: `${data.durationMinutes} min` },
    { label: 'Events', value: eventCount },
    { label: 'Independent sources', value: sourceCount },
    { label: 'Entities', value: entityCount },
  ]

  return (
    <section
      aria-label="Potential critical event window"
      className="rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-ink-850 to-ink-850 px-5 py-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/15 text-amber-300">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-200">
              Potential critical event window
            </h2>
            <p className="text-xs text-slate-400">
              {data.label} · requires investigator verification
            </p>
          </div>
        </div>
        <Link to={`/cases/${id}/graph`}>
          <Button variant="outline" size="sm">
            <Network className="h-3.5 w-3.5" aria-hidden="true" />
            View in graph
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md border border-ink-600/70 bg-ink-900/60 px-3 py-2">
            <p className="text-lg font-semibold text-slate-100">{s.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 max-w-3xl text-sm text-slate-300">
        Multiple related events were observed across independent synthetic sources within a
        concentrated time period. This is an investigative lead.
      </p>

      {/* Supporting evidence */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          <FileText className="h-3 w-3" aria-hidden="true" /> Supporting evidence
        </span>
        {data.evidenceIds.map((ev) => (
          <EvidenceChip key={ev} id={ev} theme="accent" onOpen={onOpenEvidence} />
        ))}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-md border border-ink-600/60 bg-ink-900/50 px-3 py-2 text-xs text-slate-400">
        <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
        <p>
          The events share a common time band, not a conclusion. Confirm each record and its
          traceability before acting on this lead.
        </p>
      </div>
    </section>
  )
}

export default CriticalEventWindow