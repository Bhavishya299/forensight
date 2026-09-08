import { User, Share2, Hash } from 'lucide-react'
import Drawer from '../ui/Drawer.jsx'
import Button from '../ui/Button.jsx'
import SourceBadge from '../common/SourceBadge.jsx'
import EvidenceChip from '../common/EvidenceChip.jsx'
import { ENTITY_META } from './entityMeta.js'

/*
 * Entity detail drawer opened when a graph node is selected. Shows
 * entity metadata, connected entities, and the supporting evidence
 * behind those connections.
 */
const NodeDetailPanel = ({
  open,
  onClose,
  caseId,
  node,
  edges = [],
  nodeById = {},
  onOpenEvidence,
  onSelectEntity,
}) => {
  if (!node) return null
  const meta = ENTITY_META[node.type] || {}
  const Icon = meta.icon || User

  const labelOf = (id) => nodeById[id]?.label || id
  const incidentEdges = edges.filter((e) => e.source === node.id || e.target === node.id)
  const connectedIds = [
    ...new Set(incidentEdges.flatMap((e) => [e.source, e.target]).filter((id) => id !== node.id)),
  ]
  const evidenceIds = [...new Set(incidentEdges.flatMap((e) => e.evidenceIds))]
  const sources = node.meta?.sources || []

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Entity details"
      width="max-w-sm"
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {/* Identity */}
      <div className="mb-4 flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${meta.iconClasses}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {meta.singular || node.type}
          </p>
          <p className="text-sm font-semibold text-slate-100">{node.label}</p>
        </div>
      </div>

      {/* Entity details */}
      <section className="mb-4" aria-label="Entity details">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Entity details
        </h3>
        <dl className="divide-y divide-ink-600/50 rounded-md border border-ink-600/70 bg-ink-800/40 px-4 text-sm">
          <div className="flex items-center justify-between gap-4 py-2">
            <dt className="flex items-center gap-1.5 text-slate-400"><Hash className="h-3.5 w-3.5" aria-hidden="true" />Entity type</dt>
            <dd className="text-slate-200">{meta.singular || node.type}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2">
            <dt className="text-slate-400">Related records</dt>
            <dd className="text-slate-200">{node.meta?.relatedRecords ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2">
            <dt className="text-slate-400">Related entities</dt>
            <dd className="text-slate-200">{node.meta?.relatedEntities ?? '—'}</dd>
          </div>
          <div className="py-2">
            <dt className="mb-2 text-slate-400">Sources</dt>
            <dd className="flex flex-wrap gap-1.5">
              {sources.length ? (
                sources.map((s) => <SourceBadge key={s} source={s} />)
              ) : (
                <span className="text-xs text-slate-500">No source records</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {/* Connected entities */}
      <section className="mb-4" aria-label="Connected entities">
        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" /> Connected entities
        </h3>
        {connectedIds.length ? (
          <ul className="space-y-1.5">
            {connectedIds.map((cid) => {
              const cn = nodeById[cid]
              return (
                <li key={cid}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      onSelectEntity?.(cid)
                    }}
                    className="flex w-full items-center justify-between rounded-md border border-ink-600/70 bg-ink-800/40 px-3 py-2 text-sm text-slate-200 transition-colors hover:border-cyan-brand/40 hover:bg-ink-700/50 cursor-pointer"
                  >
                    {labelOf(cid)}
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      {cn ? ENTITY_META[cn.type]?.singular : ''}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No connected entities.</p>
        )}
      </section>

      {/* Supporting evidence */}
      <section aria-label="Supporting evidence">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Supporting evidence
        </h3>
        {evidenceIds.length ? (
          <div className="flex flex-wrap gap-1.5">
            {evidenceIds.map((id) => (
              <EvidenceChip key={id} id={id} onOpen={onOpenEvidence} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No evidence records linked yet.</p>
        )}
      </section>
    </Drawer>
  )
}

export default NodeDetailPanel