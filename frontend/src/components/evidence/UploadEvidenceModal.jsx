import { useEffect, useRef, useState } from 'react'
import { UploadCloud, FileUp, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Select from '../ui/Select.jsx'
import Textarea from '../ui/Textarea.jsx'
import SourceBadge from '../common/SourceBadge.jsx'
import { SOURCE_META } from '../../config/sourceMeta.js'
import { getUser } from '../../services/auth.js'
import { addEvidenceItem, generateEvidenceId } from '../../store/caseStore.js'

const SOURCE_OPTIONS = Object.keys(SOURCE_META).map((key) => ({
  value: key,
  label: SOURCE_META[key].label,
}))

const SAMPLE_FILES = ['CDR.csv', 'ledger_export.csv', 'ipdr_summary.csv', 'device_export.json']

// Header-name aliases → canonical detail keys the backend normalization
// (ingestion._infer_event_from_details) understands per source.
const COLUMN_ALIASES = {
  from: ['from', 'caller', 'origin', 'source', 'caller number', 'a-number', 'source_number', 'calling'],
  to: ['to', 'callee', 'destination', 'target', 'called', 'b-number', 'destination_number'],
  direction: ['direction', 'dir', 'call type', 'call_type', 'type'],
  duration: ['duration', 'dur', 'seconds', 'call duration', 'duration_seconds'],
  senderAccount: ['senderaccount', 'sender', 'from account', 'from_account', 'source account', 'source_account', 'debit account', 'debit_account'],
  receiverAccount: ['receiveraccount', 'receiver', 'beneficiary', 'to account', 'to_account', 'target account', 'target_account', 'credit account', 'credit_account'],
  amount: ['amount', 'value', 'txn amount', 'txn_amount', 'transaction amount', 'transaction_amount'],
  entity1: ['entity1', 'entity a', 'entity_a', 'subject', 'person', 'name', 'from entity', 'from_entity', 'primary'],
  entity2: ['entity2', 'entity b', 'entity_b', 'counterparty', 'related', 'to entity', 'to_entity', 'secondary'],
  location: ['location', 'place', 'city', 'site', 'area', 'geolocation', 'geo'],
  timestamp: ['timestamp', 'datetime', 'date', 'time', 'event time', 'event_time', 'when', 'ts'],
  description: ['description', 'notes', 'note', 'comment', 'details', 'narrative'],
}

function nowStamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.readAsText(file)
  })
}

function parseCsv(text) {
  const rows = []
  let field = ''
  let row = []
  let inQuotes = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      field = ''
      if (row.some((c) => String(c).trim() !== '')) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  if (field !== '' || row.some((c) => String(c).trim() !== '')) {
    row.push(field)
    if (row.some((c) => String(c).trim() !== '')) rows.push(row)
  }
  return rows
}

function rowsToObjects(rows) {
  if (!rows.length) return []
  const header = rows[0].map((h) => String(h || '').trim())
  return rows.slice(1).map((cells) => {
    const obj = {}
    header.forEach((h, i) => {
      obj[h] = cells[i] !== undefined ? String(cells[i]).trim() : ''
    })
    return obj
  })
}

function normalizeJsonRecords(data) {
  let arr = data
  if (!Array.isArray(arr)) {
    const nested = arr && (arr.records || arr.items || arr.data)
    if (Array.isArray(nested)) arr = nested
    else arr = [arr]
  }
  return arr.filter((r) => r && typeof r === 'object')
}

function buildColumnMap(objects) {
  if (!objects.length) return {}
  const map = {}
  Object.keys(objects[0]).forEach((header) => {
    const key = String(header).trim().toLowerCase()
    for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (key === canonical || aliases.includes(key)) {
        map[key] = canonical
        break
      }
    }
  })
  return map
}

function buildRecord(source, values, fileName, notes) {
  const ok = (v) => v !== undefined && v !== null && String(v).trim() !== ''
  const take = (k) => (ok(values[k]) ? String(values[k]).trim() : '')

  const details = {}
  const descriptionBase = notes.trim()
  let description = descriptionBase
  let reason = ''

  if (source === 'CDR') {
    const from = take('from')
    const to = take('to')
    if (!from || !to) return { ok: false, reason: 'missing from/to columns' }
    details.from = from
    details.to = to
    if (take('direction')) details.direction = take('direction')
    if (take('duration')) details.duration = take('duration')
    if (take('timestamp')) details.timestamp = take('timestamp')
    if (take('location')) details.location = take('location')
    description = descriptionBase || `Call ${from} → ${to}`
  } else if (source === 'BANKING') {
    const sender = take('senderAccount')
    const receiver = take('receiverAccount')
    if (!sender || !receiver) return { ok: false, reason: 'missing sender/receiver account columns' }
    details.senderAccount = sender
    details.receiverAccount = receiver
    if (take('amount')) details.amount = take('amount')
    if (take('timestamp')) details.timestamp = take('timestamp')
    if (take('location')) details.location = take('location')
    description = descriptionBase || `Transfer ${sender} → ${receiver}`
  } else {
    const e1 = take('entity1')
    const e2 = take('entity2')
    if (!e1 && !e2 && !take('timestamp')) {
      return { ok: false, reason: 'no usable columns (expect entity1/entity2 and/or timestamp)' }
    }
    if (e1) details.entity1 = e1
    if (e2) details.entity2 = e2
    if (take('location')) details.location = take('location')
    if (take('timestamp')) details.timestamp = take('timestamp')
    description = descriptionBase || [e1, e2].filter(Boolean).join(' ↔ ') || `${source} record`
  }
  if (fileName && (details.description || take('description'))) {
    details.description = take('description') || description
  }
  if (fileName) details.sourceFile = fileName

  return { ok: true, details, description }
}

/*
 * Evidence-upload flow.
 *
 * Reads the selected CSV/JSON file, maps each data row into the `details`
 * shape the backend normalization expects (CDR: from/to/direction/duration,
 * BANKING: sender/receiver account + amount, other sources: entity1/entity2/
 * location), and POSTs ONE evidence record per row. The backend hashes the
 * raw payload of every record before parsing (integrity anchor). Malformed
 * rows are skipped with a visible warning.
 */
const UploadEvidenceModal = ({ open, onClose, caseId, onUploaded }) => {
  const [step, setStep] = useState('select') // select | uploading | done | error
  const [fileName, setFileName] = useState('')
  const [sourceType, setSourceType] = useState('CDR')
  const [description, setDescription] = useState('')
  const [dragover, setDragover] = useState(false)
  const [progress, setProgress] = useState({ done: 0, skipped: 0, total: 0 })
  const [currentRow, setCurrentRow] = useState('')
  const [summary, setSummary] = useState({ added: 0, skipped: [] })
  const [errorMsg, setErrorMsg] = useState('')
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!open) return
    setStep('select')
    setFileName('')
    setSourceType('CDR')
    setDescription('')
    setDragover(false)
    setProgress({ done: 0, skipped: 0, total: 0 })
    setCurrentRow('')
    setSummary({ added: 0, skipped: [] })
    setErrorMsg('')
    cancelledRef.current = false
  }, [open])

  const handleClose = () => {
    cancelledRef.current = true
    onClose()
  }

  const persist = async (source, record) => {
    let attempt = 0
    for (;;) {
      attempt += 1
      try {
        await addEvidenceItem(caseId, record)
        return { ok: true, added: true }
      } catch (err) {
        if (err?.response?.status === 409 && attempt < 2) {
          record.id = generateEvidenceId(source)
          continue
        }
        return {
          ok: false,
          reason:
            String(err?.response?.data?.detail || '') || 'record rejected by the backend',
        }
      }
    }
  }

  const startUpload = async () => {
    const file = document.getElementById('evidence-file')?.files?.[0]
    const name = fileName
    if (!file && !name) return

    const ext = (file?.name || name).split('.').pop()?.toLowerCase()
    if (ext !== 'csv' && ext !== 'json') {
      setErrorMsg('Unsupported file type — use a .csv or .json file.')
      setStep('error')
      return
    }

    let objects = []
    try {
      const text = file ? await readFileText(file) : ''
      if (ext === 'json') {
        const data = JSON.parse(text || '[]')
        objects = normalizeJsonRecords(data)
      } else {
        objects = rowsToObjects(parseCsv(text))
      }
    } catch {
      setErrorMsg('Could not parse the file. Check that the CSV/JSON is well-formed.')
      setStep('error')
      return
    }

    if (!objects.length) {
      setErrorMsg('No data rows found in the file.')
      setStep('error')
      return
    }

    const columnMap = buildColumnMap(objects)
    const records = []
    const skipped = []
    objects.forEach((obj, idx) => {
      const values = {}
      Object.entries(obj).forEach(([header, value]) => {
        const canonical = columnMap[String(header).trim().toLowerCase()]
        values[canonical || String(header).trim().toLowerCase()] = value
      })
      const built = buildRecord(sourceType, values, fileName, description)
      if (!built.ok) {
        skipped.push({ row: idx + 2, reason: built.reason })
        return
      }
      records.push({
        id: generateEvidenceId(sourceType),
        type: sourceType,
        source: sourceType,
        description: built.description,
        status: 'Ready for analysis',
        addedAt: nowStamp(),
        addedBy: getUser()?.name || 'Investigator',
        details: built.details,
      })
    })

    if (!records.length) {
      setSummary({ added: 0, skipped })
      setErrorMsg('None of the rows could be mapped to valid records for this source.')
      setStep('error')
      return
    }

    cancelledRef.current = false
    setStep('uploading')
    setProgress({ done: 0, skipped: 0, total: records.length })
    setCurrentRow('')

    const added = []
    const rowSkips = [...skipped]
    for (let i = 0; i < records.length; i += 1) {
      if (cancelledRef.current) break
      const record = records[i]
      setCurrentRow(String(record.id))
      const res = await persist(sourceType, record)
      if (res.ok) {
        added.push(record.id)
      } else {
        rowSkips.push({ row: `record ${record.id}`, reason: res.reason })
      }
      setProgress((p) => ({ done: p.done + 1, skipped: 0, total: p.total }))
    }

    const finalSkips = rowSkips.filter((s) => s.reason !== 'missing from/to columns')
    const fullSummary = { added: added.length, skipped: finalSkips.length ? finalSkips : [] }
    setSummary(fullSummary)
    onUploaded?.(fullSummary)
    setStep('done')
  }

  const canStart = Boolean(fileName)
  const total = progress.total
  const progressPct = total ? Math.round((progress.done / total) * 100) : 0

  return (
    <Modal
      open={open}
      onClose={handleClose}
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
              Ingest file
            </Button>
          </>
        ) : step === 'uploading' ? (
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )
      }
    >
      {step === 'select' && (
        <div className="space-y-4">
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
                Drag &amp; drop a CSV or JSON file here, or <span className="text-cyan-200">browse</span>
              </span>
              <span className="text-xs text-slate-500">
                {fileName ? `Selected: ${fileName}` : 'Each data row becomes its own evidence record'}
              </span>
              <input
                id="evidence-file"
                type="file"
                accept=".csv,.json,text/csv,application/json"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setFileName(file.name)
                }}
              />
            </label>
          </div>

          {fileName && (
            <p className="rounded-md border border-ink-600/60 bg-ink-800/30 px-3 py-2 text-xs text-slate-400">
              Columns are mapped per source type — CDR uses from/to/direction/duration,
              BANKING uses sender/receiver account + amount, other sources use entity1/entity2/location.
            </p>
          )}

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
            placeholder="Optional context for these records (e.g. extraction window or batch)."
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
                {currentRow ? `Record ${currentRow} posted to the backend…` : 'Preparing records…'}
              </p>
            </div>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-ink-700"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-cyan-brand transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-right text-xs text-slate-400">
            {progress.done} of {progress.total} records
          </p>
        </div>
      )}

      {step === 'error' && (
        <div>
          <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {errorMsg}
          </div>
          <p className="text-xs text-slate-500">Nothing was added. Fix the file and try again.</p>
        </div>
      )}

      {step === 'done' && (
        <div>
          <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {summary.added === 1 ? '1 record added' : `${summary.added} records added`} to case #{caseId}.
          </div>
          {summary.skipped.length > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">{summary.skipped.length} row(s) skipped:</p>
                <ul className="mt-1 list-inside list-disc text-xs text-amber-200/80">
                  {summary.skipped.slice(0, 5).map((s) => (
                    <li key={`${s.row}-${s.reason}`}>
                      {s.row}: {s.reason}
                    </li>
                  ))}
                  {summary.skipped.length > 5 && <li>…and {summary.skipped.length - 5} more.</li>}
                </ul>
              </div>
            </div>
          )}
          <p className="text-xs text-slate-500">
            Run analysis from the case header to build the event timeline, entity graph, and alerts.
          </p>
        </div>
      )}
    </Modal>
  )
}

export default UploadEvidenceModal