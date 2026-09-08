"""Case management routes.

POST /api/cases mirrors CreateCase.jsx exactly: the submitted `number`
becomes the case id, and the remaining fields map 1:1 to mockData.js
(mockCases rows). GET /api/cases returns the same list shape; the overview
endpoint returns stats/sources/activity compatible with the case workspace
mockOverviewStats / mockCaseSources / mockCaseActivity contracts.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user, require_roles
from models import (
    AlertRecord,
    AuditLog,
    Case,
    ContradictionRecord,
    EntityCaseRecord,
    EventRecord,
    EvidenceRecord,
    WeakLinkRecord,
    User,
)
from schemas import CaseCreateIn
from services.audit_service import record_audit
from services.source_data import source_label

router = APIRouter(prefix="/api/cases", tags=["cases"])

CREATION_ROLES = require_roles("INVESTIGATOR", "ADMIN")
WRITE_EDIT_ROLES = require_roles("INVESTIGATOR", "ADMIN")


def _today() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


def case_payload(row: Case, db: Session) -> dict:
    alert_count = db.query(func.count(AlertRecord.id)).filter(AlertRecord.case_id == row.id).scalar() or 0
    event_count = db.query(func.count(EventRecord.id)).filter(EventRecord.case_id == row.id).scalar() or 0
    return {
        "id": row.id,
        "title": row.title,
        "status": row.status,
        "priority": row.priority,
        "description": row.description or "",
        "owner": row.owner,
        "tags": row.tags or [],
        "recordCount": row.record_count,
        "sourceCount": row.source_count,
        "createdAt": row.created_at,
        "updatedAt": row.updated_at,
        "analysisStatus": row.analysis_status,
        "alerts": alert_count,
        "events": event_count,
    }


def _source_distribution(db: Session, case_id: str) -> list[dict]:
    rows = (
        db.query(EvidenceRecord.source, func.count(EvidenceRecord.id))
        .filter(EvidenceRecord.case_id == case_id)
        .group_by(EvidenceRecord.source)
        .order_by(func.count(EvidenceRecord.id).desc())
        .all()
    )
    return [
        {"type": src, "label": source_label(src), "count": count}
        for src, count in rows
    ]


def _case_activity(db: Session, case_id: str) -> list[dict]:
    rows = (
        db.query(AuditLog)
        .order_by(AuditLog.id.desc())
        .limit(500)
        .all()
    )
    out = []
    for row in rows:
        linked = False
        if row.target and row.target.startswith("CASE #"):
            if row.target.replace("CASE #", "").strip() == case_id:
                linked = True
        elif row.audit_metadata and row.audit_metadata.get("case_number") == case_id:
            linked = True
        if not linked:
            continue
        stamp = (row.timestamp or "")[11:16] or "00:00"
        action = row.action.lower().replace("_", " ")
        action = action[:1].upper() + action[1:]
        out.append(
            {
                "id": f"ca{row.id}",
                "time": stamp,
                "action": action,
                "detail": row.detail or row.target or "",
                "actor": row.username or "System",
            }
        )
        if len(out) >= 10:
            break
    return out


def _last_ingestion(db: Session, case_id: str) -> str:
    latest_event = (
        db.query(EventRecord.timestamp)
        .filter(EventRecord.case_id == case_id)
        .order_by(EventRecord.timestamp.desc())
        .first()
    )
    if latest_event and latest_event[0]:
        return str(latest_event[0])[-5:]
    latest_evidence = (
        db.query(EvidenceRecord.added_at)
        .filter(EvidenceRecord.case_id == case_id)
        .order_by(EvidenceRecord.id.desc())
        .first()
    )
    if latest_evidence and latest_evidence[0]:
        return str(latest_evidence[0])[-5:]
    return "—"


@router.get("", status_code=status.HTTP_200_OK)
def list_cases(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = db.query(Case).order_by(Case.created_at.desc()).all()
    return {"cases": [case_payload(r, db) for r in rows]}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_case(
    body: CaseCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(CREATION_ROLES),
):
    number = body.number.strip()
    if not number or not number.isdigit():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Case number must be numeric.",
        )
    if db.query(Case).filter(Case.id == number).first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Case #{number} already exists.",
        )

    today = _today()
    row = Case(
        id=number,
        title=body.title.strip(),
        description=body.description or "",
        status=body.status or "Active",
        priority=body.priority or "Medium",
        owner=body.owner or (user.name if user else None),
        tags=body.tags or [],
        record_count=0,
        source_count=0,
        analysis_status="Not analyzed",
        created_by=user.id if user else None,
        created_at=today,
        updated_at=today,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    record_audit(
        db,
        user=user,
        action="CASE_CREATED",
        target=f"CASE #{row.id}",
        detail=f"Workspace initialized for case {row.title}.",
        status="SUCCESS",
        metadata={"case_number": row.id},
    )

    return {"id": row.id, "case": case_payload(row, db)}


@router.get("/{case_id}", status_code=status.HTTP_200_OK)
def get_case(
    case_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = _get_case_or_404(db, case_id)
    record_audit(
        db,
        user=user,
        action="CASE_VIEWED",
        target=f"CASE #{row.id}",
        detail="Case workspace opened.",
        status="SUCCESS",
        metadata={"case_number": row.id},
    )
    return case_payload(row, db)


@router.get("/{case_id}/overview", status_code=status.HTTP_200_OK)
def get_case_overview(
    case_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = _get_case_or_404(db, case_id)

    sources = _source_distribution(db, case_id)
    stats = {
        "records": db.query(func.count(EvidenceRecord.id)).filter(EvidenceRecord.case_id == case_id).scalar() or 0,
        "sourceCount": len(sources),
        "sources": len(sources),
        "potentialRelationships": db.query(func.count(WeakLinkRecord.id)).filter(WeakLinkRecord.case_id == case_id).scalar() or 0,
        "alerts": db.query(func.count(AlertRecord.id)).filter(AlertRecord.case_id == case_id).scalar() or 0,
        "events": db.query(func.count(EventRecord.id)).filter(EventRecord.case_id == case_id).scalar() or 0,
        "entities": db.query(func.count(EntityCaseRecord.id)).filter(EntityCaseRecord.case_id == case_id).scalar() or 0,
        "contradictions": db.query(func.count(ContradictionRecord.id)).filter(ContradictionRecord.case_id == case_id).scalar() or 0,
        "lastIngestion": _last_ingestion(db, case_id),
    }

    return {
        "case": case_payload(row, db),
        "stats": stats,
        "sources": sources,
        "activity": _case_activity(db, case_id),
    }


def _get_case_or_404(db: Session, case_id: str) -> Case:
    row = db.query(Case).filter(Case.id == case_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    return row