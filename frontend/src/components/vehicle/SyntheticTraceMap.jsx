import { MapPin } from 'lucide-react'

/*
 * Illustrative, non-geographic route reconstruction over a stylized
 * demo grid. Camera markers are positioned with relative percentages.
 * This is NOT a live map and never uses real geographic coordinates.
 */
const SyntheticTraceMap = ({ trace, cameraMap = {} }) => {
  const ordered = trace.sights
  const points = ordered.map((s, idx) => {
    const fallback = cameraMap[s.camera] || null
    return {
      cam: fallback || { id: s.camera, area: s.area, position: { x: 15 + idx * 20, y: 20 + (idx % 2) * 30 } },
      time: s.timeShort,
      direction: s.directionShort,
    }
  })

  // Polyline across the sequential camera markers (percent space).
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cam.position.x} ${p.cam.position.y}`)
    .join(' ')

  // Midpoint arrow markers between consecutive cameras.
  const arrows = points.slice(0, -1).map((p, i) => {
    const a = points[i]
    const b = points[i + 1]
    const mx = (a.cam.position.x + b.cam.position.x) / 2
    const my = (a.cam.position.y + b.cam.position.y) / 2
    const angle = (Math.atan2(b.cam.position.y - a.cam.position.y, b.cam.position.x - a.cam.position.x) * 180) / Math.PI
    return { mx, my, angle }
  })

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg border border-ink-600/70 bg-ink-950">
        {/* Grid backdrop */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'linear-gradient(rgba(56,189,248,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.08) 1px, transparent 1px)',
            backgroundSize: '34px 34px',
          }}
          aria-hidden="true"
        />
        {/* Road-like bands */}
        <div
          className="absolute inset-x-0 top-1/3 h-20 -rotate-6 rounded-full bg-slate-800/60"
          aria-hidden="true"
        />
        <div
          className="absolute inset-y-0 left-1/2 w-24 -rotate-12 rounded-full bg-slate-800/60"
          aria-hidden="true"
        />

        {/* Route polyline */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path
            d={path}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="0.7"
            strokeDasharray="1.6 1.4"
            vectorEffect="non-scaling-stroke"
          />
          {arrows.map((arrow, i) => (
            <g key={i} transform={`translate(${arrow.mx} ${arrow.my}) rotate(${arrow.angle + 90})`}>
              <path d="M -1.4 2.2 L 0 -2.2 L 1.4 2.2 Z" fill="#38bdf8" />
            </g>
          ))}
        </svg>

        {/* Camera markers */}
        {points.map((p, i) => (
          <div
            key={p.cam.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.cam.position.x}%`, top: `${p.cam.position.y}%` }}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-cyan-brand/60 bg-cyan-brand/20 ring-2 ring-ink-900">
              <MapPin className="h-2.5 w-2.5 text-cyan-200" aria-hidden="true" />
            </span>
            <div className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded border border-ink-600 bg-ink-800/95 px-2 py-1 text-center shadow">
              <p className="font-mono text-[10px] font-semibold text-cyan-200">CAMERA {p.cam.id}</p>
              <p className="text-[9px] text-slate-400">{p.cam.area}</p>
              <p className="font-mono text-[10px] text-slate-200">
                {p.time} <span className="text-slate-500">·</span> {p.direction}
              </p>
            </div>
            {i === 0 && (
              <span className="absolute -top-3 right-0 rounded-sm bg-cyan-brand px-1 py-px text-[8px] font-bold uppercase tracking-widest text-ink-950">
                Start
              </span>
            )}
            {i === points.length - 1 && (
              <span className="absolute -bottom-3 right-0 rounded-sm bg-amber-400 px-1 py-px text-[8px] font-bold uppercase tracking-widest text-ink-950">
                Last
              </span>
            )}
          </div>
        ))}

        <div className="pointer-events-none absolute bottom-2 right-2 rounded-sm bg-ink-800/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
          Synthetic demo grid — not a live map
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Illustrative route reconstruction from synthetic camera observations — not a live geographic position.
      </p>
    </div>
  )
}

export default SyntheticTraceMap