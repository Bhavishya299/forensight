"""Read-only graph endpoint.

Returns the graphData.js contract: {summary, nodes, edges, criticalEventWindow}.
The critical window is derived from the timeline engine so the read-only
view always reflects the persisted window state.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config import get_settings
from database import get_db
from dependencies import get_current_user
from models import Case, User
from services.audit_service import record_audit
from services.graph_engine import get_graph_payload
from services.timeline_engine import build_timeline

settings = get_settings()

router = APIRouter(prefix="/api/cases", tags=["graph"])


def _empty_window() -> dict:
    return {
        "start": None,
        "end": None,
        "label": None,
        "durationMinutes": 0,
        "eventIds": [],
        "evidenceIds": [],
        "sourceTypes": [],
        "eventCount": 0,
        "sourceCount": 0,
        "method": None,
    }


@router.get("/{case_id}/graph", status_code=status.HTTP_200_OK)
def get_graph(
    case_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if db.query(Case).filter(Case.id == case_id).first() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

    payload = get_graph_payload(db, case_id)
    window = build_timeline(db, case_id, settings)["overview"].get("window")
    payload["criticalEventWindow"] = window or _empty_window()

    record_audit(
        db,
        user=user,
        action="GRAPH_VIEWED",
        target=f"CASE #{case_id}",
        detail="Entity graph viewed.",
        status="SUCCESS",
        metadata={"case_number": case_id},
    )
    return payload