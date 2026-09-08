/*
 * Analytical refresh bus — lets the analysis modal notify case-scoped
 * pages (graph, timeline, alerts) that a real analysis run completed so
 * they re-fetch without a manual browser refresh.
 */
const listeners = new Set()

export function onAnalysisDone(fn) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function emitAnalysisDone(caseId) {
  listeners.forEach((fn) => fn(caseId))
}