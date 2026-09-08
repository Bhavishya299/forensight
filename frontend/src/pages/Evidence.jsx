import { useMemo, useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Search, Upload, FileSearch, ChevronRight, Trash2, Loader2 } from 'lucide-react'
import { getEvidenceForCase, deleteEvidenceItem, deleteEvidenceMany } from '../store/caseStore.js'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHeader from '../components/dashboard/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Badge from '../components/ui/Badge.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import SourceBadge from '../components/common/SourceBadge.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import UploadEvidenceModal from '../components/evidence/UploadEvidenceModal.jsx'
import EvidenceDetailDrawer from '../components/evidence/EvidenceDetailDrawer.jsx'
import { SOURCE_META } from '../config/sourceMeta.js'

const Evidence = () => {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('All')
  const [status, setStatus] = useState('All')
  const [showUpload, setShowUpload] = useState(false)
  const [activeItem, setActiveItem] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [category, setCategory] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getEvidenceForCase(id).then((data) => {
      if (!cancelled) {
        setItems(data || [])
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) {
        setItems([])
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [id])

  // Deep link support: /cases/:id/evidence?record=<evidenceId>
  useEffect(() => {
    const recordId = searchParams.get('record')
    if (!recordId || loading) return
    const item = items.find((i) => i.id === recordId)
    if (item) setActiveItem(item)
    setSearchParams({}, { replace: true })
  }, [searchParams, items, loading, setSearchParams])

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

  const statusOptions = useMemo(
    () => [
      { value: 'All', label: 'All statuses' },
      ...[...new Set(items.map((i) => i.status))].map((s) => ({ value: s, label: s })),
    ],
    [items]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => {
      const matchesSource = source === 'All' || item.source === source
      const matchesStatus = status === 'All' || item.status === status
      const matchesQuery =
        !q ||
        item.id.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      return matchesSource && matchesStatus && matchesQuery
    })
  }, [items, query, source, status])

  const summary = useMemo(
    () => ({
      total: items.length,
      ready: items.filter((i) => i.status === 'Ready for analysis').length,
      ingested: items.filter((i) => i.status === 'Ingested').length,
      requiresVerification: items.filter((i) => i.status === 'Requires verification').length,
    }),
    [items]
  )

  const handleUploaded = async () => {
    const refreshed = await getEvidenceForCase(id)
    setItems(refreshed || [])
  }

  const handleDeleteItem = async (item, e) => {
    e.stopPropagation()
    if (!window.confirm(`Delete evidence ${item.id}?`)) return
    setDeletingId(item.id)
    try {
      await deleteEvidenceItem(id, item.id)
      const refreshed = await getEvidenceForCase(id)
      setItems(refreshed || [])
      if (activeItem?.id === item.id) setActiveItem(null)
    } finally {
      setDeletingId(null)
    }
  }

  const refresh = async () => {
    const refreshed = await getEvidenceForCase(id)
    setItems(refreshed || [])
  }

  const handleDeleteCategory = async () => {
    if (!category) return
    const label = SOURCE_META[category]?.label || category
    if (!window.confirm(`Delete all ${label} evidence (${items.filter((i) => i.source === category).length} record(s))?`)) return
    setBulkDeleting(true)
    try {
      await deleteEvidenceMany(id, category)
      setCategory('')
      await refresh()
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleDeleteAll = async () => {
    if (!items.length) return
    if (!window.confirm(`Delete all ${items.length} evidence records in this case?`)) return
    setBulkDeleting(true)
    try {
      await deleteEvidenceMany(id)
      await refresh()
    } finally {
      setBulkDeleting(false)
    }
  }

  const categoryOptions = useMemo(
    () =>
      [...new Set(items.map((i) => i.source))].sort().map((key) => ({
        value: key,
        label: SOURCE_META[key]?.label || key,
      })),
    [items]
  )

  const clearFilters = () => {
    setQuery('')
    setSource('All')
    setStatus('All')
  }

  if (loading) {
    return (
      <PageContainer>
        <PageHeader
          title="Evidence"
          tagline={`Evidence records and traceability · Case #${id}`}
        />
        <LoadingState label="Loading evidence records…" />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Evidence"
        tagline={`Evidence records and traceability · Case #${id}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[{ value: '', label: 'Delete by category…' }, ...categoryOptions]}
                aria-label="Delete evidence by category"
                disabled={!categoryOptions.length}
                className="w-52"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!category || bulkDeleting}
                onClick={handleDeleteCategory}
              >
                {bulkDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
                Delete
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!items.length || bulkDeleting}
              onClick={handleDeleteAll}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete all evidence
            </Button>
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload evidence
            </Button>
          </div>
        }
      />

      {/* Summary strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Total records', summary.total],
          ['Ready for analysis', summary.ready],
          ['Ingested', summary.ingested],
          ['Requires verification', summary.requiresVerification],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-ink-600/70 bg-ink-850 px-4 py-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold leading-none text-slate-100">{value}</p>
          </div>
        ))}
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
            placeholder="Search record ID or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search evidence"
          />
        </div>
        <div className="w-48">
          <Select value={source} onChange={(e) => setSource(e.target.value)} options={sourceOptions} aria-label="Filter by source" />
        </div>
        <div className="w-48">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions} aria-label="Filter by status" />
        </div>
      </div>

      <Card bodyClassName="p-0">
        {filtered.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink-600/70 text-left">
                    {['Record', 'Type', 'Source', 'Description', 'Status', 'Added', ''].map(
                      (h, i) => (
                        <th
                          key={h || i}
                          className="whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer border-b border-ink-600/50 transition-colors last:border-0 hover:bg-ink-700/40"
                      onClick={() => setActiveItem(item)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-cyan-brand">{item.id}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge variant="neutral">{item.type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <SourceBadge source={item.source} />
                      </td>
                      <td className="max-w-[340px] truncate px-4 py-3 text-slate-300">
                        {item.description}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                        {item.addedAt}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            title={`Delete ${item.id}`}
                            aria-label={`Delete ${item.id}`}
                            disabled={deletingId === item.id}
                            onClick={(e) => handleDeleteItem(item, e)}
                            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-40"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                          <ChevronRight className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-ink-600/60 px-4 py-2.5 text-xs text-slate-500">
              {filtered.length} of {items.length} records · click a row to inspect
            </div>
          </>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<FileSearch className="h-6 w-6" aria-hidden="true" />}
            title="No evidence yet"
            description="Add your first item to start building the evidence record."
            action={
              <Button onClick={() => setShowUpload(true)}>
                <Upload className="h-4 w-4" aria-hidden="true" />
                Upload evidence
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<FileSearch className="h-6 w-6" aria-hidden="true" />}
            title="No records match your filters"
            description="Try a different search or clear the source/status filters."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        )}
      </Card>

      <UploadEvidenceModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        caseId={id}
        onUploaded={handleUploaded}
      />

      <EvidenceDetailDrawer
        open={Boolean(activeItem)}
        onClose={() => setActiveItem(null)}
        caseId={id}
        item={activeItem}
      />
    </PageContainer>
  )
}

export default Evidence
