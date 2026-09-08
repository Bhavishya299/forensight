import { SOURCE_META } from '../../config/sourceMeta.js'

/*
 * Report model helpers.
 *
 * The report data itself is fetched live from the backend
 * (GET /cases/{id}/report) by the Reports page — no mock data is
 * involved here. This module only owns the self-contained HTML used
 * by the print/download export flow.
 */

function sourceLabel(key) {
  return SOURCE_META[key]?.label || key
}

/* ---------------- Self-contained HTML (print / download) ---------------- */

function rowsHtml(pairs) {
  return pairs
    .map(
      ([k, v]) =>
        `<tr><td class="k">${k}</td><td>${v}</td></tr>`
    )
    .join('')
}

function evidenceChips(ids) {
  return (ids || []).map((i) => `<span class="mono chip">${i}</span>`).join(' ')
}

export function renderReportHtml(model) {
  const entityHtml = (model.entities || [])
    .map(
      (e) => `
        <tr>
          <td class="mono">${e.name}</td>
          <td>${e.type}</td>
          <td>${evidenceChips(e.relatedEvidence)}</td>
          <td>${e.relatedEvents}</td>
        </tr>`
    )
    .join('')

  const eventsHtml = (model.events || [])
    .map(
      (e) => `
        <tr>
          <td class="mono">${e.time}</td>
          <td>${sourceLabel(e.source)}</td>
          <td>${e.description}</td>
          <td class="mono">${e.evidenceId}</td>
        </tr>`
    )
    .join('')

  const leadsHtml = (model.leads || [])
    .map(
      (l) => `
        <div class="block">
          <h4>${l.type.toUpperCase()}</h4>
          <p><strong>Observed:</strong> ${l.observed}</p>
          <p><strong>Reason:</strong> ${l.reason}</p>
          <p class="mono line"><strong>Evidence:</strong> ${evidenceChips(l.evidence)}</p>
          <p><strong>Status:</strong> ${l.status}</p>
        </div>`
    )
    .join('')

  const evidenceHtml = (model.evidenceRows || [])
    .map(
      (r) => `
        <tr>
          <td class="mono">${r.id}</td>
          <td>${sourceLabel(r.source)}</td>
          <td class="mono">${r.timestamp}</td>
          <td>${r.description}</td>
          <td>${r.referencedBy || '—'}</td>
        </tr>`
    )
    .join('')

  const relHtml = model.relationship
    ? `<div class="block">
         <h4>${model.relationship.subject || 'Potential relationship'}</h4>
         <p><strong>Potential Relationship</strong></p>
         <p><strong>Supporting sources:</strong> ${
           (model.relationship.sources || []).join(', ') || '—'
         }</p>
         <p class="mono line"><strong>Evidence:</strong> ${evidenceChips(model.relationship.evidence)}</p>
         <p><strong>Status:</strong> ${model.relationship.status || '—'}</p>
       </div>`
    : '<p>No potential relationships identified in this phase.</p>'

  const vehHtml = model.vehicle
    ? `<div class="block">
         <h4>VEHICLE MOVEMENT ANALYSIS</h4>
         <p class="mono line"><strong>Vehicle:</strong> ${model.vehicle.plate} · ${model.vehicle.type} · ${model.vehicle.color}</p>
         <p><strong>Camera coverage:</strong> ${model.vehicle.cameras} traffic cameras · first ${model.vehicle.firstSeen} · last ${model.vehicle.lastSeen} · ${model.vehicle.duration}</p>
         <p><strong>Observed route (illustrative):</strong> ${(model.vehicle.route || []).join(' → ')}</p>
         ${(model.vehicle.sightings || [])
           .map(
             (s) =>
               `<p class="mono line">${s.time} · Camera ${s.camera} · ${s.area} · ${s.direction}</p>`
           )
           .join('')}
         <p><strong>Potential correlations (surrounding source records):</strong></p>
         ${(model.vehicle.correlations || [])
           .map(
             (c) =>
               `<p class="mono line">${c.time} · ${c.source} · ${c.sector} · ${evidenceChips([c.evidenceId])}</p>`
           )
           .join('')}
         <p>These are observed time/sector alignments only. They do not associate any person with the vehicle and do not infer a destination.</p>
         <p><strong>Status:</strong> ${model.vehicle.status}</p>
       </div>`
    : '<p>No vehicle trace is attached to this phase.</p>'

  const conHtml = model.contradiction
    ? `<div class="block">
         <h4>POTENTIAL CONTRADICTION</h4>
         <p><strong>Statement claim:</strong> “${model.contradiction.claim}”</p>
         ${(model.contradiction.records || [])
           .map(
             (r) => `
           <p class="mono line">${r.time} · ${r.source} · ${r.detail}</p>`
           )
           .join('')}
         <p><strong>Assessment:</strong> ${model.contradiction.assessment}</p>
         <p><strong>Status:</strong> ${model.contradiction.status}</p>
       </div>`
    : '<p>No potential contradictions identified in this phase.</p>'

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Investigation Report — CASE #${model.caseId}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', ui-sans-serif, system-ui, Arial, sans-serif; color: #1a2435; background: #fff; margin: 0; padding: 32px 48px; }
  h2 { font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #3b5f94; border-bottom: 2px solid #d4deea; padding-bottom: 6px; margin: 28px 0 12px; }
  h3 { font-size: 13px; margin: 0 0 8px; color: #223c63; }
  h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px; color: #223c63; }
  p { margin: 4px 0; font-size: 13px; line-height: 1.55; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 4px; font-size: 13px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #5a7fae; border-bottom: 2px solid #d4deea; padding: 6px 8px; }
  td { border-bottom: 1px solid #e6ecf4; padding: 7px 8px; vertical-align: top; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .k { color: #5a7fae; white-space: nowrap; padding-right: 24px; }
  .chip { display: inline-block; border: 1px solid #c6d4e6; border-radius: 4px; padding: 1px 6px; margin: 0 4px 2px 0; background: #f3f7fc; }
  .block { border: 1px solid #dfe7f1; border-radius: 6px; padding: 12px 14px; margin: 10px 0; background: #fafcfe; }
  .line { margin: 2px 0 6px; }
  .overview { display: flex; flex-wrap: wrap; gap: 12px; }
  .stat { flex: 1 1 110px; border: 1px solid #dfe7f1; border-radius: 6px; padding: 10px 12px; background: #f7fafd; }
  .stat b { display: block; font-size: 22px; color: #14233c; }
  .stat span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #5a7fae; }
  .mast { border-bottom: 3px double #3b5f94; padding-bottom: 14px; margin-bottom: 20px; }
  .mast small { display: block; color: #5a7fae; letter-spacing: 2px; text-transform: uppercase; font-size: 10px; margin-top: 4px; }
  .disclaimer { border: 1px solid #f2d79a; background: #fff8e8; color: #8a6d1a; border-radius: 6px; padding: 10px 12px; font-size: 12px; }
  input[type=checkbox] { margin-right: 8px; }
  ul { margin: 6px 0; padding-left: 18px; }
  li { font-size: 13px; margin: 4px 0; }
  .signoff { margin-top: 28px; border-top: 1px solid #d4deea; padding-top: 12px; font-size: 11px; color: #5a7fae; }
</style>
</head>
<body>
  <div class="mast">
    <div style="font-size:18px; font-weight:800; letter-spacing:3px; color:#14233c;">FORENSIGHT</div>
    <small>Multi-Source Investigative Analytics</small>
    <h2 style="border:0; margin:14px 0 4px;">Investigation Report</h2>
    <table>
      ${rowsHtml([
        ['Case Number', `CASE #${model.caseId}`],
        ['Case Title', model.title],
        ['Generated', model.generated],
        ['Environment', 'DEMONSTRATION DATA — SYNTHETIC / SANITIZED'],
        ['Prepared for', 'Investigator Review'],
      ])}
    </table>
  </div>

  <div class="disclaimer">
    This is a prototype report generated from synthetic demonstration data.
    Analytical results do not constitute legal conclusions or determinations of guilt.
    Independent investigator verification is required before any investigative action or conclusion.
  </div>

  <h2>Executive Summary</h2>
  <p>This prototype analysis identified multiple potential relationships and correlated events across independent synthetic evidence sources associated with Case #${model.caseId}.</p>
  <p>Observed activity includes communication, digital access, financial activity, social interaction and device/location associations within a concentrated time period.</p>
  <p>These results are investigative leads generated from synthetic demonstration data and require investigator verification.</p>

  <h2>Case Overview</h2>
  <div class="overview">
    <div class="stat"><b>CASE</b><span>#${model.caseId}</span></div>
    <div class="stat"><b>${model.overview?.sources}</b><span>Evidence sources</span></div>
    <div class="stat"><b>${model.overview?.events}</b><span>Events</span></div>
    <div class="stat"><b>${model.overview?.entities}</b><span>Entities</span></div>
    <div class="stat"><b>${model.overview?.relationships}</b><span>Relationships</span></div>
    <div class="stat"><b>${model.overview?.leads}</b><span>Potential leads</span></div>
    <div class="stat"><b>${model.overview?.windows}</b><span>Critical windows</span></div>
  </div>

  <h2>Key Entities</h2>
  <table>
    <thead><tr><th>Name</th><th>Type</th><th>Related Evidence</th><th>Related Events</th></tr></thead>
    <tbody>${entityHtml}</tbody>
  </table>

  <h2>Key Investigative Leads</h2>
  ${leadsHtml}

  <h2>Key Event Sequence</h2>
  <table>
    <thead><tr><th>Time</th><th>Source</th><th>Description</th><th>Evidence</th></tr></thead>
    <tbody>${eventsHtml}</tbody>
  </table>

  <h2>Relationship Analysis</h2>
  ${relHtml}

  <h2>Vehicle Movement Analysis</h2>
  ${vehHtml}

  <h2>Potential Contradictions</h2>
  ${conHtml}

  <h2>Supporting Evidence</h2>
  <table>
    <thead><tr><th>Evidence ID</th><th>Source</th><th>Timestamp</th><th>Description</th><th>Referenced By</th></tr></thead>
    <tbody>${evidenceHtml}</tbody>
  </table>

  <h2>Investigator Review</h2>
  <p>This report contains prototype analytical leads generated from synthetic demonstration data.</p>
  <p>Analytical results do not constitute legal conclusions or determinations of guilt.</p>
  <p>Independent investigator verification is required before any investigative action or conclusion.</p>
  <ul>
    <li><input type="checkbox" /> Relationship reviewed</li>
    <li><input type="checkbox" /> Timeline reviewed</li>
    <li><input type="checkbox" /> Potential anomalies reviewed</li>
    <li><input type="checkbox" /> Potential contradictions reviewed</li>
    <li><input type="checkbox" /> Vehicle movement reviewed</li>
    <li><input type="checkbox" /> Supporting evidence reviewed</li>
  </ul>

  <p class="signoff">FORENSIGHT — Prototype for demonstration purposes. No real or sanitized private data is included.</p>
</body>
</html>`
}

export function buildReportFileName(caseId) {
  return `forensight-investigation-report-case-${caseId}.html`
}