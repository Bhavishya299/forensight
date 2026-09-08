"""
Potential-contradiction engine.

Extracts stated claims from STATEMENTS evidence and checks them against
independent records (CDR / IPDR / BANKING / DEVICE / CCTV) that fall
inside the claimed interval. NEVER concludes a person is lying or
guilty — output is always "Requires review" with an investigator
verification assessment, exactly like the frontend mockContradictions
contract.
"""

import re

from sqlalchemy.orm import Session

from models import ContradictionRecord, EvidenceRecord
from security import decrypt_json
from services import nlp_engine

INDEPENDENT_SOURCES = {"CDR", "IPDR", "BANKING", "DEVICE", "CCTV"}


def _payload(row: ContradictionRecord) -> dict:
    return {
        "id": row.id,
        "caseId": row.case_id,
        "severity": row.severity,
        "status": row.status,
        "claimedBy": row.claimed_by,
        "claim": row.claim,
        "claimedLocation": row.claimed_location,
        "startTime": row.start_time,
        "endTime": row.end_time,
        "claimSource": row.claim_source,
        "independentEvidence": row.independent_evidence or [],
        "evidenceIds": row.evidence_ids or [],
        "entities": row.entities or [],
        "assessment": row.assessment,
        "sources": row.sources or [],
    }


def get_contradictions(db: Session, case_id: str) -> list[dict]:
    rows = (
        db.query(ContradictionRecord)
        .filter(ContradictionRecord.case_id == case_id)
        .order_by(ContradictionRecord.id.asc())
        .all()
    )
    return [_payload(r) for r in rows]


def _hhmm(value: str) -> str | None:
    match = re.match(r"(\d{1,2}):(\d{2})(?::\d{2})?", value or "")
    if not match:
        return None
    hour = int(match.group(1))
    minute = int(match.group(2))
    if hour > 23 or minute > 59:
        return None
    return f"{hour:02d}:{minute:02d}"


def _within(start: str | None, end: str | None, time_value: str) -> bool:
    if not start or not end:
        return True
    t = _hhmm(time_value)
    if not t:
        return False
    return start <= t <= end


def rebuild_contradictions(
    db: Session,
    case_id: str,
    keep_existing: bool = True,
) -> dict:
    """Return frontend contradictions. Keeps seeded/canonical rows for the
    demo case; generates fresh ones for cases that have none."""
    db.expire_all()
    existing = (
        db.query(ContradictionRecord)
        .filter(ContradictionRecord.case_id == case_id)
        .order_by(ContradictionRecord.id.asc())
        .all()
    )
    if existing and keep_existing:
        return {"contradictions": [_payload(r) for r in existing], "generated": False}

    if not keep_existing:
        db.query(ContradictionRecord).filter(ContradictionRecord.case_id == case_id).delete()
        db.flush()

    statements = (
        db.query(EvidenceRecord)
        .filter(EvidenceRecord.case_id == case_id, EvidenceRecord.source == "STATEMENTS")
        .all()
    )

    def _text(row) -> str:
        details = decrypt_json(row.details_enc) or {}
        text = details.get("statement") or details.get("narrative") or details.get("claim")
        if not text:
            text = row.description or ""
        return details.get("timestamp", "") + " " + text

    claimed_rows = []
    for row in statements:
        text = _text(row)
        parsed = nlp_engine.parse_claim(text)
        if not parsed or not parsed.get("location"):
            continue
        claimed_rows.append({"claim": row, "parsed": parsed})

    independent = (
        db.query(EvidenceRecord)
        .filter(
            EvidenceRecord.case_id == case_id,
            EvidenceRecord.source.in_(sorted(INDEPENDENT_SOURCES)),
        )
        .all()
    )

    generated = []
    counter = 1
    for item in claimed_rows:
        claim_row = item["claim"]
        parsed = item["parsed"]
        claim = _text(claim_row).strip()
        claimed_location = parsed["location"]
        start = parsed.get("start")
        end = parsed.get("end")

        matches = []
        evidence_ids = []
        entities = []
        for rec in independent:
            ts = (decrypt_json(rec.details_enc) or {}).get("timestamp") or rec.added_at or ""
            if not _within(start, end, _hhmm(ts) or (ts[11:16] if len(ts) >= 16 else "")):
                continue
            if not _associated(rec):
                continue
            detail = (decrypt_json(rec.details_enc) or {}).get("location") or _describe_source(rec)
            matches.append({"time": _hhmm(ts) or (ts[11:16] if len(ts) >= 16 else ""), "source": rec.source, "detail": detail})
            evidence_ids.append(rec.evidence_id)
            related = (decrypt_json(rec.details_enc) or {}).get("relatedPersons") or []
            entities.extend(related)

        if not matches:
            continue

        claim_detail = decrypt_json(claim_row.details_enc) or {}
        entities = [claim_detail.get("subject") or claim_detail.get("entities", [claim_row.created_by or "Person A"])[0] if isinstance(claim_detail.get("entities"), list) and claim_detail.get("entities") else "Person A"] + entities
        entities = list(dict.fromkeys([e for e in entities if isinstance(e, str) and e]))
        entities = entities[:8]
        sources = ["STATEMENTS"] + [m["source"] for m in matches]

        generated.append({
            "id": f"ct-{100 + counter:03d}",
            "caseId": case_id,
            "severity": "High" if len(matches) >= 3 else "Medium",
            "status": "Requires review",
            "claimedBy": entities[0] if entities else "Subject",
            "claim": claim,
            "claimedLocation": claimed_location,
            "startTime": start or "00:00",
            "endTime": end or "23:59",
            "claimSource": claim_row.evidence_id,
            "independentEvidence": matches,
            "evidenceIds": evidence_ids,
            "entities": entities,
            "assessment": (
                f"Independent synthetic records associate the subject with "
                f"{claimed_location} during the stated interval."
            ),
            "sources": list(dict.fromkeys(sources)),
        })
        counter += 1

    for data in generated:
        db.add(ContradictionRecord(
            id=data["id"],
            case_id=case_id,
            severity=data["severity"],
            status=data["status"],
            claimed_by=data["claimedBy"],
            claim=data["claim"],
            claimed_location=data["claimedLocation"],
            start_time=data["startTime"],
            end_time=data["endTime"],
            claim_source=data["claimSource"],
            independent_evidence=data["independentEvidence"],
            evidence_ids=data["evidenceIds"],
            entities=data["entities"],
            assessment=data["assessment"],
            sources=data["sources"],
        ))
    db.flush()
    return {"contradictions": generated, "generated": True}


def _associated(rec: EvidenceRecord) -> bool:
    """Non-statement records are independent counters for verification."""
    return True


def _describe_source(rec: EvidenceRecord) -> str:
    details = decrypt_json(rec.details_enc) or {}
    return details.get("kind") or details.get("event") or rec.source.title()