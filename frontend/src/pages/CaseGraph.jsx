import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import ReactFlow, {
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  SlidersHorizontal,
  RotateCcw,
  Clock3,
  Share2,
  FolderSearch,
  GitBranch,
  Database,
  Layers,
  Lightbulb,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import PageHeader from '../components/dashboard/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import AlertBanner from '../components/ui/AlertBanner.jsx'
import EntityNode from '../components/graph/EntityNode.jsx'
import RelationshipEdge from '../components/graph/RelationshipEdge.jsx'
import GraphLegend from '../components/graph/GraphLegend.jsx'
import GraphFiltersPanel, {
  DEFAULT_ENTITY_STATE,
  DEFAULT_RELATIONSHIP_STATE,
  relationshipMatches,
} from '../components/graph/GraphFiltersPanel.jsx'
import NodeDetailPanel from '../components/graph/NodeDetailPanel.jsx'
import EdgeDetailPanel from '../components/graph/EdgeDetailPanel.jsx'
import EvidenceDetailDrawer from '../components/evidence/EvidenceDetailDrawer.jsx'
import EntityIntelligencePanel from '../components/intelligence/EntityIntelligencePanel.jsx'
import WeakLinkDrawer from '../components/intelligence/WeakLinkDrawer.jsx'
import { ENTITY_META } from '../components/graph/entityMeta.js'
import LoadingState from '../components/ui/LoadingState.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import api from '../services/api.js'
import { getEvidenceById, getCaseById } from '../store/caseStore.js'
import { getAlertsForCase } from '../store/analyticsStore.js'

const GraphPage = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { fitView } = useReactFlow()

  // Graph payload (live API)
  const [graphLoading, setGraphLoading] = useState(true)
  const [caseData, setCaseData] = useState(null)
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [summary, setSummary] = useState(null)
  const [criticalWindow, setCriticalWindow] = useState(null)
  const [entitiesByLabel, setEntitiesByLabel] = useState({})
  const [crossCaseEntities, setCrossCaseEntities] = useState([])

  // Relationship-alert derived weak-link signals
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [caseWeakLinks, setCaseWeakLinks] = useState([])

  const nodeTypes = useMemo(() => ({ entity: EntityNode }), [])
  const edgeTypes = useMemo(() => ({ relationship: RelationshipEdge }), [])

  // Fetch the case graph, case header, and entity catalog once per case.
  useEffect(() => {
    let cancelled = false
    setGraphLoading(true)
    setCaseData(null)
    setNodes([])
    setEdges([])
    setSummary(null)
    setCriticalWindow(null)
    setEntitiesByLabel({})
    setCrossCaseEntities([])
    Promise.all([
      api.get(`/cases/${id}/graph`),
      getCaseById(id),
      api.get('/entities'),
    ])
      .then(([graphRes, caseRes, entitiesRes]) => {
        if (cancelled) return
        const g = graphRes.data || {}
        setNodes(g.nodes || [])
        setEdges(g.edges || [])
        setSummary(g.summary || null)
        setCriticalWindow(g.criticalEventWindow || null)
        setCaseData(caseRes)
        const list = entitiesRes.data.entities || []
        setEntitiesByLabel(Object.fromEntries(list.map((e) => [e.label, e])))
        setCrossCaseEntities(
          list
            .filter((e) => (e.cases || []).length > 1)
            .map((e) => ({ slug: e.slug, label: e.label, cases: e.cases || [] }))
        )
      })
      .catch(() => {
        if (cancelled) return
        setSummary(null)
      })
      .finally(() => {
        if (!cancelled) setGraphLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // Case weak-link signals come from the relationship alerts; map them
  // to the shape the weak-link UI consumes.
  useEffect(() => {
    let cancelled = false
    setAlertsLoading(true)
    getAlertsForCase(id)
      .then((alerts) => {
        if (cancelled) return
        const mapped = (alerts || [])
          .filter((a) => /relationship|weak link/i.test(String(a.type || '')))
          .map((a) => ({
            id: a.id,
            caseId: a.caseId || id,
            connection: a.title || a.id,
            typeLabel: a.type,
            confidence: a.severity || 'Medium',
            status: a.status || 'Requires verification',
            window: a.metadata?.window || '',
            entityLabels: a.entities || [],
            activitySequence: a.entities || [],
            supportingEvidence: a.evidenceIds || [],
            reason: a.reason || a.description || '',
            interpretation: a.description || a.reason || '',
          }))
        setCaseWeakLinks(mapped)
      })
      .catch(() => {
        if (!cancelled) setCaseWeakLinks([])
      })
      .finally(() => {
        if (!cancelled) setAlertsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const nodeById = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes])
  const summaryItems = useMemo(() => {
    const s = summary || {}
    return [
      { key: 'entities', label: 'Entities', value: s.entities ?? 0, icon: Share2 },
      { key: 'relationships', label: 'Relationships', value: s.relationships ?? 0, icon: GitBranch },
      { key: 'sourceTypes', label: 'Source types', value: s.sourceTypes ?? 0, icon: Database },
      { key: 'crossSource', label: 'Cross-source links', value: s.crossSourceLinks ?? 0, icon: Layers },
      { key: 'leads', label: 'Potential leads', value: s.potentialLeads ?? 0, icon: Lightbulb },
    ]
  }, [summary])

  // Filters (plain React state — no Redux)
  const [entityState, setEntityState] = useState(DEFAULT_ENTITY_STATE)
  const [relationshipState, setRelationshipState] = useState(DEFAULT_RELATIONSHIP_STATE)
  const [source, setSource] = useState('All')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Selection
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedEdge, setSelectedEdge] = useState(null)
  const [evidenceItem, setEvidenceItem] = useState(null)
  const [weakLink, setWeakLink] = useState(null)

  const relatedEdges = useMemo(() => edges.filter((e) => e.crossSource), [edges])

  // Optional context arriving from the timeline (?n=Entity Name) or the
  // evidence drawer (?entity=Evidence ID)
  useEffect(() => {
    const highlight = searchParams.get('n') || searchParams.get('entity')
    if (!highlight || !nodes.length) return
    const match = nodes.find(
      (n) => n.label === highlight || n.id === highlight
    )
    if (match) {
      setSelectedNode(match)
      window.setTimeout(() => {
        fitView({ nodes: [{ id: match.id }], padding: 0.6, duration: 500 })
      }, 120)
    }
  }, [searchParams, fitView, nodes])

  const visibleNodes = useMemo(
    () => nodes.filter((n) => entityState[n.type]),
    [entityState, nodes]
  )
  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes])
  const visibleEdges = useMemo(
    () =>
      edges.filter(
        (e) =>
          relationshipMatches(e, relationshipState) &&
          (source === 'All' || e.sourceType === source) &&
          visibleIds.has(e.source) &&
          visibleIds.has(e.target)
      ),
    [relationshipState, source, visibleIds, edges]
  )

  const rfNodes = useMemo(
    () =>
      visibleNodes.map((n) => ({
        id: n.id,
        type: 'entity',
        position: n.position,
        data: { node: n },
        selected: n.id === selectedNode?.id,
      })),
    [visibleNodes, selectedNode]
  )

  const rfEdges = useMemo(
    () =>
      visibleEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'relationship',
        data: { edge: e },
        selected: e.id === selectedEdge?.id,
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#5a7fae' },
      })),
    [visibleEdges, selectedEdge]
  )

  const openEvidence = async (evidenceId) => {
    const item = await getEvidenceById(id, evidenceId)
    if (!item) return
    setSelectedNode(null)
    setSelectedEdge(null)
    setEvidenceItem(item)
  }

  const resetView = () =>
    fitView({
      padding: 0.15,
      duration: 400,
    })

  const toggleEntity = (key) => setEntityState((s) => ({ ...s, [key]: !s[key] }))
  const toggleRelationship = (key) =>
    setRelationshipState((s) => ({ ...s, [key]: !s[key] }))

  const resetFilters = () => {
    setEntityState(DEFAULT_ENTITY_STATE)
    setRelationshipState(DEFAULT_RELATIONSHIP_STATE)
    setSource('All')
  }

  const selectedEntity = selectedNode ? entitiesByLabel[selectedNode.label] || null : null

  const nodeIdsForLink = (link) =>
    link.entityLabels
      .map((label) => nodes.find((n) => n.label === label)?.id)
      .filter(Boolean)

  const viewWeakLink = (link) => {
    setWeakLink(link)
    const ids = nodeIdsForLink(link)
    if (!ids.length) return
    const firstNode = nodes.find((n) => n.id === ids[0])
    if (firstNode) setSelectedNode(firstNode)
    window.setTimeout(() => {
      fitView({ nodes: ids.map((i) => ({ id: i })), padding: 0.5, duration: 500 })
    }, 120)
  }

  return (
    <div>
      {/* Page header */}
      <div className="mx-auto w-full max-w-[1400px] px-5 pt-4">
        <PageHeader
          title="CaseGraph"
          tagline="Explore relationships across people, accounts, devices, locations and digital activity."
          actions={
            <>
              <Button variant="secondary" onClick={() => setFiltersOpen((o) => !o)}>
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Filter
              </Button>
              <Button variant="outline" onClick={resetView}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset view
              </Button>
              <Link to={`/cases/${id}/timeline`}>
                <Button variant="outline">
                  <Clock3 className="h-4 w-4" aria-hidden="true" />
                  View timeline
                </Button>
              </Link>
              <Link to={`/cases/${id}/evidence`}>
                <Button variant="ghost">
                  <FolderSearch className="h-4 w-4" aria-hidden="true" />
                  Evidence
                </Button>
              </Link>
            </>
          }
          className="mb-3"
        />

        {/* Case strip */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono text-cyan-brand">Case # {id}</span>
          <span className="font-medium text-slate-100">
            {caseData ? caseData.title : 'Synthetic demonstration case'}
          </span>
          <Badge variant="success" dot>
            Analyzed
          </Badge>
        </div>

        {/* Synthetic disclaimer */}
        <AlertBanner variant="warning" className="mb-4">
          <p>
            Synthetic demonstration data. Relationships are investigative leads that require
            investigator verification — never a conclusion.
          </p>
        </AlertBanner>

        {/* Summary bar */}
        {graphLoading ? (
          <div className="mb-4 rounded-lg border border-ink-600/70 bg-ink-850 px-4 py-3">
            <LoadingState label="Loading graph summary…" />
          </div>
        ) : (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {summaryItems.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.key}
                  className="flex items-center gap-3 rounded-lg border border-ink-600/70 bg-ink-850 px-4 py-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink-700 text-cyan-brand">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100">{item.value}</p>
                    <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      {item.label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Graph viewport */}
        <div className="relative h-[calc(100dvh-268px)] min-h-[440px] overflow-hidden rounded-lg border border-ink-600/70 bg-ink-900/40">
          <GraphFiltersPanel
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            entityState={entityState}
            relationshipState={relationshipState}
            source={source}
            onToggleEntity={toggleEntity}
            onToggleRelationship={toggleRelationship}
            onSourceChange={setSource}
            onReset={resetFilters}
          />

          <GraphLegend className="absolute bottom-4 left-4 z-10 rounded-md border border-ink-600/70 bg-ink-900/90 px-3 py-2.5 shadow-sm backdrop-blur-sm" />

          {criticalWindow && (
            <div className="absolute right-4 top-4 z-10 max-w-[260px] rounded-md border border-amber-500/30 bg-ink-900/90 px-3 py-2 shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-300">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                Potential critical event window
              </div>
              <p className="mt-0.5 text-xs text-slate-300">
                {criticalWindow.label} · {criticalWindow.durationMinutes} min ·{' '}
                {(criticalWindow.sourceTypes || []).length} sources
              </p>
            </div>
          )}

          {graphLoading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink-900/20">
              <LoadingState label="Building relationship graph…" />
            </div>
          ) : nodes.length === 0 ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <EmptyState
                icon={<Share2 className="h-6 w-6" aria-hidden="true" />}
                title="No graph data"
                description="No relationship graph is available for this case yet — ingest evidence and re-run the analysis."
              />
            </div>
          ) : visibleNodes.length === 0 ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <p className="text-sm text-slate-400">
                All entity types are hidden — enable at least one filter to display the graph.
              </p>
            </div>
          ) : null}

          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={(_, node) => {
              setEvidenceItem(null)
              setSelectedEdge(null)
              setSelectedNode(node.data.node)
            }}
            onEdgeClick={(_, edge) => {
              setEvidenceItem(null)
              setSelectedNode(null)
              setSelectedEdge(edge.data.edge)
            }}
            onPaneClick={() => {
              setSelectedNode(null)
              setSelectedEdge(null)
            }}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            minZoom={0.2}
            maxZoom={2}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={26}
              size={1}
              color="#223c63"
            />
            <Controls showInteractive={false} aria-label="Graph controls" />
            <MiniMap
              pannable
              zoomable
              maskColor="rgba(10, 15, 26, 0.65)"
              nodeColor={(n) => ENTITY_META[n.data?.node?.type]?.minimap || '#3f6ea5'}
              nodeStrokeColor="#0e1524"
              nodeStrokeWidth={3}
            />
          </ReactFlow>
        </div>

        {/* Intelligence layer */}
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-lg border border-amber-500/25 bg-ink-850 shadow-sm">
            <header className="flex items-center justify-between gap-4 border-b border-ink-600/70 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-300">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Potential unexplained connections
                  </h3>
                  <p className="text-xs text-slate-400">
                    Relationships that may warrant further investigation.
                  </p>
                </div>
              </div>
              <Badge variant="warning">{caseWeakLinks.length}</Badge>
            </header>
            <div className="px-4 py-4">
              {alertsLoading ? (
                <LoadingState label="Loading weak-link signals…" />
              ) : caseWeakLinks.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">
                  No unexplained connections flagged for this case.
                </p>
              ) : (
                <ul className="space-y-3">
                  {caseWeakLinks.slice(0, 3).map((l) => (
                    <li
                      key={l.id}
                      className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm text-slate-100">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
                            <span className="truncate">{l.connection}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {l.typeLabel} · Confidence {l.confidence} · {l.window}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <code className="hidden font-mono text-[10px] text-slate-500 sm:block">
                            {l.activitySequence.join(' → ')}
                          </code>
                          <Button variant="ghost" size="sm" onClick={() => viewWeakLink(l)}>
                            View
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                  {caseWeakLinks.length > 3 && (
                    <p className="text-center text-xs text-slate-500">
                      +{caseWeakLinks.length - 3} more signals — open an entity profile to review them.
                    </p>
                  )}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-ink-600/70 bg-ink-850 shadow-sm">
            <header className="border-b border-ink-600/70 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-100">Intelligence Signals</h3>
              <p className="text-xs text-slate-400">
                Derived from the investigation dataset — not conclusions.
              </p>
            </header>
            <div className="space-y-4 px-4 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Potential relationships ({relatedEdges.length})
                </p>
                <ul className="mt-2 space-y-1.5">
                  {relatedEdges.slice(0, 4).map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-2 text-xs text-slate-300"
                    >
                      <span className="truncate">
                        {e.sourceType} · {e.label}
                      </span>
                      <span className="shrink-0 rounded-sm bg-cyan-brand/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-200">
                        {e.timestamp}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Cross-case entities ({crossCaseEntities.length})
                </p>
                {crossCaseEntities.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {crossCaseEntities.map((e) => (
                      <li key={e.slug} className="flex items-center justify-between gap-2 text-xs">
                        <Link to={`/entities/${e.slug}`} className="flex items-center gap-1.5 text-cyan-brand hover:underline">
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          {e.label}
                        </Link>
                        <span className="shrink-0 text-[10px] text-slate-500">{e.cases.length} cases</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">No cross-case entities identified.</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Weak link signals ({caseWeakLinks.length})
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {caseWeakLinks.length} potential unexplained connections are flagged for this
                  case. Open an entity profile to review supporting evidence.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Detail panels — shared EvidenceDetailDrawer is reused for evidence IDs */}
      <EntityIntelligencePanel
        open={Boolean(selectedNode && selectedEntity)}
        onClose={() => setSelectedNode(null)}
        entity={selectedEntity}
        nodeId={selectedNode?.id}
        caseId={id}
        onOpenEvidence={openEvidence}
      />
      <NodeDetailPanel
        open={Boolean(selectedNode && !selectedEntity)}
        onClose={() => setSelectedNode(null)}
        caseId={id}
        node={selectedNode}
        edges={edges}
        nodeById={nodeById}
        onOpenEvidence={openEvidence}
        onSelectEntity={(entityId) => {
          const match = nodes.find((n) => n.id === entityId)
          if (match) setSelectedNode(match)
        }}
      />
      <EdgeDetailPanel
        open={Boolean(selectedEdge)}
        onClose={() => setSelectedEdge(null)}
        caseId={id}
        edge={selectedEdge}
        nodeById={nodeById}
        onOpenEvidence={openEvidence}
      />
      <EvidenceDetailDrawer
        open={Boolean(evidenceItem)}
        onClose={() => setEvidenceItem(null)}
        caseId={id}
        item={evidenceItem}
      />
      <WeakLinkDrawer
        open={Boolean(weakLink)}
        onClose={() => setWeakLink(null)}
        link={weakLink}
        onOpenEvidence={openEvidence}
      />
    </div>
  )
}

const CaseGraph = () => (
  <ReactFlowProvider>
    <GraphPage />
  </ReactFlowProvider>
)

export default CaseGraph