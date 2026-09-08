import { Link } from 'react-router-dom'
import { BellRing, Clock3, Users, FileSearch, Database, ArrowRight, Eye, EyeOff } from 'lucide-react'
import Drawer from '../ui/Drawer.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import VerificationStatus from '../analytics/VerificationStatus.jsx'
import EvidenceChip from '../common/EvidenceChip.jsx'
import EvidenceChain from '../analytics/EvidenceChain.jsx'
import CrossSourceCorroboration from '../analytics/CrossSourceCorroboration.jsx'
import CorrelationBadge from '../analytics/CorrelationBadge.jsx'
import { getAlertTypeMeta, SEVERITY_VARIANTS } from '../analytics/alertTypeMeta.js'

const PROTO_NOTE = {
  title: 'Prototype note',
  text: 'This is an analytical lead generated from synthetic demonstration data. Investigator verification is required.',
}

const AlertDetailDrawer = ({ open, onClose, caseId, alert, onOpenEvidence, onStatusChange }) => {
  const meta = getAlertTypeMeta(alert?.type)
  const Icon = meta.icon

  if (!alert) return null

  const relatedEventIds = alert.relatedEventIds || []

  const chainSteps = [
    { label: 'Alert', value: meta.label, icon: BellRing, iconClasses: meta.iconClasses, detail: alert.title },
    {
      label: 'Event',
      value: alert.timestamp,
      icon: Clock3,
      iconClasses: 'bg-cyan-brand/15 text-cyan-brand',
      detail: alert.description,
    },
    {
      label: 'Entity',
      value: alert.entities.slice(0, 2).join(' → '),
      icon: Users,
      iconClasses: 'bg-sky-500/15 text-sky-300',
      detail: alert.entities.length > 2 ? `+${alert.entities.length - 2} more` : undefined,
    },
    { label: 'Evidence', value: alert.primaryEvidence || '—', icon: FileSearch, iconClasses: 'bg-cyan-brand/15 text-cyan-brand' },
    {
      label: 'Source',
      value: alert.sourceTypes.join(', ') || '—',
      icon: Database,
      iconClasses: 'bg-teal-brand/15 text-teal-brand',
      detail: alert.crossSource ? 'Cross-source lead' : undefined,
    },
  ]

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Investigative lead"
      width="max-w-2xl"
      footer={
        <>
          <div className="mr-auto flex items-center gap-2">
            <CorrelationBadge />
            {alert.metadata?.contradictionId && (
              <Link to={`/cases/${caseId}/contradictions?c=${encodeURIComponent(alert.metadata.contradictionId)}`}>
                <Button variant="outline" size="sm">
                  Open contradiction
                </Button>
              </Link>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={alert.status === 'Reviewed'}
            onClick={() => onStatusChange?.('Reviewed')}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Mark as reviewed
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={alert.status === 'Dismissed'}
            onClick={() => onStatusChange?.('Dismissed')}
          >
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            Dismiss
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={alert.status === 'Requires review'}
            onClick={() => onStatusChange?.('Requires review')}
          >
            Keep for review
          </Button>
        </>
      }
    >
      {/* Identity */}
      <div className="mb-4 flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${meta.iconClasses}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">{alert.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Case #{alert.caseId} · {alert.timestamp}
          </p>
        </div>
      </div>

      {/* Meta chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${meta.classes}`}>
          {meta.label}
        </span>
        <Badge variant={SEVERITY_VARIANTS[alert.severity] || 'neutral'}>
          {alert.severity} priority
        </Badge>
        <VerificationStatus status={alert.status} />
      </div>

      {/* Observation + reason */}
      <section className="mb-4" aria-label="Observation">
        <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Observation
        </h3>
        <p className="rounded-md border border-ink-600/70 bg-ink-800/40 px-3 py-2.5 text-sm text-slate-200">
          {alert.description}
        </p>
      </section>

      <section className="mb-4" aria-label="Why this was flagged">
        <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Why was this flagged?
        </h3>
        <p className="rounded-md border border-ink-600/70 bg-ink-800/40 px-3 py-2.5 text-sm text-slate-200">
          {alert.reason}
        </p>
      </section>

      {/* Related entities */}
      {alert.entities.length > 0 && (
        <section className="mb-4" aria-label="Related entities">
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Related entities
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {alert.entities.map((e) => (
              <span key={e} className="rounded-md border border-ink-600 bg-ink-700/50 px-2 py-1 text-xs text-slate-200">
                {e}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Related events */}
      {relatedEventIds.length > 0 && (
        <section className="mb-4" aria-label="Related events">
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Related events
            </h3>
            <Link
              to={`/cases/${caseId}/timeline?event=${encodeURIComponent(relatedEventIds[0])}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-cyan-200 hover:text-cyan-100"
            >
              View in timeline
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
          <ul className="space-y-2">
            {relatedEventIds.map((id) => (
              <li key={id} className="flex items-center justify-between gap-3 rounded-md border border-ink-600/70 bg-ink-800/40 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                  <span className="font-mono text-xs text-cyan-brand">{id}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Supporting evidence */}
      <section className="mb-4" aria-label="Supporting evidence">
        <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Supporting evidence
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {alert.evidenceIds.map((ev) => (
            <EvidenceChip key={ev} id={ev} theme={ev === alert.primaryEvidence ? 'default' : 'accent'} onOpen={onOpenEvidence} />
          ))}
        </div>
      </section>

      {/* Evidence chain */}
      <section className="mb-4" aria-label="Evidence chain">
        <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Evidence chain
        </h3>
        <EvidenceChain steps={chainSteps} />
      </section>

      {/* Cross-source corroboration */}
      {alert.crossSource && alert.sourceTypes.length > 1 && (
        <section className="mb-4" aria-label="Cross-source corroboration">
          <CrossSourceCorroboration sourceTypes={alert.sourceTypes} />
        </section>
      )}

      {/* Prototype note */}
      <section className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2.5" aria-label="Prototype note">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">
          {PROTO_NOTE.title}
        </p>
        <p className="mt-1 text-xs text-slate-300">{PROTO_NOTE.text}</p>
      </section>
    </Drawer>
  )
}

export default AlertDetailDrawer