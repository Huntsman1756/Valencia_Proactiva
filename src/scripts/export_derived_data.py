#!/usr/bin/env python
"""Export V-PRO derived open data files."""

from __future__ import annotations

import csv
import html
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
PUBLIC_BASE_URL = os.environ.get("VPRO_PUBLIC_BASE_URL", "").rstrip("/")


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


def _public_url(path: str) -> str:
    if PUBLIC_BASE_URL:
        return f"{PUBLIC_BASE_URL}/{path.lstrip('/')}"
    return path


def _event_permalink(event_id: int) -> str:
    return _public_url(f"events/{event_id}.html")


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


def _latest_event_rows(limit: int = 100) -> list[dict[str, Any]]:
    query = text("""
        SELECT
            ue.id,
            ue.type,
            ue.title,
            ue.description,
            ue.severity,
            ue.source,
            ue.source_id,
            ue.start_time,
            ue.end_time,
            ue.created_at,
            ue.updated_at,
            ue.extra_data,
            ST_AsGeoJSON(ue.geometry)::json AS geometry,
            ST_X(ST_Centroid(ue.geometry)) AS lon,
            ST_Y(ST_Centroid(ue.geometry)) AS lat,
            COUNT(ma.id) AS mitigation_action_count
        FROM urban_events ue
        LEFT JOIN mitigation_actions ma ON ma.event_id = ue.id
        GROUP BY ue.id
        ORDER BY COALESCE(ue.updated_at, ue.created_at) DESC, ue.id DESC
        LIMIT :limit
    """)
    with SessionLocal() as session:
        return list(session.execute(query, {"limit": limit}).mappings().all())


def _location_label(extra_data: Any) -> str | None:
    if not isinstance(extra_data, dict):
        return None
    for key in ("location_label", "direccion", "address", "calle", "localizacion", "localización"):
        value = extra_data.get(key)
        if value not in (None, ""):
            return str(value)
    return None


def _iso_or_none(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _event_payload(row: dict[str, Any]) -> dict[str, Any]:
    event_id = int(row["id"])
    extra_data = row.get("extra_data") or {}
    return {
        "id": event_id,
        "type": row["type"],
        "title": row["title"],
        "description": row["description"] or "",
        "location_label": _location_label(extra_data),
        "severity": row["severity"],
        "source": row["source"],
        "source_id": row["source_id"],
        "start_time": _iso_or_none(row["start_time"]),
        "end_time": _iso_or_none(row["end_time"]),
        "created_at": _iso_or_none(row["created_at"]),
        "updated_at": _iso_or_none(row["updated_at"]),
        "center": [float(row["lon"]), float(row["lat"])],
        "geometry": row["geometry"],
        "mitigation_action_count": int(row["mitigation_action_count"] or 0),
        "permalink": _event_permalink(event_id),
    }


def _event_html(event: dict[str, Any]) -> str:
    title = html.escape(str(event["title"]))
    description = html.escape(str(event.get("description") or ""))
    location = html.escape(str(event.get("location_label") or "Ubicacion no especificada"))
    source = html.escape(str(event["source"]))
    source_id = html.escape(str(event.get("source_id") or ""))
    updated = html.escape(str(event.get("updated_at") or event.get("created_at") or ""))
    payload = html.escape(json.dumps(event, ensure_ascii=False, separators=(",", ":")))
    return f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>VLC PROACTIVA | {title}</title>
  <meta name="description" content="{description[:240]}">
  <meta property="og:title" content="VLC PROACTIVA | {title}">
  <meta property="og:description" content="{description[:240]}">
  <meta name="twitter:card" content="summary">
  <style>
    body {{ margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6f2ec; color: #18222f; }}
    main {{ max-width: 760px; margin: 0 auto; padding: 32px 20px 48px; }}
    a {{ color: #075f4f; }}
    .meta {{ color: #536173; font-size: 0.95rem; }}
    .event {{ background: #fffdfa; border: 1px solid #ded6ca; border-radius: 8px; padding: 22px; }}
    .badge {{ display: inline-block; margin-bottom: 12px; padding: 4px 8px; border-radius: 4px; background: #e8efe9; color: #075f4f; font-weight: 700; }}
    pre {{ white-space: pre-wrap; word-break: break-word; background: #18222f; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }}
  </style>
</head>
<body>
  <main>
    <p><a href="../index.html">VLC PROACTIVA</a></p>
    <article class="event">
      <span class="badge">Impacto {html.escape(str(event["severity"]))}/5</span>
      <h1>{title}</h1>
      <p class="meta">{location}</p>
      <p>{description}</p>
      <p class="meta">Fuente: {source} · ID: {source_id} · actualizado: {updated}</p>
    </article>
    <h2>Datos reutilizables</h2>
    <pre>{payload}</pre>
  </main>
</body>
</html>
"""


def export_public_event_feed(export_dir: Path = EXPORT_DIR, limit: int = 100) -> dict[str, int]:
    rows = _latest_event_rows(limit)
    events = [_event_payload(dict(row)) for row in rows]
    payload = {
        "name": "vpro_latest_events",
        "license": LICENSE,
        "source": SOURCE_ATTRIBUTION,
        "generated_at": _now_iso(),
        "count": len(events),
        "events": events,
    }
    _write_json(export_dir / "latest_events.json", payload)

    pages_dir = export_dir / "events"
    pages_dir.mkdir(parents=True, exist_ok=True)
    for event in events:
        (pages_dir / f"{event['id']}.html").write_text(_event_html(event), encoding="utf-8")

    return {"latest_events": len(events), "event_pages": len(events)}


def export_data_health(export_dir: Path = EXPORT_DIR) -> int:
    query = text("""
        SELECT 'urban_events' AS metric, COUNT(*)::text AS value, MAX(updated_at)::text AS observed_at FROM urban_events
        UNION ALL
        SELECT 'points_of_interest', COUNT(*)::text, MAX(created_at)::text FROM points_of_interest
        UNION ALL
        SELECT 'impact_zones', COUNT(*)::text, MAX(created_at)::text FROM impact_zones
        UNION ALL
        SELECT 'mitigation_actions', COUNT(*)::text, MAX(created_at)::text FROM mitigation_actions
        UNION ALL
        SELECT 'official_notices', COUNT(*)::text, MAX(updated_at)::text FROM official_notices
        UNION ALL
        SELECT 'feedback', COUNT(*)::text, MAX(created_at)::text FROM feedback
    """)
    with SessionLocal() as session:
        rows = session.execute(query).mappings().all()

    payload = {
        "name": "vpro_data_health",
        "license": LICENSE,
        "source": SOURCE_ATTRIBUTION,
        "generated_at": _now_iso(),
        "metrics": {
            row["metric"]: {
                "count": int(row["value"]),
                "observed_at": row["observed_at"],
            }
            for row in rows
        },
    }
    _write_json(export_dir / "data_health.json", payload)
    return len(rows)


def export_all(export_dir: Path = EXPORT_DIR) -> dict[str, int]:
    export_dir.mkdir(parents=True, exist_ok=True)
    summary = {
        "impact_zones": export_impact_zones(export_dir),
        "mitigation_actions": export_mitigation_actions(export_dir),
        "feedback_aggregated": export_feedback_aggregated(export_dir),
    }
    summary.update(export_public_event_feed(export_dir))
    summary["data_health"] = export_data_health(export_dir)
    return summary


def main() -> int:
    summary = export_all()
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
