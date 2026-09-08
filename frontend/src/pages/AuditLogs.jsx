import { useEffect, useMemo, useState } from 'react'
import { Search, Database, Clock, FolderOpen, ShieldCheck } from 'lucide-react'
import api from '../services/api.js'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHeader from '../components/dashboard/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import AuditDetailDrawer from '../components/audit/AuditDetailDrawer.jsx'

const BUCKET_WEIGHT = { Today: 0, Yesterday: 1, 'Last 7 Days': 2, Older: 3 }

const DATE_OPTIONS = [
  { value: 'All', label: 'All Date' },
  { value: 'Today', label: 'Today' },
  { value: 'Yesterday', label: 'Yesterday' },
  { value: 'Last 7 Days', label: 'Last 7 Days' },
]

const format = (d, t) => `${d} — ${t}`

const STATUS_NEUTRAL = 'Archived'

const AuditStat = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-3 rounded-lg border border-ink-600/70 bg-ink-850 px-4 py-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-brand/10 text-cyan-brand">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
    <div>
      <div className="text-lg font-semibold leading-tight text-slate-100">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
    </div>
  </div>
)

const AuditLogs = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [user, setUser] = useState('All')
  const [action, setAction] = useState('All')
  const [caseFilter, setCaseFilter] = useState('All')
  const [date, setDate] = useState('All')
  const [activeEvent, setActiveEvent] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(false)
      try {
        const res = await api.get('/audit')
        if (cancelled) return
        setItems(res.data.items || [])
      } catch (err) {
        if (cancelled) return
        if (err?.response?.status === 403) {
          setError(true)
        } else {
          setItems([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const summary = useMemo(
    () => ({
      total: items.length,
      today: items.filter((i) => i.bucket === 'Today').length,
      caseActions: items.filter((i) => !i.system).length,
      systemEvents: items.filter((i) => i.system).length,
    }),
    [items]
  )

  const actionOptions = useMemo(() => {
    const actions = [...new Set(items.map((e) => e.action).filter(Boolean))]
    return [
      { value: 'All', label: 'All actions' },
      ...actions.map((a) => ({ value: a, label: a.replace(/_/g, ' ') })),
    ]
  }, [items])

  const userOptions = useMemo(() => {
    const users = [...new Set(items.map((e) => e.user).filter(Boolean))]
    return [{ value: 'All', label: 'All users' }, ...users.map((u) => ({ value: u, label: u }))]
  }, [items])

  const caseOptions = useMemo(() => {
    const cases = [...new Set(items.map((e) => e.caseLabel).filter(Boolean))]
    return [
      { value: 'All', label: 'All cases' },
      ...cases.map((c) => ({ value: c, label: c.replace('#', ' #') })),
    ]
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = items.filter((e) => {
      const matchesQuery =
        !q ||
        [e.user, e.action, e.caseLabel, e.detail, e.target].some((v) =>
          String(v || '').toLowerCase().includes(q)
        )
      const matchesUser = user === 'All' || e.user === user
      const matchesAction = action === 'All' || e.action === action
      const matchesCase = caseFilter === 'All' || e.caseLabel === caseFilter
      let matchesDate = true
      if (date === 'Today') matchesDate = e.bucket === 'Today'
      else if (date === 'Yesterday') matchesDate = e.bucket === 'Yesterday'
      else if (date === 'Last 7 Days')
        matchesDate = e.bucket === 'Today' || e.bucket === 'Yesterday' || (e.bucket && e.bucket !== 'Older')
      return matchesQuery && matchesUser && matchesAction && matchesCase && matchesDate
    })
    return matches
      .map((e) => ({ e, weight: BUCKET_WEIGHT[e.bucket] }))
      .sort((a, b) => a.weight - b.weight || b.e.time.localeCompare(a.e.time))
      .map((x) => x.e)
  }, [items, query, user, action, caseFilter, date])

  const hasFilters = query || user !== 'All' || action !== 'All' || caseFilter !== 'All' || date !== 'All'

  const clearFilters = () => {
    setQuery('')
    setUser('All')
    setAction('All')
    setCaseFilter('All')
    setDate('All')
  }

  const handleRowKey = (event, e) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setActiveEvent(e)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Audit Logs"
        tagline="Trace user actions performed within the investigation workspace."
      />

      {/* Summary strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4 print:hidden">
        <AuditStat label="Total events" value={summary.total} icon={Database} />
        <AuditStat label="Today" value={summary.today} icon={Clock} />
        <AuditStat label="Case actions" value={summary.caseActions} icon={FolderOpen} />
        <AuditStat label="System events" value={summary.systemEvents} icon={ShieldCheck} />
      </div>

      {/* Filter bar */}
      <Card className="mb-4 print:hidden" bodyClassName="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-1">
            <label htmlFor="audit-search" className="mb-1 block text-xs font-medium text-slate-300">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <Input
                id="audit-search"
                placeholder="User, action, case, record…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="[&>input]:pl-9"
              />
            </div>
          </div>
          <Select
            label="User"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            options={userOptions}
          />
          <Select
            label="Action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            options={actionOptions}
          />
          <Select
            label="Case"
            value={caseFilter}
            onChange={(e) => setCaseFilter(e.target.value)}
            options={caseOptions}
          />
          <Select
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            options={DATE_OPTIONS}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Showing {filtered.length} of {items.length} events
            {hasFilters && (
              <span className="text-slate-400"> · filtered</span>
            )}
          </p>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      {loading ? (
        <Card>
          <LoadingState label="Loading audit log…" />
        </Card>
      ) : error ? (
        <Card>
          <EmptyState
            icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />}
            title="You do not have permission to view the audit log"
            description="The audit log is restricted to Analyst and Admin roles. Contact your administrator if you believe this is a mistake."
          />
        </Card>
      ) : filtered.length === 0 && items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Database className="h-6 w-6" aria-hidden="true" />}
            title="No audit events recorded"
            description="Audit events will appear here as user actions are performed within the investigation workspace."
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search className="h-6 w-6" aria-hidden="true" />}
            title="No audit events match"
            description="Try a different search term or clear the filters to see all recorded events."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <Card bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-600/70 text-[11px] uppercase tracking-wider text-slate-400">
                  <th scope="col" className="px-4 py-2.5 font-semibold">Timestamp</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">User</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Action</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Case</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Detail</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setActiveEvent(e)}
                    onKeyDown={(ev) => handleRowKey(ev, e)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open audit event: ${format(e.date, e.time)} — ${String(e.action || '').replace(/_/g, ' ')}`}
                    className="cursor-pointer border-b border-ink-700/50 transition-colors hover:bg-ink-800/60 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-brand"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-cyan-200">
                      {e.time}
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-500">{e.bucket}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-200">
                      {e.user}
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-500">{e.role}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge variant={e.system ? 'info' : 'brand'}>
                        {String(e.action || '').replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">
                      {e.caseLabel}
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-slate-300">
                      {e.detail}
                      {e.target !== '—' && (
                        <span className="ml-2 font-mono text-[11px] text-slate-500">{e.target}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StatusBadge status={e.status || STATUS_NEUTRAL} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-ink-600/70 px-4 py-2.5 text-xs text-slate-500 print:hidden">
            Select any row to view the full audit event.
          </div>
        </Card>
      )}

      <AuditDetailDrawer
        open={Boolean(activeEvent)}
        onClose={() => setActiveEvent(null)}
        event={activeEvent}
      />
    </PageContainer>
  )
}

export default AuditLogs