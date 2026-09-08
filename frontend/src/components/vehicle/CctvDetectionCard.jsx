import { Eye } from 'lucide-react'
import CctvFrame from './CctvFrame.jsx'

/*
 * Confidence indicator — width + numeric label so the value is never
 * communicated by color alone.
 */
export const ConfidenceBar = ({ label, value }) => {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-slate-500">
        <span>{label}</span>
        <span className="font-mono text-slate-200">{value}%</span>
      </div>
      <div
        className="h-1.5 rounded-full bg-ink-700"
        role="meter"
        aria-label={`${label} ${value} percent`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div
          className="h-1.5 rounded-full bg-cyan-brand"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}

/*
 * One synthetic CCTV detection card. Clicking the action opens the
 * detection detail drawer.
 */
const CctvDetectionCard = ({ detection, vehiclePlate, onInspect, index, cameraMeta }) => {
  const cam = cameraMeta || null
  return (
    <article className="rounded-lg border border-ink-600/70 bg-ink-850 p-3">
      <CctvFrame
        camera={`CAMERA ${detection.camera}`}
        area={detection.area}
        time={detection.time}
        plate={vehiclePlate}
        detectionId={detection.id}
        className="h-full min-h-[180px]"
      />
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[10px] uppercase tracking-widest text-slate-500">Time</dt>
          <dd className="font-mono text-xs text-slate-100">{detection.time}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[10px] uppercase tracking-widest text-slate-500">Location</dt>
          <dd className="text-right text-xs text-slate-200">{detection.area}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[10px] uppercase tracking-widest text-slate-500">Direction</dt>
          <dd className="font-mono text-xs text-slate-100">{detection.directionShort}</dd>
        </div>
        {cam && (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[10px] uppercase tracking-widest text-slate-500">Sector</dt>
            <dd className="text-right text-xs text-slate-300">{cam.sector}</dd>
          </div>
        )}
      </dl>
      <div className="mt-3 space-y-2.5">
        <ConfidenceBar label="Plate recognition" value={detection.plateConfidence} />
        <ConfidenceBar label="Vehicle match" value={detection.matchConfidence} />
      </div>
      <button
        type="button"
        onClick={() => onInspect(detection)}
        className="mt-3 inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border border-cyan-brand/40 bg-transparent text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-brand/10"
      >
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        Inspect detection {index + 1}
      </button>
    </article>
  )
}

export default CctvDetectionCard