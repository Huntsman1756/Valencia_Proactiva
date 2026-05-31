"""Build the frontend street index from the municipal Geoportal.

The generated file is intentionally static: browser searches stay local and only
use official street axes from València.
"""

from __future__ import annotations

import json
import re
import unicodedata
import urllib.request
from collections.abc import Iterable, Iterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, TypedDict


SOURCE_URL = "https://geoportal.valencia.es/apps/OpenData/UrbanismoEInfraestructuras/EJES_CALLE.json"
SOURCE_NAME = "Ejes lineales de las calles"
SOURCE_PUBLISHER = "Geoportal València / Ayuntamiento de València"
VALENCIA_BBOX = (-0.55, 39.25, -0.20, 39.65)
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "frontend" / "data" / "valencia-streets.json"


class StreetAccumulator(TypedDict):
    id: str
    type: str
    name: str
    official_name: str
    search: str
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float
    segment_count: int


def normalize_search(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", re.sub(r"[^a-zA-Z0-9]+", " ", ascii_value).lower()).strip()


def iter_coordinates(geometry: dict[str, Any]) -> Iterator[tuple[float, float]]:
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates")
    if geometry_type == "LineString" and isinstance(coordinates, list):
        yield from iter_line_coordinates(coordinates)
    elif geometry_type == "MultiLineString" and isinstance(coordinates, list):
        for line in coordinates:
            if isinstance(line, list):
                yield from iter_line_coordinates(line)


def iter_line_coordinates(line: Iterable[Any]) -> Iterator[tuple[float, float]]:
    for point in line:
        if (
            isinstance(point, list)
            and len(point) >= 2
            and isinstance(point[0], int | float)
            and isinstance(point[1], int | float)
        ):
            yield float(point[0]), float(point[1])


def inside_valencia_bbox(lon: float, lat: float) -> bool:
    min_lon, min_lat, max_lon, max_lat = VALENCIA_BBOX
    return min_lon <= lon <= max_lon and min_lat <= lat <= max_lat


def fetch_source() -> dict[str, Any]:
    request = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "vpro-street-index/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = response.read().decode("utf-8")
    data = json.loads(payload)
    if not isinstance(data, dict) or not isinstance(data.get("features"), list):
        raise ValueError("Municipal street source did not return a GeoJSON FeatureCollection")
    return data


def build_index(data: dict[str, Any]) -> list[dict[str, Any]]:
    streets: dict[str, StreetAccumulator] = {}
    for feature in data.get("features", []):
        if not isinstance(feature, dict):
            continue
        properties = feature.get("properties")
        geometry = feature.get("geometry")
        if not isinstance(properties, dict) or not isinstance(geometry, dict):
            continue

        code = str(properties.get("codvia") or "").strip()
        street_type = str(properties.get("tipcalle") or "").strip()
        street_name = str(properties.get("nomcalle") or "").strip()
        official_name = str(properties.get("tipnomcalle") or f"{street_type} {street_name}").strip()
        if not official_name:
            continue
        points = [(lon, lat) for lon, lat in iter_coordinates(geometry) if inside_valencia_bbox(lon, lat)]
        if not points:
            continue

        street_id = code or normalize_search(official_name).replace(" ", "-")
        search_text = normalize_search(" ".join([official_name, street_name, street_type]))
        if street_id not in streets:
            first_lon, first_lat = points[0]
            streets[street_id] = {
                "id": street_id,
                "type": street_type,
                "name": street_name,
                "official_name": official_name,
                "search": search_text,
                "min_lon": first_lon,
                "min_lat": first_lat,
                "max_lon": first_lon,
                "max_lat": first_lat,
                "segment_count": 0,
            }

        item = streets[street_id]
        for lon, lat in points:
            item["min_lon"] = min(item["min_lon"], lon)
            item["min_lat"] = min(item["min_lat"], lat)
            item["max_lon"] = max(item["max_lon"], lon)
            item["max_lat"] = max(item["max_lat"], lat)
        item["segment_count"] += 1

    output: list[dict[str, Any]] = []
    for item in streets.values():
        center = [
            round((item["min_lon"] + item["max_lon"]) / 2, 7),
            round((item["min_lat"] + item["max_lat"]) / 2, 7),
        ]
        output.append(
            {
                "id": item["id"],
                "name": item["official_name"],
                "street_type": item["type"],
                "search": item["search"],
                "center": center,
                "bbox": [
                    round(item["min_lon"], 7),
                    round(item["min_lat"], 7),
                    round(item["max_lon"], 7),
                    round(item["max_lat"], 7),
                ],
                "segment_count": item["segment_count"],
            }
        )
    return sorted(output, key=lambda street: normalize_search(str(street["name"])))


def main() -> None:
    data = fetch_source()
    streets = build_index(data)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "name": "vpro_valencia_street_index",
        "source": {
            "name": SOURCE_NAME,
            "publisher": SOURCE_PUBLISHER,
            "url": SOURCE_URL,
            "license": "Datos abiertos municipales",
        },
        "scope": "Calles del municipio de València a partir de ejes lineales oficiales.",
        "bbox": list(VALENCIA_BBOX),
        "generated_at": datetime.now(UTC).isoformat(),
        "count": len(streets),
        "streets": streets,
    }
    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"output": str(OUTPUT_PATH), "count": len(streets)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
