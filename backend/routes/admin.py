"""Administrator-only routes for access request governance.

Only users with role ADMIN may list / approve / reject requests.
An approved request creates the User record from the already-hashed
password submitted at request time; the granted role is chosen by the
admin and is capped below ADMIN on this endpoint (no self-service or
two-step escalation path).
"""

from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_roles
from models import AccessRequest, User
from services.audit_service import record_audit

router = APIRouter(prefix="/api/admin", tags=["admin"])

APPROVABLE_ROLES = {"INVESTIGATOR", "ANALYST"}


class AccessDecisionIn(BaseModel):
    role: Optional[Literal["INVESTIGATOR", "ANALYST"]] = None


def _request_payload(row: AccessRequest) -> dict:
    return {
        "id": row.id,
        "loginId": row.login_id,
        "fullName": row.full_name,
        "department": row.department,
        "email": row.email,
        "justification": row.justification,
        "role": row.role,
        "status": row.status,
        "requestedAt": row.created_at.isoformat() if row.created_at else None,
        "decidedBy": row.decided_by,
        "decidedAt": row.decided_at.isoformat() if row.decided_at else None,
    }


def _get_pending_or_404(db: Session, request_id: int) -> AccessRequest:
    row = db.query(AccessRequest).filter(AccessRequest.id == request_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access request not found.")
    if row.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This request has already been decided.",
        )
    return row


@router.get("/access-requests", status_code=status.HTTP_200_OK)
def list_access_requests(
    status_filter: str = "PENDING",
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("ADMIN")),
):
    query = db.query(AccessRequest)
    if status_filter:
        query = query.filter(AccessRequest.status == status_filter.upper())
    rows = query.order_by(AccessRequest.id.asc()).all()
    return {"requests": [_request_payload(r) for r in rows]}


@router.post("/access-requests/{access_request_id}/approve", status_code=status.HTTP_200_OK)
def approve_access_request(
    access_request_id: int,
    body: AccessDecisionIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("ADMIN")),
):
    row = _get_pending_or_404(db, access_request_id)

    granted_role = body.role or row.role or "INVESTIGATOR"
    if granted_role not in APPROVABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only INVESTIGATOR or ANALYST may be granted through an access request.",
        )

    existing = db.query(User).filter(User.login_id == row.login_id).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this login ID already exists.",
        )

    user = User(
        login_id=row.login_id,
        name=row.full_name,
        email=row.email,
        department=row.department,
        password_hash=row.password_hash,
        role=granted_role,
        is_active=True,
    )
    db.add(user)
    db.flush()

    row.status = "APPROVED"
    row.decided_by = admin.id
    row.decided_at = datetime.utcnow()
    db.add(row)
    db.commit()

    record_audit(
        db,
        user=admin,
        action="ACCESS_REQUEST_APPROVED",
        target=row.login_id,
        detail=f"Granted role {granted_role} to {row.full_name}.",
        status="SUCCESS",
    )

    return {"ok": True, "request": _request_payload(row), "user": {"id": user.id, "loginId": user.login_id, "role": user.role}}


@router.post("/access-requests/{access_request_id}/reject", status_code=status.HTTP_200_OK)
def reject_access_request(
    access_request_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("ADMIN")),
):
    row = _get_pending_or_404(db, access_request_id)

    row.status = "REJECTED"
    row.decided_by = admin.id
    row.decided_at = datetime.utcnow()
    db.add(row)
    db.commit()

    record_audit(
        db,
        user=admin,
        action="ACCESS_REQUEST_REJECTED",
        target=row.login_id,
        detail=f"Access request from {row.full_name} rejected.",
        status="SUCCESS",
    )

    return {"ok": True, "request": _request_payload(row)}