import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Scale, Timer, History } from 'lucide-react'
import Drawer from '../ui/Drawer.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import EvidenceChip from '../common/EvidenceChip.jsx'

const CONFIDENCE_STYLES = {
  High: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Low: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
}

/*
 * Detail drawer for a potential weak / unexplained connection between
 * entities. Language stays strictly investigative: nothing here is
 * asserted as confirmed — everything is a potential lead requiring
 * investigator verification.
 */
const WeakLinkDrawer = ({ open, onClose, link, onOpenEvidence }) => {
  const navigate = useNavigate()
  if (!link) return null

  const go = (path) => {
    onClose()
    navigate(path)
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Potential Weak Link"
      footer={
        <div className="flex w-full gap-2">
          <Button variant="outline" onClick={() => go(`/cases/${link.caseId}/timeline`)}>
            View timeline
          </Button>
          <Button variant="outline" onClick={() => go(`/cases/${link.caseId}/graph`)}>
            View graph
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
            Potential unexplained connection
          </p>
          <h2 className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-100">
            <span>{link.connection}</span>
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {link.activitySequence.join('  →  ')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="warning" dot>
              {link.status}
            </Badge>
            <span className="inline-flex items-center gap-1 rounded-md border border-ink-600 bg-ink-700/50 px-2 py-0.5 text-xs text-slate-300">
              <Scale className="h-3 w-3 text-slate-400" aria-hidden="true" />
              Confidence · {link.confidence}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-ink-600 bg-ink-700/30 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300/90">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {link.typeLabel}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{link.reason}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-ink-600 bg-ink-700/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Observed window
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-200">
              <Timer className="h-4 w-4 text-slate-400" aria-hidden="true" />
              {link.window}
            </p>
          </div>
          <div className="rounded-lg border border-ink-600 bg-ink-700/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Activity sequence
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-200">
              <History className="h-4 w-4 text-slate-400" aria-hidden="true" />
              {link.activitySequence.join(' → ')}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-ink-600 bg-ink-700/30 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Interpretation
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{link.interpretation}</p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Supporting evidence
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {link.supportingEvidence.map((id) => (
              <EvidenceChip key={id} id={id} theme="accent" onOpen={() => onOpenEvidence?.(id)} />
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  )
}

export default WeakLinkDrawer