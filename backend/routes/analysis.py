"""Analysis route — a thin wrapper over the shared orchestration service."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from config import get_settings
from database import get_db
from dependencies import require_roles
from models import User
from services.analysis_service import run_analysis

settings = get_settings()

router = APIRouter(prefix="/api/cases", tags=["analysis"])

ANALYZE_ROLES = require_roles("INVESTIGATOR", "ANALYST")


@router.post("/{case_id}/analyze", status_code=status.HTTP_200_OK)
def analyze_case(
    case_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(ANALYZE_ROLES),
):
    return run_analysis(db, case_id, settings, actor=user)