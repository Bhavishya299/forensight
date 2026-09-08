"""Analysis pipeline orchestration shared by the /analyze route and seed.py.

Pure composition of the engine services — no business logic lives here.

Idempotency contract:
  - events, graph nodes/edges, and alerts are DELETED and regenerated on
    each run (never duplicated),
  - contradictions and weak links are PRESERVED when canonical rows already
    exist for the case (keep_existing=True).
"""

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Case, EvidenceRecord, User
from services.anomaly_engine import get_alerts, rebuild_alerts
from services.audit_service import record_audit
from services.contradiction_engine import rebuild_contradictions
from services.correlation import rebuild_weak_links
from services.entity_service import sync_entities
from services.graph_engine import rebuild_graph
from services.ingestion import normalize_case
from services.timeline_engine import assign_window_flags, build_timeline


def run_analysis(
    db: Session,
    case_id: str,
    settings,
    actor: User | None = None,
) -> dict:
    case = db.query(Case).filter(Case.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

    evidence_count = (
        db.query(func.count(EvidenceRecord.id))
        .filter(EvidenceRecord.case_id == case_id)
        .scalar()
        or 0
    )
    if evidence_count == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Add at least one evidence record before running analysis.",
        )

    # 1. Normalize events (deletes + regenerates EventRecord rows).
    normalize_case(db, case_id)
    db.commit()

    # 2. Timeline scan — build event dicts, detect the critical window.
    timeline_result = build_timeline(db, case_id, settings)
    sync_entities(db, case_id, timeline_result["events"])
    assign_window_flags(db, case_id, timeline_result["window"])
    db.commit()
    timeline_result = build_timeline(db, case_id, settings)  # re-read with flags applied

    # 3. Graph — deletes + regenerates nodes/edges.
    graph_summary = rebuild_graph(db, case_id)
    db.commit()

    # 4. Contradictions — preserved when canonical rows already exist.
    contradictions_result = rebuild_contradictions(db, case_id, keep_existing=True)
    has_contradictions = bool(contradictions_result["contradictions"])

    # 5. Anomaly alerts — deletes + regenerates.
    rebuild_alerts(
        db,
        case_id,
        timeline_result,
        has_contradictions,
        settings,
        contradictions=contradictions_result["contradictions"],
    )
    db.commit()
    alert_rows = get_alerts(db, case_id)
    warns = {"alerts": alert_rows, "total": len(alert_rows)}

    # 6. Weak links — preserved when canonical rows already exist.
    rebuild_weak_links(db, case_id, timeline_result["events"], keep_existing=True)
    db.commit()

    case.analysis_status = "Analyzed"
    case.updated_at = datetime.utcnow().strftime("%Y-%m-%d")
    db.add(case)
    db.commit()

    record_audit(
        db,
        user=actor,
        action="ANALYSIS_STARTED",
        target=f"CASE #{case_id}",
        detail=f"Cross-source analysis completed for case {case.title}.",
        status="SUCCESS",
        metadata={"case_number": case_id},
    )

    return {
        "caseId": case_id,
        "graph": graph_summary,
        "timeline": timeline_result,
        "alerts": warns,
        "contradictions": contradictions_result["contradictions"],
    }