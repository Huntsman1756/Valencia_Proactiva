"""Promotion rules from OfficialNotice staging to UrbanEvent candidates."""

from __future__ import annotations

import json
from datetime import datetime
from math import asin, cos, radians, sin, sqrt
from pathlib import Path
from typing import Any
from unicodedata import category, normalize

from ingestion.official_sources import EMT_ESTADO_SERVICIO_SOURCE


PROMOTION_DISTANCE_METERS = 120.0
GAZETTEER_PATH = Path(__file__).with_name("data") / "valencia_gazetteer.json"

NOTICE_TYPE_TO_EVENT_TYPE = {
    "EVENTO_FALLAS": "EVENTO_FALLAS",
    "SPORT_EVENT": "OCUPACION",
    "PUBLIC_ACT": "OCUPACION",
    "ROADWORK": "OCUPACION",
    "TRANSPORT_NOTICE": "OTRO",
}


def _fold_text(value: str) -> str:
    decomposed = normalize("NFKD", value.casefold())
    without_marks = "".join(char for char in decomposed if category(char) != "Mn")
    return " ".join(without_marks.replace(".", " ").replace(",", " ").split())


def load_valencia_gazetteer(path: Path = GAZETTEER_PATH) -> dict[str, Any]:
    """Load the versioned Valencia gazetteer."""
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def iter_gazetteer_locations(path: Path = GAZETTEER_PATH) -> list[dict[str, Any]]:
    """Return gazetteer locations with folded aliases ready for matching."""
    gazetteer = load_valencia_gazetteer(path)
    locations = []
    for location in gazetteer.get("locations", []):
        aliases = location.get("aliases") or []
        folded_aliases = {_fold_text(alias) for alias in aliases}
        folded_aliases.add(_fold_text(location["label"]))
        locations.append({**location, "folded_aliases": sorted(folded_aliases)})
    return locations


def _notice_text(notice: dict[str, Any]) -> str:
    extra_data = notice.get("extra_data") or {}
    values = [
        notice.get("title") or "",
        notice.get("description") or "",
        extra_data.get("slug") or "",
    ]
    return _fold_text(" ".join(values))


def infer_notice_location(notice: dict[str, Any]) -> dict[str, Any] | None:
    """Infer a notice location only from approved high-confidence signals."""
    extra_data = notice.get("extra_data") or {}
    official_geometry = extra_data.get("geometry")
    if isinstance(official_geometry, dict):
        return {
            "label": extra_data.get("location_label") or "official_geometry",
            "geometry": official_geometry,
            "confidence": 1.0,
            "method": "official_geometry",
        }

    text = _notice_text(notice)
    for location in iter_gazetteer_locations():
        matched_phrase = next((alias for alias in location["folded_aliases"] if alias in text), None)
        if matched_phrase:
            return {
                "label": location["label"],
                "geometry": location["geometry"],
                "confidence": location["confidence"],
                "method": "known_location_gazetteer",
                "matched_phrase": matched_phrase,
                "gazetteer_id": location["id"],
            }

    return None


def _point_from_geometry(geometry: dict[str, Any]) -> tuple[float, float] | None:
    try:
        if geometry.get("type") == "Point":
            lon, lat = geometry["coordinates"]
            return float(lon), float(lat)

        import shapely.geometry

        shape = shapely.geometry.shape(geometry)
        return float(shape.centroid.x), float(shape.centroid.y)
    except Exception:
        return None


def _distance_meters(a: tuple[float, float], b: tuple[float, float]) -> float:
    lon1, lat1 = a
    lon2, lat2 = b
    radius = 6_371_000.0
    dlon = radians(lon2 - lon1)
    dlat = radians(lat2 - lat1)
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    hav = sin(dlat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2) ** 2
    return 2 * radius * asin(sqrt(hav))


def is_duplicate_urban_event(
    candidate: dict[str, Any],
    existing_events: list[dict[str, Any]],
    max_distance_meters: float = PROMOTION_DISTANCE_METERS,
) -> bool:
    """Return true when a candidate overlaps an existing open-data event."""
    candidate_point = _point_from_geometry(candidate["geometry"])
    if candidate_point is None:
        return True

    for event in existing_events:
        event_point = event.get("center") or _point_from_geometry(event.get("geometry") or {})
        if event_point is None:
            continue
        if _distance_meters(candidate_point, event_point) > max_distance_meters:
            continue
        if event.get("type") == candidate.get("type") or event.get("source", "").startswith("opendata_valencia"):
            return True

    return False


def promote_official_notice_to_event(
    notice: dict[str, Any],
    existing_events: list[dict[str, Any]] | None = None,
) -> dict[str, Any] | None:
    """Promote an OfficialNotice dict to an UrbanEvent candidate when safe."""
    existing_events = existing_events or []
    if notice.get("source") != EMT_ESTADO_SERVICIO_SOURCE:
        return None

    location = infer_notice_location(notice)
    if location is None or location["confidence"] < 0.85:
        return None

    notice_type = notice.get("notice_type", "TRANSPORT_NOTICE")
    event_type = NOTICE_TYPE_TO_EVENT_TYPE.get(notice_type, "OTRO")
    start_time = notice.get("published_at") or datetime.now()
    affected_lines = (notice.get("extra_data") or {}).get("affected_lines", [])

    candidate = {
        "record_kind": "event",
        "type": event_type,
        "title": notice["title"],
        "description": notice.get("description") or "",
        "geometry": location["geometry"],
        "start_time": start_time,
        "end_time": None,
        "severity": 2 if affected_lines else 1,
        "source": notice["source"],
        "source_id": f"promoted:{notice['source_id']}",
        "extra_data": {
            "promoted_from": "official_notice",
            "official_notice_source_id": notice["source_id"],
            "official_url": notice.get("url"),
            "notice_type": notice_type,
            "affected_lines": affected_lines,
            "location_label": location["label"],
            "location_confidence": location["confidence"],
            "location_method": location["method"],
        },
    }

    if is_duplicate_urban_event(candidate, existing_events):
        return None

    return candidate
