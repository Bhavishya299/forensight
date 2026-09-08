import { X } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { ENTITY_TYPES } from './entityMeta.js'

/*
 * Relationship-type filter groups mapped onto the raw relationship keys
 * used by the graph edge dataset.
 */
export const RELATIONSHIP_FILTERS = [
  { key: 'calls', label: 'Calls', matches: ['CALL'] },
  { key: 'transfers', label: 'Transfers', matches: ['TRANSFERRED'] },
  { key: 'access', label: 'Access', matches: ['ACCESSED'] },
  { key: 'location', label: 'Location', matches: ['LOCATED_AT', 'ACTIVITY_AT'] },
  { key: 'mentions', label: 'Mentions', matches: ['MENTIONED'] },
  { key: 'associations', label: 'Associations', matches: ['ASSOCIATED', 'CONNECTED_TO'] },
  { key: 'observations', label: 'CCTV Observations', matches: ['OBSERVED_BY'] },
]

export const DEFAULT_ENTITY_STATE = Object.fromEntries(ENTITY_TYPES.map((t) => [t.key, true]))
export const DEFAULT_RELATIONSHIP_STATE = Object.fromEntries(
  RELATIONSHIP_FILTERS.map((r) => [r.key, true])
)

export const GRAPH_SOURCE_OPTIONS = [
  { value: 'All', label: 'All sources' },
  { value: 'CDR', label: 'CDR' },
  { value: 'IPDR', label: 'IPDR' },
  { value: 'BANKING', label: 'Banking' },
  { value: 'OSINT', label: 'Social' },
  { value: 'DEVICE', label: 'Device' },
  { value: 'CCTV', label: 'CCTV' },
]

export function relationshipMatches(edge, relationshipState) {
  const group = RELATIONSHIP_FILTERS.find((r) => r.matches.includes(edge.relationship))
  return group ? relationshipState[group.key] : true
}

/*
 * Slide-in filter panel over the graph viewport.
 * All controls drive React state and immediately affect the graph.
 */
const GraphFiltersPanel = ({
  open,
  onClose,
  entityState,
  relationshipState,
  source,
  onToggleEntity,
  onToggleRelationship,
  onSourceChange,
  onReset,
}) => {
  if (!open) return null

  return (
    <div className="absolute inset-y-0 left-0 z-20 flex w-72 max-w-[85%] flex-col border-r border-ink-600/70 bg-ink-900/95 shadow-xl backdrop-blur-sm">
      <header className="flex items-center justify-between border-b border-ink-600/70 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-100">
          Graph filters
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close graph filters">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <fieldset>
          <legend className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Entity types
          </legend>
          <ul className="space-y-2">
            {ENTITY_TYPES.map((t) => (
              <li key={t.key}>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={entityState[t.key]}
                    onChange={() => onToggleEntity(t.key)}
                    className="h-4 w-4 accent-cyan-brand"
                  />
                  {t.plural}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Relationship types
          </legend>
          <ul className="space-y-2">
            {RELATIONSHIP_FILTERS.map((r) => (
              <li key={r.key}>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={relationshipState[r.key]}
                    onChange={() => onToggleRelationship(r.key)}
                    className="h-4 w-4 accent-cyan-brand"
                  />
                  {r.label}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Source
          </legend>
          <select
            value={source}
            onChange={(e) => onSourceChange(e.target.value)}
            className="h-9 w-full rounded-md border border-ink-600 bg-ink-700/40 px-3 text-sm text-slate-100 transition-colors focus:border-cyan-brand/60 focus:outline-none focus:ring-1 focus:ring-cyan-brand/40"
            aria-label="Filter by source"
          >
            {GRAPH_SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-ink-800">
                {o.label}
              </option>
            ))}
          </select>
        </fieldset>
      </div>

      <footer className="border-t border-ink-600/70 px-4 py-3">
        <Button variant="outline" size="sm" onClick={onReset} className="w-full">
          Reset view defaults
        </Button>
      </footer>
    </div>
  )
}

export default GraphFiltersPanel