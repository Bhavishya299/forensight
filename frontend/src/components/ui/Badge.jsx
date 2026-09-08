import { BADGE_VARIANTS } from './badgeStyles.js'

const Badge = ({
  variant = 'neutral',
  children,
  dot = false,
  className = '',
}) => {
  const v = BADGE_VARIANTS[variant] || BADGE_VARIANTS.neutral
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded text-xs font-medium px-2 py-0.5 border',
        v.classes,
        className,
      ].join(' ')}
    >
      {dot && <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />}
      {children}
    </span>
  )
}

export default Badge
