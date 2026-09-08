import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow'

/*
 * Custom relationship edge.
 *
 * Draws a readable relationship label at the edge midpoint. Cross-source
 * relationships (supported by multiple evidence sources) carry a small
 * "×N SOURCES" tag — FORENSIGHT's key differentiator. Selected edges
 * receive a cyan highlight; otherwise edges stay thin and muted.
 */
const RelationshipEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}) => {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const edge = data.edge
  const crossSource = Boolean(edge.crossSource)
  const stroke = selected ? '#38bdf8' : crossSource ? '#5a7fae' : '#2a3a5c'
  const width = selected ? 2 : 1.4

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke, strokeWidth: width }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
          className="nodrag nopan pointer-events-none absolute flex items-center gap-1 rounded border border-ink-600 bg-ink-900/95 px-1.5 py-0.5 shadow-sm"
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-200">
            {edge.relationship}
          </span>
          {crossSource && (
            <span
              className="rounded-sm bg-teal-brand/15 px-1 text-[9px] font-medium uppercase tracking-wider text-teal-brand"
              title={`${edge.sourceTypes.length} independent sources support this relationship`}
            >
              ×{edge.sourceTypes.length}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default RelationshipEdge