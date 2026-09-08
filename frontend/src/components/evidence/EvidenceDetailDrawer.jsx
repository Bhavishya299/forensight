import { FileSearch, Lightbulb, Database, ArrowRight, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import Drawer from '../ui/Drawer.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'
import SourceBadge from '../common/SourceBadge.jsx'
import EvidenceReference from '../analytics/EvidenceReference.jsx'
import CorrelationBadge from '../analytics/CorrelationBadge.jsx'

/*
 * Slide-over detail panel for a single evidence record.
 * Purely presentational — the record (with its normalized `details`)
 * is loaded asynchronously by the parent page and passed in as `item`.
 */
const EvidenceDetailDrawer = ({ open, onClose, caseId, item }) => {
  if (!item) return null

  const hasDetails = Boolean(item.details && typeof item.details === 'object')

  const fields = hasDetails
    ? Object.entries(item.details)
        .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
        .map(([k, v]) => [
          String(k).replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
          String(v),
        ])
    : []

  const relatedEntities =
    hasDetails && Array.isArray(item.details.entities) ? item.details.entities : []
  const relatedPersons =
    hasDetails && Array.isArray(item.details.relatedPersons) ? item.details.relatedPersons : []

  const references = hasDetails
    ? {
        alerts: Array.isArray(item.details.alerts) ? item.details.alerts : [],
        contradictions: Array.isArray(item.details.contradictions)
          ? item.details.contradictions
          : [],
      }
    : { alerts: [], contradictions: [] }

  const related =
    hasDetails && Array.isArray(item.details.leads) ? item.details.leads : []
  const referenceTotal = references.alerts.length + references.contradictions.length

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Evidence · ${item.id}`}
      width="max-w-lg"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-ink-600/60 bg-ink-800/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Record loaded from the live case workspace
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
          <FileSearch className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-slate-100">{item.id}</p>
          <p className="mt-0.5 text-sm text-slate-400">{item.description}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="neutral">{item.type}</Badge>
        <SourceBadge source={item.source} />
        <StatusBadge status={item.status} />
      </div>

      {/* Metadata */}
      <section className="mb-4" aria-label="Record metadata">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Record metadata
        </div>
        <dl className="divide-y divide-ink-600/50 rounded-md border border-ink-600/70 bg-ink-800/40 px-4 text-sm">
          {[
            ['Case', `#${caseId}`],
            ['Source file', item.details?.sourceFile || '—'],
            ['Timestamp', item.details?.timestamp || item.addedAt || '—'],
            ['Added by', item.addedBy || '—'],
            ['Integrity check', item.verified ? 'Passed' : '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-2">
              <dt className="text-slate-400">{k}</dt>
              <dd className="max-w-[60%] truncate text-right font-mono text-slate-200">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Normalized record */}
      <section className="mb-4" aria-label="Normalized record">
        <div className="mb-2 flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Normalized record
          </div>
        </div>
        <dl className="divide-y divide-ink-600/50 rounded-md border border-ink-600/70 bg-ink-800/40 px-4 text-sm">
          {fields.length ? (
            fields.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 py-2">
                <dt className="text-slate-400">{k}</dt>
                <dd className="max-w-[60%] truncate text-right text-slate-200">{v}</dd>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-between gap-4 py-2">
              <dt className="text-slate-400">Record fields</dt>
              <dd className="truncate text-right text-slate-200">—</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Related entities */}
      {(relatedEntities.length > 0 || relatedPersons.length > 0) && (
        <section className="mb-4" aria-label="Related entities and persons">
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Related entities
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {relatedEntities.map((e) => (
              <span key={e} className="rounded-md border border-ink-600 bg-ink-700/50 px-2 py-1 text-xs text-slate-200">
                {e}
              </span>
            ))}
            {relatedPersons.length > 0 && (
              <>
                <ArrowRight className="h-3 w-3 text-slate-500" aria-hidden="true" />
                {relatedPersons.map((p) => (
                  <span key={p} className="rounded-md border border-cyan-brand/30 bg-cyan-brand/10 px-2 py-1 text-xs text-cyan-200">
                    {p}
                  </span>
                ))}
              </>
            )}
          </div>
        </section>
      )}

      {/* Analytical references */}
      <section className="mb-4" aria-label="Analytical references">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Analytical references
          </div>
          <Badge variant={referenceTotal ? 'brand' : 'neutral'}>{referenceTotal}</Badge>
        </div>
        {referenceTotal ? (
          <ul className="space-y-2">
            {references.alerts.map((a) => (
              <li key={`a-${a.id}`}>
                <EvidenceReference caseId={caseId} kind="alert" id={a.id} type={a.type} title={a.title} />
              </li>
            ))}
            {references.contradictions.map((c) => (
              <li key={`c-${c.id}`}>
                <EvidenceReference
                  caseId={caseId}
                  kind="contradiction"
                  id={c.id}
                  type="Potential Contradiction"
                  title={`${c.claimedBy} claim about ${c.claimedLocation}`}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-ink-600/60 bg-ink-800/30 px-3 py-2.5 text-sm text-slate-400">
            No analytical leads reference this record yet.
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Link to={`/cases/${caseId}/timeline?event=${encodeURIComponent(item.id)}`}>
            <Button variant="ghost" size="sm">
              View in timeline
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Button>
          </Link>
          <Link to={`/cases/${caseId}/graph?entity=${encodeURIComponent(item.id)}`}>
            <Button variant="ghost" size="sm">
              View in graph
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Investigative leads */}
      <section aria-label="Investigative leads">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Investigative leads
          </div>
          <CorrelationBadge>Prototype</CorrelationBadge>
        </div>
        {related.length ? (
          <ul className="space-y-2">
            {related.map((lead) => (
              <li
                key={lead.id}
                className="flex items-start gap-2.5 rounded-md border border-ink-600/70 bg-ink-800/40 px-3 py-2.5"
              >
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm text-slate-200">{lead.type}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{lead.explanation}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-ink-600/60 bg-ink-800/30 px-3 py-2.5 text-sm text-slate-400">
            No investigative leads are attached to this record yet.
          </p>
        )}
        <Link to={`/cases/${caseId}/alerts`} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cyan-200 hover:text-cyan-100">
          View all analytical leads
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </section>
    </Drawer>
  )
}

export default EvidenceDetailDrawer