import Badge from './Badge.jsx'

/*
 * Maps known investigative status terminology to badge styling.
 *
 * The language used is investigative and neutral — it never asserts
 * guilt or final conclusions. Any unrecognized status falls back to
 * a neutral style.
 */

const STATUS_MAP = {
  // Investigative findings / severity
  'Potential anomaly': 'warning',
  'Potential relationship': 'info',
  'Potential contradiction': 'danger',
  'Critical': 'danger',
  'High': 'danger',
  'Medium': 'warning',
  'Low': 'info',
  'Investigative lead': 'brand',

  // Lifecycle / verification states
  'Analyzed': 'success',
  'Processing': 'info',
  'Pending': 'warning',
  'Requires verification': 'warning',
  'Requires review': 'warning',
  'Under Investigation': 'brand',
  'Open': 'brand',
  'Closed': 'neutral',
  'Verified': 'success',
  'Rejected': 'danger',
  'Completed': 'success',
  'Reviewed': 'success',
  'Dismissed': 'neutral',

  // Case management
  'Active': 'brand',
  'In Review': 'warning',
  'Archived': 'neutral',

  // Evidence lifecycle
  'Ingested': 'success',
  'Ready for analysis': 'success',
  'In Queue': 'info',
  'Queued': 'info',
  'Error': 'danger',

  // Vehicle trace states
  'Trace available': 'success',

  // System / environment states
  'OPERATIONAL': 'success',
  'READY': 'success',
  'ACTIVE': 'success',
  'DEMONSTRATION': 'warning',
  'Protected': 'info',

  // Evidence sources
  'Financial': 'brand',
  'Telecom': 'info',
  'Digital': 'info',
  'Physical': 'neutral',
}

const StatusBadge = ({ status }) => {
  const variant = STATUS_MAP[status] || 'neutral'
  return (
    <Badge variant={variant} dot>
      {status}
    </Badge>
  )
}

export default StatusBadge
