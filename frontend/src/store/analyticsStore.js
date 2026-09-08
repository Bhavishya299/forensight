/*
 * Analytical data access (alerts + contradictions) — talks to the live
 * backend API. No localStorage, no mock data.
 */

import api from '../services/api.js'

export async function getAlertsForCase(caseId) {
  try {
    const res = await api.get(`/cases/${caseId}/alerts`)
    return res.data.alerts || []
  } catch {
    return []
  }
}

export async function getAlertById(caseId, alertId) {
  const alerts = await getAlertsForCase(caseId)
  return alerts.find((a) => a.id === alertId) || null
}

export async function getContradictionsForCase(caseId) {
  try {
    const res = await api.get(`/cases/${caseId}/contradictions`)
    return res.data.contradictions || []
  } catch {
    return []
  }
}

export async function getContradictionById(caseId, contradictionId) {
  const rows = await getContradictionsForCase(caseId)
  return rows.find((c) => c.id === contradictionId) || null
}

export async function clearContradictions(caseId) {
  const res = await api.delete(`/cases/${caseId}/contradictions`)
  return res.data
}
