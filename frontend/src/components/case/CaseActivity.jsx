import { useEffect, useState } from 'react'
import {
  Upload,
  FilePlus,
  Activity,
  Database,
  Lightbulb,
  FolderOpen,
  CircleDot,
} from 'lucide-react'
import { getCaseActivity } from '../../store/caseStore.js'
import Card from '../ui/Card.jsx'

const ACTION_ICONS = {
  'Evidence uploaded': Upload,
  'Evidence added': FilePlus,
  'Analysis started': Activity,
  'Source ingested': Database,
  'Lead updated': Lightbulb,
  'Case created': FolderOpen,
}

const CaseActivity = ({ caseId, limit = 6 }) => {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    let cancelled = false
    getCaseActivity(caseId).then((rows) => {
      if (!cancelled) setEntries((rows || []).slice(0, limit))
    })
    return () => {
      cancelled = true
    }
  }, [caseId, limit])

  return (
    <Card title="Recent activity" subtitle={`Case #${caseId} workspace`}>
      <div className="-mx-4 -my-4 px-4 py-2">
        {entries.length === 0 ? (
          <p className="px-1 py-3 text-sm text-slate-500">No recent activity for this case yet.</p>
        ) : (
        <ul className="divide-y divide-ink-600/50">
          {entries.map((entry) => {
            const Icon = ACTION_ICONS[entry.action] || CircleDot
            return (
              <li key={entry.id} className="flex items-start gap-3 py-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink-700 text-cyan-brand">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200">
                    {entry.action}
                    {entry.detail && (
                      <span className="text-slate-400"> · {entry.detail}</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {entry.time} · {entry.actor}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
        )}
      </div>
    </Card>
  )
}

export default CaseActivity