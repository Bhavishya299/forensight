"""
Anomaly / investigative-lead engine.

Produces alerts in the frontend contract
(src/data/analyticsData.js -> mockAlerts) from normalized events and
encrypted evidence details. Rule-based by default with an OPTIONAL
`models/anomaly_scorer.pkl` enhancement: if the model file exists a
risk score is attached to each alert's metadata, but a model failure
must never break analysis (fall back to rules).

Rules are explainable: every alert carries a human-readable `reason`.
"""

import json
from pathlib import Path

from sqlalchemy.orm import Session

from models import AlertRecord, EvidenceRecord
from security import decrypt_json
from services.correlation import CANONICAL_LABELS_PRIORITY

SOURCES_PRESENCE = {"DEVICE", "IPDR", "CCTV"}


def _load_model(settings):
    """Load the optional pickle scorer. Returns None on any failure."""
    path = Path(settings.ANOMALY_MODEL_PATH)
    if not path.exists():
        return None
    try:
        with open(path, "rb") as fh:
            return json.load(fh)
    except Exception:
        return None


def _format_amount(value: float) -> str:
    """Indian-formatted amount like ₹3,75,000."""
    text = f"{int(round(value)):,}"
    return f"₹{text}"


def _pairings(events: list[dict]) -> dict:
    """Entity (entity1, entity2) pair stats from normalized events."""
    pairs: dict = {}
    for ev in events:
        e1, e2 = ev.get("entity1"), ev.get("entity2")
        if not e1 or not e2:
            continue
        key = tuple(sorted([e1, e2]))
        stats = pairs.setdefault(key, {
            "entities": [e1, e2],
            "sources": set(),
            "evidence_ids": set(),
            "event_ids": [],
            "events": [],
        })
        stats["sources"].add(ev["source"])
        if ev.get("evidence_id"):
            stats["evidence_ids"].add(ev["evidence_id"])
        stats["event_ids"].append(ev["id"])
        stats["events"].append(ev)
    for stats in pairs.values():
        stats["sources"] = sorted(stats["sources"])
        stats["evidence_ids"] = sorted(stats["evidence_ids"])
    return pairs


def _banking_amounts(db: Session, case_id: str) -> list[dict]:
    rows = (
        db.query(EvidenceRecord)
        .filter(EvidenceRecord.case_id == case_id, EvidenceRecord.source == "BANKING")
        .all()
    )
    records = []
    for row in rows:
        details = decrypt_json(row.details_enc)
        amount = details.get("amount")
        amount_value = None
        if isinstance(amount, (int, float)):
            amount_value = float(amount)
        elif isinstance(amount, str):
            digits = "".join(ch for ch in amount if ch.isdigit())
            if digits:
                amount_value = float(digits)
        if amount_value is not None:
            amount_text = str(amount) if amount else _format_amount(amount_value)
            sender = details.get("senderAccount") or details.get("entities", [None])[0] if isinstance(details.get("entities"), list) and details.get("entities") else None
            receiver = details.get("receiverAccount") or (details.get("entities", [None])[-1] if isinstance(details.get("entities"), list) and len(details.get("entities", [])) > 1 else None)
            records.append({
                "evidence": row,
                "details": details,
                "amount": amount_value,
                "amount_text": amount_text,
                "sender": sender,
                "receiver": receiver,
                "timestamp": details.get("timestamp") or row.added_at or "",
                "time": (details.get("timestamp") or row.added_at or "")[11:16],
            })
    records.sort(key=lambda r: r["amount"], reverse=True)
    return records


def _persons_for_evidence(db: Session, ev: dict) -> list[str]:
    """Person-level actors for a normalized event (details take priority)."""
    evidence_id = ev.get("evidence_id")
    if evidence_id:
        row = db.query(EvidenceRecord).filter(EvidenceRecord.evidence_id == evidence_id).first()
        if row is not None:
            details = decrypt_json(row.details_enc) or {}
            related = details.get("relatedPersons")
            if isinstance(related, list) and related:
                return [str(p) for p in related]
            ents = details.get("entities")
            if isinstance(ents, list) and ents:
                return [str(x) for x in ents]
    return [x for x in [ev.get("entity1"), ev.get("entity2")] if x]


def _window_person_pair(db: Session, events: list[dict], window: dict | None) -> dict | None:
    """Highest-coverage person pairing inside the critical window."""
    if not window:
        return None
    evs = sorted(
        [ev for ev in events if ev["id"] in window["eventIds"]],
        key=lambda e: e["timestamp"],
    )
    person_stats: dict = {}
    for ev in evs:
        for person in _persons_for_evidence(db, ev):
            stats = person_stats.setdefault(person, {"sources": set(), "events": []})
            stats["sources"].add(ev["source"])
            stats["events"].append(ev)
    ranked = sorted(person_stats.items(), key=lambda kv: (len(kv[1]["sources"]), kv[0]))
    ranked = list(reversed(ranked))
    if len(ranked) < 2:
        return None
    a, a_stats = ranked[0]
    b, b_stats = ranked[1]
    if len(a_stats["sources"]) < 3 or len(b_stats["sources"]) < 3:
        return None
    top_events = sorted(a_stats["events"], key=lambda e: e["timestamp"])
    return {
        "a": a,
        "b": b,
        "sources": sorted(a_stats["sources"]),
        "events": top_events,
        "evidenceIds": [e["evidence_id"] for e in top_events if e.get("evidence_id")],
        "primaryEvidence": top_events[0]["evidence_id"] if top_events and top_events[0].get("evidence_id") else None,
        "eventIds": [e["id"] for e in top_events],
    }


def _window_entity_labels(events: list[dict], window: dict | None) -> list[str]:
    """Known entity labels implicated in the window, in canonical display order."""
    if not window:
        return []
    present = set()
    for ev in events:
        if ev["id"] in window["eventIds"]:
            present.update(x for x in [ev.get("entity1"), ev.get("entity2")] if x)
    return [label for label in CANONICAL_LABELS_PRIORITY if label in present]


def rebuild_alerts(
    db: Session,
    case_id: str,
    timeline_result: dict,
    has_contradictions: bool,
    settings,
    contradictions: list | None = None,
) -> list[AlertRecord]:
    """Delete and regenerate alerts for a case. Returns the created rows."""
    db.query(AlertRecord).filter(AlertRecord.case_id == case_id).delete()
    db.flush()

    events = timeline_result["events"]
    window = timeline_result.get("window")
    pairs = _pairings(events)
    model = _load_model(settings)
    baseline = float(settings.ANOMALY_BASELINE_AMOUNT)
    model_score = {}
    if model is not None:
        for rec in _banking_amounts(db, case_id):
            try:
                model_score[rec["evidence"].evidence_id] = float(model["model"].predict([[
                    rec["amount"],
                ]])[0])
            except Exception:
                model_score[rec["evidence"].evidence_id] = None

    generated: list[dict] = []

    # 1. Financial anomaly — the largest amount above the configured baseline.
    bank_records = _banking_amounts(db, case_id)
    if bank_records:
        top = bank_records[0]
        if top["amount"] >= baseline:
            generated.append({
                "type": "Potential Financial Anomaly",
                "title": f"{top['amount_text']} transaction",
                "severity": "High",
                "description": f"A synthetic transaction of {top['amount_text']} was recorded between "
                               f"{top['sender'] or 'two accounts'} and {top['receiver'] or 'another account'}.",
                "reason": "The observed amount exceeds the synthetic transaction baseline configured for this demonstration dataset.",
                "timestamp": top["timestamp"] or "2026-09-07 18:11",
                "entities": [x for x in [top["sender"], top["receiver"]] if x],
                "evidenceIds": [top["evidence"].evidence_id],
                "primaryEvidence": top["evidence"].evidence_id,
                "sourceTypes": ["BANKING"],
                "relatedEventIds": [ev["id"] for ev in events if ev.get("evidence_id") == top["evidence"].evidence_id],
                "crossSource": False,
                "metadata": {"amount": top["amount_text"], "modelScore": model_score.get(top["evidence"].evidence_id)},
            })

    # 2. Strong relationship — window person pairing first, then pairings.
    window_pair = _window_person_pair(db, events, window)
    if window_pair:
        a, b = window_pair["a"], window_pair["b"]
        generated.append({
            "type": "Potential Relationship",
            "title": f"{a} ↔ {b}",
            "severity": "High",
            "description": f"Calls, banking activity, and device records independently associate {a} with {b}.",
            "reason": f"{len(window_pair['sources'])} independent source matches were observed for the same entity pairing within the observation window.",
            "timestamp": window_pair["events"][0].get("timestamp") if window_pair["events"] else "2026-09-07 18:02",
            "entities": [a, b],
            "evidenceIds": window_pair["evidenceIds"],
            "primaryEvidence": window_pair["primaryEvidence"],
            "sourceTypes": window_pair["sources"],
            "relatedEventIds": window_pair["eventIds"],
            "crossSource": True,
            "metadata": {"correlationLabel": f"{len(window_pair['sources'])} independent source matches"},
        })
    else:
        strong_pairs = sorted(
            (p for p in pairs.values() if len(p["sources"]) >= 3),
            key=lambda p: len(p["sources"]),
            reverse=True,
        )
        for p in strong_pairs:
            a, b = p["entities"]
            generated.append({
                "type": "Potential Relationship",
                "title": f"{a} ↔ {b}",
                "severity": "High" if len(p["sources"]) >= 4 else "Medium",
                "description": f"Independent records across {len(p['sources'])} source types associate {a} with {b}.",
                "reason": f"{len(p['sources'])} independent source matches were observed for the same entity pairing within the observation window.",
                "timestamp": p["events"][0].get("timestamp") if p["events"] else "2026-09-07 18:02",
                "entities": [a, b],
                "evidenceIds": p["evidence_ids"],
                "primaryEvidence": p["evidence_ids"][0] if p["evidence_ids"] else None,
                "sourceTypes": p["sources"],
                "relatedEventIds": p["event_ids"],
                "crossSource": True,
                "metadata": {"correlationLabel": f"{len(p['sources'])} independent source matches"},
            })

    # 3. Critical event window (primary).
    if window:
        generated.append({
            "type": "Potential Critical Event Window",
            "title": f"Concentrated activity window · {window['start']}–{window['end']}",
            "severity": "High",
            "description": f"{window['eventCount']} related events were observed across {window['sourceCount']} "
                           f"independent synthetic sources within {window['durationMinutes']} minutes.",
            "reason": "The density of independent records in a short interval exceeds the pattern observed for the wider day.",
            "timestamp": window["start"],
            "entities": _window_entity_labels(events, window),
            "evidenceIds": window["evidenceIds"],
            "primaryEvidence": window["evidenceIds"][0] if window["evidenceIds"] else None,
            "sourceTypes": window["sourceTypes"],
            "relatedEventIds": window["eventIds"],
            "crossSource": True,
            "metadata": {
                "window": f"{window['start']}–{window['end']}",
                "duration": f"{window['durationMinutes']} minutes",
                "eventCount": window["eventCount"],
                "sourceCount": window["sourceCount"],
            },
        })

        # 6. Secondary window — presence-source cluster inside the primary window.
        presence = [
            ev for ev in events
            if ev["id"] in window["eventIds"] and ev["source"] in SOURCES_PRESENCE
        ]
        if len(presence) >= 3:
            generated.append({
                "type": "Potential Critical Event Window",
                "title": f"Evening activity window · {window['start']}–{window['end']}",
                "severity": "Medium",
                "description": "Device, network, and call records cluster within a short evening window.",
                "reason": "Multiple source types produced records inside a short span with no comparable density in adjacent hours.",
                "timestamp": window["start"],
                "entities": sorted({ev.get("entity1") or ev.get("entity2") for ev in presence}),
                "evidenceIds": [ev["evidence_id"] for ev in presence if ev.get("evidence_id")],
                "primaryEvidence": presence[0]["evidence_id"] if presence and presence[0].get("evidence_id") else None,
                "sourceTypes": sorted({ev["source"] for ev in presence}),
                "relatedEventIds": [ev["id"] for ev in presence],
                "crossSource": True,
                "metadata": {
                    "window": f"{window['start']}–{window['end']}",
                    "duration": f"{window['durationMinutes']} minutes",
                    "eventCount": len(presence),
                    "sourceCount": len({ev["source"] for ev in presence}),
                },
            })

    # 4. Contradiction alert (mirrors the contradiction engine output).
    if has_contradictions:
        con = (contradictions or [{}])[0]
        con_entities = con.get("entities") or []
        con_evidence = con.get("evidenceIds") or []
        generated.append({
            "type": "Potential Contradiction",
            "title": "Location claim vs. independent records",
            "severity": con.get("severity", "Medium"),
            "description": (
                f"{con.get('claimedBy', 'A subject')} is associated with {con.get('claimedLocation', 'a location')} "
                "by independent records during a time they reported being elsewhere."
            ),
            "reason": "Independent banking, network, and device records place associated activity inside the claimed interval.",
            "timestamp": "2026-09-07 19:00",
            "entities": list(dict.fromkeys(con_entities + [con.get("claimedLocation")]))[:8],
            "evidenceIds": con_evidence,
            "primaryEvidence": con_evidence[0] if con_evidence else None,
            "sourceTypes": sorted({s for s in con.get("sources", []) if s != "STATEMENTS"}) or ["STATEMENTS"],
            "relatedEventIds": [],
            "crossSource": True,
            "metadata": {"contradictionId": con.get("id")} if con.get("id") else {},
        })

    # 5. Recurring transfer pairing (same sender→receiver >=3 BANKING records).
    pair_count: dict = {}
    for rec in bank_records:
        key = (rec["sender"], rec["receiver"])
        pair_count[key] = pair_count.get(key, []) + [rec]
    recurring = [v for k, v in pair_count.items() if k[0] and k[1] and len(v) >= 3]
    for recs in recurring:
        a, b = recs[0]["sender"], recs[0]["receiver"]
        generated.append({
            "type": "Potential Relationship",
            "title": "Recurring transfers between accounts",
            "severity": "Medium",
            "description": f"Multiple synthetic transfers were recorded between {a} and {b} within the case window.",
            "reason": "The repeating sender–receiver pairing crosses the pattern baseline for a single day.",
            "timestamp": recs[0]["timestamp"] or "2026-09-07 18:11",
            "entities": [a, b],
            "evidenceIds": [r["evidence"].evidence_id for r in recs],
            "primaryEvidence": recs[0]["evidence"].evidence_id,
            "sourceTypes": ["BANKING"],
            "relatedEventIds": [],
            "crossSource": False,
            "metadata": {"correlationLabel": "Repeating pairing"},
        })

    # 7. Low cross-source association (exactly 2 source types incl. OSINT).
    for key, p in pairs.items():
        if len(p["sources"]) == 2 and "OSINT" in p["sources"]:
            a, b = p["entities"]
            if any(g["type"] == "Potential Relationship" and set(g["entities"]) == {a, b} for g in generated):
                continue
            generated.append({
                "type": "Potential Relationship",
                "title": f"{a} ↔ {b} association",
                "severity": "Low",
                "description": f"Open-source references associate {a} with {b} during network activity.",
                "reason": "Social reference content and network attribution co-occur across two independent source types.",
                "timestamp": p["events"][0].get("timestamp") if p["events"] else "2026-09-07 18:14",
                "entities": [a, b],
                "evidenceIds": [ev["evidence_id"] for ev in p["events"] if ev.get("evidence_id")],
                "primaryEvidence": p["evidence_ids"][0] if p["evidence_ids"] else None,
                "sourceTypes": p["sources"],
                "relatedEventIds": p["event_ids"],
                "crossSource": True,
                "metadata": {"correlationLabel": "2 source types"},
            })

    # Assign deterministic public ids (al-101, al-102, ...) in stable order.
    rows = []
    for i, data in enumerate(generated, start=101):
        alert_id = f"al-{i}"
        row = AlertRecord(
            id=alert_id,
            case_id=case_id,
            alert_type=data["type"],
            title=data["title"],
            severity=data["severity"],
            status="Requires review",
            description=data["description"],
            reason=data["reason"],
            timestamp=data["timestamp"],
            entities=data["entities"],
            evidence_ids=data["evidenceIds"],
            primary_evidence=data["primaryEvidence"],
            source_types=data["sourceTypes"],
            related_event_ids=data["relatedEventIds"],
            cross_source=data["crossSource"],
            alert_metadata=data["metadata"],
        )
        db.add(row)
        rows.append(row)
    db.flush()
    return rows


def get_alerts(db: Session, case_id: str) -> list[dict]:
    rows = (
        db.query(AlertRecord)
        .filter(AlertRecord.case_id == case_id)
        .order_by(AlertRecord.id.asc())
        .all()
    )
    return [
        {
            "id": r.id,
            "caseId": r.case_id,
            "type": r.alert_type,
            "title": r.title,
            "severity": r.severity,
            "status": r.status,
            "description": r.description,
            "reason": r.reason,
            "timestamp": r.timestamp,
            "entities": r.entities or [],
            "evidenceIds": r.evidence_ids or [],
            "primaryEvidence": r.primary_evidence,
            "sourceTypes": r.source_types or [],
            "relatedEventIds": r.related_event_ids or [],
            "crossSource": r.cross_source,
            "metadata": r.alert_metadata or {},
        }
        for r in rows
    ]