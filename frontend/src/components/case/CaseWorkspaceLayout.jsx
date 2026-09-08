import { useEffect, useState } from 'react'
import { Link, Outlet, useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ChevronsUpDown,
  Calendar,
  Clock,
  User,
  Database,
  FileText,
  Play,
  FolderOpen,
} from 'lucide-react'
import { getCaseById, getAllCases } from '../../store/caseStore.js'
import PageContainer from '../layout/PageContainer.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'
import LoadingState from '../ui/LoadingState.jsx'
import CaseTabs from './CaseTabs.jsx'
import AnalysisModal from './AnalysisModal.jsx'

const PRIORITY_VARIANT = {
  High: 'danger',
  Medium: 'warning',
  Low: 'info',
}

/*
 * Shared workspace shell for a single case. Renders the case header,
 * the section tabs, and the nested route content via <Outlet />.
 */
const CaseWorkspaceLayout = () => {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [caseData, setCaseData] = useState(null)
  const [allCases, setAllCases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setCaseData(null)
    Promise.allSettled([getCaseById(id), getAllCases()]).then(([caseRes, casesRes]) => {
      if (cancelled) return
      setCaseData(caseRes.status === 'fulfilled' ? caseRes.value : null)
      setAllCases(casesRes.status === 'fulfilled' ? casesRes.value || [] : [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  const basePath = `/cases/${id}`
  const currentTab = location.pathname.startsWith(`${basePath}/`)
    ? location.pathname.slice(basePath.length)
    : ''

  if (loading) {
    return (
      <PageContainer>
        <LoadingState label="Loading case…" />
      </PageContainer>
    )
  }

  if (!caseData) {
    return (
      <PageContainer>
        <EmptyState
          icon={<FolderOpen className="h-6 w-6" aria-hidden="true" />}
          title="Case not found"
          description={`Could not locate case #${id}. It may have been removed or the identifier is invalid.`}
          action={
            <Link to="/cases">
              <Button variant="outline">Back to cases</Button>
            </Link>
          }
        />
      </PageContainer>
    )
  }

  return (
    <div>
      <header className="border-b border-ink-600/70 bg-ink-850">
        <div className="mx-auto w-full max-w-7xl px-5 pt-4">
          {/* Breadcrumb + case switcher */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-slate-400">
              <Link to="/cases" className="hover:text-cyan-200">
                Cases
              </Link>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <span className="font-medium text-slate-200">Case #{caseData.id}</span>
            </nav>

            <div className="relative">
              <button
                type="button"
                onClick={() => setSwitcherOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={switcherOpen}
                className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-800/50 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-brand/50 hover:text-cyan-200"
              >
                <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                Switch case
              </button>

              {switcherOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setSwitcherOpen(false)}
                    aria-hidden="true"
                  />
                  <ul
                    role="listbox"
                    aria-label="Switch case"
                    className="absolute right-0 z-40 mt-1 max-h-80 w-80 overflow-y-auto rounded-lg border border-ink-600/70 bg-ink-800 py-1 shadow-xl shadow-black/40"
                  >
                    {allCases.map((c) => {
                      const active = c.id === String(id)
                      return (
                        <li key={c.id} role="option" aria-selected={active}>
                          <button
                            type="button"
                            onClick={() => {
                              setSwitcherOpen(false)
                              if (!active) navigate(`/cases/${c.id}${currentTab}`)
                            }}
                            className={[
                              'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                              active
                                ? 'bg-cyan-brand/10'
                                : 'hover:bg-ink-700/60',
                            ].join(' ')}
                          >
                            <span className="font-mono text-xs text-cyan-200">{`# ${c.id}`}</span>
                            <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                              {c.title}
                            </span>
                            <StatusBadge status={c.status} />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>

          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold tracking-wide text-slate-100">
                  Case #{caseData.id}
                </h1>
                <span className="text-slate-500">·</span>
                <span className="truncate text-sm text-slate-300">{caseData.title}</span>
                <StatusBadge status={caseData.status} />
                {caseData.priority && (
                  <Badge variant={PRIORITY_VARIANT[caseData.priority] || 'neutral'}>
                    {caseData.priority} priority
                  </Badge>
                )}
              </div>
              <p className="mt-1.5 max-w-3xl text-sm text-slate-400">
                {caseData.description}
              </p>

              {/* Meta row */}
              <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  <dt className="sr-only">Created</dt>
                  <dd>Created {caseData.createdAt}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <dt className="sr-only">Updated</dt>
                  <dd>Updated {caseData.updatedAt}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                  <dt className="sr-only">Owner</dt>
                  <dd>{caseData.owner}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5" aria-hidden="true" />
                  <dt className="sr-only">Sources</dt>
                  <dd>{caseData.sourceCount || 0} sources</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  <dt className="sr-only">Records</dt>
                  <dd>{caseData.recordCount || 0} records</dd>
                </div>
              </dl>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button onClick={() => setShowAnalysis(true)}>
                <Play className="h-4 w-4" aria-hidden="true" />
                Run analysis
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 -mx-5 px-5">
            <CaseTabs caseId={caseData.id} />
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <AnalysisModal
        open={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        caseId={id}
        caseName={`Case #${caseData.id}`}
      />
    </div>
  )
}

export default CaseWorkspaceLayout