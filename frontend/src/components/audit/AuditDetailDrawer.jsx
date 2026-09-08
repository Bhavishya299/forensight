import { History, User, Activity, FolderOpen, Target } from 'lucide-react'
import Drawer from '../ui/Drawer.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'

/*
 * Slide-over with details for one audit event. Exposes only the
 * synthetic demonstration events recorded by this prototype — nothing
 * sensitive (no credentials, PII, or payloads) is shown or stored.
 */
const AuditDetailDrawer = ({ open, onClose, event }) => {
  if (!event) return null

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Audit event"
      width="max-w-lg"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-ink-600/60 bg-ink-800/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Demonstration data — synthetic / sanitized
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {/* Identity */}
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-brand/10 text-cyan-brand">
          <History className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-slate-100">
            {event.date} — {event.time}
          </p>
          <p className="mt-0.5 text-sm text-slate-400">
            {event.action.replace(/_/g, ' ')} · {event.caseLabel}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="neutral">{event.action}</Badge>
        <Badge variant={event.system ? 'info' : 'brand'}>{event.system ? 'System' : 'User'}</Badge>
        <StatusBadge status={event.status} />
      </div>

      {/* Details */}
      <section aria-label="Audit event details">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Event details
        </div>
        <dl className="divide-y divide-ink-600/50 rounded-md border border-ink-600/70 bg-ink-800/40 px-4 text-sm">
          <div className="flex items-start justify-between gap-4 py-2.5">
            <dt className="flex items-center gap-2 text-slate-400">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              User
            </dt>
            <dd className="text-right text-slate-200">{event.user}</dd>
          </div>
          <div className="flex items-start justify-between gap-4 py-2.5">
            <dt className="flex items-center gap-2 text-slate-400">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              Role
            </dt>
            <dd className="text-right text-slate-200">{event.role}</dd>
          </div>
          <div className="flex items-start justify-between gap-4 py-2.5">
            <dt className="flex items-center gap-2 text-slate-400">
              <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Case
            </dt>
            <dd className="text-right text-slate-200">{event.caseLabel}</dd>
          </div>
          <div className="flex items-start justify-between gap-4 py-2.5">
            <dt className="flex items-center gap-2 text-slate-400">
              <Target className="h-3.5 w-3.5" aria-hidden="true" />
              Target
            </dt>
            <dd className="break-all text-right font-mono text-xs text-slate-200">{event.target}</dd>
          </div>
          <div className="py-2.5">
            <dt className="mb-1 flex items-center gap-2 text-slate-400">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              Detail
            </dt>
            <dd className="text-slate-200">{event.detail}</dd>
          </div>
        </dl>
      </section>

      <p className="mt-4 rounded-md border border-ink-600/60 bg-ink-800/40 px-3 py-2 text-xs text-slate-500">
        This audit trail mirrors prototype activity only. No credentials, personal data, or
        attachments are logged or displayed.
      </p>
    </Drawer>
  )
}

export default AuditDetailDrawer