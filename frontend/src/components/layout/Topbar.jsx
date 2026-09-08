import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut } from 'lucide-react'
import { getUser, logout } from '../../services/auth.js'
import { humanEntitySlug } from '../../config/entityMeta.js'
import GlobalSearch from '../search/GlobalSearch.jsx'

const PAGE_META = {
  '/dashboard': {
    crumb: 'Dashboard',
    subtitle: 'Overview of active investigations and analytical leads',
  },
  '/cases': { crumb: 'Cases', subtitle: 'Investigation case list' },
  '/audit': { crumb: 'Audit Logs', subtitle: 'System audit trail' },
  '/vehicle-intelligence': {
    crumb: 'Vehicle Intelligence',
    subtitle: 'CCTV vehicle trajectory reconstruction',
  },
}

function buildBreadcrumbs(pathname) {
  const parts = pathname.split('/').filter(Boolean)
  const crumbs = []
  const labels = {
    dashboard: 'Dashboard',
    cases: 'Cases',
    new: 'New Case',
    graph: 'CaseGraph',
    timeline: 'CrimeTimeline',
    alerts: 'Alerts',
    contradictions: 'Contradictions',
    evidence: 'Evidence',
    reports: 'Reports',
    audit: 'Audit Logs',
    entities: 'Entities',
    'cross-case': 'Cross-Case Intelligence',
    'vehicle-intelligence': 'Vehicle Intelligence',
  }
  parts.forEach((part, i) => {
    let label = labels[part] || (i === 1 ? `Case #${part}` : part)
    if (i > 0 && parts[0] === 'entities' && !labels[part]) {
      label = part === 'cross-case' ? 'Cross-Case Intelligence' : humanEntitySlug(part)
    }
    crumbs.push({ label })
  })
  return crumbs
}

const Topbar = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = getUser()
  const crumbs = buildBreadcrumbs(pathname)
  const meta = PAGE_META[pathname]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const title = meta ? meta.crumb : crumbs[crumbs.length - 1]?.label || 'FORENSIGHT'

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-ink-600/70 bg-ink-900 px-5">
      {/* Left: title + subtitle */}
      <div className="min-w-0 max-w-[200px]">
        <h1 className="truncate text-sm font-semibold text-slate-100">{title}</h1>
        {meta?.subtitle && (
          <p className="hidden truncate text-xs text-slate-400 md:block">
            {meta.subtitle}
          </p>
        )}
      </div>

      {/* Center: global investigation search */}
      <div className="flex min-w-0 flex-1 justify-center px-2">
        <GlobalSearch />
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications — view audit trail"
          onClick={() => navigate('/audit')}
          className="relative rounded-md p-2 text-slate-400 transition-colors hover:bg-ink-700 hover:text-slate-100"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
        </button>

        <div className="h-6 w-px bg-ink-600/70" />

        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-700 text-xs font-semibold text-cyan-200 ring-1 ring-ink-600"
            aria-hidden="true"
          >
            {user?.initials || 'US'}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium text-slate-100">{user?.name || 'User'}</p>
            <p className="text-[10px] uppercase tracking-wider text-cyan-brand/70">
              {user?.role || ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          aria-label="Sign out"
          className="rounded-md p-2 text-slate-400 transition-colors hover:bg-ink-700 hover:text-red-300"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}

export default Topbar
