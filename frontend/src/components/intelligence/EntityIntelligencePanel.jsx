import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, ShieldAlert, ExternalLink } from 'lucide-react'
import Drawer from '../ui/Drawer.jsx'
import Button from '../ui/Button.jsx'
import EvidenceChip from '../common/EvidenceChip.jsx'
import LoadingState from '../ui/LoadingState.jsx'
import api from '../../services/api.js'
import { ENTITY_TYPE_META } from '../../config/entityMeta.js'

/*
 * Compact entity intelligence drawer opened from a graph node click.
 * Only opened for nodes that resolve to a known entity profile; all
 * other nodes fall back to NodeDetailPanel.
 */
const EntityIntelligencePanel = ({ open, onClose, entity, nodeId, caseId, onOpenEvidence }) => {
  const navigate = useNavigate()
  const [connections, setConnections] = useState([])
  const [connectionsLoading, setConnectionsLoading] = useState(false)
  const [incidentEvidence, setIncidentEvidence] = useState([])

  useEffect(() => {
    let cancelled = false
    if (!entity?.slug) {
      setConnections([])
      return undefined
    }
    setConnectionsLoading(true)
    api
      .get(`/entities/${entity.slug}/connections`)
      .then((res) => {
        if (!cancelled) setConnections(res.data.connections || [])
      })
      .catch(() => {
        if (!cancelled) setConnections([])
      })
      .finally(() => {
        if (!cancelled) setConnectionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [entity])

  // Supporting evidence behind the incident edges touching this node.
  useEffect(() => {
    let cancelled = false
    if (!caseId || !nodeId) {
      setIncidentEvidence([])
      return undefined
    }
    api
      .get(`/cases/${caseId}/graph`)
      .then((res) => {
        if (cancelled) return
        const incident = (res.data.edges || []).filter(
          (e) => e.source === nodeId || e.target === nodeId
        )
        const ids = [...new Set(incident.flatMap((e) => e.evidenceIds || []))]
        setIncidentEvidence(ids.slice(0, 6))
      })
      .catch(() => {
        if (!cancelled) setIncidentEvidence([])
      })
    return () => {
      cancelled = true
    }
  }, [caseId, nodeId])

  if (!entity) return null

  const meta = ENTITY_TYPE_META[entity.type] || {}
  const TypeIcon = meta.icon || ExternalLink
  const crossCase = (entity.cases || []).length > 1
  const metrics = entity.metrics || {}

  return (
    <Drawer open={open} onClose={onClose} title="Entity Intelligence">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.classes || 'bg-ink-700 text-slate-300'}`}
          >
            <TypeIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {meta.label || entity.type} · {entity.id}
            </p>
            <h2 className="text-lg font-semibold text-slate-100">{entity.label}</h2>
            <p className="mt-0.5 text-xs text-slate-400">{metrics.cases ?? 0} case presence</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Calls', value: metrics.calls ?? 0 },
            { label: 'Txn', value: metrics.transactions ?? 0 },
            { label: 'IP events', value: metrics.ipActivities ?? 0 },
            { label: 'Evidence', value: metrics.evidenceReferences ?? 0 },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-ink-600 bg-ink-700/30 p-2 text-center">
              <p className="text-lg font-semibold text-slate-100">{m.value}</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-slate-500">{m.label}</p>
            </div>
          ))}
        </div>

        {crossCase && (
          <div className="flex items-center gap-2 rounded-lg border border-cyan-brand/25 bg-cyan-brand/10 px-3 py-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
            <p className="text-xs text-cyan-100">
              Cross-case entity — appears in {(entity.cases || []).length} investigations.
            </p>
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Connected entities ({connections.length})
          </p>
          {connectionsLoading ? (
            <LoadingState label="Loading connections…" />
          ) : connections.length === 0 ? (
            <p className="mt-2 rounded-lg border border-ink-600 bg-ink-700/30 px-3 py-2 text-sm text-slate-400">
              No connected entities recorded.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {connections.map((c) => {
                const ConnectedIcon = ENTITY_TYPE_META[c.type]?.icon || ExternalLink
                return (
                  <li
                    key={c.nodeId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-ink-600 bg-ink-700/30 px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <ConnectedIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      <span className="truncate text-sm text-slate-200">
                        {c.label}
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-500">
                          {c.relation}
                        </span>
                      </span>
                    </span>
                    {c.slug && (
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/entities/${c.slug}`)}>
                        Profile
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {incidentEvidence.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Supporting evidence · case {caseId}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {incidentEvidence.map((id) => (
                <EvidenceChip key={id} id={id} onOpen={() => onOpenEvidence?.(id)} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-2">
        <Button
          variant="primary"
          className="w-full"
          onClick={() => {
            onClose()
            navigate(`/entities/${entity.slug}`)
          }}
        >
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          Open entity profile
        </Button>
        {crossCase && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onClose()
              navigate(`/entities/${entity.slug}/cross-case`)
            }}
          >
            View cross-case detail
          </Button>
        )}
      </div>
    </Drawer>
  )
}

export default EntityIntelligencePanel