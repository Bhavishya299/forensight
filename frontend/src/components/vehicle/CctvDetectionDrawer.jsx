import { FileSearch } from 'lucide-react'
import Drawer from '../ui/Drawer.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import SourceBadge from '../common/SourceBadge.jsx'
import CctvFrame from './CctvFrame.jsx'
import { ConfidenceBar } from './CctvDetectionCard.jsx'

/*
 * Detail drawer for a single synthetic CCTV detection. Shows the demo
 * frame placeholder, labeled observation fields, and neutral language
 * about what the plate observation does and does not prove.
 */
const CctvDetectionDrawer = ({ open, onClose, detection, vehiclePlate, onOpenEvidence }) => {
  if (!detection) return null

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="CCTV detection"
      width="max-w-lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-md border border-ink-600/60 bg-ink-800/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Demonstration data — synthetic / sanitized
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button size="sm" onClick={() => onOpenEvidence?.(detection.evidenceId)}>
              <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
              Open evidence record
            </Button>
          </div>
        </div>
      }
    >
      <CctvFrame
        camera={`CAMERA ${detection.camera}`}
        area={detection.area}
        time={detection.time}
        plate={vehiclePlate}
        detectionId={detection.id}
        className="mb-4 min-h-[200px]"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="neutral">{detection.id}</Badge>
        <SourceBadge source={detection.source} />
        <Badge variant="brand">OBSERVED</Badge>
      </div>

      {/* Observation fields */}
      <section className="mb-4" aria-label="Detection details">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Detection details
        </div>
        <dl className="divide-y divide-ink-600/50 rounded-md border border-ink-600/70 bg-ink-800/40 px-4 text-sm">
          {[
            ['Detection ID', detection.id],
            ['Vehicle', vehiclePlate],
            ['Camera', `${detection.camera} · ${detection.cameraName}`],
            ['Location', detection.location],
            ['Timestamp', detection.time],
            ['Direction', detection.direction],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-2">
              <dt className="text-slate-400">{k}</dt>
              <dd className="max-w-[60%] truncate text-right font-mono text-slate-200">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mb-4" aria-label="Confidence">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Recognition confidence
        </div>
        <div className="space-y-3 rounded-md border border-ink-600/70 bg-ink-800/40 px-4 py-3">
          <ConfidenceBar label="Plate recognition confidence" value={detection.plateConfidence} />
          <ConfidenceBar label="Vehicle match confidence" value={detection.matchConfidence} />
        </div>
      </section>

      <p className="rounded-md border border-ink-600/60 bg-ink-800/40 px-3 py-2.5 text-sm text-slate-400">
        Vehicle plate was observed in the synthetic camera record. This observation does not prove
        vehicle ownership or driver identity.
      </p>
    </Drawer>
  )
}

export default CctvDetectionDrawer