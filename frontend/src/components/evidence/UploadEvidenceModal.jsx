import { useEffect, useRef, useState } from 'react'
import { UploadCloud, FileUp, CheckCircle2, Loader2 } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Select from '../ui/Select.jsx'
import Textarea from '../ui/Textarea.jsx'
import SourceBadge from '../common/SourceBadge.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'
import { SOURCE_META } from '../../config/sourceMeta.js'
import { getUser } from '../../services/auth.js'
import api from '../../services/api.js'
import { generateEvidenceId } from '../../store/caseStore.js'

const SOURCE_OPTIONS = Object.keys(SOURCE_META).map((key) => ({
  value: key,
  label: SOURCE_META[key].label,
}))

const SAMPLE_FILES = ['CDR.csv', 'ledger_export.xlsx', 'ipdr_summary.csv', 'device_export.json']

function nowStamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/*
 * Evidence-upload flow.
 *
 * Two-step wizard: (1) describe the record (file + source + notes),
 * (2) simulated ingestion with progress. On completion the record is
 * POSTed to the live backend by the parent via onUploaded.
 */
const UploadEvidenceModal = ({ open, onClose, caseId, onUploaded }) => {
  const [step, setStep] = useState('select') // select | uploading | done
  const [fileName, setFileName] = useState('')
  const [sourceType, setSourceType] = useState('CDR')
  const [description, setDescription] = useState('')
  const [progress, setProgress] = useState(0)
  const [dragover, setDragover] = useState(false)
  const pendingRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setStep('select')
    setFileName('')
    setSourceType('CDR')
    setDescription('')
    setProgress(0)
    setDragover(false)
    pendingRef.current = null
  }, [open])

  useEffect(() => {
    if (step !== 'uploading') return
    let p = 0
    const timer = window.setInterval(() => {
      p += 34
      const val = Math.min(100, p)
      setProgress(val)
      if (val >= 100) {
        window.clearInterval(timer)
        setStep('done')
        if (pendingRef.current) onUploaded?.(pendingRef.current)
      }
    }, 480)
    return () => window.clearInterval(timer)
  }, [step])

  const startUpload = () => {
    pendingRef.current = {
      id: generateEvidenceId(sourceType),
      type: sourceType,
      source: sourceType,
      description: description.trim() || `Bulk evidence import · ${fileName}`,
      status: 'Ready for analysis',
      addedAt: nowStamp(),
      addedBy: getUser()?.name || 'Investigator',
    }
    setStep('uploading')
    setProgress(0)
  }

  const canStart = Boolean(fileName)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload evidence"
      size="lg"
      footer={
        step === 'select' ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={startUpload} disabled={!canStart}>
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Start ingestion
            </Button>
          </>
        ) : step === 'uploading' ? (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )
      }
    >
      {step === 'select' && (
        <div className="space-y-4">
          {/* Drop target */}
          <div>
            <label
              htmlFor="evidence-file"
              className={[
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors',
                dragover
                  ? 'border-cyan-brand bg-cyan-brand/10'
                  : 'border-ink-600 bg-ink-700/30 hover:border-cyan-brand/50 hover:bg-ink-700/50',
              ].join(' ')}
              onDragOver={(e) => {
                e.preventDefault()
                setDragover(true)
              }}
              onDragLeave={() => setDragover(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragover(false)
                const file = e.dataTransfer.files?.[0]
                if (file) setFileName(file.name)
              }}
            >
              <UploadCloud className="h-7 w-7 text-cyan-brand" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-200">
                Drag &amp; drop a file here, or <span className="text-cyan-200">browse</span>
              </span>
              <span className="text-xs text-slate-500">
                {fileName ? `Selected: ${fileName}` : 'Record metadata is captured; file bytes are not stored'}
              </span>
              <input
                id="evidence-file"
                type="file"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setFileName(file.name)
                }}
              />
            </label>
          </div>

          {/* Sample files */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500">Use a sample:</span>
            {SAMPLE_FILES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setFileName(name)}
                className={[
                  'rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
                  fileName === name
                    ? 'border-cyan-brand/50 bg-cyan-brand/10 text-cyan-200'
                    : 'border-ink-600 text-slate-400 hover:border-ink-600/80 hover:text-slate-200',
                ].join(' ')}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Source type"
              options={SOURCE_OPTIONS}
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
            />
            <div className="sm:pt-5">
              <SourceBadge source={sourceType} />
            </div>
          </div>

          <Textarea
            label="Notes"
            rows={3}
            placeholder="Optional context for this record (e.g. extraction window or batch)."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      )}

      {step === 'uploading' && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-cyan-brand" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-slate-100">Ingesting {fileName}</p>
              <p className="text-xs text-slate-400">
                Parsing, normalization, and indexing…
              </p>
            </div>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-ink-700"
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
          <p className="mt-2 text-right text-xs text-slate-400">{progress}%</p>
        </div>
      )}

      {step === 'done' && pendingRef.current && (
        <div>
          <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Record added to case # {caseId}.
          </div>
          <dl className="space-y-2 rounded-md border border-ink-600/70 bg-ink-800/40 px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400">Record ID</dt>
              <dd className="font-mono text-cyan-200">{pendingRef.current.id}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400">Source</dt>
              <dd>
                <SourceBadge source={pendingRef.current.source} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400">Status</dt>
              <dd>
                <StatusBadge status={pendingRef.current.status} />
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-400">Notes</dt>
              <dd className="max-w-[60%] text-right text-slate-200">
                {pendingRef.current.description}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </Modal>
  )
}

export default UploadEvidenceModal