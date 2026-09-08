import { Check } from 'lucide-react'
import { SOURCE_META } from '../../config/sourceMeta.js'

/*
 * Cross-source corroboration indicator.
 *
 * Shows which independent synthetic source types support a lead.
 * Neutral wording only — "corroborating synthetic records", never proof.
 */
const CrossSourceCorroboration = ({ sourceTypes = [], noteClass = 'text-xs text-slate-400' }) => {
  if (!sourceTypes.length) return null
  return (
    <div>
      <p className={`${noteClass} mb-2 font-semibold uppercase tracking-widest text-[10px]`}>
        Corroborating synthetic records
      </p>
      <div className="flex flex-wrap gap-2">
        {sourceTypes.map((key) => {
          const meta = SOURCE_META[key]
          if (!meta) return null
          const Icon = meta.icon
          return (
            <span
              key={key}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${meta.classes}`}
            >
              <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {meta.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default CrossSourceCorroboration