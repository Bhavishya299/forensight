import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  FileText,
  Printer,
  Download,
  Clock,
  FolderSearch,
  AlertTriangle,
  Link2,
  Car,
  ArrowRight,
} from 'lucide-react'
import { getCaseById, getEvidenceById } from '../store/caseStore.js'
import api from '../services/api.js'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHeader from '../components/dashboard/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import SourceBadge from '../components/common/SourceBadge.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import EvidenceDetailDrawer from '../components/evidence/EvidenceDetailDrawer.jsx'
import ReportExportModal from '../components/report/ReportExportModal.jsx'

const REPORT_REVIEW_ITEMS = [
  {
    id: 'relationship',
    label: 'Relationship was reviewed against every source record it references',
  },
  {
    id: 'timeline',
    label: 'Event sequence was compared across all independent evidence sources',
  },
  {
    id: 'anomaly',
    label: 'Reported amount/activity anomaly was measured against the baseline',
  },
  {
    id: 'contradiction',
    label: 'Statement claim was cross-checked with independent records',
  },
  {
    id: 'vehicle',
    label: 'Vehicle trace observations were reviewed with their source records',
  },
  {
    id: 'evidence',
    label: 'Supporting evidence was inspected before drawing any conclusion',
  },
]

const ReportSection = ({ title, subtitle, icon, children, footer }) => (
  <Card title={title} subtitle={subtitle} icon={icon} footer={footer} className="print:break-inside-avoid">
    {children}
  </Card>
)

const Figure = ({ label, value }) => (
  <div className="rounded-lg border border-ink-600/70 bg-ink-800 px-3 py-3">
    <div className="text-xl font-semibold text-slate-100">{value}</div>
    <div className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
  </div>
)

const EvidenceChip = ({ id, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="inline-flex cursor-pointer items-center rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[11px] text-cyan-200 transition-colors hover:bg-ink-600"
    aria-label={`Open evidence record ${id}`}
  >
    {id}
  </button>
)

const Reports = () => {
  const { id } = useParams()
  const [caseData, setCaseData] = useState(null)
  const [model, setModel] = useState(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showExport, setShowExport] = useState(false)
  const [activeEvidence, setActiveEvidence] = useState(null)
  const [review, setReview] = useState(
    () => Object.fromEntries(REPORT_REVIEW_ITEMS.map((i) => [i.id, false]))
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(false)
      try {
        const [caseResult, reportResult] = await Promise.all([
          getCaseById(id),
          api.get(`/cases/${id}/report`),
        ])
        if (cancelled) return
        setCaseData(caseResult)
        setModel(reportResult.data || null)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  const openEvidence = async (evidenceId) => {
    const item = await getEvidenceById(String(id), evidenceId)
    setActiveEvidence(item || null)
  }

  const handlePrint = () => {
    setShowExport(true)
  }

  if (loading) {
    return (
      <PageContainer>
        <Card className="print:hidden">
          <LoadingState label="Loading report…" />
        </Card>
      </PageContainer>
    )
  }

  if (error || !caseData || !model) {
    return (
      <PageContainer>
        <Card>
          <ErrorState
            title="Unable to load investigation"
            description="Case data could not be loaded. Confirm the case exists and try again."
            action={
              <Link to="/cases">
                <Button variant="outline">Back to cases</Button>
              </Link>
            }
          />
        </Card>
      </PageContainer>
    )
  }

  const viewInGraph = (name) =>
    `/cases/${id}/graph?entity=${encodeURIComponent(name)}`

  return (
    <PageContainer>
      <PageHeader
        title="Investigation Report"
        tagline={`Case #${id} · ${caseData.title}`}
        actions={
          <>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print report
            </Button>
            <Button onClick={() => setShowExport(true)}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Export report
            </Button>
          </>
        }
      />

      <div className="space-y-5">
        {/* ---------------- Masthead ---------------- */}
        <Card
          className="overflow-hidden"
          bodyClassName="p-0"
        >
          <div className="border-b border-ink-600/70 bg-ink-900 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-brand" aria-hidden="true" />
              <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-slate-100">
                FORENSIGHT
              </h2>
              <span className="text-xs text-slate-500">· Multi-Source Investigative Analytics</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-400">Investigation report</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-slate-100">CASE #{id}</span>
                  <span className="text-sm text-slate-400">{caseData.title}</span>
                </div>
              </div>
              <StatusBadge status="Analyzed" />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-400 sm:grid-cols-4">
              <div>
                <dt className="uppercase tracking-wider text-slate-500">Generated</dt>
                <dd className="mt-0.5 text-sm text-slate-200">{model.generated}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider text-slate-500">Prepared for</dt>
                <dd className="mt-0.5 text-sm text-slate-200">Investigator review</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider text-slate-500">Environment</dt>
                <dd className="mt-0.5 text-sm text-slate-200">Demonstration</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider text-slate-500">Assigned to</dt>
                <dd className="mt-0.5 text-sm text-slate-200">A. Sharma</dd>
              </div>
            </dl>
          </div>
          <div className="flex items-start gap-2 border-b border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-amber-200">
              <span className="font-semibold">DEMONSTRATION DATA — SYNTHETIC / SANITIZED.</span>{' '}
              Analytical results do not constitute legal conclusions or determinations of guilt.
              Independent investigator verification is required before any action or conclusion.
            </p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-ink-600/60 border-b border-ink-600/60 md:grid-cols-4">
            <div className="px-4 py-3">
              <div className="text-2xl font-semibold text-slate-100">#{id}</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Case number</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-2xl font-semibold text-slate-100">{model.overview?.sources}</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Evidence sources</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-2xl font-semibold text-slate-100">{model.overview?.events}</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Events</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-2xl font-semibold text-slate-100">{model.overview?.windows}</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Critical windows</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4">
            <Figure label="Entities" value={model.overview?.entities} />
            <Figure label="Relationships" value={model.overview?.relationships} />
            <Figure label="Potential leads" value={model.overview?.leads} />
            <Figure label="Lead types" value={new Set((model.leads || []).map((l) => l.type)).size} />
          </div>
        </Card>

        {/* ---------------- Executive summary ---------------- */}
        <ReportSection
          title="Executive summary"
          subtitle="Prototype analytical overview — synthetic data"
          icon={<FileText className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="space-y-3 text-sm leading-relaxed text-slate-300">
            <p>
              This prototype analysis identified multiple potential relationships and correlated
              events across independent synthetic evidence sources associated with Case #{id}.
            </p>
            <p>
              Activity was observed across communication, digital access, financial, social and
              device/location records within a concentrated 19-minute window{' '}
              <span className="font-mono text-cyan-200">18:02 → 18:21</span>. Five events across
              five independent sources were recorded during this period.
            </p>
            <p>
              All results are investigative leads derived from demonstration data. They require
              investigator verification and do not in themselves establish any conclusion.
            </p>
          </div>
        </ReportSection>

        {/* ---------------- Key entities ---------------- */}
        <ReportSection
          title="Key entities"
          subtitle={`${model.overview?.entities ?? 0} entities from the case graph`}
          icon={<FolderSearch className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-600/70 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-4 font-semibold">Name</th>
                  <th className="py-2 pr-4 font-semibold">Type</th>
                  <th className="py-2 pr-4 font-semibold">Related evidence</th>
                  <th className="py-2 pr-4 font-semibold">Related events</th>
                  <th className="py-2 font-semibold">View</th>
                </tr>
              </thead>
              <tbody>
                {(model.entities || []).map((e) => (
                  <tr key={e.name} className="border-b border-ink-700/50">
                    <td className="py-2.5 pr-4 font-medium text-slate-100">{e.name}</td>
                    <td className="py-2.5 pr-4 text-slate-300">{e.type}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-wrap gap-1.5">
                        {e.relatedEvidence.map((evId) => (
                          <EvidenceChip key={evId} id={evId} onOpen={() => openEvidence(evId)} />
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-300">{e.relatedEvents}</td>
                    <td className="py-2.5">
                      <Link
                        to={viewInGraph(e.name)}
                        className="text-xs font-medium text-cyan-300 hover:text-cyan-200 hover:underline"
                      >
                        View in graph
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            Entity names link to the case graph with the entity pre-selected.
          </p>
        </ReportSection>

        {/* ---------------- Key leads ---------------- */}
        <ReportSection
          title="Key investigative leads"
          subtitle="Potential leads requiring investigator review"
          icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="space-y-3">
            {(model.leads || []).map((lead) => (
              <div key={lead.type} className="rounded-lg border border-ink-600/70 bg-ink-800/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-cyan-200">
                    {lead.type}
                  </h4>
                  <StatusBadge status={lead.status} />
                </div>
                <div className="mt-2 space-y-1.5 text-sm text-slate-300">
                  <p>
                    <span className="font-medium text-slate-200">Observed:</span> {lead.observed}
                  </p>
                  <p>
                    <span className="font-medium text-slate-200">Reason:</span> {lead.reason}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <span>Supporting evidence:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(lead.evidence || []).map((evId) => (
                      <EvidenceChip key={evId} id={evId} onOpen={() => openEvidence(evId)} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* ---------------- Key event sequence ---------------- */}
        <ReportSection
          title="Key event sequence"
          subtitle="Five correlated events within one critical window"
          icon={<Clock className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-600/70 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-4 font-semibold">Time</th>
                  <th className="py-2 pr-4 font-semibold">Source</th>
                  <th className="py-2 pr-4 font-semibold">Description</th>
                  <th className="py-2 font-semibold">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {(model.events || []).map((e) => (
                  <tr key={e.evidenceId} className="border-b border-ink-700/50">
                    <td className="py-2.5 pr-4 font-mono text-cyan-200">{e.time}</td>
                    <td className="py-2.5 pr-4">
                      <SourceBadge source={e.source} />
                    </td>
                    <td className="py-2.5 pr-4 text-slate-300">{e.description}</td>
                    <td className="py-2.5">
                      <EvidenceChip id={e.evidenceId} onOpen={() => openEvidence(e.evidenceId)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>

        {/* ---------------- Relationship + Contradiction ---------------- */}
        <div className="grid gap-5 lg:grid-cols-2 print:grid-cols-1">
          <ReportSection
            title="Relationship analysis"
            subtitle="Cross-source correlation"
            icon={<Link2 className="h-4 w-4" aria-hidden="true" />}
            footer={
              <Link to={viewInGraph(model.relationship?.subject || '')}>
                <Button variant="outline" size="sm">
                  View case graph
                </Button>
              </Link>
            }
          >
            {model.relationship ? (
              <div className="text-sm text-slate-300">
                <h4 className="text-sm font-semibold text-slate-100">{model.relationship.subject}</h4>
                <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                  Potential relationship
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(model.relationship.sources || []).map((s) => (
                    <SourceBadge key={s} source={s} />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <span>Evidence:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(model.relationship.evidence || []).map((evId) => (
                      <EvidenceChip key={evId} id={evId} onOpen={() => openEvidence(evId)} />
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  <StatusBadge status={model.relationship.status} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No potential relationships identified.</p>
            )}
          </ReportSection>

          <ReportSection
            title="Potential contradiction"
            subtitle="Statement claim vs. independent records"
            icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
            footer={
              model.contradiction && (
                <Link to={`/cases/${id}/contradictions?c=${model.contradiction.id || ''}`}>
                  <Button variant="outline" size="sm">
                    View contradiction
                  </Button>
                </Link>
              )
            }
          >
            {model.contradiction ? (
              <div className="space-y-3 text-sm text-slate-300">
                <div className="rounded-lg border border-ink-600/70 bg-ink-800/60 p-3">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Statement claim</p>
                  <p className="mt-1">“{model.contradiction.claim}”</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Independent records in Sector X
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {model.contradiction.records.map((r, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-300">
                        <span className="text-cyan-200">{r.time}</span>
                        <span className="text-slate-500">·</span>
                        <span>{r.source}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-slate-300">{r.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="rounded-lg border border-ink-600/70 bg-ink-800/60 p-3">
                  <span className="font-medium text-slate-200">Assessment:</span>{' '}
                  {model.contradiction.assessment}
                </p>
                <StatusBadge status={model.contradiction.status} />
              </div>
            ) : (
              <p className="text-sm text-slate-400">No potential contradictions identified.</p>
            )}
          </ReportSection>
        </div>

        {/* ---------------- Vehicle movement analysis ---------------- */}
        {model.vehicle && (
          <ReportSection
            title="Vehicle movement analysis"
            subtitle="Synthetic CCTV vehicle trace — observations only"
            icon={<Car className="h-4 w-4" aria-hidden="true" />}
            footer={
              <Link to={viewInGraph(model.vehicle?.plate || '')}>
                <Button variant="outline" size="sm">
                  View in graph
                </Button>
              </Link>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-lg border border-ink-600 bg-ink-800/60 px-3 py-1.5 font-mono text-sm font-semibold text-slate-100">
                  {model.vehicle.plate}
                </span>
                <span className="text-sm text-slate-300">
                  {model.vehicle.type} · {model.vehicle.color} · Synthetic demo trace
                </span>
                <StatusBadge status={model.vehicle.status} />
              </div>

              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Cameras', String(model.vehicle.cameras)],
                  ['First seen', model.vehicle.firstSeen],
                  ['Last seen', model.vehicle.lastSeen],
                  ['Duration', model.vehicle.duration],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-ink-600/70 bg-ink-800/40 px-3 py-2">
                    <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{k}</dt>
                    <dd className="mt-0.5 font-mono text-sm text-slate-100">{v}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Observed route (illustrative)</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {model.vehicle.route.map((r, i) => (
                    <span key={r} className="inline-flex items-center gap-1.5">
                      <span className="rounded-md border border-ink-600 bg-ink-800/60 px-2 py-1 text-xs text-slate-200">
                        {r}
                      </span>
                      {i < (model.vehicle.route || []).length - 1 && (
                        <ArrowRight className="h-3 w-3 text-slate-500" aria-hidden="true" />
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <ul className="space-y-1.5">
                {model.vehicle.sightings.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-md border border-ink-600/60 bg-ink-800/30 px-3 py-2 text-xs">
                    <span className="font-mono text-cyan-200">{s.time}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-200">Camera {s.camera}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300">{s.area}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300">{s.direction}</span>
                    <EvidenceChip key={`ev-${s.id}`} id={s.id} onOpen={() => openEvidence(s.id)} />
                  </li>
                ))}
              </ul>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                  Potential correlations — surrounding source records
                </p>
                <ul className="space-y-1.5">
                  {model.vehicle.correlations.map((c) => (
                    <li key={`${c.time}-${c.source}`} className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-cyan-200">{c.time}</span>
                      <SourceBadge source={c.source} />
                      <span className="text-slate-300">{c.sector}</span>
                      <EvidenceChip id={c.evidenceId} onOpen={() => openEvidence(c.evidenceId)} />
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-slate-500">
                  Time and sector alignments only — they do not associate any person with the vehicle or infer a
                  destination. Independent verification is required.
                </p>
              </div>
            </div>
          </ReportSection>
        )}

        {/* ---------------- Supporting evidence ---------------- */}
        <ReportSection
          title="Supporting evidence"
          subtitle="Primary records referenced by this report"
          icon={<FolderSearch className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-600/70 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-4 font-semibold">Evidence ID</th>
                  <th className="py-2 pr-4 font-semibold">Source</th>
                  <th className="py-2 pr-4 font-semibold">Timestamp</th>
                  <th className="py-2 pr-4 font-semibold">Description</th>
                  <th className="py-2 font-semibold">Referenced by</th>
                </tr>
              </thead>
              <tbody>
                {(model.evidenceRows || []).map((r) => (
                  <tr key={r.id} className="border-b border-ink-700/50">
                    <td className="py-2.5 pr-4">
                      <EvidenceChip id={r.id} onOpen={() => openEvidence(r.id)} />
                    </td>
                    <td className="py-2.5 pr-4">
                      <SourceBadge source={r.source} />
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-cyan-200">{r.timestamp}</td>
                    <td className="py-2.5 pr-4 text-slate-300">{r.description}</td>
                    <td className="py-2.5 text-slate-400">{r.referencedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Select an evidence ID to inspect the underlying synthetic record.
          </p>
        </ReportSection>

        {/* ---------------- Investigator review ---------------- */}
        <ReportSection
          title="Investigator review"
          subtitle="Frontend-only acknowledgement — no data is stored"
          icon={<FolderSearch className="h-4 w-4" aria-hidden="true" />}
        >
          <ul className="space-y-2.5">
            {REPORT_REVIEW_ITEMS.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={review[item.id]}
                    onChange={(e) => setReview((r) => ({ ...r, [item.id]: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-ink-600 accent-cyan-brand"
                  />
                  <span>{item.label}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-600/70 pt-3 text-xs text-slate-500">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
            <span>
              Reminder: this report is built from synthetic demonstration data and is not a legal
              conclusion. Checks above are recorded locally only.
            </span>
          </div>
        </ReportSection>

        {/* ---------------- Footer ---------------- */}
        <p className="text-center text-xs text-slate-600">
          FORENSIGHT — Prototype for demonstration purposes · Synthetic / sanitized data only ·
          Generated {model.generated}
        </p>
      </div>

      <ReportExportModal open={showExport} onClose={() => setShowExport(false)} model={model} />

      <EvidenceDetailDrawer
        open={Boolean(activeEvidence)}
        onClose={() => setActiveEvidence(null)}
        caseId={String(id)}
        item={activeEvidence}
      />
    </PageContainer>
  )
}

export default Reports