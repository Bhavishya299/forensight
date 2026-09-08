"""Audit trail endpoints.

RBAC model: the full audit trail AND its integrity verification are
governance/oversight functions, so both are restricted to ADMIN and
ANALYST. Investigators see audit-derived activity inside their case
workspace, but not the global trail or chain validation.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_roles
from models import AuditLog, User
from services.audit_service import list_audit_rows, verify_chain

router = APIRouter(prefix="/api/audit", tags=["audit"])

GOVERNANCE_ROLES = require_roles("ADMIN", "ANALYST")


@router.get("", status_code=status.HTTP_200_OK)
def audit_list(
    db: Session = Depends(get_db),
    user: User = Depends(GOVERNANCE_ROLES),
):
    rows = list_audit_rows(db)
    return {"items": rows, "total": len(rows)}


@router.get("/verify", status_code=status.HTTP_200_OK)
def audit_verify(
    db: Session = Depends(get_db),
    user: User = Depends(GOVERNANCE_ROLES),
):
    result = verify_chain(db)
    broken_at_index = result.get("brokenAt")
    broken_at_id = None
    if broken_at_index is not None:
        row = (
            db.query(AuditLog)
            .order_by(AuditLog.id.asc())
            .offset(broken_at_index)
            .limit(1)
            .first()
        )
        broken_at_id = row.id if row else None

    return {
        "valid": bool(result.get("verified")),
        "brokenAtId": broken_at_id,
        "count": result.get("count", 0),
        "verified": bool(result.get("verified")),
    }