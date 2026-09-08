"""
Graph engine.

Builds an entity graph from normalized events using NetworkX and
computes betweenness centrality for every node. Nodes and edges are
persisted so the `/graph` endpoint serves a stable, queryable result.

Relationship wording stays investigative:
  - CALL / TRANSFERRED / ACCESSED / MENTIONED / ASSOCIATED / OBSERVED_BY
Nothing here asserts a conclusion; every edge is traceable to evidence.
"""

import math

import networkx as nx
from sqlalchemy.orm import Session

from models import GraphEdge, GraphNode, EventRecord

ENTITY_PREFIX_TO_TYPE = {
    "Person": "PERSON",
    "Account": "ACCOUNT",
    "IP": "IP",
    "Device": "DEVICE",
    "Sector": "LOCATION",
    "Social": "SOCIAL",
    "Phone": "PHONE",
    "Vehicle": "VEHICLE",
    "Camera": "CAMERA",
}

CANONICAL_NODE_IDS = {
    "Person A": "p1",
    "Person B": "p2",
    "Account A": "acct_a",
    "Account B": "acct_b",
    "IP X": "ip_x",
    "Device A": "dev_a",
    "Sector X": "loc_x",
    "Social A": "soc_a",
    "Vehicle CH01AB1234": "veh_ch01",
    "Vehicle CH01CD5678": "veh_ch02",
    "Camera T-014": "cam_t014",
    "Camera T-027": "cam_t027",
    "Camera T-041": "cam_t041",
    "Camera T-052": "cam_t052",
    "Phone A": "ph_a",
}

CANONICAL_POSITIONS = {
    "p1": (60.0, 250.0),
    "p2": (700.0, 250.0),
    "acct_a": (60.0, 490.0),
    "acct_b": (700.0, 490.0),
    "ip_x": (380.0, 80.0),
    "dev_a": (380.0, 250.0),
    "loc_x": (380.0, 620.0),
    "soc_a": (380.0, 435.0),
    "veh_ch01": (1040.0, 370.0),
    "veh_ch02": (1040.0, 160.0),
    "cam_t014": (1330.0, 300.0),
    "cam_t027": (1330.0, 390.0),
    "cam_t041": (1330.0, 480.0),
    "cam_t052": (1330.0, 570.0),
}

RELATIONSHIP_BY_EVENT_TYPE = {
    "Call": ("CALL", "Call"),
    "Access": ("ACCESSED", "Accessed"),
    "Transfer": ("TRANSFERRED", "Transferred"),
    "Mention": ("MENTIONED", "Mentioned"),
    "Location": ("ASSOCIATED", "Associated"),
    "Observation": ("OBSERVED_BY", "Observed by"),
    "Statement": ("STATED", "Stated"),
    "Record": ("REFERENCED", "Referenced"),
}

EDGE_LABEL_BY_RELATIONSHIP = {
    "ASSOCIATED": "Associated",
    "LOCATED_AT": "Located at",
    "ACTIVITY_AT": "Activity at",
}


def entity_type_for_label(label: str | None) -> str:
    if not label:
        return "UNKNOWN"
    for prefix, etype in ENTITY_PREFIX_TO_TYPE.items():
        if label.startswith(prefix):
            return etype
    return "UNKNOWN"


def node_id_for_label(label: str) -> str:
    if label in CANONICAL_NODE_IDS:
        return CANONICAL_NODE_IDS[label]
    slug = "".join(ch.lower() if ch.isalnum() else "_" for ch in label).strip("_")
    return slug or "node"


def _slot_label(node_type: str) -> str:
    return {
        "PERSON": "Person",
        "ACCOUNT": "Account",
        "IP": "IP",
        "DEVICE": "Device",
        "LOCATION": "Sector",
        "SOCIAL": "Social",
        "PHONE": "Phone",
        "VEHICLE": "Vehicle",
        "CAMERA": "Camera",
    }.get(node_type, "Entity")


def _layout_positions(nodes: list[dict]) -> dict:
    """Assign positions: canonical ones for known nodes, else a layered grid."""
    free = []
    positions = {}
    for node in nodes:
        nid = node["node_id"]
        if nid in CANONICAL_POSITIONS:
            positions[nid] = CANONICAL_POSITIONS[nid]
        else:
            free.append(node)

    if not free:
        return positions

    col_width = 260.0
    row_gap = 150.0
    by_type: dict[str, list] = {}
    for node in free:
        by_type.setdefault(node["type"], []).append(node)
    ordered_types = [
        "PERSON", "PHONE", "ACCOUNT", "IP", "DEVICE", "SOCIAL", "LOCATION", "VEHICLE", "CAMERA",
    ]
    col = 0
    for etype in ordered_types:
        bucket = by_type.pop(etype, [])
        if not bucket:
            continue
        count = len(bucket)
        x = 60 + col * col_width
        for i, node in enumerate(bucket):
            y = 80 + (i - (count - 1) / 2) * row_gap
            positions[node["node_id"]] = (float(x), float(y))
        col += 1
    # Anything left (unknown types)
    for node in free:
        if node["node_id"] not in positions:
            x = 60 + col * col_width
            positions[node["node_id"]] = (x, 80.0)
            col += 1
    return positions


def _collect_events(db: Session, case_id: str) -> list[dict]:
    rows = (
        db.query(EventRecord)
        .filter(EventRecord.case_id == case_id)
        .order_by(EventRecord.timestamp.asc())
        .all()
    )
    events = []
    for r in rows:
        event = {
            "id": r.id,
            "time": r.time,
            "timestamp": r.timestamp,
            "source": r.source,
            "event_type": r.event_type,
            "entity1": r.entity1,
            "entity2": r.entity2,
            "location": r.location,
            "description": r.description,
            "evidence_id": r.evidence_id,
            "in_window": r.in_window,
        }
        events.append(event)
    return events


def _edge_candidates(events: list[dict]) -> list[dict]:
    """Build (unsaved) edge candidates from event pairings."""
    edges: list[dict] = []
    for ev in events:
        e1, e2 = ev.get("entity1"), ev.get("entity2")
        relation_info = RELATIONSHIP_BY_EVENT_TYPE.get(ev.get("event_type"), RELATIONSHIP_BY_EVENT_TYPE["Record"])
        relationship, label = relation_info

        primary = None
        if e1 and e2 and entity_type_for_label(e2) != "CAMERA":
            primary = {
                "source_node": node_id_for_label(e1),
                "target_node": node_id_for_label(e2),
                "label": label,
                "relationship": relationship,
                "source": ev["source"],
                "timestamp": ev.get("time"),
                "evidence_id": ev["evidence_id"],
            }
        elif e1 and e2 and entity_type_for_label(e2) == "CAMERA":
            # Observation: vehicle â†’ camera
            primary = {
                "source_node": node_id_for_label(e1),
                "target_node": node_id_for_label(e2),
                "label": "Observed by",
                "relationship": "OBSERVED_BY",
                "source": ev["source"],
                "timestamp": ev.get("time"),
                "evidence_id": ev["evidence_id"],
            }
        elif e1 and ev.get("location"):
            # entity â†’ location
            primary = {
                "source_node": node_id_for_label(e1),
                "target_node": node_id_for_label(ev["location"]),
                "label": "Activity at",
                "relationship": "ACTIVITY_AT",
                "source": ev["source"],
                "timestamp": ev.get("time"),
                "evidence_id": ev["evidence_id"],
            }

        if primary:
            edges.append(primary)

        # Extra canonical edges for device records with a location.
        if ev["source"] == "DEVICE" and e1 and ev.get("location") and entity_type_for_label(e1) == "DEVICE":
            edges.append({
                "source_node": node_id_for_label(e1),
                "target_node": node_id_for_label(ev["location"]),
                "label": "Located at",
                "relationship": "LOCATED_AT",
                "source": ev["source"],
                "timestamp": ev.get("time"),
                "evidence_id": ev["evidence_id"],
            })
            if e2 and entity_type_for_label(e2) != "DEVICE":
                edges.append({
                    "source_node": node_id_for_label(e2),
                    "target_node": node_id_for_label(ev["location"]),
                    "label": "Activity at",
                    "relationship": "ACTIVITY_AT",
                    "source": ev["source"],
                    "timestamp": ev.get("time"),
                    "evidence_id": ev["evidence_id"],
                })
    return edges


def _merge_edges(candidates: list[dict]) -> list[dict]:
    merged: dict[tuple, dict] = {}
    for c in candidates:
        if c["source_node"] == c["target_node"]:
            continue
        key = (c["relationship"], c["source_node"], c["target_node"])
        if key in merged:
            m = merged[key]
            m["evidence_ids"] = sorted(set(m["evidence_ids"] + [c["evidence_id"]]))
            if c["source"] not in m["sources"]:
                m["sources"].append(c["source"])
            if c["timestamp"] and c["timestamp"] < m["timestamp"]:
                m["timestamp"] = c["timestamp"]
        else:
            merged[key] = {
                "relationship": c["relationship"],
                "label": c.get("label") or EDGE_LABEL_BY_RELATIONSHIP.get(c["relationship"], c["relationship"]),
                "source_node": c["source_node"],
                "target_node": c["target_node"],
                "sources": [c["source"]],
                "source_type": c["source"],
                "timestamp": c["timestamp"],
                "evidence_ids": [c["evidence_id"]] if c["evidence_id"] else [],
                "cross_source": False,
            }
    result = sorted(merged.values(), key=lambda e: (e["timestamp"] or "", e["source_node"], e["target_node"]))
    for e in result:
        e["source_types"] = sorted(set(e["sources"]))
        e["cross_source"] = len(e["source_types"]) >= 2
        e["note"] = (
            f"Relationship indicated by {len(e['evidence_ids'])} source record(s) "
            f"across {len(e['source_types'])} independent source type(s)."
        )
    return result


def rebuild_graph(db: Session, case_id: str) -> dict:
    """Recompute and persist the entity graph for a case. Returns summary."""
    db.query(GraphNode).filter(GraphNode.case_id == case_id).delete()
    db.query(GraphEdge).filter(GraphEdge.case_id == case_id).delete()
    db.flush()

    events = _collect_events(db, case_id)

    node_labels: dict[str, str] = {}
    for ev in events:
        for label in (ev.get("entity1"), ev.get("entity2"), ev.get("location")):
            if label:
                node_labels.setdefault(node_id_for_label(label), label)

    # Build NetworkX graph and betweenness centrality.
    g = nx.Graph()
    for nid in node_labels:
        g.add_node(nid)

    edges = _merge_edges(_edge_candidates(events))
    for e in edges:
        g.add_edge(e["source_node"], e["target_node"])

    centrality = nx.betweenness_centrality(g)

    positions = _layout_positions(
        [{"node_id": nid, "type": entity_type_for_label(label)} for nid, label in node_labels.items()]
    )

    window_event_ids = {ev["id"] for ev in events if ev.get("in_window")}

    for nid, label in node_labels.items():
        involved = [ev for ev in events if ev.get("entity1") == label or ev.get("entity2") == label or ev.get("location") == label]
        sources = sorted({ev.get("source") for ev in involved})
        neighbors = [n for n in g.neighbors(nid)] if nid in g else []
        x, y = positions.get(nid, (60.0, 80.0))
        evidence_count = len({ev.get("evidence_id") for ev in involved})
        db.add(GraphNode(
            case_id=case_id,
            node_id=nid,
            type=entity_type_for_label(label),
            label=label,
            position_x=x,
            position_y=y,
            related_records=evidence_count,
            related_entities=len(neighbors),
            sources=sources,
            in_window=bool(window_event_ids and any(ev["id"] in window_event_ids for ev in involved)),
            centrality=round(centrality.get(nid, 0.0), 4),
        ))

    for i, e in enumerate(edges, start=1):
        window = bool(window_event_ids and any(ev["id"] in window_event_ids for ev in events if ev["evidence_id"] in e["evidence_ids"]))
        db.add(GraphEdge(
            case_id=case_id,
            edge_id=f"e{i}",
            label=e["label"],
            relationship=e["relationship"],
            source_node_id=e["source_node"],
            target_node_id=e["target_node"],
            source_type=e["source_type"],
            source_types=e["source_types"],
            cross_source=e["cross_source"],
            timestamp=e["timestamp"],
            evidence_ids=e["evidence_ids"],
            note=e["note"],
        ))
        _ = window
    db.flush()

    return {
        "entities": len(node_labels),
        "relationships": len(edges),
        "sourceTypes": len({s for e in edges for s in e["source_types"]}),
        "crossSourceLinks": sum(1 for e in edges if e["cross_source"]),
        "potentialLeads": sum(1 for e in edges if e["cross_source"]),
        "totalCentrality": round(sum(centrality.values()), 4),
    }


def get_graph_payload(db: Session, case_id: str) -> dict:
    nodes_rows = db.query(GraphNode).filter(GraphNode.case_id == case_id).order_by(GraphNode.node_id).all()
    edge_rows = db.query(GraphEdge).filter(GraphEdge.case_id == case_id).order_by(GraphEdge.edge_id).all()

    nodes = [
        {
            "id": n.node_id,
            "type": n.type,
            "label": n.label,
            "position": {"x": n.position_x, "y": n.position_y},
            "meta": {
                "relatedRecords": n.related_records,
                "relatedEntities": n.related_entities,
                "sources": n.sources or [],
                "window": n.in_window,
                "centrality": n.centrality,
            },
        }
        for n in nodes_rows
    ]
    edges = [
        {
            "id": e.edge_id,
            "label": e.label,
            "relationship": e.relationship,
            "source": e.source_node_id,
            "target": e.target_node_id,
            "sourceType": e.source_type,
            "sourceTypes": e.source_types or [],
            "crossSource": e.cross_source,
            "timestamp": e.timestamp,
            "evidenceIds": e.evidence_ids or [],
            "note": e.note,
        }
        for e in edge_rows
    ]
    summary = {
        "entities": len(nodes),
        "relationships": len(edges),
        "sourceTypes": len({s for e in edges for s in e.get("sourceTypes", [])}),
        "crossSourceLinks": sum(1 for e in edges if e.get("crossSource")),
        "potentialLeads": sum(1 for e in edges if e.get("crossSource")),
    }
    return {"nodes": nodes, "edges": edges, "summary": summary}
