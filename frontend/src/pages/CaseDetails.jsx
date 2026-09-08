import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FileText, Database, GitBranch, Clock, Network, FolderSearch, BellRing } from 'lucide-react'
import api from '../services/api.js'
import { getCaseById } from '../store/caseStore.js'
import LoadingState from '../components/ui/LoadingState.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageContainer from '../components/layout/PageContainer.jsx'
import DashboardStatCard from '../components/dashboard/DashboardStatCard.jsx'
import Card from '../components/ui/Card.jsx'
import AlertBanner from '../components/ui/AlertBanner.jsx'
import EvidenceSourceOverview from '../components/case/EvidenceSourceOverview.jsx'
import CaseActivity from '../components/case/CaseActivity.jsx'

/*
 * Case overview (index tab of the case workspace).
 * Provides a live summary of the case's data posture and
 * quick access into the analytical workspaces.
 */
const CaseDetails = () => {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [caseData, setCaseData] = useState(null)
  const [stats, setStats] = useState({
    records: 0,
    sourceCount: 0,
    potentialRelationships: 0,
    alerts: 0,
    events: 0,
    entities: 0,
    lastIngestion: '—',
  })
  const [sources, setSources] = useState([])
  const [activity, setActivity] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [caseRes, overviewRes] = await Promise.allSettled([
        getCaseById(id),
        api.get(`/cases/${id}/overview`),
      ])
      if (cancelled) return
      const caseDataRes = caseRes.status === 'fulfilled' ? caseRes.value : null
      const overviewData =
        overviewRes.status === 'fulfilled' ? overviewRes.value.data || {} : {}
      const statsRes = overviewData.stats || {}
      setCaseData(caseDataRes)
      setStats({
        records: statsRes.records ?? 0,
        sourceCount: statsRes.sourceCount ?? statsRes.sources ?? 0,
        potentialRelationships: statsRes.potentialRelationships ?? 0,
        alerts: statsRes.alerts ?? 0,
        events: statsRes.events ?? 0,
        entities: statsRes.entities ?? 0,
        lastIngestion: statsRes.lastIngestion ?? '—',
      })
      setSources(overviewData.sources || [])
      setActivity(overviewData.activity || [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  const analyticalProducts = [
    {
      to: 'alerts',
      label: 'Alerts',
      value: stats.alerts,
      icon: BellRing,
      note: 'Potential investigative leads',
    },
    {
      to: 'timeline',
      label: 'Events',
      value: stats.events,
      icon: Clock,
      note: 'Across independent sources',
    },
    {
      to: 'evidence',
      label: 'Sources',
      value: stats.sourceCount,
      icon: Database,
      note: 'Source types captured',
    },
  ]

  const quickLinks = [
    { to: 'evidence', label: 'Evidence workspace', description: 'Records, sources, and ingestion', icon: FolderSearch },
    { to: 'graph', label: 'Graph', description: 'Entity and relationship map', icon: Network },
    { to: 'timeline', label: 'Timeline', description: 'Event-window visualization', icon: Clock },
    { to: 'alerts', label: 'Alerts', description: 'Review flagged items', icon: BellRing },
    { to: 'reports', label: 'Reports', description: 'Investigation report', icon: FileText },
  ]

  if (loading) {
    return (
      <PageContainer>
        <Card>
          <LoadingState label="Loading case overview…" />
        </Card>
      </PageContainer>
    )
  }

  if (!caseData) {
    return (
      <PageContainer>
        <Card>
          <EmptyState
            icon={<Network className="h-6 w-6" aria-hidden="true" />}
            title="Case not found"
            description={`No case exists for ID #${id}. The case may have been archived or you may not have access to it.`}
          />
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="space-y-5">
        <AlertBanner variant="warning" title="Demonstration workspace">
          Analytical products shown here are investigative leads that require verification.
          Treat every summary as a lead that requires verification.
        </AlertBanner>

        {/* Analytical products strip */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {analyticalProducts.map((p) => {
            const Icon = p.icon
            return (
              <Link
                key={p.to}
                to={p.to}
                className="group flex items-center gap-3 rounded-lg border border-ink-600/70 bg-ink-850 px-4 py-3 transition-colors hover:border-cyan-brand/40 hover:bg-ink-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-brand"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink-700 text-cyan-brand">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-semibold leading-none text-slate-100 group-hover:text-cyan-100">
                    {p.value}
                  </p>
                  <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {p.label} · {p.note}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <DashboardStatCard
            icon={<FileText className="h-4 w-4" aria-hidden="true" />}
            label="Records"
            value={stats.records}
            note="Normalized evidence records"
          />
          <DashboardStatCard
            icon={<Database className="h-4 w-4" aria-hidden="true" />}
            label="Source types"
            value={stats.sourceCount}
            note="Across the case workspace"
            tone="teal"
          />
          <DashboardStatCard
            icon={<GitBranch className="h-4 w-4" aria-hidden="true" />}
            label="Potential Relationships"
            value={stats.potentialRelationships}
            note="Requires verification"
            tone="amber"
          />
          <DashboardStatCard
            icon={<Clock className="h-4 w-4" aria-hidden="true" />}
            label="Last Ingestion"
            value={stats.lastIngestion}
            note="Most recent source ingest"
            tone="cyan"
          />
        </div>

        {/* Sources + quick links */}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EvidenceSourceOverview caseId={id} />
          </div>

          <div className="space-y-5">
            <Card
              title="Workspace access"
              subtitle="Jump directly into a section"
              icon={<Network className="h-4 w-4" aria-hidden="true" />}
            >
              <ul className="-my-2">
                {quickLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="group flex items-start gap-3 rounded-md px-1 py-2.5 transition-colors hover:bg-ink-700/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-brand"
                      >
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink-700 text-cyan-brand">
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-slate-200 group-hover:text-cyan-100">
                            {link.label}
                          </span>
                          <span className="block text-xs text-slate-500">{link.description}</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </div>
        </div>

        <CaseActivity caseId={id} />
      </div>
    </PageContainer>
  )
}

export default CaseDetails