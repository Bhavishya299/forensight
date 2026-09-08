import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, ArrowRight, Rocket, X, Loader2 } from 'lucide-react'
import { createCase, addEvidenceItem, generateEvidenceId } from '../store/caseStore.js'
import { getUser } from '../services/auth.js'
import api from '../services/api.js'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHeader from '../components/dashboard/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Textarea from '../components/ui/Textarea.jsx'
import SourceBadge from '../components/common/SourceBadge.jsx'

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'In Review', label: 'In Review' },
]

const PRIORITY_OPTIONS = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
]

/*
 * Source-type → field schema for the optional evidence step.
 * Only CDR and BANKING are registered for the initial review pass;
 * IPDR, DEVICE, OSINT, and STATEMENTS schemas are added once the
 * field pattern is confirmed.
 */
const EVIDENCE_SCHEMA = {
  CDR: {
    typeLabel: 'Call Detail Record',
    fields: [
      {
        key: 'direction',
        label: 'Direction',
        type: 'select',
        options: [
          { value: 'in', label: 'Inbound' },
          { value: 'out', label: 'Outbound' },
        ],
      },
      { key: 'from', label: 'From (number)', type: 'text', placeholder: 'e.g. 9876543210' },
      { key: 'to', label: 'To (number)', type: 'text', placeholder: 'e.g. 9123456780' },
      { key: 'duration', label: 'Duration', type: 'text', placeholder: 'e.g. 4m 12s' },
    ],
  },
  BANKING: {
    typeLabel: 'Transaction',
    fields: [
      { key: 'senderAccount', label: 'Sender account', type: 'text', placeholder: 'e.g. Account A' },
      { key: 'receiverAccount', label: 'Receiver account', type: 'text', placeholder: 'e.g. Account B' },
      { key: 'amount', label: 'Amount', type: 'text', placeholder: 'e.g. ₹1,20,000' },
      { key: 'location', label: 'Location', type: 'text', placeholder: 'e.g. Sector X' },
    ],
  },
  // IPDR — session state / IP address / geo reference
  // DEVICE — device ID / location / timestamp
  // OSINT — reference kind / subject / related person
  // STATEMENTS — claimant / claim text / claimed time range / claimed location
}

function nowStamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function describeRecord(type, values) {
  if (type === 'CDR') {
    return `${values.direction === 'out' ? 'Outbound' : 'Inbound'} call · ${values.from} → ${values.to} · ${values.duration}`
  }
  if (type === 'BANKING') {
    return `${values.amount} transfer — ${values.senderAccount} → ${values.receiverAccount}${values.location ? ` · ${values.location}` : ''}`
  }
  return `${type} record`
}

const CreateCase = () => {
  const navigate = useNavigate()
  const user = getUser()
  const userName = user?.name || 'Investigator'
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    number: '1028',
    title: '',
    summary: '',
    status: 'Active',
    priority: 'Medium',
    owner: userName,
    tags: '',
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [recordType, setRecordType] = useState('CDR')
  const [draft, setDraft] = useState({})
  const [records, setRecords] = useState([])
  const [recordError, setRecordError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const next = {}
    if (!/^\d{4}$/.test(form.number.trim())) {
      next.number = 'Enter a 4-digit case number (e.g. 1028).'
    }
    if (!form.title.trim()) {
      next.title = 'A short case title is required.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const schema = EVIDENCE_SCHEMA[recordType]

  const changeRecordType = (e) => {
    const value = e.target.value
    setRecordType(value)
    setDraft({})
    setRecordError('')
  }

  const setField = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }))

  const renderField = (field) => {
    const common = {
      label: field.label,
      value: draft[field.key] || '',
      onChange: setField(field.key),
    }
    if (field.type === 'select') {
      return <Select key={field.key} {...common} options={field.options} />
    }
    return <Input key={field.key} {...common} placeholder={field.placeholder} autoComplete="off" />
  }

  const addRecord = () => {
    const values = Object.fromEntries(
      schema.fields.map((f) => [f.key, String(draft[f.key] || '').trim()])
    )
    const missing = schema.fields.filter((f) => !values[f.key])
    if (missing.length) {
      setRecordError(`Complete the following: ${missing.map((f) => f.label).join(', ')}`)
      return
    }
    setRecordError('')
    setRecords((r) => [
      ...r,
      {
        id: generateEvidenceId(recordType),
        sourceType: recordType,
        typeLabel: schema.typeLabel,
        description: describeRecord(recordType, values),
        data: values,
      },
    ])
    setDraft({})
  }

  const removeRecord = (id) => setRecords((r) => r.filter((rec) => rec.id !== id))

  const persistCase = async (payload) => {
    try {
      const res = await api.post('/cases', payload)
      const created = res?.data
      const id = created?.id ?? created?.caseId ?? created?.case_number ?? created?.number
      if (id != null) return { ok: true, id: String(id) }
    } catch {
      /* no backend present — fall through to the local demo store */
    }
    const local = createCase(payload)
    if (!local.ok) return { ok: false, error: local.error }
    return { ok: true, id: local.data.id }
  }

  const persistEvidence = async (caseId, record) => {
    const body = {
      id: record.id,
      type: record.typeLabel,
      source: record.sourceType,
      description: record.description,
      status: 'Ready for analysis',
      addedAt: nowStamp(),
      addedBy: userName,
      details: record.data,
    }
    try {
      await api.post(`/cases/${caseId}/evidence`, body)
    } catch {
      /* no backend present — store the record locally in the demo store */
      addEvidenceItem(caseId, body)
    }
  }

  const handleFinish = async (withEvidence) => {
    if (submitting) return
    setSubmitError('')
    if (!validate()) {
      setStep(1)
      return
    }
    setSubmitting(true)
    const payload = {
      number: form.number.trim(),
      title: form.title.trim(),
      description: form.summary.trim() || 'No summary provided.',
      status: form.status,
      priority: form.priority,
      owner: form.owner.trim() || userName,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    }
    const created = await persistCase(payload)
    if (!created.ok) {
      setSubmitError(created.error)
      setSubmitting(false)
      return
    }
    if (withEvidence && records.length) {
      for (const record of records) {
        await persistEvidence(created.id, record)
      }
      navigate(`/cases/${created.id}/evidence`)
    } else {
      navigate(`/cases/${created.id}`)
    }
  }

  const stepClass = (active) =>
    active
      ? 'rounded-md border border-cyan-brand/50 bg-cyan-brand/10 px-3 py-2 text-sm font-medium text-cyan-100'
      : 'rounded-md border border-ink-600/70 bg-ink-800/40 px-3 py-2 text-sm font-medium text-slate-500'

  return (
    <PageContainer maxWidth="max-w-2xl">
      <PageHeader
        title="New case"
        tagline="Create an investigation case workspace"
        className="mb-4"
      />

      <div className="mb-5 grid grid-cols-2 gap-2" aria-label="Case creation progress">
        <div className={stepClass(step === 1)}>1 · Case details</div>
        <div className={stepClass(step === 2)}>2 · Evidence (optional)</div>
      </div>

      {submitError && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
        >
          {submitError}
        </div>
      )}

      <Card>
        {step === 1 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setSubmitError('')
              if (validate()) setStep(2)
            }}
            noValidate
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Case number"
                  value={form.number}
                  onChange={set('number')}
                  error={errors.number}
                  hint="4-digit identifier used as the case ID"
                  inputMode="numeric"
                  autoComplete="off"
                />
                <Select
                  label="Priority"
                  options={PRIORITY_OPTIONS}
                  value={form.priority}
                  onChange={set('priority')}
                />
              </div>

              <Input
                label="Case title"
                value={form.title}
                onChange={set('title')}
                error={errors.title}
                placeholder="e.g. Cross-Source Activity Review"
              />

              <Textarea
                label="Summary"
                rows={4}
                value={form.summary}
                onChange={set('summary')}
                placeholder="High-level objective and scope of the investigation."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Status"
                  options={STATUS_OPTIONS}
                  value={form.status}
                  onChange={set('status')}
                />
                <Input
                  label="Owner"
                  value={form.owner}
                  onChange={set('owner')}
                />
              </div>

              <Input
                label="Tags"
                value={form.tags}
                onChange={set('tags')}
                placeholder="e.g. Financial, Telecom"
                hint="Comma-separated, optional"
              />

              <div className="flex items-start gap-2 rounded-md border border-cyan-brand/20 bg-cyan-brand/5 px-3 py-2.5 text-xs text-cyan-100/80">
                <Rocket className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <p>
                  The case is created on the live backend as soon as you continue.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-ink-600/70 pt-4">
              <Link
                to="/cases"
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to cases
              </Link>
              <Button type="submit">
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <p className="mb-4 text-sm text-slate-400">
              Optional — attach evidence records to the case before it is created. Select a source
              type, fill in its record, and add it to the list below.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Source type"
                options={Object.keys(EVIDENCE_SCHEMA).map((key) => ({
                  value: key,
                  label: EVIDENCE_SCHEMA[key].typeLabel,
                }))}
                value={recordType}
                onChange={changeRecordType}
              />
              <div className="sm:pt-5">
                <SourceBadge source={recordType} />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {schema.fields.map((field) => renderField(field))}
            </div>

            {recordError && (
              <p role="alert" className="mt-2 text-xs text-red-300">
                {recordError}
              </p>
            )}

            <div className="mt-3">
              <Button type="button" variant="outline" size="sm" onClick={addRecord}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add evidence record
              </Button>
            </div>

            {records.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Records to attach
                  </span>
                  <span className="rounded-md border border-ink-600 bg-ink-800/60 px-2 py-0.5 text-[11px] text-slate-300">
                    {records.length} {records.length === 1 ? 'record' : 'records'}
                  </span>
                </div>
                <ul className="space-y-2">
                  {records.map((record) => (
                    <li
                      key={record.id}
                      className="flex items-start justify-between gap-3 rounded-md border border-ink-600/70 bg-ink-800/40 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <SourceBadge source={record.sourceType} />
                          <span className="font-mono text-[11px] text-slate-500">{record.id}</span>
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-300">{record.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRecord(record.id)}
                        aria-label={`Remove ${record.id}`}
                        className="mt-0.5 rounded-md border border-ink-600 p-1 text-slate-500 transition-colors hover:border-red-500/50 hover:text-red-300"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-600/70 pt-4">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={submitting}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => handleFinish(false)} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Skip, add later
                </Button>
                <Button onClick={() => handleFinish(true)} disabled={submitting || records.length === 0}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Add evidence now
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </PageContainer>
  )
}

export default CreateCase