import { useEffect } from 'react'
import { X } from 'lucide-react'
import Button from './Button.jsx'

/*
 * Right-hand slide-over panel used for detail inspection (e.g. the
 * evidence record drawer). Mirrors Modal's accessibility behavior.
 */
const Drawer = ({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-lg',
}) => {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        className={`absolute inset-y-0 right-0 flex w-full ${width} flex-col border-l border-ink-600 bg-ink-850 shadow-xl`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-600/70 px-4 py-3">
          <h2 className="truncate text-sm font-semibold text-slate-100">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <footer className="flex shrink-0 justify-end gap-2 border-t border-ink-600/70 px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

export default Drawer