"""Dashboard endpoint (mockData.js dashboard contract)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import User
from services.dashboard_service import build_dashboard

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", status_code=status.HTTP_200_OK)
def dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return build_dashboard(db)