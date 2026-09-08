import { ArrowDown } from 'lucide-react'

/*
 * Compact vertical evidence chain demonstrating traceability:
 * ALERT → EVENT → ENTITY → EVIDENCE → SOURCE.
 *
 * Each step is rendered as a labelled card connected by a small
 * downward arrow. Kept intentionally simple — this is not the CaseGraph.
 */
const EvidenceChain = ({ steps = [] }) => {
  if (!steps.length) return null
  return (
    <ol className="space-y-1" aria-label="Evidence traceability chain">
      {steps.map((step, i) => {
        const Icon = step.icon
        return (
          <li key={i} className="flex flex-col">
            {i > 0 && (
              <div className="flex justify-center py-0.5" aria-hidden="true">
                <ArrowDown className="h-3 w-3 text-slate-500" />
              </div>
            )}
            <div className="flex items-center gap-2.5 rounded-md border border-ink-600/70 bg-ink-800/40 px-3 py-2">
              {Icon && step.iconClasses && (
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${step.iconClasses || 'bg-ink-700 text-slate-300'}`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {step.label}
                </p>
                <p className="truncate text-sm font-medium text-slate-200">{step.value}</p>
                {step.detail && (
                  <p className="truncate text-xs text-slate-400">{step.detail}</p>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default EvidenceChain