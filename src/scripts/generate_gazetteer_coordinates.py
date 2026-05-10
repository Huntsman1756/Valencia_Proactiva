"""Validate gazetteer coordinates against municipal street-axis geodata."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import httpx
import shapely.geometry
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "src" / "backend"
sys.path.insert(0, str(BACKEND))

from ingestion.official_promotion import (  # noqa: E402
    _fold_text,
    _distance_meters,
    iter_gazetteer_locations,
    load_valencia_gazetteer,
)


STREET_AXES_URL = "https://geoportal.valencia.es/apps/OpenData/UrbanismoEInfraestructuras/EJES_CALLE.json"


@dataclass
class CoordinateCheck:
    id: str
    label: str
    matched: bool
    matched_alias: str | None
    matched_features: int
    current_coordinates: list[float]
    derived_coordinates: list[float] | None
    distance_meters: float | None
    status: str
    note: str


TYPE_TOKENS = {
    "av",
    "avinguda",
    "avenida",
    "c",
    "calle",
    "carrer",
    "gran",
    "gv",
    "lloc",
    "passeig",
    "paseo",
    "pl",
    "placa",
    "plaza",
}
FILLER_TOKENS = {"de", "del", "dels", "de la", "l", "la", "el", "les", "los"}
NON_LINEAR_LOCATION_TYPES = {"district", "neighborhood", "facility", "landmark", "transport_hub"}
JUSTIFIED_VALIDATION_POLICIES = {"long_axis_curated_point"}


def fetch_street_axes(url: str = STREET_AXES_URL) -> dict[str, Any]:
    response = httpx.get(url, timeout=60.0, follow_redirects=True)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict) or "features" not in payload:
        raise ValueError("street axes endpoint did not return a GeoJSON FeatureCollection")
    return payload


def _feature_text(feature: dict[str, Any]) -> str:
    props = feature.get("properties") or {}
    return _fold_text(
        " ".join(
            str(props.get(field) or "")
            for field in ("tipnomcalle", "nomcalle", "tipcalle")
        )
    )


def _tokens(value: str) -> list[str]:
    return [token for token in _fold_text(value).replace("-", " ").split() if token]


def _canonical_tokens(value: str) -> list[str]:
    return [
        token
        for token in _tokens(value)
        if token not in TYPE_TOKENS and token not in FILLER_TOKENS
    ]


def _contains_sequence(tokens: list[str], query: list[str]) -> bool:
    if not query or len(query) > len(tokens):
        return False
    return any(tokens[index : index + len(query)] == query for index in range(len(tokens) - len(query) + 1))


def _alias_matches_feature(alias: str, feature_text: str) -> bool:
    alias_tokens = _tokens(alias)
    feature_tokens = _tokens(feature_text)
    if _contains_sequence(feature_tokens, alias_tokens):
        return True

    canonical_alias = _canonical_tokens(alias)
    canonical_feature = _canonical_tokens(feature_text)
    return len(canonical_alias) >= 2 and _contains_sequence(canonical_feature, canonical_alias)


def _centroid_coordinates(features: list[dict[str, Any]]) -> list[float] | None:
    shapes = []
    for feature in features:
        try:
            shapes.append(shapely.geometry.shape(feature["geometry"]))
        except Exception:
            continue
    if not shapes:
        return None

    centroid = unary_union(shapes).centroid
    return [round(float(centroid.x), 6), round(float(centroid.y), 6)]


def derive_coordinate_report(
    gazetteer_path: Path | None = None,
    street_axes: dict[str, Any] | None = None,
) -> dict[str, Any]:
    path = gazetteer_path or None
    gazetteer = load_valencia_gazetteer(path) if path else load_valencia_gazetteer()
    locations = iter_gazetteer_locations(path) if path else iter_gazetteer_locations()
    axes = street_axes or fetch_street_axes()
    features = axes.get("features", [])

    feature_index = [(feature, _feature_text(feature)) for feature in features]
    checks: list[CoordinateCheck] = []

    for location in locations:
        matched_alias = None
        matched_features: list[dict[str, Any]] = []
        current = location["geometry"]["coordinates"]
        distance = None
        status = "missing_match"
        note = "no matching municipal street-axis feature"
        if location.get("location_type") in NON_LINEAR_LOCATION_TYPES:
            derived = None
            status = "justified"
            note = f"non-linear {location['location_type']} location; keep curated point"
        else:
            for alias in location["folded_aliases"]:
                exact_matches = [feature for feature, text in feature_index if _alias_matches_feature(alias, text)]
                if exact_matches:
                    matched_alias = alias
                    matched_features = exact_matches
                    break

            derived = _centroid_coordinates(matched_features)
            if derived:
                distance = round(_distance_meters((current[0], current[1]), (derived[0], derived[1])), 2)
                status = "ok" if distance <= 250 else "review"
                note = "matched municipal street-axis centroid"
                if status == "review" and location.get("validation_policy") in JUSTIFIED_VALIDATION_POLICIES:
                    status = "justified"
                    note = (
                        f"{location['validation_policy']}; matched municipal street axis "
                        "but keeps curated operational point"
                    )

        checks.append(
            CoordinateCheck(
                id=location["id"],
                label=location["label"],
                matched=bool(matched_features),
                matched_alias=matched_alias,
                matched_features=len(matched_features),
                current_coordinates=current,
                derived_coordinates=derived,
                distance_meters=distance,
                status=status,
                note=note,
            )
        )

    ok_count = sum(1 for check in checks if check.status == "ok")
    review_count = sum(1 for check in checks if check.status == "review")
    justified_count = sum(1 for check in checks if check.status == "justified")
    missing_count = sum(1 for check in checks if check.status == "missing_match")

    return {
        "source": {
            "name": "Ejes lineales de las calles",
            "url": STREET_AXES_URL,
            "license": "CC BY 4.0",
            "feature_count": len(features),
        },
        "gazetteer": {
            "name": gazetteer["metadata"]["name"],
            "version": gazetteer["metadata"]["version"],
            "location_count": len(locations),
        },
        "summary": {
            "ok": ok_count,
            "review": review_count,
            "justified": justified_count,
            "missing_match": missing_count,
        },
        "checks": [asdict(check) for check in checks],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "docs" / "reports" / "gazetteer-coordinate-report.json",
    )
    args = parser.parse_args()

    report = derive_coordinate_report()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report["summary"], ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
