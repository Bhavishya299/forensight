"""
Vehicle movement intelligence.

Mirrors src/data/vehicleData.js: camera network, synthetic plate traces
with CCTV detections, and time/sector correlations with independent
source records. Observations only — never driver or destination claims.
"""

from sqlalchemy.orm import Session

from models import CameraRecord, VehicleCorrelation, VehicleRecord, VehicleSighting


def get_camera_network(db: Session) -> list[dict]:
    rows = db.query(CameraRecord).order_by(CameraRecord.id.asc()).all()
    return [
        {
            "id": r.id,
            "sector": r.sector,
            "area": r.area,
            "position": {"x": r.position_x, "y": r.position_y},
        }
        for r in rows
    ]


def _sighting_payload(row: VehicleSighting) -> dict:
    return {
        "id": row.id,
        "camera": row.camera,
        "cameraName": f"Camera {row.camera}",
        "sector": row.sector,
        "area": row.area,
        "location": row.location,
        "time": row.time,
        "timeShort": row.time[:5],
        "direction": row.direction,
        "directionShort": row.direction_short,
        "plateConfidence": row.plate_confidence,
        "matchConfidence": row.match_confidence,
        "evidenceId": row.evidence_id,
        "source": "CCTV",
    }


def _trace_payload(vehicle: VehicleRecord, sightings: list[VehicleSighting]) -> dict:
    sights = [_sighting_payload(s) for s in sightings]
    return {
        "plate": vehicle.plate,
        "type": vehicle.type,
        "color": vehicle.color,
        "confidence": vehicle.confidence,
        "status": vehicle.status,
        "firstSeen": vehicle.first_seen,
        "lastSeen": vehicle.last_seen,
        "durationSeconds": vehicle.duration_seconds,
        "sights": sights,
    }


def get_traces(db: Session) -> list[dict]:
    vehicles = db.query(VehicleRecord).order_by(VehicleRecord.plate.asc()).all()
    traces = []
    for vehicle in vehicles:
        sightings = (
            db.query(VehicleSighting)
            .filter(VehicleSighting.plate == vehicle.plate)
            .order_by(VehicleSighting.time.asc())
            .all()
        )
        traces.append(_trace_payload(vehicle, sightings))
    return traces


def _normalize_plate(value: str) -> str:
    return "".join(str(value or "").split()).upper()


def get_trace(db: Session, plate: str) -> dict | None:
    q = _normalize_plate(plate)
    vehicle = db.query(VehicleRecord).filter(VehicleRecord.plate == q).first()
    if not vehicle:
        return None
    sightings = (
        db.query(VehicleSighting)
        .filter(VehicleSighting.plate == vehicle.plate)
        .order_by(VehicleSighting.time.asc())
        .all()
    )
    return _trace_payload(vehicle, sightings)


def search_trace(db: Session, plate: str) -> dict:
    q = _normalize_plate(plate)
    trace = get_trace(db, q)
    return {
        "found": trace is not None,
        "plate": q,
        "trace": trace,
        "message": None if trace else "No synthetic vehicle trace matches that plate.",
    }


def get_detection(db: Session, plate: str, detection_id: str) -> dict | None:
    row = (
        db.query(VehicleSighting)
        .filter(VehicleSighting.plate == _normalize_plate(plate), VehicleSighting.id == detection_id)
        .first()
    )
    if row is None:
        row = db.query(VehicleSighting).filter(VehicleSighting.id == detection_id).first()
    return _sighting_payload(row) if row else None


def get_vehicle_for_detection(db: Session, detection_id: str) -> dict | None:
    row = db.query(VehicleSighting).filter(VehicleSighting.id == detection_id).first()
    if row is None:
        return None
    return get_trace(db, row.plate)


def get_correlations(db: Session, plate: str) -> list[dict]:
    rows = (
        db.query(VehicleCorrelation)
        .filter(VehicleCorrelation.vehicle == _normalize_plate(plate))
        .order_by(VehicleCorrelation.time.asc())
        .all()
    )
    return [
        {
            "vehicle": r.vehicle,
            "source": r.source,
            "sourceLabel": r.source_label,
            "detail": r.detail,
            "time": r.time,
            "sector": r.sector,
            "evidenceId": r.evidence_id,
        }
        for r in rows
    ]


def format_duration(seconds: int) -> str:
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m}m {s:02d}s"