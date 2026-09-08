"""Read-only timeline endpoint (timelineData.js contract)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config import get_settings
from database import get_db
from dependencies import get_current_user
from models import Case, User
from services.audit_service import record_audit
from services.timeline_engine import build_timeline

settings = get_settings()

router = APIRouter(prefix="/api/cases", tags=["timeline"])


@router.get("/{case_id}/timeline", status_code=status.HTTP_200_OK)
def get_timeline(
    case_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if db.query(Case).filter(Case.id == case_id).first() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

    result = build_timeline(db, case_id, settings)
    record_audit(
        db,
        user=user,
        action="TIMELINE_VIEWED",
        target=f"CASE #{case_id}",
        detail="Critical timeline viewed.",
        status="SUCCESS",
        metadata={"case_number": case_id},
    )
    return result