import { useNavigate } from 'react-router-dom'
import { History, ScrollText, Activity } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'

const RecentActivity = ({ activity = [] }) => {
  const navigate = useNavigate()
  return (
    <Card
      title="Recent Activity"
      subtitle="Audit trail preview"
      icon={<History className="h-4 w-4" aria-hidden="true" />}
    >
      {activity.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-6 w-6" aria-hidden="true" />}
          title="No recent activity"
          description="User and system actions performed within the workspace will appear here."
        />
      ) : (
      <>
      <ul className="divide-y divide-ink-600/50">
        {activity.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 px-1 py-2.5">
            <span className="font-mono text-xs text-slate-500">{a.time}</span>
            <span className="flex-1 truncate text-left font-mono text-xs text-cyan-100">
              {a.action}
            </span>
            <span className="truncate text-xs text-slate-400">{a.target}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/audit')}
        >
          <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />
          View audit log
        </Button>
      </div>
      </>
      )}
    </Card>
  )
}

export default RecentActivity
