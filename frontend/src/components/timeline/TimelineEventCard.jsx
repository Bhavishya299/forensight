import { MapPin, ArrowRight } from 'lucide-react'
import Badge from '../ui/Badge.jsx'
import SourceBadge from '../common/SourceBadge.jsx'
import EvidenceChip from '../common/EvidenceChip.jsx'

/*
 * Single timeline event card. Shows timestamp, source, event type,
 * description, entities, location, and the traceable evidence ID.
 * Clicking the card opens the event detail drawer.
 */
const TimelineEventCard = ({ event, onSelect, onOpenEvidence }) => {
  return (
    <article
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.()
        }
      }}
      aria-label={`Open event ${event.id} · ${event.time} ${event.description}`}
      className={[
        'block w-full cursor-pointer rounded-lg border bg-ink-850 px-4 py-3 text-left shadow-sm transition-colors hover:border-cyan-brand/40 hover:bg-ink-800',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-brand',
        event.window ? 'border-l-4 border-l-amber-400/70' : 'border-l-4 border-l-ink-600/40',
      ].join(' ')}
    >
      {/* Time + source */}
      <div className="flex items-center justify-between gap-3">
        <span className={`font-mono text-sm font-semibold ${event.window ? 'text-amber-300' : 'text-slate-200'}`}>
          {event.time}
        </span>
        <SourceBadge source={event.source} />
      </div>

      {/* Event type */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant="brand">{event.eventType}</Badge>
        {event.window && (
          <Badge variant="warning" dot>
            Window
          </Badge>
        )}
      </div>

      <p className="mt-2 text-sm text-slate-200">{event.description}</p>

      {/* Entities */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded bg-ink-700 px-1.5 py-0.5 text-slate-200">{event.entity1}</span>
        {event.entity2 && (
          <>
            <ArrowRight className="h-3 w-3 text-slate-500" aria-hidden="true" />
            <span className="rounded bg-ink-700 px-1.5 py-0.5 text-slate-200">{event.entity2}</span>
          </>
        )}
      </div>

      {/* Location + amount */}
      {(event.location || event.metadata?.amount) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {event.location}
            </span>
          )}
          {event.metadata?.amount && (
            <span className="font-semibold text-slate-200">{event.metadata.amount}</span>
          )}
        </div>
      )}

      {/* Evidence traceability */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink-600/50 pt-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Evidence
        </span>
        <EvidenceChip
          id={event.evidenceId}
          theme={event.window ? 'accent' : 'default'}
          onOpen={onOpenEvidence}
        />
      </div>
    </article>
  )
}

export default TimelineEventCard