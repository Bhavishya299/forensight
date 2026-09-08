import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Share2,
  GitBranch,
  Network,
  AlertTriangle,
  FileSearch,
  ArrowUpRight,
  FolderKanban,
} from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHeader from '../components/dashboard/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import DashboardStatCard from '../components/dashboard/DashboardStatCard.jsx'
import EvidenceChip from '../components/common/EvidenceChip.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import EvidenceDetailDrawer from '../components/evidence/EvidenceDetailDrawer.jsx'
import { ENTITY_TYPE_META } from '../config/entityMeta.js'
import { getEvidenceById } from '../store/caseStore.js'
import api from '../services/api.js'

const CrossCase = () => {
  const { entityId } = useParams()
  const [entity, setEntity] = useState(null)
  const [caseRows, setCaseRows] = useState([])
  const [weakLinks, setWeakLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [evidenceOpen, setEvidenceOpen] = useState(null)

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

        const [casesRes, weakRes] = await Promise.all([
          api.get(`/entities/${ent.slug}/cases`),
          api.get(`/entities/${ent.slug}/weak-links`),
        ])
        if (cancelled) return
        setCaseRows(casesRes.data.cases || [])
        setWeakLinks(weakRes.data.weakLinks || [])
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
        <LoadingState label="Loading cross-case intelligence…" />
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
  const TypeIcon = meta?.icon || Network
  const crossCaseCount = (entity.cases || []).length
  const patterns = [...new Set(weakLinks.map((w) => w.typeLabel))]

  const columns = [
    { key: 'caseId', header: 'Case', render: (r) => <Link to={`/cases/${r.caseId}`} className="font-medium text-cyan-brand hover:underline">CASE #{r.caseId}</Link> },
    { key: 'from', header: 'First seen' },
    { key: 'to', header: 'Last seen' },
    { key: 'events', header: 'Events', render: (r) => <Badge variant="neutral">{r.events}</Badge> },
    {
      key: 'evidence',
      header: 'Evidence',
      render: (r) => (
        <div className="flex flex-wrap gap-1.5">
          {(r.evidence || []).map((id) => (
            <EvidenceChip key={id} id={id} theme="faint" onOpen={() => showEvidence(r.caseId, id)} />
          ))}
        </div>
      ),
    },
    {
      key: 'patterns',
      header: 'Shared patterns',
      render: () =>
        patterns.length ? (
          <Badge variant="warning" dot>{patterns.join(' · ')}</Badge>
        ) : (
          <span className="text-xs text-slate-500">—</span>
        ),
    },
  ]

  return (
    <PageContainer maxWidth="max-w-7xl">
      <PageHeader
        title={`Cross-Case Intelligence · ${entity.label}`}
        tagline="Aggregated view of the same entity across separate investigations."
        actions={
          <Link to={`/cases/${(entity.cases || [])[0]}/graph?entity=${encodeURIComponent(entity.label)}`}>
            <Button variant="outline">
              <Network className="h-4 w-4" aria-hidden="true" />
              Open in casegraph
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info" dot>SHARED ENTITY ACROSS {crossCaseCount} CASES</Badge>
      </div>

      {/* Cross-case signal */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Card
          title="Cross-Case Signal"
          subtitle="The entity appears in multiple case files"
          icon={<Share2 className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta?.classes || ''}`}>
              <TypeIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-slate-100">{entity.label}</p>
              <p className="text-xs text-slate-500">{entity.id} · shared pattern count {patterns.length}</p>
            </div>
          </div>
        </Card>

        <Card
          title="Identity"
          subtitle="Type and investigation period"
          icon={<FolderKanban className="h-4 w-4" aria-hidden="true" />}
        >
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-slate-500">Type</span><span className="text-slate-200">{meta?.label || entity.type}</span></li>
            <li className="flex justify-between"><span className="text-slate-500">First seen</span><span className="text-slate-200">{entity.firstSeen}</span></li>
            <li className="flex justify-between"><span className="text-slate-500">Last seen</span><span className="text-slate-200">{entity.lastSeen}</span></li>
          </ul>
        </Card>

        <Card
          title="Detected Patterns"
          subtitle="Cross-case weak link signals"
          icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
        >
          <ul className="space-y-1.5">
            {(patterns.length ? patterns : ['No shared pattern detected']).map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6">
        <Card
          title="Case comparison"
          subtitle={`Traceability of ${entity.label} across each investigation`}
          icon={<GitBranch className="h-4 w-4" aria-hidden="true" />}
          bodyClassName="px-0 py-0"
        >
          <div className="overflow-hidden">
            <DataTable
              columns={columns}
              rows={caseRows}
              rowKey={(r) => r.caseId}
              emptyLabel={`No case records for ${entity.label}`}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card
            title="Cross-case intelligence"
            subtitle={`Evidence and events per case file`}
            icon={<FileSearch className="h-4 w-4" aria-hidden="true" />}
          >
            <ul className="space-y-3">
              {caseRows.map((c) => (
                <li key={c.caseId} className="rounded-lg border border-ink-600/70 bg-ink-800/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Link to={`/cases/${c.caseId}`} className="text-sm font-semibold text-cyan-brand hover:underline">
                      CASE #{c.caseId}
                    </Link>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">{c.from} → {c.to}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="neutral">{c.events} events</Badge>
                    <Badge variant="info">{(c.evidence || []).length} evidence</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card
          title="Spatial view"
          subtitle="Entity present in multiple case files"
          icon={<Network className="h-4 w-4" aria-hidden="true" />}
          footer={
            <Link to={`/cases/${(entity.cases || [])[0]}/graph?entity=${encodeURIComponent(entity.label)}`}>
              <Button variant="outline" size="sm" className="w-full">
                Open in casegraph <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Link>
          }
        >
          <div className="flex items-center justify-center py-2">
            <svg viewBox="0 0 260 40" className="w-full" role="img" aria-label={`${entity.label} shared across ${crossCaseCount} cases`}>
              {[0, 1, 2].map((i) => (
                <line key={i} x1={i < 2 ? 62 + i * 30 : 0} x2={i < 2 ? 62 + i * 30 : 0} y1="20" y2="20" stroke="#334155" strokeWidth="1.5" />
              ))}
              {(entity.cases || []).slice(0, 3).map((c, i) => (
                <g key={c}>
                  <line x1={62 + i * 30} y1="20" x2="124" y2="20" stroke="#334155" strokeWidth="1.5" />
                  <rect x={60 + i * 30} y="12" width="14" height="16" rx="2" fill="#0f2747" stroke="#38bdf8" strokeWidth="1" />
                  <text x={62 + i * 30 + 7} y="23" textAnchor="middle" fontSize="7" fill="#7dd3fc" fontFamily="monospace">{String(c).slice(-2)}</text>
                </g>
              ))}
              <circle cx="124" cy="20" r="9" fill="#155e75" stroke="#22d3ee" strokeWidth="1.5" />
              <text x="124" y="23" textAnchor="middle" fontSize="7" fill="#cffafe" fontFamily="monospace">X</text>
            </svg>
          </div>
          <ul className="flex flex-wrap justify-center gap-2">
            {(entity.cases || []).map((c) => (
              <li key={c}><Badge variant="info">{`CASE #${c}`}</Badge></li>
            ))}
          </ul>
        </Card>
      </div>

      <EvidenceDetailDrawer
        open={!!evidenceOpen}
        onClose={() => setEvidenceOpen(null)}
        caseId={evidenceOpen?.caseId}
        item={evidenceOpen?.item}
      />
    </PageContainer>
  )
}

export default CrossCase
