"""
Portable investigation report model (JSON + self-contained HTML).

Mirrors src/components/report/reportModel.js so the on-screen report and
print/download export stay consistent. All content is neutral — leads
require verification.
"""

import datetime as dt

from sqlalchemy.orm import Session

from models import Case, EventRecord, GraphEdge, GraphNode, VehicleSighting
from services.anomaly_engine import get_alerts
from services.contradiction_engine import get_contradictions
from services.source_data import source_label
from services.vehicle_service import (
    format_duration,
    get_correlations,
    get_trace,
)

STATUS_NEUTRAL = "Requires verification"

TYPE_LABEL = {
    "PERSON": "Person",
    "PHONE": "Phone",
    "ACCOUNT": "Account",
    "IP": "IP Address",
    "DEVICE": "Device",
    "SOCIAL": "Social",
    "LOCATION": "Sector",
}


def _entity_rows(db: Session, case_id: str) -> list[dict]:
    from models import CameraRecord, EntityCaseRecord, EntityRecord

    rows = []
    for row in db.query(EntityRecord).order_by(EntityRecord.id.asc()).all():
        cases = row.cases or []
        if case_id not in cases:
            continue
        case_row = (
            db.query(EntityCaseRecord)
            .filter(
                EntityCaseRecord.slug == row.slug,
                EntityCaseRecord.case_id == case_id,
            )
            .first()
        )
        rows.append({
            "name": row.label,
            "type": TYPE_LABEL.get(row.type, row.type),
            "relatedEvidence": (case_row.evidence if case_row else []) or [],
            "relatedEvents": (case_row.events if case_row else 0) or 0,
        })

    # Vehicle + camera rows (graph objects linked to CCTV detections).
    vehicles = get_trace(db, "CH01AB1234")
    if vehicles:
        sightings = vehicles["sights"]
        rows.append({
            "name": "Vehicle CH01AB1234",
            "type": "Vehicle",
            "relatedEvidence": [s["id"] for s in sightings],
            "relatedEvents": len(sightings),
        })
    cameras = (
        db.query(CameraRecord)
        .order_by(CameraRecord.id.asc())
        .all()
    )
    for cam in cameras:
        det = (
            db.query(VehicleSighting)
            .filter(VehicleSighting.camera == cam.id)
            .first()
        )
        rows.append({
            "name": f"Camera {cam.id}",
            "type": "Traffic Camera",
            "relatedEvidence": [det.id] if det else [],
            "relatedEvents": 1 if det else 0,
        })
    return rows


def _build_vehicle_section(db: Session) -> dict | None:
    trace = get_trace(db, "CH01AB1234")
    if not trace:
        return None
    correlations = get_correlations(db, "CH01AB1234")
    return {
        "plate": trace["plate"],
        "type": trace["type"],
        "color": trace["color"],
        "cameras": len(trace["sights"]),
        "firstSeen": trace["firstSeen"],
        "lastSeen": trace["lastSeen"],
        "duration": format_duration(trace["durationSeconds"]),
        "route": [s["area"] for s in trace["sights"]],
        "direction": [s["direction"] for s in trace["sights"]],
        "sightings": [
            {
                "id": s["id"],
                "camera": s["camera"],
                "area": s["area"],
                "time": s["time"],
                "direction": s["direction"],
            }
            for s in trace["sights"]
        ],
        "correlations": [
            {
                "source": c["sourceLabel"],
                "detail": c["detail"],
                "time": c["time"],
                "sector": c["sector"],
                "evidenceId": c["evidenceId"],
            }
            for c in correlations
        ],
        "status": STATUS_NEUTRAL,
    }


def build_report_model(db: Session, case_id: str) -> dict:
    from models import EventRecord

    case = db.query(Case).filter(Case.id == case_id).first()
    alerts = get_alerts(db, case_id)
    contradictions = get_contradictions(db, case_id)
    contradiction = contradictions[0] if contradictions else None

    first_by_type: list[dict] = []
    for alert in alerts:
        if not any(x["type"] == alert["type"] for x in first_by_type):
            first_by_type.append(alert)

    leads = [
        {
            "type": a["type"],
            "observed": a["description"],
            "reason": a["reason"],
            "evidence": a["evidenceIds"],
            "status": STATUS_NEUTRAL,
        }
        for a in first_by_type
    ]

    events = []
    for row in db.query(EventRecord).filter(EventRecord.case_id == case_id).order_by(EventRecord.timestamp.asc()).all():
        if not row.in_window:
            continue
        events.append({
            "time": row.time,
            "source": row.source,
            "description": row.description,
            "evidenceId": row.evidence_id,
        })
    events.sort(key=lambda e: e["time"])

    relationship_lead = next((a for a in alerts if a["type"] == "Potential Relationship"), None)
    relationship = (
        {
            "subject": relationship_lead["title"],
            "sources": [source_label(s) for s in relationship_lead["sourceTypes"]],
            "evidence": relationship_lead["evidenceIds"],
            "status": STATUS_NEUTRAL,
        }
        if relationship_lead
        else None
    )

    contradiction_section = None
    if contradiction and contradiction["independentEvidence"]:
        contradiction_section = {
            "claim": contradiction["claim"],
            "records": [
                {"time": r["time"], "source": source_label(r["source"]), "detail": r["detail"]}
                for r in contradiction["independentEvidence"]
            ],
            "assessment": contradiction["assessment"],
            "status": STATUS_NEUTRAL,
        }

    related_evidence = relationship_lead["evidenceIds"] if relationship_lead else []
    financial_ids = {e for a in alerts if "financial" in a["type"].lower() for e in a["evidenceIds"]}
    evidence_table = []
    for event in events:
        evidence_id = event["evidenceId"]
        if evidence_id in financial_ids:
            referenced_by = "Financial Anomaly"
        elif evidence_id in related_evidence:
            referenced_by = "Relationship"
        else:
            referenced_by = "Critical Window"
        evidence_table.append({
            "id": evidence_id,
            "source": event["source"],
            "timestamp": event["time"],
            "description": event["description"],
            "referencedBy": referenced_by,
        })

    entity_rows = _entity_rows(db, case_id)
    node_count = db.query(GraphNode).filter(GraphNode.case_id == case_id).count() or len(entity_rows)
    edge_count = db.query(GraphEdge).filter(GraphEdge.case_id == case_id).count()
    source_count = db.query(EventRecord).filter(EventRecord.case_id == case_id).distinct(EventRecord.source).count()
    total_events = db.query(EventRecord).filter(EventRecord.case_id == case_id).count()

    return {
        "caseId": case_id,
        "title": case.title if case else "Synthetic demonstration case",
        "status": case.status if case else "Analyzed",
        "generated": dt.datetime.now().strftime("%d %B %Y"),
        "overview": {
            "sources": source_count or 6,
            "events": total_events,
            "entities": node_count,
            "relationships": edge_count,
            "leads": len(alerts),
            "windows": 1 if events else 0,
        },
        "entities": entity_rows,
        "leads": leads,
        "events": events,
        "relationship": relationship,
        "contradiction": contradiction_section,
        "vehicle": _build_vehicle_section(db),
        "evidenceRows": evidence_table,
    }


def _escape(value) -> str:
    import html
    return html.escape(str(value))


def render_report_html(model: dict) -> str:
    def rows_html(pairs):
        return "".join(
            f"<tr><td class=\"k\">{_escape(k)}</td><td>{_escape(v)}</td></tr>"
            for k, v in pairs
        )

    def evidence_chips(ids):
        return "".join(f'<span class="mono chip">{_escape(i)}</span>' for i in ids)

    entity_html = "".join(
        f"""
        <tr>
          <td class="mono">{_escape(e['name'])}</td>
          <td>{_escape(e['type'])}</td>
          <td>{evidence_chips(e['relatedEvidence'])}</td>
          <td>{_escape(e['relatedEvents'])}</td>
        </tr>"""
        for e in model["entities"]
    )

    events_html = "".join(
        f"""
        <tr>
          <td class="mono">{_escape(e['time'])}</td>
          <td>{_escape(source_label(e['source']))}</td>
          <td>{_escape(e['description'])}</td>
          <td class="mono">{_escape(e['evidenceId'])}</td>
        </tr>"""
        for e in model["events"]
    )

    leads_html = "".join(
        f"""
        <div class="block">
          <h4>{_escape(l['type']).upper()}</h4>
          <p><strong>Observed:</strong> {_escape(l['observed'])}</p>
          <p><strong>Reason:</strong> {_escape(l['reason'])}</p>
          <p class="mono line"><strong>Evidence:</strong> {evidence_chips(l['evidence'])}</p>
          <p><strong>Status:</strong> {_escape(l['status'])}</p>
        </div>"""
        for l in model["leads"]
    )

    evidence_html = "".join(
        f"""
        <tr>
          <td class="mono">{_escape(r['id'])}</td>
          <td>{_escape(source_label(r['source']))}</td>
          <td class="mono">{_escape(r['timestamp'])}</td>
          <td>{_escape(r['description'])}</td>
          <td>{_escape(r['referencedBy'])}</td>
        </tr>"""
        for r in model["evidenceRows"]
    )

    rel = model["relationship"]
    rel_html = (
        f"""
        <div class="block">
          <h4>{_escape(rel['subject'])}</h4>
          <p><strong>Potential Relationship</strong></p>
          <p><strong>Supporting sources:</strong> {_escape(', '.join(rel['sources']))}</p>
          <p class="mono line"><strong>Evidence:</strong> {evidence_chips(rel['evidence'])}</p>
          <p><strong>Status:</strong> {_escape(rel['status'])}</p>
        </div>"""
        if rel
        else "<p>No potential relationships identified in this phase.</p>"
    )

    veh = model["vehicle"]
    veh_html = ""
    if veh:
        sightings = "".join(
            f"<p class=\"mono line\">{_escape(s['time'])} · Camera {_escape(s['camera'])} · {_escape(s['area'])} · {_escape(s['direction'])}</p>"
            for s in veh["sightings"]
        )
        correlations = "".join(
            f"<p class=\"mono line\">{_escape(c['time'])} · {_escape(c['source'])} · {_escape(c['sector'])} · {evidence_chips([c['evidenceId']])}</p>"
            for c in veh["correlations"]
        )
        veh_html = f"""
        <div class="block">
          <h4>VEHICLE MOVEMENT ANALYSIS</h4>
          <p class="mono line"><strong>Vehicle:</strong> {_escape(veh['plate'])} · {_escape(veh['type'])} · {_escape(veh['color'])} · Synthetic demo trace</p>
          <p><strong>Camera coverage:</strong> {_escape(veh['cameras'])} traffic cameras · first {_escape(veh['firstSeen'])} · last {_escape(veh['lastSeen'])} · {_escape(veh['duration'])}</p>
          <p><strong>Observed route (illustrative):</strong> {_escape(' → '.join(veh['route']))}</p>
          {sightings}
          <p><strong>Potential correlations (surrounding source records):</strong></p>
          {correlations}
          <p>These are observed time/sector alignments only. They do not associate any person with the vehicle and do not infer a destination.</p>
          <p><strong>Status:</strong> {_escape(veh['status'])}</p>
        </div>"""
    else:
        veh_html = "<p>No synthetic vehicle trace is attached to this phase.</p>"

    con = model["contradiction"]
    if con:
        records = "".join(
            f"\n           <p class=\"mono line\">{_escape(r['time'])} · {_escape(r['source'])} · {_escape(r['detail'])}</p>"
            for r in con["records"]
        )
        con_html = f"""
        <div class="block">
          <h4>POTENTIAL CONTRADICTION</h4>
          <p><strong>Statement claim:</strong> “{_escape(con['claim'])}”</p>
          {records}
          <p><strong>Assessment:</strong> {_escape(con['assessment'])}</p>
          <p><strong>Status:</strong> {_escape(con['status'])}</p>
        </div>"""
    else:
        con_html = "<p>No potential contradictions identified in this phase.</p>"

    m = model
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Investigation Report — CASE #{_escape(m['caseId'])}</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Inter', ui-sans-serif, system-ui, Arial, sans-serif; color: #1a2435; background: #fff; margin: 0; padding: 32px 48px; }}
  h2 {{ font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #3b5f94; border-bottom: 2px solid #d4deea; padding-bottom: 6px; margin: 28px 0 12px; }}
  h3 {{ font-size: 13px; margin: 0 0 8px; color: #223c63; }}
  h4 {{ font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px; color: #223c63; }}
  p {{ margin: 4px 0; font-size: 13px; line-height: 1.55; }}
  table {{ width: 100%; border-collapse: collapse; margin: 8px 0 4px; font-size: 13px; }}
  th {{ text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #5a7fae; border-bottom: 2px solid #d4deea; padding: 6px 8px; }}
  td {{ border-bottom: 1px solid #e6ecf4; padding: 7px 8px; vertical-align: top; }}
  .mono {{ font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }}
  .k {{ color: #5a7fae; white-space: nowrap; padding-right: 24px; }}
  .chip {{ display: inline-block; border: 1px solid #c6d4e6; border-radius: 4px; padding: 1px 6px; margin: 0 4px 2px 0; background: #f3f7fc; }}
  .block {{ border: 1px solid #dfe7f1; border-radius: 6px; padding: 12px 14px; margin: 10px 0; background: #fafcfe; }}
  .line {{ margin: 2px 0 6px; }}
  .overview {{ display: flex; flex-wrap: wrap; gap: 12px; }}
  .stat {{ flex: 1 1 110px; border: 1px solid #dfe7f1; border-radius: 6px; padding: 10px 12px; background: #f7fafd; }}
  .stat b {{ display: block; font-size: 22px; color: #14233c; }}
  .stat span {{ font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #5a7fae; }}
  .mast {{ border-bottom: 3px double #3b5f94; padding-bottom: 14px; margin-bottom: 20px; }}
  .mast small {{ display: block; color: #5a7fae; letter-spacing: 2px; text-transform: uppercase; font-size: 10px; margin-top: 4px; }}
  .disclaimer {{ border: 1px solid #f2d79a; background: #fff8e8; color: #8a6d1a; border-radius: 6px; padding: 10px 12px; font-size: 12px; }}
  input[type=checkbox] {{ margin-right: 8px; }}
  ul {{ margin: 6px 0; padding-left: 18px; }}
  li {{ font-size: 13px; margin: 4px 0; }}
  .signoff {{ margin-top: 28px; border-top: 1px solid #d4deea; padding-top: 12px; font-size: 11px; color: #5a7fae; }}
</style>
</head>
<body>
  <div class="mast">
    <div style="font-size:18px; font-weight:800; letter-spacing:3px; color:#14233c;">FORENSIGHT</div>
    <small>Multi-Source Investigative Analytics</small>
    <h2 style="border:0; margin:14px 0 4px;">Investigation Report</h2>
    <table>
      {rows_html([
        ('Case Number', f"CASE #{m['caseId']}"),
        ('Case Title', m['title']),
        ('Generated', m['generated']),
        ('Environment', 'DEMONSTRATION DATA — SYNTHETIC / SANITIZED'),
        ('Prepared for', 'Investigator Review'),
      ])}
    </table>
  </div>

  <div class="disclaimer">
    This is a prototype report generated from synthetic demonstration data.
    Analytical results do not constitute legal conclusions or determinations of guilt.
    Independent investigator verification is required before any investigative action or conclusion.
  </div>

  <h2>Executive Summary</h2>
  <p>This prototype analysis identified multiple potential relationships and correlated events across independent synthetic evidence sources associated with Case #{_escape(m['caseId'])}.</p>
  <p>Observed activity includes communication, digital access, financial activity, social interaction and device/location associations within a concentrated time period.</p>
  <p>These results are investigative leads generated from synthetic demonstration data and require investigator verification.</p>

  <h2>Case Overview</h2>
  <div class="overview">
    <div class="stat"><b>CASE</b><span>#{_escape(m['caseId'])}</span></div>
    <div class="stat"><b>{_escape(m['overview']['sources'])}</b><span>Evidence sources</span></div>
    <div class="stat"><b>{_escape(m['overview']['events'])}</b><span>Events</span></div>
    <div class="stat"><b>{_escape(m['overview']['entities'])}</b><span>Entities</span></div>
    <div class="stat"><b>{_escape(m['overview']['relationships'])}</b><span>Relationships</span></div>
    <div class="stat"><b>{_escape(m['overview']['leads'])}</b><span>Potential leads</span></div>
    <div class="stat"><b>{_escape(m['overview']['windows'])}</b><span>Critical windows</span></div>
  </div>

  <h2>Key Entities</h2>
  <table>
    <thead><tr><th>Name</th><th>Type</th><th>Related Evidence</th><th>Related Events</th></tr></thead>
    <tbody>{entity_html}</tbody>
  </table>

  <h2>Key Investigative Leads</h2>
  {leads_html}

  <h2>Key Event Sequence</h2>
  <table>
    <thead><tr><th>Time</th><th>Source</th><th>Description</th><th>Evidence</th></tr></thead>
    <tbody>{events_html}</tbody>
  </table>

  <h2>Relationship Analysis</h2>
  {rel_html}

  <h2>Vehicle Movement Analysis</h2>
  {veh_html}

  <h2>Potential Contradictions</h2>
  {con_html}

  <h2>Supporting Evidence</h2>
  <table>
    <thead><tr><th>Evidence ID</th><th>Source</th><th>Timestamp</th><th>Description</th><th>Referenced By</th></tr></thead>
    <tbody>{evidence_html}</tbody>
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
</html>"""


def build_report_filename(case_id: str) -> str:
    return f"forensight-investigation-report-case-{case_id}.html"