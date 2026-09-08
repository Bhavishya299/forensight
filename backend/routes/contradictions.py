"""Read-only contradiction endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Case, User
from services.contradiction_engine import get_contradictions

router = APIRouter(prefix="/api/cases", tags=["contradictions"])


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