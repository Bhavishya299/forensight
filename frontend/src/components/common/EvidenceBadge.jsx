import { FileText } from 'lucide-react'
import Badge from '../ui/Badge.jsx'

/*
 * Evidence-type badge. Maps evidence categories to a neutral
 * investigative palette (color paired with a label, never color-only).
 */

const EVIDENCE_VARIANTS = {
  Transaction: 'brand',
  Session: 'info',
  Document: 'neutral',
  Call: 'info',
  Account: 'brand',
  Device: 'info',
  Location: 'warning',
  Image: 'neutral',
  Statement: 'warning',
}

const EvidenceBadge = ({ type }) => {
  const variant = EVIDENCE_VARIANTS[type] || 'neutral'
  return (
    <Badge variant={variant}>
      <FileText className="h-3 w-3" aria-hidden="true" />
      {type}
    </Badge>
  )
}

export default EvidenceBadge
