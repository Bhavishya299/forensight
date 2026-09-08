import { NavLink, useParams } from 'react-router-dom'
import { ShieldHalf, ChevronLeft, ChevronRight } from 'lucide-react'
import { NAV_SECTIONS } from './navigation.js'
import { getUser } from '../../services/auth.js'
import Button from '../ui/Button.jsx'

/*
 * Builds the full path for a nav item. Case-scoped items live under
 * the currently viewed case (e.g. /cases/:id/graph). When no case is
 * active they are disabled (no demo fallback — the app starts empty).
 */
function resolvePath(item, caseId) {
  if (item.caseScoped) {
    return caseId ? `/cases/${caseId}${item.to}` : null
  }
  return item.to
}

const Sidebar = ({ collapsed, onToggleCollapse }) => {
  const { id } = useParams()
  const user = getUser()

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-ink-600/70 bg-ink-900 transition-[width] duration-150 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand */}
      <div className="flex items-center justify-center border-b border-ink-600/70 px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-cyan-brand/30 to-cyan-brand/10 text-cyan-brand ring-1 ring-cyan-brand/30">
          <ShieldHalf className="h-5 w-5" aria-hidden="true" />
        </div>
        {!collapsed && (
          <div className="ml-3 leading-tight">
            <p className="text-sm font-bold tracking-widest text-slate-100">
              FORENSIGHT
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-brand/80">
              Multi-Source Analytics
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Main navigation">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className={collapsed ? 'mb-3' : 'mb-5'}>
            {!collapsed && (
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {section.label}
              </p>
            )}
            <ul className={collapsed ? 'space-y-1' : 'space-y-0.5'}>
              {section.items.map((item) => {
                const Icon = item.icon
                const to = resolvePath(item, id)
                return (
                  <li key={item.label} className="relative">
                    <NavLink
                      to={to || '/cases'}
                      title={item.label}
                      aria-label={item.label}
                      aria-disabled={!to}
                      tabIndex={to ? 0 : -1}
                      className={({ isActive }) =>
                        [
                          'flex items-center rounded-md text-sm font-medium transition-colors',
                          collapsed ? 'justify-center px-1 py-2' : 'gap-2.5 px-2.5 py-2',
                          !to ? 'cursor-not-allowed text-slate-600' : '',
                          isActive && to
                            ? 'bg-cyan-brand/10 text-cyan-100 ring-1 ring-cyan-brand/20'
                            : 'text-slate-400 hover:bg-ink-700/60 hover:text-slate-100',
                        ].join(' ')
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom: user + collapse */}
      <div className="border-t border-ink-600/70 px-3 py-3">
        {!collapsed && user && (
          <div className="mb-3 flex items-center gap-2.5 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-700 text-xs font-semibold text-slate-100">
              {user.initials}
            </div>
            <div className="leading-tight">
              <p className="text-xs font-medium text-slate-200">{user.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-cyan-brand/70">
                {user.role}
              </p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'md'}
          onClick={onToggleCollapse}
          className="w-full"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}

export default Sidebar
