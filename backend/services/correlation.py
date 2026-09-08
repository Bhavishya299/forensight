"""
Entity correlation and weak-link detection.

Weak links are "unexplained connections": activity with observed temporal
proximity but no direct graph edge. Seeded canonical links are preserved
for the demo case (WL-01..04); new cases get an automatic generation pass.
"""

from sqlalchemy.orm import Session

from models import WeakLinkRecord, GraphEdge

CANONICAL_LABELS_PRIORITY = [
    "Person A", "Person B", "IP X", "Device A", "Sector X",
    "Account A", "Account B", "Social A", "Phone A",
    "Vehicle X", "Camera T-014", "Camera T-021",
]


def _payload(row: WeakLinkRecord) -> dict:
    return {
        "id": row.id,
        "caseId": row.case_id,
        "typeLabel": row.type_label,
        "confidence": row.confidence,
        "status": row.status,
        "entities": row.entities or [],
        "entityLabels": row.entity_labels or [],
        "connection": row.connection,
        "window": row.window,
        "activitySequence": row.activity_sequence or [],
        "supportingEvidence": row.supporting_evidence or [],
        "reason": row.reason,
        "interpretation": row.interpretation,
    }


def get_weak_links(db: Session, case_id: str) -> list[dict]:
    rows = (
        db.query(WeakLinkRecord)
        .filter(WeakLinkRecord.case_id == case_id)
        .order_by(WeakLinkRecord.id.asc())
        .all()
    )
    return [_payload(r) for r in rows]


def rebuild_weak_links(db: Session, case_id: str, events: list[dict], keep_existing: bool = True) -> list[dict]:
    """Preserve canonical links; generate for cases that have none."""
    existing = (
        db.query(WeakLinkRecord).filter(WeakLinkRecord.case_id == case_id).all()
    )
    if existing and keep_existing:
        return [_payload(r) for r in existing]
    if existing:
        for r in existing:
            db.delete(r)
    db.flush()
    return _generate(db, case_id, events)


def _direct_edges(db: Session, case_id: str) -> set[tuple[str, str]]:
    edges = db.query(GraphEdge).filter(GraphEdge.case_id == case_id).all()
    out = set()
    for edge in edges:
        a, b = edge.source_node_id, edge.target_node_id
        out.add(tuple(sorted([a, b])))
    return out


def _generate(db: Session, case_id: str, events: list[dict]) -> list[dict]:
    links = []
    edges = _direct_edges(db, case_id)
    ordered = sorted(events, key=lambda e: e["timestamp"])
    counter = 1
    for i in range(len(ordered)):
        if len(links) >= 3:
            break
        for j in range(i + 1, len(ordered)):
            a, b = ordered[i], ordered[j]
            gap_min = int(round((_seconds(b["timestamp"]) - _seconds(a["timestamp"])) / 60.0))
            if gap_min < 0 or gap_min > 15:
                break
            if a["source"] == b["source"]:
                continue
            a_ents = _labels(a)
            b_ents = _labels(b)
            if a_ents == b_ents:
                continue
            connection = f"{a_ents[-1]} → {b_ents[-1]}"
            key = tuple(sorted([connection, ", ".join(a_ents) if len(a_ents) < len(b_ents) else ", ".join(b_ents)]))
            if key in edges:
                continue
            windows = f"{a['time']} – {b['time']}"
            links.append({
                "id": f"WL-{counter:02d}",
                "caseId": case_id,
                "typeLabel": "Potential temporal proximity",
                "confidence": "Medium" if gap_min <= 10 else "Low",
                "status": "Requires verification",
                "entities": [],
                "entityLabels": list(dict.fromkeys(a_ents + b_ents)),
                "connection": connection,
                "window": windows,
                "activitySequence": a_ents + ["???"] + b_ents,
                "supportingEvidence": [x for x in [a.get("evidence_id"), b.get("evidence_id")] if x],
                "reason": (
                    f"{a_ents[-1]} is observed minutes before activity involving {b_ents[-1]}. "
                    "There is no direct link between them, so this is treated as an unexplained connection."
                ),
                "interpretation": (
                    "A series of activities with observed temporal proximity but no direct link. "
                    "This is a potential investigative lead that requires investigator verification."
                ),
            })
            counter += 1
            break

    for data in links:
        db.add(WeakLinkRecord(
            id=data["id"],
            case_id=case_id,
            type_label=data["typeLabel"],
            confidence=data["confidence"],
            status=data["status"],
            entities=data["entities"],
            entity_labels=data["entityLabels"],
            connection=data["connection"],
            window=data["window"],
            activity_sequence=data["activitySequence"],
            supporting_evidence=data["supportingEvidence"],
            reason=data["reason"],
            interpretation=data["interpretation"],
        ))
    db.flush()
    return links


def _seconds(timestamp: str) -> float:
    import datetime as _dt
    return _dt.datetime.fromisoformat(timestamp).timestamp()


def _labels(ev: dict) -> list[str]:
    labels = [ev.get("entity1"), ev.get("entity2")]
    return [x for x in labels if x]