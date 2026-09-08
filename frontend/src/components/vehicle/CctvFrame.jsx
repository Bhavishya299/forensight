import { Cctv, ScanLine } from 'lucide-react'

/*
 * Placeholder representing a synthetic traffic-CCTV frame. Always
 * labeled as a demonstration frame — it never shows real footage.
 */
const CctvFrame = ({ camera, time, plate, area, detectionId = '', className = '' }) => {
  return (
    <div
      className={`relative overflow-hidden rounded-md border border-ink-600 bg-ink-950 ${className}`}
      role="img"
      aria-label={`Synthetic CCTV demonstration frame for camera ${camera} at ${time}`}
    >
      {/* Scan / grid backdrop */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(56,189,248,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.12) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/4 animate-pulse bg-gradient-to-b from-transparent via-cyan-brand/20 to-transparent"
        aria-hidden="true"
      />

      {/* Center content */}
      <div className="relative flex h-full min-h-[240px] flex-col items-center justify-center gap-2 p-4 text-center">
        <Cctv className="h-8 w-8 text-cyan-brand/70" strokeWidth={1.5} aria-hidden="true" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
          Traffic CCTV
        </p>
        <p className="font-mono text-sm font-semibold text-cyan-200">
          {camera || '—'}
          {area && <span className="ml-2 text-slate-400">{area}</span>}
        </p>
        <p className="font-mono text-xs text-slate-400">{time || '—'}</p>
        {plate && (
          <span className="mt-2 inline-flex items-center gap-2 rounded border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-mono text-sm tracking-widest text-amber-200">
            <ScanLine className="h-3.5 w-3.5" aria-hidden="true" />
            {plate}
          </span>
        )}
        {detectionId && (
          <p className="mt-1 font-mono text-[10px] text-slate-500">DETECTION {detectionId}</p>
        )}
        <span className="absolute bottom-2 right-2 rounded-sm bg-ink-800/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
          Synthetic demonstration frame
        </span>
        <span className="absolute bottom-2 left-2 font-mono text-[9px] uppercase tracking-widest text-slate-600">
          DEMO
        </span>
      </div>
    </div>
  )
}

export default CctvFrame