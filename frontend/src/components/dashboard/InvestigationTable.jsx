import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, FolderOpen, Files } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'
import EmptyState from '../ui/EmptyState.jsx'

/*
 * Data source icon tint per source count is not needed; this table
 * presents active investigations with a "View case" action that
 * routes to /cases/:id.
 */
const InvestigationTable = ({ investigations = [] }) => {
  const navigate = useNavigate()

  return (
    <Card title="Active Investigations" subtitle="Open investigations and analytical leads">
      {investigations.length === 0 ? (
        <EmptyState
          icon={<Files className="h-6 w-6" aria-hidden="true" />}
          title="No active investigations"
          description="Open or create a case to start building an investigation workspace."
          action={
            <Button variant="outline" size="sm" onClick={() => navigate('/cases')}>
              View cases
            </Button>
          }
        />
      ) : (
      <div className="-mx-4 -my-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-600/70 text-left">
                {['Case', 'Investigation', 'Sources', 'Alerts', 'Status', 'Last Activity', 'Action'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {investigations.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-ink-600/50 last:border-0 transition-colors hover:bg-ink-700/40"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-cyan-brand">#{c.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-slate-200">
                      <FolderOpen className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      {c.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{c.sources}</td>
                  <td className="px-4 py-3 text-slate-300">{c.alerts}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-400">{c.lastActivity}</td>
                  <td className="px-4 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/cases/${c.id}`)}
                    >
                      View case
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </Card>
  )
}

export default InvestigationTable
