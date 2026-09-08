import { Landmark, Link2, Layers, Scale, AlertTriangle } from 'lucide-react'

/*
 * Visual metadata for analytical lead types. Each type carries an icon
 * and a paired tint so identity is never communicated by color alone.
 */
export const ALERT_TYPE_META = {
  'Potential Financial Anomaly': {
    icon: Landmark,
    label: 'Potential Financial Anomaly',
    classes: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    iconClasses: 'bg-amber-500/15 text-amber-300',
  },
  'Potential Relationship': {
    icon: Link2,
    label: 'Potential Relationship',
    classes: 'bg-cyan-brand/10 text-cyan-200 border-cyan-brand/30',
    iconClasses: 'bg-cyan-brand/15 text-cyan-brand',
  },
  'Potential Critical Event Window': {
    icon: Layers,
    label: 'Potential Critical Event Window',
    classes: 'bg-red-500/10 text-red-300 border-red-500/30',
    iconClasses: 'bg-red-500/15 text-red-300',
  },
  'Potential Contradiction': {
    icon: Scale,
    label: 'Potential Contradiction',
    classes: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    iconClasses: 'bg-sky-500/15 text-sky-300',
  },
}

export const FALLBACK_ALERT_TYPE_META = {
  icon: AlertTriangle,
  label: 'Investigative lead',
  classes: 'bg-ink-700/60 text-slate-300 border-ink-600',
  iconClasses: 'bg-ink-700 text-slate-300',
}

export function getAlertTypeMeta(type) {
  return ALERT_TYPE_META[type] || FALLBACK_ALERT_TYPE_META
}

export const SEVERITY_VARIANTS = {
  High: 'danger',
  Medium: 'warning',
  Low: 'info',
}