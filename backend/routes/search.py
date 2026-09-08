"""Read-only search endpoint (intelligenceData.querySearch contract)."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import User
from services.search_service import query_search

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("", status_code=status.HTTP_200_OK)
def search(
    q: str = Query("", max_length=120),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    needle = q.strip()
    if not needle:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Query is required.")
    return {"query": needle, "groups": query_search(db, needle)}