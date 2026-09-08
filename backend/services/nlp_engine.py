"""
Basic NLP for statement claims.

Uses spaCy when a language model is available; otherwise a regex-based
fallback tokenizer. Output is deliberately a *claim extraction* — the
system never concludes that a person is lying or guilty. It flags
potential contradictions for investigator verification.
"""

import re

try:  # optional heavy dependency — degrade gracefully
    import spacy

    _SPACY_AVAILABLE = True
except Exception:
    spacy = None
    _SPACY_AVAILABLE = False

_LEMMATIZER_CACHE = {}


def _lemmatize_word(word: str) -> str:
    return word.lower().rstrip(".,;:!?")


def split_sentences(text: str) -> list[str]:
    if not text:
        return []
    parts = re.split(r"(?<=[.?!])\s+", text.strip())
    return [p for p in parts if p.strip()]


def extract_locations(text: str) -> list[str]:
    """Regex-based location heuristics for claim text."""
    found = []
    patterns = [
        r"was at\s+([A-Z][A-Za-z0-9 ]{1,40}?)\s+(?:between|from|during|the whole)",
        r"was not in\s+([A-Z][A-Za-z0-9 ]{1,40}?)\b",
        r"travelled (?:directly )?to\s+([A-Z][A-Za-z0-9 ]{1,40}?)\b",
        r"at\s+([A-Z][A-Za-z0-9 ]{1,20}?)\s+(?:between|from)",
        r"\b(home|work|office)\b",
    ]
    for pattern in patterns:
        found.extend(re.findall(pattern, text, flags=re.IGNORECASE))
    out = []
    for loc in found:
        cleaned = loc.strip().strip(".,")
        if cleaned and cleaned.lower() not in {x.lower() for x in out}:
            out.append(cleaned)
    return out


def _normalize_time(token: str) -> str | None:
    token = token.strip().lower().replace(" ", "")
    match = re.match(r"^(\d{1,2})(?::(\d{2}))?(am|pm)?$", token)
    if not match:
        return None
    hour = int(match.group(1))
    minute = int(match.group(2) or 0)
    meridian = match.group(3)
    if meridian == "pm" and hour < 12:
        hour += 12
    elif meridian == "am" and hour == 12:
        hour = 0
    if hour > 23 or minute > 59:
        return None
    return f"{hour:02d}:{minute:02d}"


def parse_claim(claim_text: str) -> dict | None:
    """Parse a claim into {location, start, end, kind} — or None."""
    if not claim_text:
        return None
    variants = [
        r"was at\s+(.+?)\s+(?:between|from)\s+([\d:]+(?:\s?(?:am|pm))?)\s+(?:and|to|until)\s+([\d:]+(?:\s?(?:am|pm))?)",
        r"was not in\s+(.+?)\s+(?:between|from)\s+([\d:]+(?:\s?(?:am|pm))?)\s+(?:and|to|until)\s+([\d:]+(?:\s?(?:am|pm))?)",
        r"(?:left|departed)\s+(?:from\s+)?(.+?)\s+at\s+([\d:]+(?:\s?(?:am|pm))?)",
        r"at\s+(.+?)\s+(?:between|from)\s+([\d:]+(?:\s?(?:am|pm))?)\s+(?:and|to|until)\s+([\d:]+(?:\s?(?:am|pm))?)",
    ]
    for pattern in variants:
        match = re.search(pattern, claim_text, flags=re.IGNORECASE)
        if match:
            location = match.group(1).strip().strip(".,").strip('“”"')
            start = _normalize_time(match.group(2)) if match.lastindex >= 2 else None
            end = _normalize_time(match.group(3)) if match.lastindex >= 3 else None
            kind = "absence" if "not in" in claim_text.lower() else "presence"
            return {"location": location, "start": start, "end": end, "kind": kind}
    # Fall back: just extract a location mention.
    locations = extract_locations(claim_text)
    if locations:
        return {"location": locations[0], "start": None, "end": None, "kind": "presence"}
    return None


def lemmatize(text: str) -> list[str]:
    """Word tokens (spaCy lemmatized when available)."""
    if _SPACY_AVAILABLE and "NLP" not in _LEMMATIZER_CACHE:
        try:
            _LEMMATIZER_CACHE["NLP"] = spacy.load("en_core_web_sm", disable=["ner", "parser"])
        except Exception:
            _LEMMATIZER_CACHE["NLP"] = None
    nlp = _LEMMATIZER_CACHE.get("NLP")
    if nlp is not None:
        try:
            doc = nlp(text)
            return [token.lemma_.lower() for token in doc if not token.is_punct]
        except Exception:
            pass
    return [_lemmatize_word(w) for w in re.findall(r"[A-Za-z0-9₹%\.,]+", text or "")]


def tokens_available() -> bool:
    return _SPACY_AVAILABLE


def model_loaded() -> bool:
    return _SPACY_AVAILABLE and _LEMMATIZER_CACHE.get("NLP") is not None