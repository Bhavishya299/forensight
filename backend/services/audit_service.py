"""
Append-only, tamper-evident audit trail.

Every row stores the SHA-256 of the canonicalized previous row plus its own
content, forming a hash chain. Any deletion/edit or out-of-order insert
breaks the chain and is detectable via `verify_chain()`.

Frontend contract mapping (src/data/auditData.js):
    {id, user, role, action, caseNumber, caseLabel, detail, target,
     status, system, date, time, bucket, ipAddress}
"""

import hashlib
from datetime import datetime, time

from fastapi import Request
from sqlalchemy.orm import Session

from models import AuditLog, User

APPEND_ONLY_ACTIONS = {
    "LOGIN",
    "LOGIN_FAILED",
    "LOGOUT",
    "TOKEN_REFRESHED",
    "FORGOT_PASSWORD_REQUESTED",
    "ACCESS_REQUESTED",
    "ACCESS_REQUEST_APPROVED",
    "ACCESS_REQUEST_REJECTED",
    "CASE_CREATED",
    "CASE_VIEWED",
    "EVIDENCE_UPLOADED",
    "EVIDENCE_VIEWED",
    "EVIDENCE_VERIFIED",
    "ANALYSIS_STARTED",
    "GRAPH_VIEWED",
    "TIMELINE_VIEWED",
    "ALERT_VIEWED",
    "REPORT_EXPORTED",
    "VEHICLE_TRACE_SEARCHED",
    "CCTV_DETECTION_VIEWED",
    "VEHICLE_CASE_CORRELATED",
    "VEHICLE_GRAPH_VIEWED",
}


def _now_stamp() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M")


def _canonical(entry: dict) -> str:
    """Deterministic, stable serialization of one audit row for hashing."""
    keys = [
        "user_id", "username", "role", "action", "target", "detail",
        "status", "ip_address", "timestamp", "metadata",
    ]
    parts = []
    for key in keys:
        value = entry.get(key)
        if isinstance(value, (dict, list)):
            import json

            value = json.dumps(value, sort_keys=True, default=str)
        parts.append(f"{key}={value if value is not None else ''}")
    return "|".join(parts)


def _chain_hash(prev_hash: str, entry: dict) -> str:
    raw = f"{prev_hash}\n{_canonical(entry)}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def record_audit(
    db: Session,
    *,
    user: User | None,
    action: str,
    target: str = "",
    detail: str = "",
    status: str = "SUCCESS",
    request: Request | None = None,
    metadata: dict | None = None,
) -> AuditLog:
    """Insert an append-only audit row and return it."""
    last = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_hash = last.hash if last else ""

    ip = "0.0.0.0"
    ua = ""
    if request is not None:
        fwd = request.headers.get("x-forwarded-for", "")
        ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "0.0.0.0")
        ua = (request.headers.get("user-agent") or "")[:255]

    entry = {
        "user_id": user.id if user else None,
        "username": user.name if user else None,
        "role": user.role if user else None,
        "action": action,
        "target": target,
        "detail": detail,
        "status": status,
        "ip_address": ip,
        "timestamp": _now_stamp(),
        "metadata": metadata or {},
    }

    row = AuditLog(
        user_id=user.id if user else None,
        username=user.name if user else None,
        role=user.role if user else None,
        action=action,
        target=target,
        detail=detail,
        status=status,
        ip_address=ip,
        user_agent=ua,
        timestamp=entry["timestamp"],
        audit_metadata=metadata or {},
        prev_hash=prev_hash,
        hash=_chain_hash(prev_hash, entry),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def verify_chain(db: Session) -> dict:
    """Return {'verified': bool, 'brokenAt': index_or_null, 'count': n}."""
    rows = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
    prev = ""
    for i, row in enumerate(rows):
        entry = {
            "user_id": row.user_id,
            "username": row.username,
            "role": row.role,
            "action": row.action,
            "target": row.target,
            "detail": row.detail,
            "status": row.status,
            "ip_address": row.ip_address,
            "timestamp": row.timestamp,
            "metadata": row.audit_metadata or {},
        }
        expected = _chain_hash(prev, entry)
        if row.hash != expected:
            return {"verified": False, "brokenAt": i, "count": len(rows)}
        prev = row.hash
    return {"verified": True, "brokenAt": None, "count": len(rows)}


def _bucket_for_date(date_str: str, now: datetime) -> str:
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
        today = now.date()
        delta = (today - d).days
        if delta <= 0:
            return "Today"
        if delta == 1:
            return "Yesterday"
        if delta <= 7:
            return "Last 7 Days"
        return "Older"
    except ValueError:
        return "Older"


def audit_to_frontend(row: AuditLog) -> dict:
    """Map an AuditLog row to the auditData.js contract shape."""
    date_str = (row.timestamp or "")[:10]
    time_str = (row.timestamp or "")[11:16] or ""
    now = datetime.utcnow()

    is_system = row.action == "LOGIN" or row.action == "LOGIN_FAILED"
    case_number = None
    case_label = "—"
    if row.target and row.target.startswith("CASE #"):
        case_number = row.target.replace("CASE #", "").strip()
        case_label = row.target
    elif row.audit_metadata and row.audit_metadata.get("case_number"):
        case_number = str(row.audit_metadata.get("case_number"))
        case_label = f"CASE #{case_number}"

    action = row.action
    short = action.lower().replace("_", "")
    return {
        "id": f"{short}-{int(row.id):06d}",
        "user": row.username or "SYSTEM",
        "role": row.role or "SYSTEM",
        "action": action,
        "caseNumber": case_number,
        "caseLabel": case_label,
        "detail": row.detail or "",
        "target": row.target or "—",
        "status": row.status,
        "system": is_system,
        "date": date_str or "2026-09-07",
        "time": time_str or "00:00",
        "bucket": _bucket_for_date(date_str, now) if date_str else "Today",
        "ipAddress": row.ip_address,
    }


def list_audit_rows(db: Session) -> list[dict]:
    rows = db.query(AuditLog).order_by(AuditLog.id.desc()).all()
    return [audit_to_frontend(r) for r in rows]