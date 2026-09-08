import { useEffect, useState } from 'react'
import { Database } from 'lucide-react'
import { getCaseSourcesForOverview } from '../../store/caseStore.js'
import Card from '../ui/Card.jsx'
import SourceBadge from '../common/SourceBadge.jsx'

/*
 * Source-distribution overview for a case. Shows each normalized source
 * type with its record count and a proportional bar (relative to the
 * highest-count source).
 */
const EvidenceSourceOverview = ({ caseId }) => {
  const [sources, setSources] = useState([])

  useEffect(() => {
    let cancelled = false
    getCaseSourcesForOverview(caseId).then((rows) => {
      if (!cancelled) setSources(rows || [])
    })
    return () => {
      cancelled = true
    }
  }, [caseId])

  const total = sources.reduce((sum, s) => sum + s.count, 0)
  const max = Math.max(...sources.map((s) => s.count), 1)

  return (
    <Card
      title="Evidence sources"
      subtitle={`${sources.length} source types · ${total} records`}
      icon={<Database className="h-4 w-4" aria-hidden="true" />}
    >
      <ul className="space-y-3">
        {sources.map((s) => (
          <li key={s.type}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <SourceBadge source={s.type} />
              <span className="text-xs font-medium text-slate-300">{s.count}</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-ink-700"
              role="img"
              aria-label={`${s.label}: ${s.count} records`}
            >
              <div
                className="h-full rounded-full bg-cyan-brand/70"
                style={{ width: `${Math.round((s.count / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default EvidenceSourceOverview