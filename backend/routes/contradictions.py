"""Contradiction endpoints (read + clear)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user, require_roles
from models import Case, ContradictionRecord, User
from services.audit_service import record_audit
from services.contradiction_engine import get_contradictions

router = APIRouter(prefix="/api/cases", tags=["contradictions"])

WRITE_ROLES = require_roles("INVESTIGATOR", "ANALYST", "ADMIN")


@router.get("/{case_id}/contradictions", status_code=status.HTTP_200_OK)
def get_case_contradictions(
    case_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if db.query(Case).filter(Case.id == case_id).first() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

    contradictions = get_contradictions(db, case_id)
    return {"contradictions": contradictions, "total": len(contradictions)}


@router.delete("/{case_id}/contradictions", status_code=status.HTTP_200_OK)
def clear_case_contradictions(
    case_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(WRITE_ROLES),
):
    if db.query(Case).filter(Case.id == case_id).first() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

    deleted = db.query(ContradictionRecord).filter(ContradictionRecord.case_id == case_id).delete()
    record_audit(
        db,
        user=user,
        action="INTERVALS_CLEARED",
        target=f"CASE #{case_id}",
        detail=f"Cleared {deleted} contradiction intervals for case #{case_id}.",
        status="SUCCESS",
        metadata={"case_number": case_id},
    )
    return {"ok": True, "deleted": deleted, "caseId": case_id}