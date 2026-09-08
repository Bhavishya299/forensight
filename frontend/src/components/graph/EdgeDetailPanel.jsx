import { GitMerge, Clock } from 'lucide-react'
import Drawer from '../ui/Drawer.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import SourceBadge from '../common/SourceBadge.jsx'
import EvidenceChip from '../common/EvidenceChip.jsx'

/*
 * Relationship detail drawer opened when a graph edge is selected.
 * Neutral investigative framing only — never presented as proof.
 */
const EdgeDetailPanel = ({ open, onClose, caseId, edge, nodeById = {}, onOpenEvidence }) => {
  if (!edge) return null

  const labelOf = (id) => nodeById[id]?.label || id

  const [primaryEvidence, ...corroboration] = edge.evidenceIds || []

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Potential relationship"
      width="max-w-sm"
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {/* Identity */}
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-brand/10 text-cyan-brand">
          <GitMerge className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">
            {labelOf(edge.source)} <span className="text-slate-500">↔</span> {labelOf(edge.target)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="brand">{edge.relationship}</Badge>
            {edge.crossSource && (
              <Badge variant="success" dot>
                {edge.sourceTypes.length} sources
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Detection */}
      <section className="mb-4" aria-label="Detection details">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Detected through
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {(edge.sourceTypes || [edge.sourceType]).map((s) => (
            <SourceBadge key={s} source={s} />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Timestamp {edge.timestamp} {caseId ? `· Case #${caseId}` : ''}
        </div>
      </section>

      {/* Evidence */}
      <section className="mb-4" aria-label="Supporting evidence">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Supporting evidence
        </h3>
        {edge.evidenceIds?.length ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {primaryEvidence && <EvidenceChip id={primaryEvidence} onOpen={onOpenEvidence} />}
            </div>
            {corroboration.length > 0 && (
              <>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  Additional corroboration
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {corroboration.map((id) => (
                    <EvidenceChip key={id} id={id} theme="faint" onOpen={onOpenEvidence} />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No evidence records linked yet.</p>
        )}
      </section>

      {edge.note && (
        <p className="mb-4 rounded-md border border-ink-600/70 bg-ink-800/40 px-3 py-2.5 text-xs text-slate-300">
          {edge.note}
        </p>
      )}

      {/* Status */}
      <section aria-label="Status">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Status
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="brand">Potential relationship</Badge>
          <Badge variant="warning">Requires investigator verification</Badge>
        </div>
      </section>
    </Drawer>
  )
}

export default EdgeDetailPanel