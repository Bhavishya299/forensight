import { useEffect, useRef, useState } from 'react'
import { Play, CheckCircle2, Circle, Loader2, AlertTriangle } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import api from '../../services/api.js'
import { emitAnalysisDone } from '../../store/analysisBus.js'

/*
 * Real analysis run for a case workspace.
 *
 * Calls POST /api/cases/{case_id}/analyze against the live backend and
 * surfaces the actual response (graph / timeline / alerts / contradictions).
 * Case-scoped pages subscribe to the analysis bus and re-fetch on success.
 */

const RESULT_ITEMS = [
  { key: 'relationships', label: 'Relationships' },
  { key: 'entities', label: 'Entities' },
  { key: 'sourceTypes', label: 'Source types' },
  { key: 'crossSourceLinks', label: 'Cross-source links' },
]

const AnalysisModal = ({ open, onClose, caseId, caseName }) => {
  const [phase, setPhase] = useState('idle') // idle | running | done | error
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const runTokenRef = useRef(0)

  useEffect(() => {
    if (!open) return
    runTokenRef.current += 1
    setPhase('idle')
    setResult(null)
    setErrorMsg('')
  }, [open])

  const runAnalysis = async () => {
    const token = ++runTokenRef.current
    setPhase('running')
    setErrorMsg('')
    try {
      const res = await api.post(`/cases/${caseId}/analyze`)
      if (runTokenRef.current !== token) return
      setResult(res.data)
      setPhase('done')
      emitAnalysisDone(caseId)
    } catch (err) {
      if (runTokenRef.current !== token) return
      if (err?.response?.status === 422) {
        setErrorMsg(
          String(err?.response?.data?.detail || 'Add at least one evidence record before running analysis.')
        )
      } else if (err?.response?.status === 403) {
        setErrorMsg('You do not have permission to run analysis on this case.')
      } else if (err?.response?.status === 401) {
        setErrorMsg('Your session expired. Sign in again and retry.')
      } else {
        setErrorMsg(
          String(err?.response?.data?.detail || err?.message || 'Analysis failed. Check the backend and retry.')
        )
      }
      setPhase('error')
    }
  }

  const displayName = caseName || `Case #${caseId}`

  const graph = result?.graph || {}
  const alerts = result?.alerts || {}
  const timeline = result?.timeline || {}
  const contradictions = result?.contradictions || []
  const timelineEvents = timeline.overview?.total ?? timeline.events?.length ?? 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Run analysis"
      aria-label="Run analysis"
      size="md"
      footer={
        <>
          {phase === 'running' && (
            <span className="mr-auto text-xs text-slate-400">Running live pipeline…</span>
          )}
          {phase !== 'running' && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
          {phase === 'idle' && (
            <Button onClick={runAnalysis}>
              <Play className="h-4 w-4" aria-hidden="true" />
              Run analysis
            </Button>
          )}
        </>
      }
    >
      {phase === 'idle' && (
        <div>
          <p className="mb-3 text-sm text-slate-400">
            This runs the real analysis pipeline on <span className="text-slate-200">{displayName}</span>:
            record normalization, entity graph, timeline &amp; critical-window scan, anomaly
            alerts, and contradiction checks.
          </p>
          <p className="text-xs text-slate-500">
            The backend requires at least one evidence record before analysis can start.
          </p>
        </div>
      )}

      {phase === 'running' && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-cyan-brand" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-slate-100">Analyzing {displayName}</p>
              <p className="text-xs text-slate-400">
                Normalizing records, building the entity graph, scanning the event window…
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {['Normalizing source records', 'Entity & relationship extraction', 'Event-window detection', 'Anomaly & contradiction checks'].map(
              (label) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 rounded-md border border-ink-600/40 px-3 py-2 text-sm text-slate-500"
                >
                  <Circle className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
                  {label}
                </li>
              )
            )}
          </ul>
          <div className="mt-4">
            <div className="h-1.5 animate-pulse overflow-hidden rounded-full bg-cyan-brand/40" role="progressbar" />
          </div>
        </div>
      )}

      {phase === 'done' && result && (
        <div>
          <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Analysis completed on {displayName}. Case views have been refreshed.
          </div>
          <p className="mb-3 text-sm font-medium text-slate-100">Engine output</p>
          <div className="flex flex-wrap gap-2">
            {RESULT_ITEMS.filter((item) => graph[item.key] != null).map((item) => (
              <span
                key={item.key}
                className="rounded-md border border-ink-600 bg-ink-700/60 px-2.5 py-1 text-xs text-slate-300"
              >
                {graph[item.key]} {item.label.toLowerCase()}
              </span>
            ))}
            <span className="rounded-md border border-ink-600 bg-ink-700/60 px-2.5 py-1 text-xs text-slate-300">
              {timelineEvents} timeline events
            </span>
            <span className="rounded-md border border-ink-600 bg-ink-700/60 px-2.5 py-1 text-xs text-slate-300">
              {alerts.total ?? alerts.alerts?.length ?? 0} alerts
            </span>
            <span className="rounded-md border border-ink-600 bg-ink-700/60 px-2.5 py-1 text-xs text-slate-300">
              {contradictions.length} contradictions
            </span>
            {timeline.window?.label && (
              <span className="rounded-md border border-cyan-brand/30 bg-cyan-brand/10 px-2.5 py-1 text-xs text-cyan-200">
                Window {timeline.window.label}
              </span>
            )}
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div>
          <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {errorMsg}
          </div>
          <p className="text-xs text-slate-500">
            Add evidence records first, then run analysis again.
          </p>
        </div>
      )}
    </Modal>
  )
}

export default AnalysisModal