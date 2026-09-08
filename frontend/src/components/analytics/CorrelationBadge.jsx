/*
 * Small badge used to label prototype analytical outputs.
 * The wording never claims production accuracy or detection certainty.
 */
const CorrelationBadge = ({ children = 'Prototype correlation' }) => {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-brand/30 bg-cyan-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cyan-brand" />
      {children}
    </span>
  )
}

export default CorrelationBadge