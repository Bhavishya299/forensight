import { FileSearch } from 'lucide-react'

/*
 * Clickable evidence-ID chip used across the graph and timeline to open
 * the shared Evidence Detail drawer.
 */
const EvidenceChip = ({ id, onOpen, theme = 'default' }) => {
  const themes = {
    default: 'border-cyan-brand/30 bg-cyan-brand/10 text-cyan-200 hover:bg-cyan-brand/20',
    accent: 'border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20',
    faint: 'border-ink-600 bg-ink-700/50 text-slate-300 hover:bg-ink-700',
  }
  return (
    <button
      type="button"
      onClick={() => onOpen?.(id)}
      title={`Open evidence ${id}`}
      className={[
        'inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs transition-colors cursor-pointer',
        themes[theme] || themes.default,
      ].join(' ')}
    >
      <FileSearch className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{id}</span>
    </button>
  )
}

export default EvidenceChip