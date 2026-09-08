import { useNavigate } from 'react-router-dom'
import { FileSearch, ArrowUpRight, FileQuestion } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'
import EmptyState from '../ui/EmptyState.jsx'

const LeadItem = ({ lead }) => {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(`/cases/${lead.caseId}/alerts`)}
      className="group flex w-full flex-col gap-2 border-b border-ink-600/50 px-4 py-3 text-left last:border-0 transition-colors hover:bg-ink-700/40"
    >
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={lead.severity} />
        <span className="flex items-center gap-1 text-[11px] text-slate-500 group-hover:text-cyan-brand">
          Case #{lead.caseId}
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </span>
      </div>
      <p className="text-xs font-medium uppercase tracking-wider text-cyan-100">
        {lead.type}
      </p>
      <p className="text-sm text-slate-300">{lead.explanation}</p>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-mono text-[11px] text-slate-500">
          Evidence: {lead.evidence}
        </span>
        <span>{lead.time}</span>
      </div>
    </button>
  )
}

const InvestigationLead = ({ leads = [] }) => {
  const navigate = useNavigate()
  return (
    <Card
      title="Recent Investigative Leads"
      subtitle="Generated leads requiring review"
      icon={<FileSearch className="h-4 w-4" aria-hidden="true" />}
    >
      {leads.length === 0 ? (
        <EmptyState
          icon={<FileQuestion className="h-6 w-6" aria-hidden="true" />}
          title="No investigative leads"
          description="Leads generated from correlated evidence will appear here."
        />
      ) : (
      <div className="-mx-4 -my-4">
        {leads.map((lead) => (
          <LeadItem key={lead.id} lead={lead} />
        ))}
      </div>
      )}
      {leads.length > 0 && (
      <div className="mt-2 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/cases')}
        >
          View all leads
        </Button>
      </div>
      )}
    </Card>
  )
}

export default InvestigationLead
