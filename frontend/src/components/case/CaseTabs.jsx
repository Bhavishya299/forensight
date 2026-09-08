import { NavLink } from 'react-router-dom'

/*
 * Tab navigation for a case workspace. The Overview tab maps to the
 * index route of /cases/:id; every other tab is a nested route.
 */
const TAB_ITEMS = [
  { to: '', label: 'Overview', end: true },
  { to: 'graph', label: 'Graph' },
  { to: 'timeline', label: 'Timeline' },
  { to: 'alerts', label: 'Alerts' },
  { to: 'contradictions', label: 'Contradictions' },
  { to: 'evidence', label: 'Evidence' },
  { to: 'reports', label: 'Reports' },
]

const CaseTabs = ({ caseId }) => {
  const base = `/cases/${caseId}`
  return (
    <nav aria-label="Case sections" className="flex overflow-x-auto">
      {TAB_ITEMS.map((tab) => (
        <NavLink
          key={tab.to || 'overview'}
          to={tab.end ? base : `${base}/${tab.to}`}
          end={tab.end}
          className={({ isActive }) =>
            [
              'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-cyan-brand text-cyan-100'
                : 'border-transparent text-slate-400 hover:border-ink-600 hover:text-slate-200',
            ].join(' ')
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default CaseTabs