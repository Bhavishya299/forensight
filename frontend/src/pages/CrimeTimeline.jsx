import { useMemo, useState, useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CalendarRange, Filter, Search, Clock3, Network } from 'lucide-react'
import api from '../services/api.js'
import PageHeader from '../components/dashboard/PageHeader.jsx'
import PageContainer from '../components/layout/PageContainer.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import TimelineEventCard from '../components/timeline/TimelineEventCard.jsx'
import EventDetailDrawer from '../components/timeline/EventDetailDrawer.jsx'
import CriticalEventWindow from '../components/timeline/CriticalEventWindow.jsx'
import EvidenceDetailDrawer from '../components/evidence/EvidenceDetailDrawer.jsx'
import { SOURCE_META } from '../config/sourceMeta.js'
import { getEvidenceById, getCaseById } from '../store/caseStore.js'
import { onAnalysisDone } from '../store/analysisBus.js'

function toMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function formatSpan(minutes) {
  if (minutes < 60) return `${minutes} MIN`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}H ${m}M`
}

function uniqueBy(items, key) {
  return [...new Set(items.map((i) => i[key]).filter(Boolean))].sort()
}

function isWindowEvent(e) {
  return e.window === true || e.in_window === true
}

const OVERVIEW_KEYS = { total: 'Total events', visible: 'Visible events', sourceTypes: 'Source types', span: 'Time span' }

const CrimeTimeline = () => {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [caseData, setCaseData] = useState(null)
  const [events, setEvents] = useState([])
  const [overview, setOverview] = useState({ total: 0 })
  const [criticalWindow, setCriticalWindow] = useState({
    label: '—',
    durationMinutes: 0,
    evidenceIds: [],
  })
  const [view, setView] = useState('narrative')
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [entityFilter, setEntityFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [evidenceItem, setEvidenceItem] = useState(null)
  const [analysisTick, setAnalysisTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [caseRes, timelineRes] = await Promise.allSettled([
        getCaseById(id),
        api.get(`/cases/${id}/timeline`),
      ])
      if (cancelled) return
      setCaseData(caseRes.status === 'fulfilled' ? caseRes.value : null)
      if (timelineRes.status === 'fulfilled') {
        const data = timelineRes.value.data || {}
        setEvents(data.events || [])
        setOverview(data.overview || {})
        setCriticalWindow(data.window || { label: '—', durationMinutes: 0, evidenceIds: [] })
      } else {
        setEvents([])
        setOverview({ total: 0 })
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, analysisTick])

  useEffect(() => {
    return onAnalysisDone((caseId) => {
      if (String(caseId) === String(id)) setAnalysisTick((t) => t + 1)
    })
  }, [id])

  const entityNames = useMemo(
    () =>
      [...new Set(events.flatMap((e) => [e.entity1, e.entity2].filter(Boolean)))].sort(),
    [events]
  )

  const entityOptions = useMemo(
    () => [
      { value: 'All', label: 'All entities' },
      ...entityNames.map((e) => ({ value: e, label: e })),
    ],
    [entityNames]
  )

  const sourceOptions = useMemo(
    () => [
      { value: 'All', label: 'All sources' },
      ...uniqueBy(events, 'source').map((s) => ({
        value: s,
        label: SOURCE_META[s]?.label || s,
      })),
    ],
    [events]
  )

  const typeOptions = useMemo(
    () => [
      { value: 'All', label: 'All event types' },
      ...uniqueBy(events, 'eventType').map((t) => ({ value: t, label: t })),
    ],
    [events]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events
      .filter((e) => {
        if (view === 'narrative' && !isWindowEvent(e)) return false
        const needle = [
          e.description,
          e.entity1,
          e.entity2,
          e.evidenceId,
          e.source,
          e.eventType,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        const matchesQuery = !q || needle.includes(q)
        const matchesSource = sourceFilter === 'All' || e.source === sourceFilter
        const matchesEntity =
          entityFilter === 'All' || e.entity1 === entityFilter || e.entity2 === entityFilter
        const matchesType = typeFilter === 'All' || e.eventType === typeFilter
        return matchesQuery && matchesSource && matchesEntity && matchesType
      })
      .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
  }, [view, query, sourceFilter, entityFilter, typeFilter, events])

  const overviewStats = useMemo(() => {
    const times = filtered.map((e) => toMinutes(e.time))
    const span = times.length > 1 ? Math.max(...times) - Math.min(...times) : 0
    return {
      total: overview.total ?? events.length,
      visible: filtered.length,
      sourceTypes: new Set(filtered.map((e) => e.source)).size,
      span: formatSpan(span),
    }
  }, [filtered, overview, events])

  const windowEvents = useMemo(() => events.filter(isWindowEvent), [events])
  const windowCounts = useMemo(
    () => ({
      sources: new Set(windowEvents.map((e) => e.source)).size,
      entities: new Set(windowEvents.flatMap((e) => [e.entity1, e.entity2].filter(Boolean))).size,
    }),
    [windowEvents]
  )

  const openEvidence = async (evidenceId) => {
    if (!evidenceId) return
    const item = await getEvidenceById(id, evidenceId)
    if (!item) return
    setSelectedEvent(null)
    setEvidenceItem(item)
  }

  const clearFilters = () => {
    setQuery('')
    setSourceFilter('All')
    setEntityFilter('All')
    setTypeFilter('All')
  }

  /* Deep-link support: ?event=<evidenceId|eventId> auto-opens an event */
  const requestedEvent = searchParams.get('event')
  useEffect(() => {
    if (!requestedEvent || !events.length) return
    const found = events.find(
      (e) => e.evidenceId === requestedEvent || e.id === requestedEvent
    )
    if (found) {
      setSelectedEvent(found)
      setView('day')
      clearFilters()
      const params = new URLSearchParams(searchParams)
      params.delete('event')
      setSearchParams(params, { replace: true })
    }
  }, [requestedEvent, searchParams, setSearchParams, events])

  return (
    <PageContainer maxWidth="max-w-[1200px]">
      <PageHeader
        title="CrimeTimeline"
        tagline="Unified chronological view of events across independent evidence sources."
        actions={
          <Link to={`/cases/${id}/graph`}>
            <Button variant="outline">
              <Network className="h-4 w-4" aria-hidden="true" />
              View in graph
            </Button>
          </Link>
        }
        className="mb-3"
      />

      {/* Case strip */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono text-cyan-brand">Case # {id}</span>
        <span className="font-medium text-slate-100">
          {caseData ? caseData.title : 'Case'}
        </span>
        <Badge variant="success" dot>
          Analyzed
        </Badge>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Search events, entities, evidence…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search timeline events"
          />
        </div>

        {/* View toggle */}
        <div role="group" aria-label="Timeline view" className="flex items-center rounded-md border border-ink-600 p-0.5">
          {[
            { key: 'narrative', label: 'Narrative' },
            { key: 'day', label: 'Full day' },
          ].map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              aria-pressed={view === v.key}
              className={[
                'rounded px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                view === v.key
                  ? 'bg-cyan-brand/15 text-cyan-100'
                  : 'text-slate-400 hover:text-slate-200',
              ].join(' ')}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="hidden items-center gap-1.5 rounded-md border border-ink-600 px-3 py-2 text-xs text-slate-400 md:flex">
          <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
          Range · {criticalWindow.label || criticalWindow.start || '—'}
        </div>

        <div className="w-44">
          <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} options={sourceOptions} aria-label="Filter by source" />
        </div>
        <div className="w-44">
          <Select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} options={entityOptions} aria-label="Filter by entity" />
        </div>
        <div className="w-40">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={typeOptions} aria-label="Filter by event type" />
        </div>
        <Button variant="outline" size="sm" onClick={clearFilters}>
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </Button>
      </div>

      {view === 'narrative' && (
        <p className="mb-4 text-xs text-slate-500">
          Showing the curated potential critical event window. Switch to Full day to explore all{' '}
          {overviewStats.total} events.
        </p>
      )}

      {/* Overview stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-ink-600/70 bg-ink-850 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{OVERVIEW_KEYS.total}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{overviewStats.total}</p>
        </div>
        <div className="rounded-lg border border-ink-600/70 bg-ink-850 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{OVERVIEW_KEYS.visible}</p>
          <p className="mt-1 text-2xl font-semibold text-cyan-brand">{overviewStats.visible}</p>
        </div>
        <div className="rounded-lg border border-ink-600/70 bg-ink-850 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{OVERVIEW_KEYS.sourceTypes}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{overviewStats.sourceTypes}</p>
        </div>
        <div className="rounded-lg border border-ink-600/70 bg-ink-850 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{OVERVIEW_KEYS.span}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{overviewStats.span}</p>
        </div>
      </div>

      {/* Critical event window callout */}
      {view === 'narrative' && (
        <div className="mb-6">
          <CriticalEventWindow
            data={criticalWindow}
            eventCount={windowEvents.length}
            sourceCount={windowCounts.sources}
            entityCount={windowCounts.entities}
            onOpenEvidence={openEvidence}
          />
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <Card>
          <LoadingState label="Loading timeline…" />
        </Card>
      ) : events.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Clock3 className="h-6 w-6" aria-hidden="true" />}
            title="No timeline events yet"
            description="Timeline events will appear here once evidence for this case has been ingested and analyzed."
          />
        </Card>
      ) : filtered.length ? (
        <div className="relative mx-auto max-w-4xl">
          <div
            className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-ink-600/70 md:block"
            aria-hidden="true"
          />
          <ul>
            {filtered.map((event, i) => {
              const left = i % 2 === 0
              return (
                <li key={event.id} className="relative pb-6">
                  <span
                    className={`absolute left-1/2 top-5 hidden h-3 w-3 -translate-x-1/2 rounded-full ring-4 ring-ink-950 md:block ${
                      isWindowEvent(event) ? 'bg-amber-400' : 'bg-cyan-brand'
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={`absolute top-5 left-1/2 hidden h-px w-7 bg-ink-600/60 md:block ${
                      left ? '-ml-8' : ''
                    }`}
                    aria-hidden="true"
                  />
                  <div
                    className={
                      left
                        ? 'mx-auto w-full max-w-xl md:mr-[52%]'
                        : 'mx-auto w-full max-w-xl md:ml-[52%]'
                    }
                  >
                    <TimelineEventCard
                      event={event}
                      onSelect={() => {
                        setEvidenceItem(null)
                        setSelectedEvent(event)
                      }}
                      onOpenEvidence={openEvidence}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="rounded-lg border border-ink-600/70 bg-ink-850">
          <EmptyState
            icon={<Clock3 className="h-6 w-6" aria-hidden="true" />}
            title="No events match your filters"
            description="Try a different search, or clear the source, entity, and event type filters."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        </div>
      )}

      {/* Drawers */}
      <EventDetailDrawer
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        caseId={id}
        event={selectedEvent}
        onOpenEvidence={openEvidence}
      />
      <EvidenceDetailDrawer
        open={Boolean(evidenceItem)}
        onClose={() => setEvidenceItem(null)}
        caseId={id}
        item={evidenceItem}
      />
    </PageContainer>
  )
}

export default CrimeTimeline