/*
 * Compact intelligence metric card.
 * Displays a small icon, uppercase label, value, and contextual note.
 */
const DashboardStatCard = ({ icon, label, value, note, tone = 'cyan' }) => {
  const tones = {
    cyan: 'text-cyan-brand',
    teal: 'text-teal-brand',
    amber: 'text-amber-300',
    red: 'text-red-300',
    slate: 'text-slate-200',
  }

  return (
    <div className="rounded-lg border border-ink-600/70 bg-ink-850 p-4 transition-colors duration-150 hover:border-cyan-brand/30 hover:bg-ink-800">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          {label}
        </span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-md bg-ink-700 ${tones[tone]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold leading-none text-slate-100">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-400">{note}</p>
    </div>
  )
}

export default DashboardStatCard
