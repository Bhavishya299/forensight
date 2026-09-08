import { Link } from 'react-router-dom'
import { Clock3, Network } from 'lucide-react'
import Drawer from '../ui/Drawer.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import SourceBadge from '../common/SourceBadge.jsx'
import EvidenceChip from '../common/EvidenceChip.jsx'

/*
 * Event detail drawer for a single timeline event. Carries the
 * evidence traceability chain: insight → event → evidence ID.
 */
const EventDetailDrawer = ({ open, onClose, caseId, event, onOpenEvidence }) => {
  if (!event) return null

  const rows = [
    ['Evidence ID', <EvidenceChip key="ev" id={event.evidenceId} onOpen={onOpenEvidence} />],
    ['Source', <SourceBadge key="src" source={event.source} />],
    ['Timestamp', event.time],
    ['Event type', <Badge key="type" variant="brand">{event.eventType}</Badge>],
    ['Sender', event.entity1],
    ['Receiver', event.entity2 || '—'],
    ['Amount', event.metadata?.amount || '—'],
    ['Location', event.location || '—'],
  ]

  const relatedEntities = [...new Set([event.entity1, event.entity2].filter(Boolean))]

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Event details"
      width="max-w-sm"
      footer={
        <>
          <Link to={`/cases/${caseId}/graph?n=${encodeURIComponent(event.entity1)}`}>
            <Button variant="outline">
              <Network className="h-4 w-4" aria-hidden="true" />
              View in graph
            </Button>
          </Link>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-brand/10 text-cyan-brand">
          <Clock3 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-slate-100">{event.time}</p>
          <p className="mt-0.5 text-sm text-slate-400">{event.description}</p>
        </div>
      </div>

      <section className="mb-4" aria-label="Event metadata">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Event details
        </h3>
        <dl className="divide-y divide-ink-600/50 rounded-md border border-ink-600/70 bg-ink-800/40 px-4 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-2">
              <dt className="text-slate-400">{k}</dt>
              <dd className="max-w-[55%] text-right">{typeof v === 'string' ? <span className="text-slate-200">{v}</span> : v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Related entities">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Related entities
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {relatedEntities.map((e) => (
            <span key={e} className="rounded-md border border-ink-600 bg-ink-700/50 px-2 py-1 text-xs text-slate-200">
              {e}
            </span>
          ))}
        </div>
      </section>
    </Drawer>
  )
}

export default EventDetailDrawer