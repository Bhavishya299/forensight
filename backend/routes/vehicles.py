"""Read-only vehicle intelligence endpoints (vehicleData.js contract)."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Case, User
from services.audit_service import record_audit
from services.vehicle_service import (
    format_duration,
    get_camera_network,
    get_correlations,
    get_detection,
    get_trace,
    get_traces,
    get_vehicle_for_detection,
    search_trace,
)

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"])


@router.get("/cameras", status_code=status.HTTP_200_OK)
def camera_network(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"cameras": get_camera_network(db), "total": len(get_camera_network(db))}


@router.get("/traces", status_code=status.HTTP_200_OK)
def traces(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = get_traces(db)
    return {"traces": rows, "total": len(rows)}


@router.get("/search", status_code=status.HTTP_200_OK)
def search(
    plate: str = Query(..., min_length=1),
    case_id: str = Query(""),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = search_trace(db, plate)
    if case_id and db.query(Case).filter(Case.id == case_id).first() is not None:
        record_audit(
            db,
            user=user,
            action="VEHICLE_TRACE_SEARCHED",
            target=result.get("plate") or plate,
            detail="Vehicle plate search performed.",
            status="SUCCESS",
            metadata={"case_number": case_id},
        )
    return result


@router.get("/trace/{plate}", status_code=status.HTTP_200_OK)
def trace_by_plate(
    plate: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = get_trace(db, plate)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No trace found for this plate.")
    return row


@router.get("/trace/{plate}/correlations", status_code=status.HTTP_200_OK)
def correlations(
    plate: str,
    case_id: str = Query(""),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = get_correlations(db, plate)
    if case_id and db.query(Case).filter(Case.id == case_id).first() is not None:
        record_audit(
            db,
            user=user,
            action="VEHICLE_CASE_CORRELATED",
            target=plate,
            detail="Vehicle correlated with case evidence.",
            status="SUCCESS",
            metadata={"case_number": case_id},
        )
    return {"correlations": rows, "total": len(rows)}


@router.get("/detections/{detection_id}", status_code=status.HTTP_200_OK)
def detection(
    detection_id: str,
    case_id: str = Query(""),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = get_detection(db, "", detection_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection not found.")
    if case_id and db.query(Case).filter(Case.id == case_id).first() is not None:
        record_audit(
            db,
            user=user,
            action="CCTV_DETECTION_VIEWED",
            target=detection_id,
            detail="CCTV detection record viewed.",
            status="SUCCESS",
            metadata={"case_number": case_id},
        )
    return row


@router.get("/detections/{detection_id}/vehicle", status_code=status.HTTP_200_OK)
def vehicle_for_detection(
    detection_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = get_vehicle_for_detection(db, detection_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No vehicle linked to this detection.")
    return row


@router.get("/label/duration", status_code=status.HTTP_200_OK)
def duration_label(
    seconds: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"value": format_duration(seconds)}