"""
Evidence ingestion + normalization to the common event model.

Each EvidenceRecord is normalized into zero or more normalized events:

    {id, time, source, eventType, entity1, entity2, description,
     location, evidenceId, window, metadata}

along with a full ISO-ish `timestamp` used for chronological scanning.

Records created by the Create Case UI (JSON POST) are inferred from their
`details` payload. Seeded demonstration records carry a canonical `event`
hint inside their (Fernet-encrypted) details so the synthetic dataset
reproduces the exact frontend timeline after a re-analysis run.
"""

import re

from sqlalchemy.orm import Session

from models import EventRecord, EvidenceRecord
from security import decrypt_json
from services.source_data import normalize_source

EVENT_TYPE_BY_SOURCE = {
    "CDR": "Call",
    "IPDR": "Access",
    "BANKING": "Transfer",
    "OSINT": "Mention",
    "DEVICE": "Location",
    "STATEMENTS": "Statement",
    "CCTV": "Observation",
}

ENTITY_PREFIX_TO_TYPE = {
    "Person": "PERSON",
    "Account": "ACCOUNT",
    "IP": "IP",
    "Device": "DEVICE",
    "Sector": "LOCATION",
    "Social": "SOCIAL",
    "Vehicle": "VEHICLE",
    "Camera": "CAMERA",
}


def parse_amount(value) -> float | None:
    """Parse an Indian-format amount string like '₹3,75,000' into a float."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value)
    digits = re.sub(r"[^\d]", "", text)
    if not digits:
        return None
    try:
        return float(digits)
    except ValueError:
        return None


def _display_time(timestamp: str) -> str:
    """Extract 'HH:MM' from 'YYYY-MM-DD HH:MM[:SS]'."""
    if len(timestamp) >= 16:
        return timestamp[11:16]
    return timestamp


def _infer_event_from_details(source, details: dict) -> dict | None:
    """Best-effort inference for user-created records."""
    source = normalize_source(source)
    etype = EVENT_TYPE_BY_SOURCE.get(source, "Record")
    description = details.get("description") or ""
    entity1 = details.get("entity1")
    entity2 = details.get("entity2")
    timestamp = details.get("timestamp") or ""
    location = details.get("location")

    if source == "CDR":
        _from = details.get("from", "")
        _to = details.get("to", "")
        if _from and _to:
            entity1 = f"Phone {_from}"
            entity2 = f"Phone {_to}"
            etype = "Call"
            direction = details.get("direction", "")
            duration = details.get("duration", "")
            description = description or f"Call {direction} — {_from} → {_to}"
            metadata = {"direction": direction or "—", "duration": duration or "—"}
            return {
                "eventType": etype,
                "entity1": entity1,
                "entity2": entity2,
                "description": description,
                "location": location,
                "timestamp": timestamp,
                "metadata": metadata,
            }
    if source == "BANKING":
        sender = details.get("senderAccount")
        receiver = details.get("receiverAccount")
        amount = details.get("amount", "")
        if sender and receiver:
            entity1 = sender
            entity2 = receiver
            etype = "Transfer"
            description = description or f"Transfer {sender} → {receiver}"
            return {
                "eventType": etype,
                "entity1": entity1,
                "entity2": entity2,
                "description": description,
                "location": location,
                "timestamp": timestamp,
                "metadata": {"amount": amount or "—"},
            }
    # Generic fallback
    return {
        "eventType": etype,
        "entity1": entity1,
        "entity2": entity2,
        "description": description or f"{etype} record",
        "location": location,
        "timestamp": timestamp,
        "metadata": {},
    }


def build_events_for_record(db: Session, evidence: EvidenceRecord) -> list[EventRecord]:
    """Return (unsaved) EventRecord objects for a single evidence record."""
    details = decrypt_json(evidence.details_enc)
    source = normalize_source(evidence.source)

    if details.get("no_event") is True:
        return []

    hint = details.get("event")
    inferred = hint if isinstance(hint, dict) else _infer_event_from_details(source, details)

    if not inferred:
        return []

    timestamp = inferred.get("timestamp") or details.get("timestamp") or evidence.added_at or ""
    event_type = inferred.get("eventType") or EVENT_TYPE_BY_SOURCE.get(source, "Record")
    description = inferred.get("description") or evidence.description or ""
    entity1 = inferred.get("entity1")
    entity2 = inferred.get("entity2")
    location = inferred.get("location")
    metadata = inferred.get("metadata") or {}
    if "record_fields" in details:
        metadata = {**metadata, "record_fields_count": len(details["record_fields"])}

    event_id = make_event_id(source, timestamp, evidence.case_id)

    return [
        EventRecord(
            id=event_id,
            case_id=evidence.case_id,
            timestamp=timestamp,
            time=_display_time(timestamp),
            source=source,
            event_type=event_type,
            entity1=str(entity1) if entity1 else None,
            entity2=str(entity2) if entity2 else None,
            location=str(location) if location else None,
            description=description,
            evidence_id=evidence.evidence_id,
            in_window=False,
            event_metadata=metadata or {},
        )
    ]


def make_event_id(source: str, timestamp: str, case_id: str) -> str:
    if not timestamp:
        return f"evt-{case_id}-{len(timestamp)}"
    digits = re.sub(r"\D", "", timestamp)
    if source == "CCTV" and len(digits) >= 6:
        return f"evt-cctv-{case_id}-{digits[-6:]}"
    if len(digits) >= 4:
        return f"evt-{case_id}-{digits[-4:]}"
    return f"evt-{case_id}-{digits or '0000'}"


def normalize_case(db: Session, case_id: str) -> list[EventRecord]:
    """Rebuild all normalized events for a case from its evidence records.

    Idempotent: existing events for the case are removed first.
    """
    db.query(EventRecord).filter(EventRecord.case_id == case_id).delete()
    db.flush()

    evidence_rows = (
        db.query(EvidenceRecord)
        .filter(EvidenceRecord.case_id == case_id)
        .order_by(EvidenceRecord.id.asc())
        .all()
    )

    seen_event_ids = set()
    created: list[EventRecord] = []
    for evidence in evidence_rows:
        for event in build_events_for_record(db, evidence):
            if event.id in seen_event_ids:
                suffix = 2
                while f"{event.id}-{suffix}" in seen_event_ids:
                    suffix += 1
                event.id = f"{event.id}-{suffix}"
            seen_event_ids.add(event.id)
            db.add(event)
            created.append(event)
    db.flush()
    return created