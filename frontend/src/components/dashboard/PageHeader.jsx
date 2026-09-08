/*
 * Page header with title, tagline, and an actions area.
 * Used at the top of dashboard pages.
 */
const PageHeader = ({ title, tagline, actions, className = '' }) => {
  return (
    <div className={`mb-5 flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div>
        <h1 className="text-lg font-semibold tracking-wide text-slate-100">
          {title}
        </h1>
        {tagline && (
          <p className="mt-0.5 text-sm text-slate-400">{tagline}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export default PageHeader
