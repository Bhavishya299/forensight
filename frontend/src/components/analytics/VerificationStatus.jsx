import Badge from '../ui/Badge.jsx'

/*
 * Status indicator shared by alerts and contradictions.
 *
 * "Requires review" maps to a warning state; Reviewed and Dismissed map
 * to success / neutral. The label is always shown alongside the color
 * so status is never communicated by color alone.
 */
const REVIEW_VARIANTS = {
  'Requires review': 'warning',
  'Reviewed': 'success',
  'Dismissed': 'neutral',
}

const VerificationStatus = ({ status }) => {
  const variant = REVIEW_VARIANTS[status] || 'warning'
  return (
    <Badge variant={variant} dot>
      {status}
    </Badge>
  )
}

export default VerificationStatus