import { useEffect, useState } from 'react'
import { Play, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

/*
 * Simulated analysis run for a case workspace.
 *
 * Steps progress on a timer and complete with a synthetic summary.
 * Everything is demonstration-only — no records are actually analyzed.
 */

const PIPELINE = [
  'Normalizing source records',
  'Cross-source correlation',
  'Entity & relationship extraction',
  'Event-window detection',
  'Contradiction checks',
]

const AnalysisModal = ({ open, onClose, caseName = 'case' }) => {
  const [step, setStep] = useState(-1)
  const running = step >= 0 && step < PIPELINE.length
  const done = step >= PIPELINE.length

  useEffect(() => {
    if (!open) return
    setStep(-1)
    let i = -1
    const timer = window.setInterval(() => {
      i += 1
      setStep(i)
      if (i >= PIPELINE.length) window.clearInterval(timer)
    }, 620)
    return () => window.clearInterval(timer)
  }, [open])

  const progress = done ? 100 : Math.max(0, Math.round(((step + 1) / PIPELINE.length) * 100))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Run analysis"
      aria-label="Run analysis"
      size="md"
      footer={
        <>
          {running && (
            <span className="mr-auto text-xs text-slate-400">
              Simulating pipeline…
            </span>
          )}
          <Button variant="outline" onClick={onClose}>
            {done ? 'Close' : 'Cancel'}
          </Button>
        </>
      }
    >
      {!done ? (
        <div>
          <p className="mb-4 text-sm text-slate-400">
            Running a synthetic analysis pass on <span className="text-slate-200">{caseName}</span>.
          </p>
          <ul className="space-y-2">
            {PIPELINE.map((label, i) => {
              const isActive = i === step
              const isDone = i < step
              return (
                <li
                  key={label}
                  className={[
                    'flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm',
                    isActive
                      ? 'border-cyan-brand/30 bg-cyan-brand/5 text-cyan-100'
                      : isDone
                        ? 'border-ink-600/70 text-slate-400'
                        : 'border-ink-600/40 text-slate-500',
                  ].join(' ')}
                >
                  {isActive ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan-brand" aria-hidden="true" />
                  ) : isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
                  )}
                  {label}
                </li>
              )
            })}
          </ul>
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-ink-700"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-cyan-brand transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Analysis simulation complete — no real processing was performed.
          </div>
          <p className="mb-3 text-sm font-medium text-slate-100">Synthetic output</p>
          <div className="flex flex-wrap gap-2">
            {['12 potential relationships', '5 potential anomalies', '1 potential contradiction', '4 requires verification'].map(
              (chip) => (
                <span
                  key={chip}
                  className="rounded-md border border-ink-600 bg-ink-700/60 px-2.5 py-1 text-xs text-slate-300"
                >
                  {chip}
                </span>
              )
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

export default AnalysisModal