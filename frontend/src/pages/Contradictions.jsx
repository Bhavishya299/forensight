import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Scale } from 'lucide-react'
import {
  getContradictionsForCase,
  getContradictionById,
} from '../store/analyticsStore.js'
import { getEvidenceById } from '../store/caseStore.js'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHeader from '../components/dashboard/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import AlertBanner from '../components/ui/AlertBanner.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import ContradictionCard from '../components/contradictions/ContradictionCard.jsx'
import ContradictionDetail from '../components/contradictions/ContradictionDetail.jsx'
import EvidenceDetailDrawer from '../components/evidence/EvidenceDetailDrawer.jsx'

const Contradictions = () => {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)
  const [activeEvidence, setActiveEvidence] = useState(null)

  useEffect(() => {
    let cancelled = false
    getContradictionsForCase(id)
      .then((rows) => {
        if (cancelled) return
        setItems(rows || [])
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const sourceTypes = [
    ...new Set(items.flatMap((c) => c.sources || [])),
  ]

  const summary = {
    total: items.length,
    high: items.filter((c) => c.severity === 'High').length,
    requiresReview: items.filter((c) => c.status === 'Requires review').length,
    sources: sourceTypes.length,
  }

  /* Deep-link support: /cases/:id/contradictions?c=CT-XXX auto-opens */
  const requestedId = searchParams.get('c')

  useEffect(() => {
    let cancelled = false
    if (requestedId) {
      getContradictionById(id, requestedId).then((found) => {
        if (cancelled || !found) return
        setActive(found)
        setSearchParams({}, { replace: true })
      })
    }
    return () => {
      cancelled = true
    }
  }, [requestedId, id, setSearchParams])

  const handleClose = () => {
    setActive(null)
    const params = new URLSearchParams(searchParams)
    params.delete('c')
    setSearchParams(params, { replace: true })
  }

  const handleOpenEvidence = useCallback(
    (evidenceId) => {
      setActive(null)
      getEvidenceById(id, evidenceId).then((item) => {
        if (item) setActiveEvidence(item)
      })
    },
    [id]
  )

  return (
    <PageContainer>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-sky-brand" aria-hidden="true" />
            Contradiction review
          </span>
        }
        tagline={`Compare stated claims with independent evidence. Demo only — none are conclusions.`}
      />

      {loading ? (
        <LoadingState label="Loading contradictions…" />
      ) : (
        <>
      {/* Explanation panel */}
      <div className="mb-5">
        <AlertBanner variant="info" title="How these are generated">
          <p className="text-xs leading-relaxed">
            Potential contradictions are generated when a stated claim appears inconsistent with
            independent synthetic evidence. They require investigator verification and do not
            automatically establish that a claim is incorrect.
          </p>
        </AlertBanner>
      </div>

      {/* Summary strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Contradictions', summary.total],
          ['High severity', summary.high],
          ['Requires review', summary.requiresReview],
          ['Source types involved', summary.sources],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-ink-600/70 bg-ink-850 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold leading-none text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {items.length ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <ContradictionCard
              key={item.id}
              contradiction={item}
              onOpen={() => setActive(item)}
              onOpenEvidence={handleOpenEvidence}
            />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Scale className="h-6 w-6" aria-hidden="true" />}
            title="No contradictions to review"
            description="Potential contradictions will appear here once generated for this case."
          />
        </Card>
      )}

      <div className="mt-4 text-xs text-slate-500">
        {summary.total} contradictions · {summary.requiresReview} pending review
      </div>

      <ContradictionDetail
        open={Boolean(active)}
        onClose={handleClose}
        caseId={id}
        contradiction={active}
        onOpenEvidence={handleOpenEvidence}
        relatedAlertId={active ? active.metadata?.relatedAlertId || null : null}
      />

      <EvidenceDetailDrawer
        open={Boolean(activeEvidence)}
        onClose={() => setActiveEvidence(null)}
        caseId={id}
        item={activeEvidence}
      />
        </>
      )}
    </PageContainer>
  )
}

export default Contradictions