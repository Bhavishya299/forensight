"""Read-only entity / intelligence endpoints (intelligenceData.js contract)."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import User
from services.entity_service import (
    get_connections,
    get_entities,
    get_entity,
    get_entity_cases,
    get_entity_timeline,
    get_weak_links_for_entity,
    intelligence_metrics,
)

router = APIRouter(prefix="/api/entities", tags=["entities"])


@router.get("/metrics", status_code=status.HTTP_200_OK)
def metrics(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return intelligence_metrics(db)


@router.get("", status_code=status.HTTP_200_OK)
def list_entities(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = get_entities(db)
    return {"entities": rows, "total": len(rows)}


@router.get("/{slug}", status_code=status.HTTP_200_OK)
def entity_detail(
    slug: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entity = get_entity(db, slug)
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entity not found.")
    return entity


@router.get("/{slug}/cases", status_code=status.HTTP_200_OK)
def entity_cases(
    slug: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"cases": get_entity_cases(db, slug)}


@router.get("/{slug}/connections", status_code=status.HTTP_200_OK)
def entity_connections(
    slug: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"connections": get_connections(db, slug)}


@router.get("/{slug}/weak-links", status_code=status.HTTP_200_OK)
def entity_weak_links(
    slug: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"weakLinks": get_weak_links_for_entity(db, slug)}


@router.get("/{slug}/timeline", status_code=status.HTTP_200_OK)
def entity_timeline(
    slug: str,
    case_id: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = get_entity_timeline(db, case_id, slug)
    return {"items": rows, "total": len(rows)}