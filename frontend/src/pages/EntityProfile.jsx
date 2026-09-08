import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  PhoneCall,
  ArrowLeftRight,
  Globe2,
  MapPin,
  MonitorSmartphone,
  AtSign,
  FolderKanban,
  FileSearch,
  Share2,
  AlertTriangle,
  Network,
  ArrowUpRight,
  ExternalLink,
  CalendarRange,
} from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHeader from '../components/dashboard/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import DashboardStatCard from '../components/dashboard/DashboardStatCard.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import SourceBadge from '../components/common/SourceBadge.jsx'
import EvidenceChip from '../components/common/EvidenceChip.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import EvidenceDetailDrawer from '../components/evidence/EvidenceDetailDrawer.jsx'
import WeakLinkDrawer from '../components/intelligence/WeakLinkDrawer.jsx'
import { ENTITY_TYPE_META } from '../config/entityMeta.js'
import { getEvidenceById } from '../store/caseStore.js'
import api from '../services/api.js'

const METRIC_CARDS = (m) => [
  { label: 'Calls', value: m.calls, icon: <PhoneCall className="h-4 w-4" aria-hidden="true" />, tone: 'cyan' },
  { label: 'Transactions', value: m.transactions, icon: <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />, tone: 'teal' },
  { label: 'IP events', value: m.ipActivities, icon: <Globe2 className="h-4 w-4" aria-hidden="true" />, tone: 'cyan' },
  { label: 'Locations', value: m.locations, icon: <MapPin className="h-4 w-4" aria-hidden="true" />, tone: 'amber' },
  { label: 'Devices', value: m.devices, icon: <MonitorSmartphone className="h-4 w-4" aria-hidden="true" />, tone: 'slate' },
  { label: 'Social activity', value: m.socialEvents, icon: <AtSign className="h-4 w-4" aria-hidden="true" />, tone: 'teal' },
  { label: 'Case presence', value: m.cases, icon: <FolderKanban className="h-4 w-4" aria-hidden="true" />, tone: 'cyan' },
  { label: 'Evidence refs', value: m.evidenceReferences, icon: <FileSearch className="h-4 w-4" aria-hidden="true" />, tone: 'amber' },
]

const EntityProfile = () => {
  const { entityId } = useParams()
  const [entity, setEntity] = useState(null)
  const [connections, setConnections] = useState([])
  const [cases, setCases] = useState([])
  const [timeline, setTimeline] = useState([])
  const [weakLinks, setWeakLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [evidenceOpen, setEvidenceOpen] = useState(null)
  const [weakLink, setWeakLink] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await api.get(`/entities/${entityId}`)
        if (cancelled) return
        const ent = res.data
        if (!ent || !ent.slug) {
          setEntity(null)
          setLoading(false)
          return
        }
        setEntity(ent)

        const [casesRes, connRes, weakRes] = await Promise.all([
          api.get(`/entities/${ent.slug}/cases`),
          api.get(`/entities/${ent.slug}/connections`),
          api.get(`/entities/${ent.slug}/weak-links`),
        ])
        if (cancelled) return
        setCases(casesRes.data.cases || [])
        setConnections(connRes.data.connections || [])
        setWeakLinks(weakRes.data.weakLinks || [])

        const firstCase = (ent.cases || [])[0]
        if (firstCase) {
          const tlRes = await api.get(`/entities/${ent.slug}/timeline?case_id=${firstCase}`)
          if (!cancelled) setTimeline(tlRes.data.items || [])
        }
      } catch {
        if (!cancelled) setEntity(null)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [entityId])

  const showEvidence = (caseId, id) => {
    setEvidenceOpen({ caseId, id, item: null })
    getEvidenceById(caseId, id).then((item) => {
      setEvidenceOpen((prev) => prev && prev.caseId === caseId && prev.id === id ? { ...prev, item } : prev)
    })
  }

  if (loading) {
    return (
      <PageContainer maxWidth="max-w-7xl">
        <LoadingState label="Loading entity profile…" />
      </PageContainer>
    )
  }

  if (!entity) {
    return (
      <PageContainer maxWidth="max-w-5xl">
        <Badge variant="warning" dot>ENTITY NOT FOUND</Badge>
        <p className="mt-3 text-sm text-slate-400">
          This entity is not part of the demonstration dataset.{' '}
          <Link to="/dashboard" className="text-cyan-brand hover:underline">Return to dashboard</Link>.
        </p>
      </PageContainer>
    )
  }

  const meta = ENTITY_TYPE_META[entity.type]
  const TypeIcon = meta?.icon || ExternalLink
  const crossCase = (entity.cases || []).length > 1
  const metrics = entity.metrics ? METRIC_CARDS(entity.metrics) : []
  const allEvidence = cases.flatMap((c) => c.evidence || [])
  const uniqueEvidence = allEvidence.filter((v, i) => allEvidence.indexOf(v) === i)
  const shownEvidence = uniqueEvidence.slice(0, 12)

  return (
    <PageContainer maxWidth="max-w-7xl">
      <PageHeader
        title={`Entity Profile · ${entity.label}`}
        tagline="Collective, cross-case picture of observed activity — no conclusion is asserted."
        actions={
          <>
            {cases.length > 0 && (cases[0].evidence || []).length > 0 && (
              <Button variant="outline" onClick={() => showEvidence(cases[0].caseId, cases[0].evidence[0])}>
                <FileSearch className="h-4 w-4" aria-hidden="true" />
                Evidence references
              </Button>
            )}
            {crossCase && (
              <Link to={`/entities/${entity.slug}/cross-case`}>
                <Button variant="outline">
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  Cross-Case Intelligence
                </Button>
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Identity + description */}
        <Card className="lg:col-span-1" bodyClassName="space-y-4">
          <div className="flex items-start gap-3">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${meta?.classes || ''}`}>
              <TypeIcon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {meta?.label || entity.type} · {entity.id}
              </p>
              <h2 className="truncate text-xl font-semibold text-slate-100">{entity.label}</h2>
              <div className="mt-1.5">
                <StatusBadge status={entity.status} />
              </div>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{entity.summary}</p>
          <dl className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">First seen</dt>
              <dd className="font-medium text-slate-200">{entity.firstSeen}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Last seen</dt>
              <dd className="font-medium text-slate-200">{entity.lastSeen}</dd>
            </div>
          </dl>
          <div className="grid grid-cols-2 gap-2">
            {cases.length > 0 && (
              <Link to={`/cases/${cases[0].caseId}/timeline`}>
                <Button variant="outline" className="w-full">
                  <CalendarRange className="h-4 w-4" aria-hidden="true" />
                  Timeline
                </Button>
              </Link>
            )}
            <Link to={`/cases/${cases[0]?.caseId}/graph?entity=${encodeURIComponent(entity.label)}`}>
              <Button variant="outline" className="w-full">
                <Network className="h-4 w-4" aria-hidden="true" />
                Graph
              </Button>
            </Link>
          </div>
        </Card>

        {/* Metrics */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-ink-600/70 bg-ink-850 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">Activity metrics</h3>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">
                From investigation dataset
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {metrics.map((m) => (
                <DashboardStatCard key={m.label} {...m} />
              ))}
            </div>
          </div>

          {/* Cross-case intelligence + signal */}
          {crossCase && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Card
                title="Cross-Case Intelligence"
                subtitle={`Shared entity across ${(entity.cases || []).length} investigations`}
                icon={<Share2 className="h-4 w-4" aria-hidden="true" />}
                footer={
                  <Link to={`/entities/${entity.slug}/cross-case`}>
                    <Button variant="outline" size="sm" className="w-full">
                      View cross-case details
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </Link>
                }
              >
                <div className="flex flex-wrap gap-2">
                  {(entity.cases || []).map((c) => (
                    <Badge key={c} variant="info">{`CASE #${c}`}</Badge>
                  ))}
                </div>
              </Card>
              <Card
                title="Cross-Case Signal"
                subtitle="Aggregated appearance across case files"
                icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
                status={<Badge variant="info">SHARED · {(entity.cases || []).length}</Badge>}
              >
                <p className="text-sm leading-relaxed text-slate-300">
                  {entity.label} appears in {(entity.cases || []).length} separate investigations. Each
                  appearance is traceable to evidence; whether the appearances relate remains an
                  investigative question.
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Connected entities */}
        <Card
          title="Connected entities"
          subtitle={`Entities linked to ${entity.label} in the case graph`}
          icon={<Network className="h-4 w-4" aria-hidden="true" />}
        >
          {connections.length === 0 ? (
            <EmptyContent text="No direct connections recorded in the graph." />
          ) : (
            <ul className="divide-y divide-ink-600/60">
              {connections.map((c) => {
                const ConnectedIcon = ENTITY_TYPE_META[c.type]?.icon || ExternalLink
                const clickable = !!c.slug
                const inner = (
                  <>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-700 text-slate-300">
                      <ConnectedIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-slate-100">{c.label}</span>
                        {clickable ? (
                          <ExternalLink className="h-3 w-3 shrink-0 text-cyan-brand" aria-hidden="true" />
                        ) : (
                          <span className="shrink-0 rounded-sm bg-ink-700/70 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-500">
                            not profile-linked
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{c.relation}</span>
                    </span>
                  </>
                )
                return (
                  <li key={c.nodeId}>
                    {clickable ? (
                      <Link
                        to={`/entities/${c.slug}`}
                        className="flex items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-ink-700/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-brand"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-1 py-2.5 opacity-70">{inner}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Case presence */}
        <Card
          title="Case presence"
          subtitle="Where this entity appears, with traceable evidence per case"
          icon={<FolderKanban className="h-4 w-4" aria-hidden="true" />}
        >
          <ul className="space-y-3">
            {cases.map((c) => (
              <li key={c.caseId} className="rounded-lg border border-ink-600/70 bg-ink-800/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    to={`/cases/${c.caseId}`}
                    className="text-sm font-semibold text-cyan-brand hover:underline"
                  >
                    CASE #{c.caseId}
                  </Link>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    {c.from} → {c.to}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">{c.events} events</Badge>
                  <Badge variant="info">{(c.evidence || []).length} evidence</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(c.evidence || []).map((eid) => (
                    <EvidenceChip key={eid} id={eid} onOpen={() => showEvidence(c.caseId, eid)} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Digital footprint timeline */}
      <Card
        className="mt-6"
        title="Digital footprint"
        subtitle={`Observed activity involving ${entity.label} across the case timeline`}
        icon={<CalendarRange className="h-4 w-4" aria-hidden="true" />}
        footer={
          cases.length > 0 ? (
            <Link
              to={`/cases/${cases[0].caseId}/timeline`}
              className="inline-flex items-center gap-1 text-xs font-medium text-cyan-brand hover:underline"
            >
              View full timeline <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : undefined
        }
      >
        {timeline.length === 0 ? (
          <EmptyContent text="No timeline events reference this entity." />
        ) : (
          <ul className="divide-y divide-ink-600/60">
            {timeline.slice(0, 12).map((ev) => (
              <li key={ev.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <span className="w-16 shrink-0 font-mono text-xs text-slate-400">{ev.time || ev.timestamp}
                  {ev.window ? <span className="ml-1 text-[10px] text-slate-500">{ev.window}</span> : null}
                </span>
                <SourceBadge source={ev.source} />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{ev.description}</span>
                {ev.evidenceId && (
                  <EvidenceChip id={ev.evidenceId} theme="faint" onOpen={() => showEvidence(ev.caseId || cases[0]?.caseId, ev.evidenceId)} />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Evidence references + weak links */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card
          title="Evidence references"
          subtitle={`${uniqueEvidence.length} unique records associated with ${entity.label}`}
          icon={<FileSearch className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="flex flex-wrap gap-2">
            {shownEvidence.map((eid) => (
              <EvidenceChip key={eid} id={eid} onOpen={() => showEvidence(cases[0]?.caseId, eid)} />
            ))}
            {uniqueEvidence.length > shownEvidence.length && (
              <span className="inline-flex items-center rounded-md border border-ink-600 bg-ink-700/50 px-2 py-0.5 text-xs text-slate-400">
                +{uniqueEvidence.length - shownEvidence.length} more
              </span>
            )}
          </div>
        </Card>

        <Card
          title="Potential weak links"
          subtitle="Unexplained connections observed in the dataset"
          icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
        >
          {weakLinks.length === 0 ? (
            <EmptyContent text="No unexplained connections recorded for this entity." />
          ) : (
            <ul className="space-y-3">
              {weakLinks.map((w, i) => (
                <li
                  key={w.id || i}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm text-slate-200">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
                      <span className="truncate">{w.connection}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">{w.typeLabel} · Confidence {w.confidence}</span>
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setWeakLink(w)}>
                    View link
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <EvidenceDetailDrawer
        open={!!evidenceOpen}
        onClose={() => setEvidenceOpen(null)}
        caseId={evidenceOpen?.caseId}
        item={evidenceOpen?.item}
      />
      <WeakLinkDrawer
        open={!!weakLink}
        onClose={() => setWeakLink(null)}
        link={weakLink}
        onOpenEvidence={(eid) => showEvidence(cases[0]?.caseId, eid)}
      />
    </PageContainer>
  )
}

function EmptyContent({ text }) {
  return <p className="py-4 text-center text-sm text-slate-500">{text}</p>
}

export default EntityProfile
