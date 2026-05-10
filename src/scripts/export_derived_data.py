#!/usr/bin/env python
"""Export V-PRO derived open data files."""

from __future__ import annotations

import csv
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_BACKEND = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(_BACKEND))

from sqlalchemy import text  # noqa: E402

from core.database import SessionLocal  # noqa: E402
from engine.action_templates import load_templates  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
EXPORT_DIR = Path(os.environ.get("VPRO_EXPORT_DIR", REPO_ROOT / "exports"))
LICENSE = "CC-BY-4.0"
SOURCE_ATTRIBUTION = (
    "Portal de Datos Abiertos del Ayuntamiento de Valencia; "
    "datos derivados por V-PRO"
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


def _write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        handle.write(f"# source: {SOURCE_ATTRIBUTION}\n")
        handle.write(f"# license: {LICENSE}\n")
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def export_impact_zones(export_dir: Path = EXPORT_DIR) -> int:
    query = text("""
        SELECT
            iz.id,
            iz.event_id,
            iz.buffer_distance,
            iz.created_at,
            ue.type AS event_type,
            ue.title AS event_title,
            ue.severity,
            ue.source,
            ue.source_id,
            ST_AsGeoJSON(iz.geometry)::json AS geometry
        FROM impact_zones iz
        JOIN urban_events ue ON ue.id = iz.event_id
        ORDER BY iz.created_at DESC, iz.id DESC
    """)
    with SessionLocal() as session:
        rows = session.execute(query).mappings().all()

    features = [
        {
            "type": "Feature",
            "geometry": row["geometry"],
            "properties": {
                "id": row["id"],
                "event_id": row["event_id"],
                "event_type": row["event_type"],
                "event_title": row["event_title"],
                "severity": row["severity"],
                "buffer_distance_meters": float(row["buffer_distance"]),
                "source": row["source"],
                "source_id": row["source_id"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            },
        }
        for row in rows
    ]
    payload = {
        "type": "FeatureCollection",
        "name": "vpro_impact_zones",
        "license": LICENSE,
        "source": SOURCE_ATTRIBUTION,
        "generated_at": _now_iso(),
        "features": features,
    }
    _write_json(export_dir / "impact_zones.geojson", payload)
    return len(features)


def export_mitigation_actions(export_dir: Path = EXPORT_DIR) -> int:
    template_payloads = _template_payloads_by_action()
    query = text("""
        SELECT
            ma.id,
            ma.event_id,
            ue.type AS event_type,
            ue.title AS event_title,
            ue.source AS event_source,
            ue.source_id AS event_source_id,
            ma.action_type,
            ma.title,
            ma.description,
            ma.priority,
            ma.payload,
            ma.created_at
        FROM mitigation_actions ma
        JOIN urban_events ue ON ue.id = ma.event_id
        ORDER BY ma.priority DESC, ma.id ASC
    """)
    with SessionLocal() as session:
        rows = session.execute(query).mappings().all()

    output = []
    for row in rows:
        payload = row["payload"] or {}
        template_payload = template_payloads.get(
            (payload.get("template_id", ""), row["action_type"], row["title"]),
            {},
        )
        payload = {**payload, **template_payload}
        profiles = payload.get("profiles") or []
        output.append(
            {
                "action_id": row["id"],
                "event_id": row["event_id"],
                "event_type": row["event_type"],
                "event_title": row["event_title"],
                "event_source": row["event_source"],
                "event_source_id": row["event_source_id"],
                "action_type": row["action_type"],
                "title": row["title"],
                "description": row["description"] or "",
                "priority": row["priority"],
                "profiles": "|".join(profiles),
                "template_id": payload.get("template_id", ""),
                "url": payload.get("url", ""),
                "poi_type": payload.get("poi_type", ""),
                "created_at": row["created_at"].isoformat() if row["created_at"] else "",
            }
        )

    fieldnames = [
        "action_id",
        "event_id",
        "event_type",
        "event_title",
        "event_source",
        "event_source_id",
        "action_type",
        "title",
        "description",
        "priority",
        "profiles",
        "template_id",
        "url",
        "poi_type",
        "created_at",
    ]
    _write_csv(export_dir / "mitigation_actions.csv", output, fieldnames)
    return len(output)


def _template_payloads_by_action() -> dict[tuple[str, str, str], dict[str, Any]]:
    payloads: dict[tuple[str, str, str], dict[str, Any]] = {}
    for template in load_templates():
        template_id = template["id"]
        for action in template.get("actions", []):
            payload = dict(action.get("payload", {}))
            if payload:
                payloads[
                    (
                        template_id,
                        action["action_type"],
                        action["title"],
                    )
                ] = payload
    return payloads


def export_feedback_aggregated(export_dir: Path = EXPORT_DIR) -> int:
    query = text("""
        SELECT
            ma.id AS action_id,
            ma.action_type,
            ma.title,
            COALESCE(f.profile, 'UNKNOWN') AS profile,
            COUNT(*) FILTER (WHERE f.vote = 1) AS up_votes,
            COUNT(*) FILTER (WHERE f.vote = -1) AS down_votes,
            COUNT(*) AS total_votes
        FROM feedback f
        JOIN mitigation_actions ma ON ma.id = f.mitigation_action_id
        GROUP BY ma.id, ma.action_type, ma.title, COALESCE(f.profile, 'UNKNOWN')
        ORDER BY total_votes DESC, ma.id ASC
    """)
    with SessionLocal() as session:
        rows = session.execute(query).mappings().all()

    output = [
        {
            "action_id": row["action_id"],
            "action_type": row["action_type"],
            "title": row["title"],
            "profile": row["profile"],
            "up_votes": row["up_votes"],
            "down_votes": row["down_votes"],
            "total_votes": row["total_votes"],
        }
        for row in rows
    ]
    fieldnames = [
        "action_id",
        "action_type",
        "title",
        "profile",
        "up_votes",
        "down_votes",
        "total_votes",
    ]
    _write_csv(export_dir / "feedback_aggregated.csv", output, fieldnames)
    return len(output)


def export_all(export_dir: Path = EXPORT_DIR) -> dict[str, int]:
    export_dir.mkdir(parents=True, exist_ok=True)
    return {
        "impact_zones": export_impact_zones(export_dir),
        "mitigation_actions": export_mitigation_actions(export_dir),
        "feedback_aggregated": export_feedback_aggregated(export_dir),
    }


def main() -> int:
    summary = export_all()
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
