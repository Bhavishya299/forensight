"""Public self-serve access requests.

POST /api/auth/request-access is the only route in this module. It is
deliberately unauthenticated and creates a PENDING AccessRequest row.

The requested role is NEVER accepted from the request body; pending
requests always carry the least-privileged INVESTIGATOR role and only an
Admin can elevate it during approval.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from dependencies import limiter
from models import AccessRequest, User
from schemas import AccessRequestIn
from security import hash_password
from services.audit_service import record_audit

# Kept separate from anything user-facing so the "role" literal is not
# echoed anywhere in the request/response surface.
DEFAULT_REQUESTED_ROLE = "INVESTIGATOR"

router = APIRouter(prefix="/api/auth", tags=["access-requests"])


@router.post("/request-access", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def request_access(
    request: Request,
    body: AccessRequestIn,
    db: Session = Depends(get_db),
):
    login_id = body.loginId.strip()
    email = (body.email or "").strip().lower() or None

    existing_user = (
        db.query(User).filter(func.lower(User.login_id) == login_id.lower()).first()
    )
    existing_pending = (
        db.query(AccessRequest)
        .filter(
            func.lower(AccessRequest.login_id) == login_id.lower(),
            AccessRequest.status == "PENDING",
        )
        .first()
    )
    if existing_user is not None or existing_pending is not None:
        if existing_user is not None and not existing_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This account exists but is disabled. Contact your administrator.",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this identifier already exists or is already pending approval.",
        )

    row = AccessRequest(
        login_id=login_id,
        full_name=body.fullName.strip(),
        department=body.department.strip(),
        email=email,
        password_hash=hash_password(body.password),
        justification=body.justification or "",
        role=DEFAULT_REQUESTED_ROLE,
        status="PENDING",
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    record_audit(
        db,
        user=None,
        action="ACCESS_REQUESTED",
        target=login_id,
        detail=f"Access requested by {row.full_name} ({row.department}).",
        status="SUCCESS",
        request=request,
    )

    return {
        "ok": True,
        "message": "Your access request has been submitted and is awaiting administrator review.",
        "requestId": row.id,
    }