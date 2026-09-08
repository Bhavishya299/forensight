/*
 * Case & evidence data access — every function talks to the live
 * backend API. No localStorage, no mock data.
 */

import api from '../services/api.js'

export async function getAllCases() {
  const res = await api.get('/cases')
  return res.data.cases || []
}

export async function getCaseById(id) {
  try {
    const res = await api.get(`/cases/${id}`)
    return res.data || null
  } catch {
    return null
  }
}

export async function getCaseStats() {
  const cases = await getAllCases()
  return {
    total: cases.length,
    active: cases.filter((c) => c.status === 'Active').length,
    inReview: cases.filter((c) => c.status === 'In Review').length,
    archived: cases.filter((c) => c.status === 'Archived').length,
    sourcesToday: 0,
  }
}

export async function createCase(payload) {
  try {
    const res = await api.post('/cases', payload)
    const created = res.data
    const body = created?.case && typeof created.case === 'object' ? created.case : created
    const id = body?.id ?? body?.caseId ?? body?.case_number ?? body?.number
    if (id != null) return { ok: true, data: { ...body, id: String(id) } }
    return { ok: true, data: body }
  } catch (err) {
    const detail = err?.response?.data?.detail
    return { ok: false, error: Array.isArray(detail) ? 'Validation failed.' : detail || 'Unable to create case.' }
  }
}

export async function getEvidenceForCase(caseId) {
  const res = await api.get(`/cases/${caseId}/evidence`)
  return res.data.items || []
}

export async function getEvidenceById(caseId, id) {
  if (!id) return null
  try {
    const res = await api.get(`/cases/${caseId}/evidence/${id}`)
    return res.data || null
  } catch {
    return null
  }
}

export async function getEvidenceSummary(caseId) {
  const items = await getEvidenceForCase(caseId)
  return {
    total: items.length,
    ready: items.filter((e) => e.status === 'Ready for analysis').length,
    ingested: items.filter((e) => e.status === 'Ingested').length,
    requiresVerification: items.filter((e) => e.status === 'Requires verification').length,
    errors: items.filter((e) => e.status === 'Error').length,
  }
}

export async function addEvidenceItem(caseId, item) {
  const res = await api.post(`/cases/${caseId}/evidence`, item)
  return { id: res.data.id, caseId: res.data.caseId }
}

export async function deleteEvidenceItem(caseId, id) {
  await api.delete(`/cases/${caseId}/evidence/${encodeURIComponent(id)}`)
}

export async function deleteEvidenceMany(caseId, source) {
  const params = source ? { source } : {}
  const res = await api.delete(`/cases/${caseId}/evidence`, { params })
  return res.data
}

export function generateEvidenceId(source = 'SRC') {
  const prefix = String(source).replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'SRC'
  return `${prefix}-${String(Math.floor(Math.random() * 900) + 100)}`
}

export async function getOverviewStats(caseId) {
  try {
    const res = await api.get(`/cases/${caseId}/overview`)
    const { stats } = res.data
    return {
      records: stats?.records ?? 0,
      sourceCount: stats?.sourceCount ?? stats?.sources ?? 0,
      potentialRelationships: stats?.potentialRelationships ?? 0,
      lastIngestion: stats?.lastIngestion ?? '—',
    }
  } catch {
    return {
      records: 0,
      sourceCount: 0,
      potentialRelationships: 0,
      lastIngestion: '—',
    }
  }
}

export async function getCaseSourcesForOverview(caseId) {
  try {
    const res = await api.get(`/cases/${caseId}/overview`)
    return res.data.sources || []
  } catch {
    return []
  }
}

export async function getCaseActivity(caseId) {
  try {
    const res = await api.get(`/cases/${caseId}/overview`)
    return res.data.activity || []
  } catch {
    return []
  }
}
