import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Car,
  Search,
  Map as MapIcon,
  Route as RouteIcon,
  Clock,
  FolderSearch,
  Link2,
  CheckCircle2,
  ScanSearch,
  AlertOctagon,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHeader from '../components/dashboard/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Modal from '../components/ui/Modal.jsx'
import Select from '../components/ui/Select.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import AlertBanner from '../components/ui/AlertBanner.jsx'
import EvidenceChip from '../components/common/EvidenceChip.jsx'
import VehicleSearchPanel from '../components/vehicle/VehicleSearchPanel.jsx'
import CctvDetectionCard from '../components/vehicle/CctvDetectionCard.jsx'
import CctvDetectionDrawer from '../components/vehicle/CctvDetectionDrawer.jsx'
import SyntheticTraceMap from '../components/vehicle/SyntheticTraceMap.jsx'
import CrossSourceCorrelation from '../components/vehicle/CrossSourceCorrelation.jsx'
import api from '../services/api.js'
import { correlationWhyFlagged, elapsedStrings, formatDuration } from '../config/vehicleMeta.js'

const CONFIDENCE_OPTIONS = [
  { value: 'All', label: 'All confidence' },
  { value: 'high', label: 'High (95%+)' },
  { value: 'medium', label: 'Medium (90–94%)' },
  { value: 'low', label: 'Low (<90%)' },
]

const TIME_WINDOWS = [
  { value: 'All', label: 'All times' },
  { value: 'w1', label: '09:00 – 09:15' },
  { value: 'w2', label: '09:15 – 09:30' },
  { value: 'w3', label: 'After 09:30' },
]

const DIRECTION_OPTIONS = [
  { value: 'All', label: 'All directions' },
  { value: 'NE', label: 'North-East' },
  { value: 'E', label: 'East' },
  { value: 'SE', label: 'South-East' },
]

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

const detectionMatches = (d, filters) => {
  if (filters.camera !== 'All' && d.camera !== filters.camera) return false
  if (filters.direction !== 'All' && d.directionShort !== filters.direction) return false
  if (filters.confidence !== 'All') {
    const v = (d.plateConfidence + d.matchConfidence) / 2
    if (filters.confidence === 'high' && v < 95) return false
    if (filters.confidence === 'medium' && (v < 90 || v >= 95)) return false
    if (filters.confidence === 'low' && v >= 90) return false
  }
  if (filters.time !== 'All') {
    const mins = toMinutes(d.time)
    if (filters.time === 'w1' && (mins < 9 * 60 || mins > 9 * 60 + 15)) return false
    if (filters.time === 'w2' && (mins <= 9 * 60 + 15 || mins > 9 * 60 + 30)) return false
    if (filters.time === 'w3' && mins <= 9 * 60 + 30) return false
  }
  return true
}

const ProfileRow = ({ label, value, mono = false }) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <dt className="text-xs uppercase tracking-widest text-slate-500">{label}</dt>
    <dd className={`text-sm text-slate-100 ${mono ? 'font-mono' : ''}`}>{value}</dd>
  </div>
)

const VehicleIntelligence = () => {
  const [phase, setPhase] = useState('initial')
  const [activeTrace, setActiveTrace] = useState(null)
  const [activeDetection, setActiveDetection] = useState(null)
  const [correlations, setCorrelations] = useState([])
  const [correlateOpen, setCorrelateOpen] = useState(false)
  const [correlated, setCorrelated] = useState(false)
  const [cameras, setCameras] = useState([])
  const [filters, setFilters] = useState({
    camera: 'All',
    confidence: 'All',
    time: 'All',
    direction: 'All',
  })

  useEffect(() => {
    api.get('/vehicles/cameras').then((res) => setCameras(res.data.cameras || [])).catch(() => {})
  }, [])

  const runSearch = async (plate) => {
    setPhase('loading')
    try {
      const res = await api.get(`/vehicles/trace/${encodeURIComponent(plate)}`)
      setActiveTrace(res.data)
      setPhase('result')
    } catch {
      setActiveTrace(null)
      setPhase('not-found')
    }
  }

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))

  useEffect(() => {
    if (!activeTrace) { setCorrelations([]); return }
    let cancelled = false
    api.get(`/vehicles/trace/${encodeURIComponent(activeTrace.plate)}/correlations`)
      .then((res) => { if (!cancelled) setCorrelations(res.data.correlations || []) })
      .catch(() => { if (!cancelled) setCorrelations([]) })
    return () => { cancelled = true }
  }, [activeTrace])

  const supportingIds = useMemo(() => {
    if (!activeTrace) return []
    const ids = activeTrace.sights.map((s) => s.evidenceId)
    correlations.forEach((c) => {
      if (c.evidenceId && !ids.includes(c.evidenceId)) ids.push(c.evidenceId)
    })
    return ids
  }, [activeTrace, correlations])

  const cameraMap = useMemo(() => {
    const m = {}
    cameras.forEach((c) => { m[c.id] = c })
    return m
  }, [cameras])

  const visibleDetections = useMemo(
    () => (activeTrace ? activeTrace.sights.filter((d) => detectionMatches(d, filters)) : []),
    [activeTrace, filters, phase]
  )

  const elapsed = activeTrace ? elapsedStrings(activeTrace.sights) : []

  const CAMERA_OPTIONS = useMemo(() => {
    const cams = cameras.length > 0
      ? cameras.map((c) => ({ value: c.id, label: `${c.id} · ${c.area}` }))
      : (activeTrace ? [...new Set(activeTrace.sights.map((s) => s.camera))].map((c) => ({ value: c, label: c })) : [])
    return [{ value: 'All', label: 'All cameras' }, ...cams]
  }, [cameras, activeTrace])

  const whyFlagged = useMemo(() => {
    if (correlations.length === 0) return []
    return [correlationWhyFlagged(correlations[0])]
  }, [correlations])

  return (
    <PageContainer maxWidth="max-w-[1200px]">
      <PageHeader
        title="VEHICLE MOVEMENT INTELLIGENCE"
        tagline="CCTV-based vehicle trajectory reconstruction using synthetic traffic-camera observations."
        actions={
          <Badge variant="warning" dot>
            DEMONSTRATION DATA — SYNTHETIC / SANITIZED
          </Badge>
        }
      />

      <AlertBanner variant="info" title="Synthetic demonstration environment">
        All vehicle traces, camera records, and map positions are synthetic. No real cameras, plates,
        GPS fixes, or persons are used or shown.
      </AlertBanner>

      {/* Search */}
      <Card bodyClassName="p-4" className="mb-5">
        <VehicleSearchPanel
          onSearch={runSearch}
          onDemo={() => {}}
          loading={phase === 'loading'}
          empty={phase === 'not-found'}
        />
      </Card>

      {/* Phase: loading */}
      {phase === 'loading' && (
        <Card>
          <LoadingState label="SEARCHING SYNTHETIC CAMERA RECORDS…" />
        </Card>
      )}

      {/* Phase: initial */}
      {phase === 'initial' && (
        <Card>
          <EmptyState
            icon={<ScanSearch className="h-6 w-6" aria-hidden="true" />}
            title="SEARCH SYNTHETIC VEHICLE"
            description="No trace selected. Enter a vehicle number plate above to look up synthetic camera records."
          />
        </Card>
      )}

      {/* Phase: not found */}
      {phase === 'not-found' && (
        <Card>
          <EmptyState
            icon={<Car className="h-6 w-6" aria-hidden="true" />}
            title="NO VEHICLE TRACE FOUND"
            description="Try another plate number."
          />
        </Card>
      )}

      {/* Phase: result */}
      {phase === 'result' && activeTrace && (
        <div className="space-y-5">
          {/* Filters */}
          <Card
            title="Detection filters"
            subtitle="Filter the observations shown below"
            icon={<Search className="h-4 w-4" aria-hidden="true" />}
            bodyClassName="p-4"
            status={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ camera: 'All', confidence: 'All', time: 'All', direction: 'All' })}
              >
                Reset
              </Button>
            }
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Select label="Camera" value={filters.camera} onChange={setFilter('camera')} options={CAMERA_OPTIONS} />
              <Select label="Confidence" value={filters.confidence} onChange={setFilter('confidence')} options={CONFIDENCE_OPTIONS} />
              <Select label="Time" value={filters.time} onChange={setFilter('time')} options={TIME_WINDOWS} />
              <Select label="Direction" value={filters.direction} onChange={setFilter('direction')} options={DIRECTION_OPTIONS} />
            </div>
          </Card>

          {/* Trace map + vehicle profile */}
          <div className="grid gap-5 lg:grid-cols-5">
            <Card
              className="lg:col-span-3"
              title="SYNTHETIC CAMERA TRACE"
              subtitle={activeTrace.plate}
              icon={<MapIcon className="h-4 w-4" aria-hidden="true" />}
              bodyClassName="p-4"
            >
              <SyntheticTraceMap trace={activeTrace} cameraMap={cameraMap} />
            </Card>

            <Card
              className="lg:col-span-2"
              title={activeTrace.plate}
              subtitle={`${activeTrace.type} · ${activeTrace.color}`}
              icon={<Car className="h-4 w-4" aria-hidden="true" />}
              status={<StatusBadge status={activeTrace.status} />}
              bodyClassName="p-4"
              footer={
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setCorrelateOpen(true)}>
                    <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Correlate with case
                  </Button>
                </div>
              }
            >
              <dl className="divide-y divide-ink-600/50">
                <ProfileRow label="Plate" value={activeTrace.plate} mono />
                <ProfileRow label="Vehicle type" value={`${activeTrace.type} · ${activeTrace.color}`} />
                <ProfileRow label="First observation" value={activeTrace.firstSeen} mono />
                <ProfileRow label="Last observation" value={activeTrace.lastSeen} mono />
                <ProfileRow label="Sightings" value={String(activeTrace.sights.length)} />
                <ProfileRow label="Duration" value={formatDuration(activeTrace.durationSeconds)} mono />
                <ProfileRow label="Avg confidence" value={activeTrace.confidence} mono />
              </dl>
              <p className="mt-3 rounded-md border border-ink-600/60 bg-ink-800/40 px-3 py-2 text-xs text-slate-400">
                Synthetic trace reconstructed from camera observations only. It does not identify a
                driver or assert ownership.
              </p>
            </Card>
          </div>

          {/* Movement timeline */}
          <Card
            title="VEHICLE MOVEMENT TIMELINE"
            subtitle="Sequential synthetic observations with elapsed gaps"
            icon={<Clock className="h-4 w-4" aria-hidden="true" />}
            bodyClassName="p-4"
          >
            <ol className="space-y-0">
              {activeTrace.sights.map((d, i) => (
                <li key={d.id} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < activeTrace.sights.length - 1 && (
                    <span className="absolute left-[7px] top-4 h-full w-px bg-ink-600" aria-hidden="true" />
                  )}
                  <span
                    className={
                      i === 0
                        ? 'mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-cyan-brand bg-cyan-brand/30'
                        : i === activeTrace.sights.length - 1
                          ? 'mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-amber-400 bg-amber-400/30'
                          : 'mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-ink-500 bg-ink-700'
                    }
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveDetection(d)}
                        className="font-mono text-sm font-medium text-cyan-200 hover:text-cyan-100 hover:underline"
                      >
                        {d.time}
                      </button>
                      <span className="text-xs text-slate-400">Camera {d.camera}</span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-300">{d.area}</span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="font-mono text-xs text-slate-400">{d.directionShort}</span>
                      {i > 0 && (
                        <span className="ml-auto rounded border border-ink-600 bg-ink-700/50 px-1.5 py-0.5 font-mono text-[10px] text-cyan-200">
                          elapsed {elapsed[i - 1]}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {/* Route summary */}
          <Card
            title="ROUTE SUMMARY"
            subtitle="Observation-only route reconstruction"
            icon={<RouteIcon className="h-4 w-4" aria-hidden="true" />}
            bodyClassName="p-4"
          >
            <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['First seen', activeTrace.sights[0].area],
                ['Last seen', activeTrace.sights[activeTrace.sights.length - 1].area],
                ['Cameras', String(activeTrace.sights.length)],
                ['Duration', formatDuration(activeTrace.durationSeconds)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-ink-600/70 bg-ink-800/40 px-3 py-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{k}</dt>
                  <dd className="mt-0.5 text-sm text-slate-100">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap items-center gap-2">
              {activeTrace.sights.map((s, i) => (
                <span key={s.id} className="inline-flex items-center gap-2">
                  <span className="rounded-md border border-ink-600 bg-ink-800/60 px-2 py-1 text-xs text-slate-200">
                    {s.area}
                    <span className="ml-2 font-mono text-[10px] text-slate-500">{s.directionShort}</span>
                  </span>
                  {i < activeTrace.sights.length - 1 && (
                    <span className="text-slate-500" aria-hidden="true">
                      →
                    </span>
                  )}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Observed direction sequence only — the route does not infer a destination or journey intent.
            </p>
          </Card>

          {/* Detection cards */}
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-100">
                CCTV detections
              </h2>
              <span className="rounded border border-ink-600 bg-ink-700/50 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                {visibleDetections.length} shown
              </span>
            </div>
            {visibleDetections.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {visibleDetections.map((d, i) => (
                  <CctvDetectionCard
                    key={d.id}
                    detection={d}
                    vehiclePlate={activeTrace.plate}
                    index={i}
                    onInspect={setActiveDetection}
                    cameraMeta={cameraMap[d.camera]}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <EmptyState
                  icon={<Search className="h-6 w-6" aria-hidden="true" />}
                  title="No detections match"
                  description="Adjust the camera, confidence, time, or direction filters to widen the results."
                />
              </Card>
            )}
          </div>

          {/* Cross-source correlation */}
          <Card
            title="CROSS-SOURCE CORRELATION"
            subtitle="Observations aligned with independent source records"
            icon={<Link2 className="h-4 w-4" aria-hidden="true" />}
            bodyClassName="p-4"
          >
            {correlations.length ? (
              <CrossSourceCorrelation
                vehicle={activeTrace}
                correlations={correlations}
                whyFlagged={whyFlagged}
              />
            ) : (
              <p className="rounded-lg border border-ink-600/60 bg-ink-800/30 px-3 py-2.5 text-sm text-slate-400">
                No cross-source correlations are flagged for this trace yet.
              </p>
            )}
          </Card>

          {/* Supporting evidence */}
          <Card
            title="SUPPORTING EVIDENCE"
            subtitle={`${supportingIds.length} source records in the shared evidence drawer`}
            icon={<FolderSearch className="h-4 w-4" aria-hidden="true" />}
            bodyClassName="p-4"
          >
            <div className="flex flex-wrap gap-1.5">
              {supportingIds.map((id) => (
                <EvidenceChip key={id} id={id} />
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              CCTV observation records and surrounding source records in the shared evidence drawer.
            </p>
          </Card>

          {/* Investigator review */}
          <Card
            title="INVESTIGATOR REVIEW"
            subtitle="Frontend-only acknowledgement — no data is stored"
            icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            bodyClassName="p-4"
          >
            <VehicleReviewChecklist />
          </Card>
        </div>
      )}

      {/* Correlate with case modal */}
      {correlateOpen && activeTrace && (
        <CorrelateModal
          vehicle={activeTrace}
          correlated={correlated}
          onClose={() => setCorrelateOpen(false)}
          onAdd={() => setCorrelated(true)}
        />
      )}

      <CctvDetectionDrawer
        open={Boolean(activeDetection)}
        onClose={() => setActiveDetection(null)}
        detection={activeDetection}
        vehiclePlate={activeTrace?.plate || ''}
      />

      <p className="mt-6 rounded-md border border-ink-600/60 bg-ink-800/40 px-3 py-2 text-xs text-slate-500">
        Vehicle Movement Intelligence is a synthetic analytical workspace. Results require independent
        investigator verification and do not assert ownership, destination, or guilt.
      </p>
    </PageContainer>
  )
}

/* Correlate-with-case modal (existing Modal primitives). */
const CorrelateModal = ({ vehicle, correlated, onClose, onAdd }) => {
  return (
    <Modal
      title="Correlate with case"
      onClose={onClose}
      footer={
        correlated ? (
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={onAdd}>
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              Add to case
            </Button>
          </>
        )
      }
    >
{correlated ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-cyan-brand/30 bg-cyan-brand/10 px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-cyan-brand" aria-hidden="true" />
              <p className="text-sm font-semibold text-cyan-200">VEHICLE ADDED TO CASE</p>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <AlertOctagon className="h-3.5 w-3.5" aria-hidden="true" />
              Relationship {vehicle.plate} → CCTV sightings is synthetic. No ownership implication is implied.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <dl className="divide-y divide-ink-600/50 rounded-md border border-ink-600/70 bg-ink-800/40 px-4 text-sm">
              <ProfileRow label="Vehicle" value={vehicle.plate} mono />
              <ProfileRow label="Type" value={`${vehicle.type} · ${vehicle.color}`} />
              <ProfileRow label="First seen" value={vehicle.firstSeen} mono />
              <ProfileRow label="Last seen" value={vehicle.lastSeen} mono />
            </dl>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <AlertOctagon className="h-3.5 w-3.5" aria-hidden="true" />
              Adds a synthetic correlation record to the case workspace. No ownership implication.
            </p>
</div>
        )}
      </Modal>
    )
  }

/* Investigator review checklist. */
const VehicleReviewChecklist = () => {
  const [checked, setChecked] = useState({})
  const items = [
    'CCTV sightings inspected with their source records',
    'Vehicle trace reviewed against camera coverage',
    'Cross-source correlation reviewed and understood as potential',
    'Supporting evidence opened and examined',
  ]
  return (
    <div className="space-y-2.5">
      {items.map((label) => (
        <label
          key={label}
          className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-200"
        >
          <input
            type="checkbox"
            checked={Boolean(checked[label])}
            onChange={() => setChecked((c) => ({ ...c, [label]: !c[label] }))}
            className="mt-0.5 h-4 w-4 accent-cyan-brand"
          />
          {label}
        </label>
      ))}
      <p className="pt-1 text-xs text-slate-500">
        Frontend-only acknowledgement. No responses are stored or transmitted.
      </p>
    </div>
  )
}

/* Lightweight checklist helper stays in this file. */
export default VehicleIntelligence
