import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, Activity, Clock, Database, Plus, ChevronRight, Search } from 'lucide-react'
import { getAllCases, getCaseStats } from '../store/caseStore.js'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHeader from '../components/dashboard/PageHeader.jsx'
import DashboardStatCard from '../components/dashboard/DashboardStatCard.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'

const PRIORITY_VARIANT = {
  High: 'danger',
  Medium: 'warning',
  Low: 'info',
}

const STATUS_OPTIONS = [
  { value: 'All', label: 'All statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'In Review', label: 'In Review' },
  { value: 'Archived', label: 'Archived' },
]

const SORT_OPTIONS = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'title', label: 'Title (A–Z)' },
]

const Cases = () => {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [sort, setSort] = useState('updated')
  const [stats, setStats] = useState({ total: 0, active: 0, inReview: 0, archived: 0, sourcesToday: 0 })
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getCaseStats(), getAllCases()])
      .then(([s, c]) => {
        if (cancelled) return
        setStats(s)
        setCases(c || [])
      })
      .catch(() => {
        if (!cancelled) {
          setStats({ total: 0, active: 0, inReview: 0, archived: 0, sourcesToday: 0 })
          setCases([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = cases.filter((c) => {
      const matchesStatus = status === 'All' || c.status === status
      const matchesQuery =
        !q || c.id.includes(q) || c.title.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
    return [...list].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title)
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [cases, query, status, sort])

  return (
    <PageContainer>
      <PageHeader
        title="Cases"
        tagline="Investigation case list"
        actions={
          <Link to="/cases/new">
            <Button>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New case
            </Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingState label="Loading cases…" />
      ) : (
        <>
      {/* Summary stats */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DashboardStatCard
          icon={<FolderOpen className="h-4 w-4" aria-hidden="true" />}
          label="Total Cases"
          value={stats.total}
          note="Across all states"
        />
        <DashboardStatCard
          icon={<Activity className="h-4 w-4" aria-hidden="true" />}
          label="Active"
          value={stats.active}
          note="Under investigation"
          tone="cyan"
        />
        <DashboardStatCard
          icon={<Clock className="h-4 w-4" aria-hidden="true" />}
          label="In Review"
          value={stats.inReview}
          note="Requires analyst attention"
          tone="amber"
        />
        <DashboardStatCard
          icon={<Database className="h-4 w-4" aria-hidden="true" />}
          label="Sources Today"
          value={stats.sourcesToday}
          note="Ingested records"
          tone="teal"
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Search by case # or title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search cases"
          />
        </div>
        <div className="w-40">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={STATUS_OPTIONS}
            aria-label="Filter by status"
          />
        </div>
        <div className="w-44">
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            options={SORT_OPTIONS}
            aria-label="Sort cases"
          />
        </div>
      </div>

      {/* Case cards */}
      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="group rounded-lg border border-ink-600/70 bg-ink-850 p-4 transition-colors duration-150 hover:border-cyan-brand/40 hover:bg-ink-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-brand"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-cyan-brand">#{c.id}</span>
                <StatusBadge status={c.status} />
              </div>
              <div className="mt-2 flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-100">{c.title}</h3>
                {c.priority && (
                  <Badge variant={PRIORITY_VARIANT[c.priority] || 'neutral'} className="shrink-0">
                    {c.priority}
                  </Badge>
                )}
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm text-slate-400">{c.description}</p>
              {c.tags?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-ink-700 px-1.5 py-0.5 text-[11px] text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-ink-600/50 pt-3 text-xs text-slate-400">
                <span>Updated {c.updatedAt}</span>
                <span className="flex items-center gap-3">
                  <span>{c.sourceCount} sources</span>
                  <span>{c.recordCount} records</span>
                  <ChevronRight
                    className="h-4 w-4 text-slate-500 transition-colors group-hover:text-cyan-brand"
                    aria-hidden="true"
                  />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-ink-600/70 bg-ink-850">
          <EmptyState
            icon={<FolderOpen className="h-6 w-6" aria-hidden="true" />}
            title="No cases match your filters"
            description="Adjust the search text or status filter, or create a new case."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery('')
                  setStatus('All')
                }}
              >
                Clear filters
              </Button>
            }
          />
        </div>
      )}
        </>
      )}
    </PageContainer>
  )
}

export default Cases