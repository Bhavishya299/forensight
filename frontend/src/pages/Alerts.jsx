import { useMemo, useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Search, Download, BellRing, Filter, ChevronRight } from 'lucide-react'
import {
  getAlertsForCase,
  getAlertById,
} from '../store/analyticsStore.js'
import { getEvidenceById } from '../store/caseStore.js'
import { onAnalysisDone } from '../store/analysisBus.js'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHeader from '../components/dashboard/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import InvestigativeAlertCard from '../components/alerts/InvestigativeAlertCard.jsx'
import AlertDetailDrawer from '../components/alerts/AlertDetailDrawer.jsx'
import EvidenceDetailDrawer from '../components/evidence/EvidenceDetailDrawer.jsx'
import CorrelationBadge from '../components/analytics/CorrelationBadge.jsx'
import { SOURCE_META } from '../config/sourceMeta.js'

const Alerts = () => {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeAlert, setActiveAlert] = useState(null)
  const [activeEvidence, setActiveEvidence] = useState(null)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('All')
  const [severity, setSeverity] = useState('All')
  const [status, setStatus] = useState('All')
  const [source, setSource] = useState('All')
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [analysisTick, setAnalysisTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const rows = await getAlertsForCase(id)
      if (cancelled) return
      setAlerts(rows || [])
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

  const typeOptions = useMemo(
    () => [
      { value: 'All', label: 'All types' },
      ...[...new Set(alerts.map((a) => a.type))].map((t) => ({ value: t, label: t })),
    ],
    [alerts]
  )

  const severityOptions = useMemo(
    () => [
      { value: 'All', label: 'All severities' },
      ...[...new Set(alerts.map((a) => a.severity))].map((s) => ({ value: s, label: s })),
    ],
    [alerts]
  )

  const statusOptions = useMemo(
    () => [
      { value: 'All', label: 'All statuses' },
      ...[...new Set(alerts.map((a) => a.status))].map((s) => ({ value: s, label: s })),
    ],
    [alerts]
  )

  const sourceOptions = useMemo(
    () => [
      { value: 'All', label: 'All sources' },
      ...Object.keys(SOURCE_META).map((key) => ({
        value: key,
        label: SOURCE_META[key].label,
      })),
    ],
    []
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return alerts.filter((a) => {
      const matchesType = type === 'All' || a.type === type
      const matchesSeverity = severity === 'All' || a.severity === severity
      const matchesStatus = status === 'All' || a.status === status
      const matchesSource =
        source === 'All' || (a.sourceTypes || []).some((s) => s === source)
      const matchesQuery =
        !q ||
        a.id.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q) ||
        a.caseId.toLowerCase().includes(q) ||
        (a.evidenceIds || []).some((e) => e.toLowerCase().includes(q)) ||
        (a.entities || []).some((e) => e.toLowerCase().includes(q))
      return matchesType && matchesSeverity && matchesStatus && matchesSource && matchesQuery
    })
  }, [alerts, query, type, severity, status, source])

  const summary = useMemo(
    () => ({
      total: alerts.length,
      high: alerts.filter((a) => a.severity === 'High').length,
      medium: alerts.filter((a) => a.severity === 'Medium').length,
      requiresReview: alerts.filter((a) => a.status === 'Requires review').length,
      crossSource: alerts.filter((a) => a.crossSource).length,
    }),
    [alerts]
  )

  /* Deep-link support: /cases/:id/alerts?a=AL-XXX auto-opens the drawer */
  const requestedAlertId = searchParams.get('a')
  const openAlert = useCallback(
    (alertId) => {
      getAlertById(id, alertId).then((found) => {
        if (found) setActiveAlert(found)
      })
    },
    [id]
  )

  useEffect(() => {
    if (requestedAlertId) {
      getAlertById(id, requestedAlertId).then((found) => {
        if (found) {
          setActiveAlert(found)
          setSearchParams({}, { replace: true })
        }
      })
    }
  }, [requestedAlertId, id, setSearchParams])

  const handleCloseDrawer = () => {
    setActiveAlert(null)
    const params = new URLSearchParams(searchParams)
    params.delete('a')
    setSearchParams(params, { replace: true })
  }

  const handleStatusChange = (alertId, nextStatus) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status: nextStatus } : a)))
    setActiveAlert((prev) =>
      prev && prev.id === alertId ? { ...prev, status: nextStatus } : prev
    )
  }

  const handleOpenEvidence = useCallback(
    (evidenceId) => {
      if (!evidenceId) return
      setActiveAlert(null)
      getEvidenceById(id, evidenceId).then((item) => {
        if (item) setActiveEvidence(item)
      })
    },
    [id]
  )

  const handleExport = () => {
    const header = ['ID', 'Type', 'Severity', 'Status', 'Title', 'Timestamp', 'Cross source', 'Entities', 'Evidence IDs']
    const rows = filtered.map((a) => [
      a.id,
      a.type,
      a.severity,
      a.status,
      `"${a.title.replace(/"/g, '""')}"`,
      a.timestamp,
      a.crossSource ? 'Yes' : 'No',
      `"${(a.entities || []).join('; ')}"`,
      `"${(a.evidenceIds || []).join('; ')}"`,
    ])
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `case-${id}-analytical-leads.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setQuery('')
    setType('All')
    setSeverity('All')
    setStatus('All')
    setSource('All')
  }

  return (
    <PageContainer>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-cyan-brand" aria-hidden="true" />
            Alerts
          </span>
        }
        tagline={`Potential investigative leads generated from correlated evidence. Demo only — none are conclusions.`}
        actions={
          <Button variant="outline" onClick={handleExport} disabled={!filtered.length}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      {/* Summary strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ['Total leads', summary.total],
          ['High priority', summary.high],
          ['Medium priority', summary.medium],
          ['Requires review', summary.requiresReview],
          ['Cross-source leads', summary.crossSource],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-ink-600/70 bg-ink-850 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold leading-none text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Filter toggle */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <CorrelationBadge>Prototype intelligence layer</CorrelationBadge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          Filters
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? 'rotate-90' : ''}`} aria-hidden="true" />
        </Button>
      </div>

      {/* Filters */}
      {filtersOpen && (
        <div className="mb-5 rounded-lg border border-ink-600/70 bg-ink-850 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <Input
                className="pl-9"
                placeholder="Search title, description, evidence ID…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search alerts"
              />
            </div>
            <div className="w-52">
              <Select value={type} onChange={(e) => setType(e.target.value)} options={typeOptions} label="Type" />
            </div>
            <div className="w-44">
              <Select value={severity} onChange={(e) => setSeverity(e.target.value)} options={severityOptions} label="Severity" />
            </div>
            <div className="w-44">
              <Select value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions} label="Status" />
            </div>
            <div className="w-48">
              <Select value={source} onChange={(e) => setSource(e.target.value)} options={sourceOptions} label="Source" />
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <Card>
          <LoadingState label="Loading alerts…" />
        </Card>
      ) : alerts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BellRing className="h-6 w-6" aria-hidden="true" />}
            title="No alerts yet"
            description="No alerts yet — they appear after running analysis on this case."
          />
        </Card>
      ) : filtered.length ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((alert) => (
            <InvestigativeAlertCard
              key={alert.id}
              alert={alert}
              onOpen={() => openAlert(alert.id)}
              onOpenEvidence={handleOpenEvidence}
            />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<BellRing className="h-6 w-6" aria-hidden="true" />}
            title="No leads match your filters"
            description="Try a different search or clear the filters to see all analytical leads."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        </Card>
      )}

      <div className="mt-4 text-xs text-slate-500">
        {filtered.length} of {alerts.length} leads shown
      </div>

      <AlertDetailDrawer
        open={Boolean(activeAlert)}
        onClose={handleCloseDrawer}
        caseId={id}
        alert={activeAlert}
        onOpenEvidence={handleOpenEvidence}
        onStatusChange={activeAlert ? (next) => handleStatusChange(activeAlert.id, next) : undefined}
      />

      <EvidenceDetailDrawer
        open={Boolean(activeEvidence)}
        onClose={() => setActiveEvidence(null)}
        caseId={id}
        item={activeEvidence}
      />
    </PageContainer>
  )
}

export default Alerts