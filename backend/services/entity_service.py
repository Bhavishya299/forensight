"""
Entity intelligence layer.

Mirrors src/data/intelligenceData.js: entity catalog, per-case entity
activity, weak links, connected entities, entity timelines, and the
global search index. All phrasing stays neutral — investigatory leads
require verification.
"""

import datetime as dt
import re

from sqlalchemy.orm import Session

from models import (
    EntityCaseRecord,
    EntityRecord,
    EventRecord,
    GraphEdge,
    GraphNode,
    WeakLinkRecord,
)
from services.correlation import get_weak_links

ENTITY_TYPE_META = {
    "PERSON": "Person",
    "PHONE": "Phone",
    "ACCOUNT": "Account",
    "IP": "IP",
    "DEVICE": "Device",
    "SOCIAL": "Social account",
    "LOCATION": "Location",
}

# Mirrors GRAPH_NODE_BY_SLUG in the frontend.
GRAPH_NODE_BY_SLUG = {
    "person-a": "p1",
    "person-b": "p2",
    "account-a": "acct_a",
    "account-b": "acct_b",
    "ip-x": "ip_x",
    "device-a": "dev_a",
    "sector-x": "loc_x",
    "social-a": "soc_a",
}
GRAPH_NODE_BY_ID = {v: k for k, v in GRAPH_NODE_BY_SLUG.items()}


def _slugify(label: str) -> str:
    value = label.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "entity"


def _infer_type(label: str) -> str:
    lowered = label.lower()
    if lowered.startswith("person"):
        return "PERSON"
    if lowered.startswith("phone"):
        return "PHONE"
    if lowered.startswith("account"):
        return "ACCOUNT"
    if lowered == "ip x" or lowered.startswith("ip "):
        return "IP"
    if lowered.startswith("device"):
        return "DEVICE"
    if lowered.startswith("sector"):
        return "LOCATION"
    if lowered.startswith("social"):
        return "SOCIAL"
    return "LOCATION"


def _date(value: str) -> str:
    if not value:
        return "—"
    try:
        parsed = dt.datetime.fromisoformat(value)
    except ValueError:
        return value[:10]
    return parsed.strftime("%d %b %Y")


def _payload(row: EntityRecord) -> dict:
    return {
        "slug": row.slug,
        "id": row.id,
        "type": row.type,
        "label": row.label,
        "summary": row.summary,
        "status": row.status,
        "firstSeen": row.first_seen,
        "lastSeen": row.last_seen,
        "cases": row.cases or [],
        "metrics": row.metrics or {},
    }


def get_entities(db: Session) -> list[dict]:
    rows = db.query(EntityRecord).order_by(EntityRecord.id.asc()).all()
    return [_payload(r) for r in rows]


def get_entity(db: Session, slug: str) -> dict | None:
    row = db.query(EntityRecord).filter(EntityRecord.slug == slug).first()
    return _payload(row) if row else None


def get_entity_cases(db: Session, slug: str) -> list[dict]:
    rows = (
        db.query(EntityCaseRecord)
        .filter(EntityCaseRecord.entity_slug == slug)
        .order_by(EntityCaseRecord.case_id.asc())
        .all()
    )
    return [
        {
            "caseId": r.case_id,
            "events": r.events,
            "evidence": r.evidence or [],
            "from": r.from_date,
            "to": r.to_date,
        }
        for r in rows
    ]


def get_weak_links_for_entity(db: Session, slug: str) -> list[dict]:
    entity = get_entity(db, slug)
    if not entity:
        return []
    label = entity["label"].lower()
    links = []
    for case_id in entity["cases"]:
        for link in get_weak_links(db, case_id):
            if slug in link["entities"]:
                links.append(link)
            elif any(step and str(step).lower() == label for step in link["activitySequence"]):
                links.append(link)
    return links


def get_connections(db: Session, slug: str) -> list[dict]:
    node_id = GRAPH_NODE_BY_SLUG.get(slug)
    if not node_id:
        return []
    edges = (
        db.query(GraphEdge)
        .filter(
            (GraphEdge.source_node_id == node_id) | (GraphEdge.target_node_id == node_id)
        )
        .all()
    )
    node_rows = {n.id: n for n in db.query(GraphNode).all()}
    seen = set()
    found = []
    for edge in edges:
        other = edge.target_node_id if edge.source_node_id == node_id else edge.source_node_id
        if other in seen:
            continue
        seen.add(other)
        node = node_rows.get(other)
        label = node.label if node else other
        ntype = node.type if node else "UNKNOWN"
        via = f" · {edge.via}" if edge.via else ""
        found.append({
            "nodeId": other,
            "label": label,
            "type": ntype,
            "relation": f"{edge.label}{via}",
            "slug": GRAPH_NODE_BY_ID.get(other),
        })
    return found


def get_entity_timeline(db: Session, case_id: str, slug: str) -> list[dict]:
    entity = get_entity(db, slug)
    if not entity:
        return []
    label = entity["label"].lower()
    rows = (
        db.query(EventRecord)
        .filter(EventRecord.case_id == case_id)
        .order_by(EventRecord.timestamp.asc())
        .all()
    )
    return [
        {
            "id": r.id,
            "caseId": r.case_id,
            "time": r.time,
            "timestamp": r.timestamp,
            "source": r.source,
            "sourceLabel": r.source,
            "description": r.description,
            "evidenceId": r.evidence_id,
            "entity1": r.entity1,
            "entity2": r.entity2,
            "window": r.in_window,
        }
        for r in rows
        if (r.entity1 or "").lower() == label or (r.entity2 or "").lower() == label
    ]


def _compute_metrics(case_id: str, label: str, events: list[dict]) -> dict:
    calls = transactions = ip_activities = locations = social = 0
    devices = set()
    evidence = set()
    for ev in events:
        if ev.get("evidence_id"):
            evidence.add(ev["evidence_id"])
        source = ev.get("source")
        if source == "CDR":
            calls += 1
        elif source == "BANKING":
            transactions += 1
        elif source == "IPDR":
            ip_activities += 1
        elif source == "DEVICE":
            locations += 1
            for x in (ev.get("entity1"), ev.get("entity2")):
                if x and x.lower().startswith("device"):
                    devices.add(x)
        elif source == "OSINT":
            social += 1
    return {
        "cases": 1,
        "calls": calls,
        "transactions": transactions,
        "ipActivities": ip_activities,
        "locations": locations,
        "socialEvents": social,
        "devices": len(devices),
        "evidenceReferences": len(evidence),
    }


def sync_entities(db: Session, case_id: str, events: list[dict]) -> None:
    """Derive entity catalog entries for a case (used for new cases)."""
    labels = set()
    for ev in events:
        for x in (ev.get("entity1"), ev.get("entity2")):
            if x:
                labels.add(x)

    counters: dict = {}
    for label in sorted(labels):
        etype = _infer_type(label)
        if etype not in ENTITY_TYPE_META:
            continue  # vehicles / cameras are graph + report objects, not entity catalog entries
        slug = _slugify(label)
        entity = db.query(EntityRecord).filter(EntityRecord.slug == slug).first()
        if entity is None:
            seq = counters.get(etype, 0) + 1
            counters[etype] = seq
            entity = EntityRecord(
                id=f"ENT-{etype[0]}-{seq:03d}",
                slug=slug,
                type=etype,
                label=label,
                summary=(
                    f"Entity referenced within the {case_id} dataset. "
                    "Analysis remains an investigative lead and requires verification."
                ),
                status="Active in investigation dataset",
                first_seen="—",
                last_seen="—",
                cases=[],
                metrics={},
            )
            db.add(entity)
            db.flush()

        related = [ev for ev in events if label.lower() in (
            (ev.get("entity1") or "").lower(),
            (ev.get("entity2") or "").lower(),
        )]
        metrics = _compute_metrics(case_id, label, related)
        stamps = [ev["timestamp"] for ev in related if ev.get("timestamp")]
        first_seen = _date(min(stamps)) if stamps else entity.first_seen
        last_seen = _date(max(stamps)) if stamps else entity.last_seen
        entity.first_seen = first_seen
        entity.last_seen = last_seen

        cases = list(entity.cases or [])
        if case_id not in cases:
            cases.append(case_id)
            entity.cases = cases

        metrics["cases"] = len(cases)
        entity.metrics = metrics

        evidence_ids = sorted({ev["evidence_id"] for ev in related if ev.get("evidence_id")})
        db.query(EntityCaseRecord).filter(
            EntityCaseRecord.slug == slug,
            EntityCaseRecord.case_id == case_id,
        ).delete()
        db.add(EntityCaseRecord(
            slug=slug,
            case_id=case_id,
            events=len(related),
            evidence=evidence_ids,
            from_date=first_seen,
            to_date=last_seen,
        ))
    db.flush()


def intelligence_metrics(db: Session) -> dict:
    entities = get_entities(db)
    shared = [e for e in entities if len(e["cases"]) > 1]
    weak = db.query(WeakLinkRecord).count()
    return {
        "entities": len(entities),
        "sharedEntities": len(shared),
        "crossCaseSignals": sum(len(e["cases"]) - 1 for e in shared),
        "weakLinks": weak,
    }