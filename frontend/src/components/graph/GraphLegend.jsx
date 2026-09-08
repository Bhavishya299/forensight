import { ENTITY_TYPES } from './entityMeta.js'

/*
 * Compact graph legend for entity types and relationship types.
 * Unobtrusive overlay used inside the graph viewport.
 */
const GraphLegend = ({ className = '' }) => {
  return (
    <div className={`pointer-events-none space-y-3 ${className}`}>
      <div className="space-y-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
          Entity types
        </p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {ENTITY_TYPES.map((t) => {
            const Icon = t.icon
            return (
              <li key={t.key} className="flex items-center gap-1.5 text-[10px] text-slate-300">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm">
                  <Icon className={`h-3 w-3 ${t.dot}`} aria-hidden="true" />
                </span>
                {t.plural}
              </li>
            )
          })}
        </ul>
      </div>
      <div>
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-slate-400">
          Relationships
        </p>
        <ul className="space-y-1 text-[10px] text-slate-300">
          <li><span className="mr-1.5 inline-block h-px w-4 bg-slate-500 align-middle" />Call · Transfer</li>
          <li><span className="mr-1.5 inline-block h-px w-4 bg-slate-500 align-middle" />Access · Location</li>
          <li><span className="mr-1.5 inline-block h-px w-4 bg-slate-500 align-middle" />Mention · Association</li>
          <li><span className="mr-1.5 inline-block h-px w-4 bg-teal-brand align-middle" />Cross-source link</li>
        </ul>
      </div>
    </div>
  )
}

export default GraphLegend