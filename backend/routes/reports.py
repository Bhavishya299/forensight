"""Report endpoints (reportModel.js contract + standalone HTML export)."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Case, User
from services.audit_service import record_audit
from services.report_engine import build_report_filename, build_report_model, render_report_html

router = APIRouter(prefix="/api/cases", tags=["reports"])


@router.get("/{case_id}/report", status_code=status.HTTP_200_OK)
def get_report(
    case_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if db.query(Case).filter(Case.id == case_id).first() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    return build_report_model(db, case_id)


@router.get("/{case_id}/report/download", response_class=HTMLResponse, status_code=status.HTTP_200_OK)
def download_report(
    case_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if db.query(Case).filter(Case.id == case_id).first() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    model = build_report_model(db, case_id)
    html = render_report_html(model)
    filename = build_report_filename(case_id)

    record_audit(
        db,
        user=user,
        action="REPORT_EXPORTED",
        target=f"CASE #{case_id}",
        detail="Investigation report exported.",
        status="SUCCESS",
        metadata={"case_number": case_id},
    )
    return HTMLResponse(
        content=html,
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"",
            "X-Content-Type-Options": "nosniff",
        },
    )