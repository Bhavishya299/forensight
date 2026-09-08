"""Static source metadata mirroring frontend src/data/sourceMeta.js."""

SOURCE_META = {
    "CDR": {"label": "Call Detail Records", "shortLabel": "CDR"},
    "IPDR": {"label": "IP Detail Records", "shortLabel": "IPDR"},
    "BANKING": {"label": "Banking & Ledger", "shortLabel": "Banking"},
    "OSINT": {"label": "Social / OSINT", "shortLabel": "OSINT"},
    "DEVICE": {"label": "Device / Location", "shortLabel": "Device"},
    "STATEMENTS": {"label": "Statements", "shortLabel": "Statements"},
    "CCTV": {"label": "CCTV / Traffic Cameras", "shortLabel": "CCTV"},
}

LEGACY_SOURCE_MAP = {
    "Call Detail Records": "CDR",
    "Call Detail": "CDR",
    "CDR": "CDR",
    "IP Detail Records": "IPDR",
    "Internet Protocol Detail Records": "IPDR",
    "IP Log": "IPDR",
    "Network": "IPDR",
    "IPDR": "IPDR",
    "Banking & Ledger": "BANKING",
    "Bank Ledger": "BANKING",
    "Banking": "BANKING",
    "Ledger": "BANKING",
    "Social / OSINT": "OSINT",
    "Open Source": "OSINT",
    "OSINT": "OSINT",
    "Device / Location": "DEVICE",
    "Device Record": "DEVICE",
    "Device": "DEVICE",
    "Location": "DEVICE",
    "Location Record": "DEVICE",
    "Statements": "STATEMENTS",
    "Statement": "STATEMENTS",
    "CCTV": "CCTV",
    "Cctv": "CCTV",
    "Traffic Camera": "CCTV",
    "Traffic CCTV": "CCTV",
}


def normalize_source(name: str | None) -> str:
    if not name:
        return "UNKNOWN"
    key = LEGACY_SOURCE_MAP.get(name)
    if key:
        return key
    return name.upper().strip()


def source_label(source: str | None) -> str:
    meta = SOURCE_META.get(normalize_source(source))
    return meta["label"] if meta else (source or "Source")


def ordered_source_keys(sources: list[str]) -> list[str]:
    """Distinct source keys ordered by the SOURCE_META canonical sequence
    (CDR, IPDR, BANKING, OSINT, DEVICE, STATEMENTS, CCTV); unknown sources
    sort alphabetically afterwards. Mirrors sourceMeta.js ordering used on
    the dashboard and elsewhere."""
    order = {key: i for i, key in enumerate(SOURCE_META.keys())}
    return sorted(
        dict.fromkeys(sources),
        key=lambda s: (order.get(s, len(order)), str(s)),
    )