import { ServerCog } from 'lucide-react'
import Card from '../ui/Card.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'
import EmptyState from '../ui/EmptyState.jsx'

const SystemStatus = ({ status = [] }) => {
  return (
    <Card
      title="System Status"
      subtitle="Platform subsystem readiness"
      icon={<ServerCog className="h-4 w-4" aria-hidden="true" />}
    >
      {status.length === 0 ? (
        <EmptyState
          icon={<ServerCog className="h-6 w-6" aria-hidden="true" />}
          title="No system status data"
          description="Subsystem readiness indicators will appear here."
        />
      ) : (
      <ul className="divide-y divide-ink-600/50">
        {status.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 px-1 py-2.5"
          >
            <span className="text-sm text-slate-200">{item.label}</span>
            <StatusBadge status={item.state} />
          </li>
        ))}
      </ul>
      )}
    </Card>
  )
}

export default SystemStatus
