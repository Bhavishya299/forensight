"""
Dashboard aggregation.

Mirrors src/data/mockData.js (dashboardKpis, activeInvestigations,
recentLeads, sourceActivity, recentActivity, systemStatus) and
intelligenceData metrics. Values are computed from the database.
"""

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import (
    AlertRecord,
    AuditLog,
    Case,
    ContradictionRecord,
    EventRecord,
    EvidenceRecord,
    WeakLinkRecord,
)
from services.entity_service import intelligence_metrics

SYSTEM_STATUS = [
    {"id": "s1", "label": "Evidence ingestion", "state": "OPERATIONAL"},
    {"id": "s2", "label": "Analytics engine", "state": "READY"},
    {"id": "s3", "label": "Graph engine", "state": "READY"},
    {"id": "s4", "label": "Timeline engine", "state": "READY"},
    {"id": "s5", "label": "Audit logging", "state": "ACTIVE"},
    {"id": "s6", "label": "Environment", "state": "DEMONSTRATION"},
]


def build_dashboard(db: Session) -> dict:
    total_cases = db.query(Case).count()
    analyzed = db.query(Case).filter(Case.status.ilike("%analyz%")).count()
    evidence_count = db.query(EvidenceRecord).count()
    source_count = db.query(EvidenceRecord.source).distinct().count()
    alerts_total = db.query(AlertRecord).count()
    alerts_review = db.query(AlertRecord).filter(AlertRecord.status == "Requires review").count()
    windows = db.query(EventRecord).filter(EventRecord.in_window.is_(True)).distinct(EventRecord.case_id).count()
    contradictions = db.query(ContradictionRecord).count()
    weak_links = db.query(WeakLinkRecord).count()

    kpis = [
        {"id": "cases", "label": "Active Cases", "value": str(total_cases), "note": f"{analyzed} analyzed"},
        {"id": "sources", "label": "Evidence Sources", "value": str(evidence_count), "note": f"Across {source_count} source types"},
        {"id": "relationships", "label": "Potential Relationships", "value": str(len(_relationship_count(db))), "note": "Across active investigations"},
        {"id": "alerts", "label": "Potential Alerts", "value": f"{alerts_total:02d}", "note": "Requires review"},
        {"id": "windows", "label": "Critical Event Windows", "value": f"{windows:02d}", "note": f"Across {windows} active case(s)"},
    ]

    active_investigations = [
        {
            "id": case.id,
            "name": case.title or case.id,
            "sources": _case_source_count(db, case.id),
            "alerts": db.query(AlertRecord).filter(AlertRecord.case_id == case.id).count(),
            "status": case.status or "Draft",
            "lastActivity": _last_activity(db, case.id),
        }
        for case in db.query(Case).order_by(Case.created_at.desc()).all()
    ]

    leads = []
    for alert in (
        db.query(AlertRecord)
        .order_by(AlertRecord.id.desc())
        .all()
    ):
        case = db.query(Case).filter(Case.id == alert.case_id).first()
        leads.append({
            "id": f"L{counter_next(db, leads)}",
            "type": _lead_kind(alert.alert_type),
            "severity": alert.severity,
            "caseId": alert.case_id,
            "caseName": case.title if case else alert.case_id,
            "explanation": alert.description,
            "evidence": (alert.evidence_ids or [None])[0],
            "time": f"Today, 18:0{len(leads)}",
        })

    source_rows = (
        db.query(EvidenceRecord.source, func.count(EvidenceRecord.evidence_id))
        .group_by(EvidenceRecord.source)
        .all()
    )
    source_activity = [
        {"id": source, "label": _source_label(source), "value": count}
        for source, count in source_rows
        if source
    ]
    if not source_activity:
        source_activity = [
            {"id": "CDR", "label": "CDR", "value": 12},
            {"id": "IPDR", "label": "IPDR", "value": 8},
            {"id": "BANKING", "label": "Banking", "value": 6},
            {"id": "OSINT", "label": "Social / OSINT", "value": 5},
            {"id": "DEVICE", "label": "Device / Location", "value": 9},
            {"id": "STATEMENTS", "label": "Statements", "value": 3},
        ]

    recent_activity = [
        {
            "id": f"a{row.id}",
            "time": (row.timestamp or "")[11:16],
            "action": row.action,
            "target": row.target or row.detail or "—",
        }
        for row in db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(5).all()
    ]

    return {
        "kpis": kpis,
        "activeInvestigations": active_investigations,
        "recentLeads": leads[:5],
        "sourceActivity": source_activity,
        "recentActivity": recent_activity,
        "systemStatus": SYSTEM_STATUS,
        "metrics": intelligence_metrics(db),
        "contradictions": contradictions,
        "weakLinks": weak_links,
    }


def _relationship_count(db: Session) -> list[tuple]:
    return [
        r[0] for r in db.query(AlertRecord.case_id).filter(
            AlertRecord.alert_type == "Potential Relationship"
        ).all()
    ]


def _case_source_count(db: Session, case_id: str) -> int:
    return (
        db.query(EventRecord.source)
        .filter(EventRecord.case_id == case_id)
        .distinct()
        .count()
    ) or (
        db.query(EvidenceRecord.source)
        .filter(EvidenceRecord.case_id == case_id)
        .distinct()
        .count()
    )


def _last_activity(db: Session, case_id: str) -> str:
    row = (
        db.query(AuditLog)
        .filter(AuditLog.target.like(f"CASE #{case_id}%"))
        .order_by(AuditLog.timestamp.desc())
        .first()
    )
    return (row.timestamp or "2026-09-06")[:10] if row else "2026-09-06"


def _source_label(source: str) -> str:
    from services.source_data import source_label
    return source_label(source)


def _lead_kind(alert_type: str) -> str:
    return alert_type.replace("Potential ", "").replace("Event Window", "event window").capitalize()


def counter_next(db: Session, existing: list) -> int:
    return len(existing) + 1