import { Link } from 'react-router-dom'
import { Quote, Scale, FileText, ArrowRight, BellRing } from 'lucide-react'
import Drawer from '../ui/Drawer.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import VerificationStatus from '../analytics/VerificationStatus.jsx'
import EvidenceChip from '../common/EvidenceChip.jsx'
import CorrelationBadge from '../analytics/CorrelationBadge.jsx'
import { getAlertTypeMeta, SEVERITY_VARIANTS } from '../analytics/alertTypeMeta.js'
import { SOURCE_META } from '../../config/sourceMeta.js'

/*
 * Compact claim timeline:
 *
 *     claim start ───────────────────┬─────────────────── claim end
 *       19:00                        │                     21:00
 *                                 evidence 1
 *                                 19:17 · BANKING · Sector X
 *                                 evidence 2…
 *
 * Rendered as an annotated vertical list. All entries stay neutral.
 */
const ClaimTimeline = ({ contradiction, onOpenEvidence }) => {
  const claimSrc = SOURCE_META[contradiction.claimSource]
  const entries = (contradiction.independentEvidence || [])
    .map((ev, i) =>
      ev
        ? {
            ...ev,
            src: SOURCE_META[ev.source],
            evidenceId: (contradiction.evidenceIds || [])[i],
          }
        : null
    )
    .filter(Boolean)

  const nodes = [
    {
      kind: 'claim-start',
      label: 'Claim start',
      time: contradiction.startTime,
      note: `Claimed location: ${contradiction.claimedLocation}`,
      evidenceId: contradiction.claimSource,
      src: claimSrc,
    },
    ...entries.map((ev) => ({
      kind: 'evidence',
      label: `${ev.source} record`,
      time: ev.time,
      note: ev.detail,
      evidenceId: ev.evidenceId,
      src: ev.src,
    })),
    {
      kind: 'claim-end',
      label: 'Claim end',
      time: contradiction.endTime,
      note: `Claimed location: ${contradiction.claimedLocation}`,
    },
  ]

  return (
    <ol className="relative space-y-4 border-l border-ink-600/70 pl-4" aria-label="Claim timeline">
      {nodes.map((node, i) => {
        const Icon = node.kind === 'evidence' ? node.src?.icon : node.kind === 'claim-start' ? Quote : FileText
        return (
          <li key={i} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[21.5px] top-1 h-2.5 w-2.5 rounded-full border-2 ${
                node.kind === 'evidence'
                  ? 'border-sky-brand bg-ink-850'
                  : 'border-amber-300 bg-ink-850'
              }`}
            />
            <div className="flex items-start gap-2">
              {Icon && (
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                    node.kind === 'evidence'
                      ? (node.src?.classes || 'bg-ink-700 text-slate-300')
                      : 'bg-amber-500/15 text-amber-300'
                  }`}
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {node.label}
                </p>
                <p className="font-mono text-xs text-cyan-brand">{node.time}</p>
                <p className="mt-0.5 text-sm text-slate-300">{node.note}</p>
                {node.evidenceId && (
                  <div className="mt-1">
                    <EvidenceChip id={node.evidenceId} theme="faint" onOpen={onOpenEvidence} />
                  </div>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

const ContradictionDetail = ({
  open,
  onClose,
  caseId,
  contradiction,
  onOpenEvidence,
  onStatusChange,
  relatedAlertId,
}) => {
  const meta = getAlertTypeMeta('Potential Contradiction')
  const MetaIcon = meta.icon

  if (!contradiction) return null

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Contradiction review"
      width="max-w-3xl"
      footer={
        <>
          <div className="mr-auto flex items-center gap-2">
            <CorrelationBadge />
            {relatedAlertId && (
              <Link to={`/cases/${caseId}/alerts?a=${encodeURIComponent(relatedAlertId)}`}>
                <Button variant="outline" size="sm">
                  <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                  Related lead
                </Button>
              </Link>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={contradiction.status === 'Reviewed'}
            onClick={() => onStatusChange?.('Reviewed')}
          >
            Mark as reviewed
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={contradiction.status === 'Dismissed'}
            onClick={() => onStatusChange?.('Dismissed')}
          >
            Dismiss
          </Button>
        </>
      }
    >
      {/* Identity */}
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-300">
          <MetaIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">
            {contradiction.claimedBy}: “{contradiction.claim}”
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Case #{contradiction.caseId} · Claim recorded in {contradiction.claimSource}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 flex-col items-end gap-2">
          <VerificationStatus status={contradiction.status} />
          <Badge variant={SEVERITY_VARIANTS[contradiction.severity] || 'neutral'}>
            {contradiction.severity} severity
          </Badge>
        </div>
      </div>

      {/* Two-column comparison */}
      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Claim versus evidence">
        <div className="rounded-md border border-amber-500/25 bg-amber-500/5 p-3">
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-amber-300">
            Stated claim
          </h3>
          <p className="text-sm leading-relaxed text-slate-200">{contradiction.claim}</p>
          <p className="mt-2 text-xs text-slate-500">
            {contradiction.startTime}–{contradiction.endTime} · {contradiction.claimedLocation}
          </p>
        </div>
        <div className="rounded-md border border-sky-500/25 bg-sky-500/5 p-3">
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-sky-300">
            Independent evidence
          </h3>
          <p className="text-sm leading-relaxed text-slate-200">{contradiction.assessment}</p>
          <p className="mt-2 text-xs text-slate-500">
            {(contradiction.independentEvidence || []).length} records against the claim
          </p>
        </div>
      </section>

      {/* Compact timeline */}
      <section className="mb-4" aria-label="Claim timeline">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Claim timeline
        </h3>
        <ClaimTimeline contradiction={contradiction} onOpenEvidence={onOpenEvidence} />
      </section>

      {/* Prototype note */}
      <section className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2.5" aria-label="Review note">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">
          Review note
        </p>
        <p className="mt-1 text-xs text-slate-300">
          Potential contradictions are generated when a stated claim appears inconsistent with
          independent synthetic evidence. They require investigator verification and do not
          automatically establish that a claim is incorrect.
        </p>
      </section>
    </Drawer>
  )
}

export default ContradictionDetail