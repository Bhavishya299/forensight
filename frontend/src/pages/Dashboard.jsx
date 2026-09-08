import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderOpen,
  Database,
  GitMerge,
  AlertTriangle,
  Timer,
  Plus,
  ScanSearch,
  Share2,
  GitBranch,
  Link2,
} from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHeader from '../components/dashboard/PageHeader.jsx'
import DashboardStatCard from '../components/dashboard/DashboardStatCard.jsx'
import InvestigationTable from '../components/dashboard/InvestigationTable.jsx'
import InvestigationLead from '../components/dashboard/InvestigationLead.jsx'
import SourceActivityChart from '../components/dashboard/SourceActivityChart.jsx'
import RecentActivity from '../components/dashboard/RecentActivity.jsx'
import SystemStatus from '../components/dashboard/SystemStatus.jsx'
import Button from '../components/ui/Button.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import api from '../services/api.js'

const KPI_META = {
  cases: { icon: FolderOpen, tone: 'cyan' },
  sources: { icon: Database, tone: 'teal' },
  relationships: { icon: GitMerge, tone: 'slate' },
  alerts: { icon: AlertTriangle, tone: 'amber' },
  windows: { icon: Timer, tone: 'red' },
}

const SIGNAL_CARD_TEMPLATE = [
  { label: 'Global entities', key: 'entities', note: 'Tracked across investigation dataset', icon: Share2, tone: 'cyan' },
  { label: 'Shared entities', key: 'sharedEntities', note: 'Appear in 2+ case files', icon: GitMerge, tone: 'teal' },
  { label: 'Cross-case signals', key: 'crossCaseSignals', note: 'Additional appearances across case files', icon: GitBranch, tone: 'amber' },
  { label: 'Weak link signals', key: 'weakLinks', note: 'Potential unexplained connections', icon: Link2, tone: 'red' },
]

const Dashboard = () => {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [crossCaseEntities, setCrossCaseEntities] = useState([])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get('/dashboard').then((r) => r.data),
      api.get('/entities')
        .then((r) => (r.data.entities || []).filter((e) => (e.cases || []).length > 1).map((e) => ({ label: e.label || e.name || e.id })))
        .catch(() => []),
    ])
      .then(([dash, entities]) => {
        if (cancelled) return
        setData(dash)
        setCrossCaseEntities(entities)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const kpis = useMemo(() => (data?.kpis || []), [data])
  const signalCards = useMemo(() => {
    const m = data?.metrics || {}
    return SIGNAL_CARD_TEMPLATE.map((s) => ({ ...s, value: m[s.key] ?? 0 }))
  }, [data])

  if (loading) {
    return (
      <PageContainer maxWidth="max-w-[1600px]">
        <LoadingState label="Loading investigation overview…" />
      </PageContainer>
    )
  }

  return (
    <PageContainer maxWidth="max-w-[1600px]">
      <PageHeader
        title="Investigation Overview"
        tagline="Connected evidence. Correlated events. Explainable investigative leads."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => navigate('/cases')}
            >
              <ScanSearch className="h-4 w-4" aria-hidden="true" />
              View cases
            </Button>
            <Button onClick={() => navigate('/cases/new')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create case
            </Button>
          </>
        }
      />

      {/* KPI cards */}
      {kpis.length === 0 ? (
        <EmptyState
          icon={<Database className="h-6 w-6" aria-hidden="true" />}
          title="No metrics yet"
          description="Create a case and add evidence to start building investigation intelligence."
          action={
            <Button onClick={() => navigate('/cases/new')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create case
            </Button>
          }
        />
      ) : (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => {
          const meta = KPI_META[kpi.id] || { icon: FolderOpen, tone: 'cyan' }
          const Icon = meta.icon
          return (
            <DashboardStatCard
              key={kpi.id}
              icon={<Icon className="h-4 w-4" aria-hidden="true" />}
              label={kpi.label}
              value={kpi.value}
              note={kpi.note}
              tone={meta.tone}
            />
          )
        })}
      </div>
      )}

      {/* Intelligence signals */}
      <section className="mt-5 rounded-lg border border-ink-600/70 bg-ink-850 p-4" aria-label="Intelligence signals">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Intelligence Signals</h2>
            <p className="text-xs text-slate-400">
              Cross-case entity coverage and potential unexplained connections.
            </p>
          </div>
          {crossCaseEntities.length > 0 && (
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              {crossCaseEntities.map((e) => e.label).join(' · ')}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {signalCards.map((s) => {
            const Icon = s.icon
            return (
              <DashboardStatCard
                key={s.label}
                icon={<Icon className="h-4 w-4" aria-hidden="true" />}
                label={s.label}
                value={s.value}
                note={s.note}
                tone={s.tone}
              />
            )
          })}
        </div>
        <div className="mt-3 text-right">
          <Button variant="ghost" size="sm" onClick={() => navigate('/cases')}>
            Open entity intelligence
          </Button>
        </div>
      </section>

      {/* Active investigations table */}
      <div className="mt-5">
        <InvestigationTable investigations={data?.activeInvestigations || []} />
      </div>

      {/* Leads + source activity */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <InvestigationLead leads={data?.recentLeads || []} />
        <SourceActivityChart data={data?.sourceActivity || []} />
      </div>

      {/* Recent activity + system status */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <RecentActivity activity={data?.recentActivity || []} />
        <SystemStatus status={data?.systemStatus || []} />
      </div>
    </PageContainer>
  )
}

export default Dashboard
