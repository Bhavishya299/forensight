import { Clock } from 'lucide-react'
import { Handle, Position } from 'reactflow'
import { ENTITY_META } from './entityMeta.js'

/*
 * Compact React Flow entity node: icon + entity type + entity name.
 * Selected nodes receive a subtle cyan ring. Entities involved in the
 * potential critical event window carry a small clock marker.
 *
 * Hidden target/source handles anchor the edges; they are invisible but
 * keep edge attachment working for custom node types.
 */
const EntityNode = ({ data, selected }) => {
  const node = data.node
  const meta = ENTITY_META[node.type] || {}
  const Icon = meta.icon

  return (
    <div
      className={[
        'nodrag nopan select-none rounded-lg border px-3 py-2 shadow-sm backdrop-blur-sm bg-ink-900/90 w-44',
        meta.nodeClasses,
        selected && 'ring-1 ring-cyan-brand bg-ink-800',
      ].join(' ')}
      title={`${meta.singular || node.type} · ${node.label}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0, width: 4, height: 4, border: 0, background: 'transparent' }}
        isConnectable={false}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0, width: 4, height: 4, border: 0, background: 'transparent' }}
        isConnectable={false}
      />
      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${meta.iconClasses}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="truncate text-[9px] font-semibold uppercase tracking-widest text-slate-400">
          {meta.singular || node.type}
        </span>
        {node.meta?.window && (
          <span
            className="ml-auto flex h-4 w-4 items-center justify-center rounded-sm bg-amber-500/15 text-amber-300"
            title="Involved in the potential critical event window (18:02–18:21)"
          >
            <Clock className="h-3 w-3" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-slate-100">{node.label}</p>
    </div>
  )
}

export default EntityNode