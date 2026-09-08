"""
Global search index.

Mirrors src/data/intelligenceData.js (searchIndex / querySearch): a flat
index of entities, evidence, cases, and vehicles grouped by the fixed
frontend type order.
"""

from sqlalchemy.orm import Session

from models import Case, EvidenceRecord, EventRecord

GROUP_ORDER = ["PERSON", "PHONE", "ACCOUNT", "IP", "DEVICE", "SOCIAL", "LOCATION", "EVIDENCE", "CASE", "VEHICLE"]

GROUP_LABELS = {
    "PERSON": "Person",
    "PHONE": "Phone",
    "ACCOUNT": "Account",
    "IP": "IP",
    "DEVICE": "Device",
    "SOCIAL": "Social account",
    "LOCATION": "Location",
    "EVIDENCE": "Evidence",
    "CASE": "Case",
    "VEHICLE": "Vehicle",
}


def build_index(db: Session) -> list[dict]:
    from services.entity_service import get_entities
    from services.vehicle_service import get_traces

    index: list[dict] = []

    def push_if_missing(entry):
        if not any(e["key"] == entry["key"] for e in index):
            index.append(entry)

    for entity in get_entities(db):
        m = entity["metrics"] or {}
        meta = []
        if m.get("calls"):
            meta.append(f"{m['calls']} calls")
        if m.get("transactions"):
            meta.append(f"{m['transactions']} transactions")
        if m.get("ipActivities") and entity["type"] == "PERSON":
            meta.append(f"{m['ipActivities']} IP events")
        if m.get("ipActivities") and entity["type"] == "IP":
            meta.append(f"{m['ipActivities']} IP activities")
        if m.get("locations"):
            meta.append(f"{m['locations']} locations")
        if m.get("devices"):
            meta.append(f"{m['devices']} devices")
        count = len(entity["cases"] or [])
        meta.append(f"{count} {'case' if count == 1 else 'cases'}")
        push_if_missing({
            "key": f"entity:{entity['slug']}",
            "type": "ENTITY",
            "subType": entity["type"],
            "label": entity["label"],
            "href": f"/entities/{entity['slug']}",
            "metaLines": meta,
            "keywords": entity["label"].lower(),
        })

    for case_id, evidence_id, description, evidence_type, source in (
        db.query(
            EvidenceRecord.case_id,
            EvidenceRecord.evidence_id,
            EvidenceRecord.description,
            EvidenceRecord.type,
            EvidenceRecord.source,
        ).all()
    ):
        push_if_missing({
            "key": f"evidence:{case_id}:{evidence_id}",
            "type": "EVIDENCE",
            "subType": source or evidence_type,
            "label": evidence_id,
            "href": f"/cases/{case_id}/evidence?record={evidence_id}",
            "metaLines": [description or "", f"CASE #{case_id}"],
            "keywords": f"{evidence_id} {description or ''} {evidence_type or ''} {case_id}".lower(),
        })

    for case in db.query(Case).all():
        push_if_missing({
            "key": f"case:{case.id}",
            "type": "CASE",
            "subType": None,
            "label": case.id,
            "href": f"/cases/{case.id}",
            "metaLines": [case.title, f"{case.status} · {case.priority}"],
            "keywords": f"{case.id} {case.title} {case.status} {case.priority}".lower(),
        })

    for trace in get_traces(db):
        push_if_missing({
            "key": f"vehicle:{trace['plate']}",
            "type": "VEHICLE",
            "subType": None,
            "label": trace["plate"],
            "href": "/vehicle-intelligence",
            "metaLines": [f"{trace['type']} · {trace['color']} · {len(trace['sights'])} sightings", "Vehicle Intelligence"],
            "keywords": f"{trace['plate']} {trace['type']} {trace['color']}".lower(),
        })

    return index


def query_search(db: Session, q: str) -> list[dict]:
    needle = q.strip().lower()
    if not needle:
        return []
    index = build_index(db)
    matches = [
        entry
        for entry in index
        if needle in entry["label"].lower() or needle in entry["keywords"]
    ]
    groups = []
    for etype in GROUP_ORDER:
        items = [
            entry
            for entry in matches
            if (entry["type"] == "ENTITY" and entry["subType"] == etype)
            or (entry["type"] == etype)
        ]
        if items:
            groups.append({"type": etype, "label": GROUP_LABELS[etype], "items": items})
    return groups