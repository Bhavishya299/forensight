import { forwardRef } from 'react'

const variantClasses = {
  primary:
    'bg-cyan-brand text-ink-950 border border-cyan-brand/60 hover:bg-sky-400 active:bg-sky-500 disabled:bg-ink-600 disabled:text-slate-500',
  secondary:
    'bg-ink-700 text-slate-100 border border-ink-600 hover:bg-ink-600 active:bg-ink-800 disabled:opacity-50',
  outline:
    'bg-transparent text-cyan-200 border border-cyan-brand/40 hover:bg-cyan-brand/10 hover:border-cyan-brand/60 active:bg-cyan-brand/15 disabled:text-slate-500 disabled:border-ink-600',
  ghost:
    'bg-transparent text-slate-300 border border-transparent hover:bg-ink-700 hover:text-slate-100 active:bg-ink-600 disabled:text-slate-500',
  danger:
    'bg-red-500 text-white border border-transparent hover:bg-red-600 active:bg-red-700 disabled:bg-ink-600 disabled:text-slate-500',
}

const sizeClasses = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
  icon: 'h-9 w-9 p-0',
}

const Button = forwardRef(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={[
          'inline-flex items-center justify-center gap-2 rounded-md font-medium',
          'transition-colors duration-150 cursor-pointer',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-brand',
          'disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
