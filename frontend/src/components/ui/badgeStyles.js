/*
 * Badge variant mappings shared across Badge, StatusBadge, and
 * other status-rendering components.
 *
 * Colors are paired with a dot symbol so that status is never
 * communicated by color alone (accessibility).
 *
 * All variants are designed for the dark command-center surface.
 */

export const BADGE_VARIANTS = {
  neutral: {
    classes: 'bg-ink-700/60 text-slate-300 border-ink-600',
    dot: 'bg-slate-400',
  },
  brand: {
    classes: 'bg-cyan-brand/10 text-cyan-200 border-cyan-brand/30',
    dot: 'bg-cyan-brand',
  },
  success: {
    classes: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  warning: {
    classes: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  danger: {
    classes: 'bg-red-500/10 text-red-300 border-red-500/30',
    dot: 'bg-red-400',
  },
  info: {
    classes: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    dot: 'bg-sky-400',
  },
}
