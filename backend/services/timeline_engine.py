"""
Timeline engine with a configurable sliding-window critical-event scan.

The scan is NOT hardcoded:
  - `span` (seconds) slides across the day in `step` steps.
  - Each window scores `2 * distinct_sources + event_count`.
  - Windows above `mean + z * sigma` are "critical" (z configurable).
  - With tiny/zero sigma the scan safely falls back to the densest
    window that still meets the minimum event/source thresholds.
"""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from models import EventRecord
from services.source_data import ordered_source_keys

DEFAULT_SPAN_MINUTES = 20
DEFAULT_STEP_MINUTES = 10


def _parse_ts(value: str) -> datetime:
    value = (value or "").strip()[:16]
    try:
        return datetime.strptime(value, "%Y-%m-%d %H:%M")
    except ValueError:
        return datetime(1970, 1, 1, 0, 0)


def scan_windows(events: list[dict], span_minutes: int, step_minutes: int) -> list[dict]:
    """Return scored candidate windows (start dt, end dt, count, sources)."""
    if not events:
        return []
    parsed = sorted((_parse_ts(ev["timestamp"]), ev["source"]) for ev in events)
    span = timedelta(minutes=span_minutes)
    step = timedelta(minutes=step_minutes)
    start = parsed[0][0]
    stop = parsed[-1][0]

    windows = []
    cursor = start
    while cursor <= stop:
        end = cursor + span
        inside = [(ts, src) for ts, src in parsed if cursor <= ts < end]
        sources = len({s for _, s in inside})
        count = len(inside)
        score = 2 * sources + count
        windows.append({
            "start": cursor,
            "end": end,
            "count": count,
            "sources": sources,
            "score": score,
        })
        cursor += step

    # Also anchor a window on every distinct event time so tight clusters
    # that would fall between grid steps are still discovered.
    seen_starts = {w["start"] for w in windows}
    for ts, src in parsed:
        if ts in seen_starts:
            continue
        end = ts + span
        inside = [(t, s) for t, s in parsed if ts <= t < end]
        sources = len({s for _, s in inside})
        count = len(inside)
        score = 2 * sources + count
        windows.append({"start": ts, "end": end, "count": count, "sources": sources, "score": score})
        seen_starts.add(ts)
    return windows


def detect_critical_window(
    events: list[dict],
    span_minutes: int = DEFAULT_SPAN_MINUTES,
    step_minutes: int = DEFAULT_STEP_MINUTES,
    z_threshold: float = 2.0,
    min_events: int = 3,
    min_distinct_sources: int = 2,
) -> dict | None:
    """Return the critical window dict or None when no cluster qualifies."""
    if not events:
        return None

    windows = scan_windows(events, span_minutes, step_minutes)
    if not windows:
        return None

    scores = [w["score"] for w in windows]
    mean = sum(scores) / len(scores)
    stdev = 0.0
    if len(scores) > 1:
        variance = sum((s - mean) ** 2 for s in scores) / (len(scores) - 1)
        stdev = variance ** 0.5

    threshold = mean + (z_threshold * stdev if stdev > 0 else 0)

    qualified = [w for w in windows if w["score"] > threshold]
    if not qualified:
        qualified = [w for w in windows if w["count"] >= min_events and w["sources"] >= min_distinct_sources]
    if not qualified:
        # Absolute fallback: the densest window if it is at least plausible.
        qualified = [max(windows, key=lambda w: w["score"])]
        if qualified[0]["count"] < min_events or qualified[0]["sources"] < min_distinct_sources:
            return None

    best = max(qualified, key=lambda w: (w["score"], -w["start"].timestamp()))
    return {
        "span_minutes": span_minutes,
        "step_minutes": step_minutes,
        "threshold": round(threshold, 2),
        "mean": round(mean, 2),
        "stdev": round(stdev, 2),
        "start": best["start"],
        "end": best["end"],
        "count": best["count"],
        "sources": best["sources"],
        "score": best["score"],
    }


def compute_window_payload(detected: dict, events: list[dict]) -> dict | None:
    """Convert a detected window into the frontend contract and mark members."""
    if not detected:
        return None
    start_min = detected["start"]
    end_min = detected["end"]

    members = [
        ev for ev in events
        if start_min <= _parse_ts(ev["timestamp"]) <= end_min
    ]
    members.sort(key=lambda ev: ev["timestamp"])
    if not members:
        return None

    # Shrink the reported window to the observed member span.
    start_str = members[0]["time"] or start_min.strftime("%H:%M")
    end_str = members[-1]["time"] or end_min.strftime("%H:%M")
    raw_span = (_parse_ts(members[-1]["timestamp"]) - _parse_ts(members[0]["timestamp"])).total_seconds()

    return {
        "start": start_str,
        "end": end_str,
        "label": f"{start_str} → {end_str}",
        "durationMinutes": max(1, int(round(raw_span / 60.0))),
        "sourceTypes": ordered_source_keys([ev["source"] for ev in members]),
        "evidenceIds": [ev["evidence_id"] for ev in members if ev.get("evidence_id")],
        "eventIds": [ev["id"] for ev in members],
        "eventCount": len(members),
        "sourceCount": len({ev["source"] for ev in members}),
        "method": {
            "scan": "sliding-window",
            "spanMinutes": detected["span_minutes"],
            "stepMinutes": detected["step_minutes"],
            "thresholdRule": "mean + z*sigma",
            "threshold": detected["threshold"],
            "mean": detected["mean"],
            "sigma": detected["stdev"],
        },
    }


def assign_window_flags(db: Session, case_id: str, window: dict | None) -> None:
    """Mark the case events that fall inside the critical window."""
    rows = db.query(EventRecord).filter(EventRecord.case_id == case_id).all()
    member_ids = set(window["eventIds"]) if window else set()
    for row in rows:
        row.in_window = row.id in member_ids
    db.flush()


def build_timeline(db: Session, case_id: str, settings) -> dict:
    """Rebuild the timeline (events + overview) for a case, marking its window."""
    events = []
    for row in (
        db.query(EventRecord)
        .filter(EventRecord.case_id == case_id)
        .order_by(EventRecord.timestamp.asc())
        .all()
    ):
        events.append({
            "id": row.id,
            "time": row.time,
            "timestamp": row.timestamp,
            "source": row.source,
            "eventType": row.event_type,
            "entity1": row.entity1,
            "entity2": row.entity2,
            "description": row.description,
            "location": row.location,
            "evidenceId": row.evidence_id,
            "window": row.in_window,
            "metadata": row.event_metadata or {},
        })

    detected = detect_critical_window(
        [{"timestamp": ev["timestamp"], "source": ev["source"]} for ev in events],
        span_minutes=getattr(settings, "ANALYSIS_SLIDING_WINDOW_MINUTES", DEFAULT_SPAN_MINUTES),
        step_minutes=getattr(settings, "ANALYSIS_SLIDING_STEP_MINUTES", DEFAULT_STEP_MINUTES),
        z_threshold=getattr(settings, "ANOMALY_ZSCORE_THRESHOLD", 2.0),
    )
    window = compute_window_payload(detected, events)

    overview = {
        "total": len(events),
        "sourceTypes": len({ev["source"] for ev in events}),
        "window": window,
    }
    return {"events": events, "overview": overview, "window": window}