"""Read-only alert endpoints (mockAlerts contract, no confidence field)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Case, User
from services.anomaly_engine import get_alerts
from services.audit_service import record_audit

router = APIRouter(prefix="/api/cases", tags=["alerts"])


@router.get("/{case_id}/alerts", status_code=status.HTTP_200_OK)
def get_case_alerts(
    case_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if db.query(Case).filter(Case.id == case_id).first() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

    alerts = get_alerts(db, case_id)
    record_audit(
        db,
        user=user,
        action="ALERT_VIEWED",
        target=f"CASE #{case_id}",
        detail="Alert center viewed.",
        status="SUCCESS",
        metadata={"case_number": case_id},
    )
    return {"alerts": alerts, "total": len(alerts)}