import { getSourceMeta } from '../../config/sourceMeta.js'

/*
 * Maps a data-source type to its canonical icon using the shared
 * source metadata module. Unknown sources fall back to a generic icon.
 */
const SourceIcon = ({ source, className = 'h-4 w-4' }) => {
  const meta = getSourceMeta(source)
  const Icon = meta.icon
  return <Icon className={className} aria-hidden="true" />
}

export default SourceIcon