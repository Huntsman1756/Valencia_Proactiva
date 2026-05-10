"""Official complementary source parsers.

These parsers create staging records. They do not promote notices to
UrbanEvent because many official notices have no direct geometry.
"""

from __future__ import annotations

from datetime import datetime
from html.parser import HTMLParser
from typing import Any

import httpx


EMT_ESTADO_SERVICIO_SOURCE = "emt_valencia:estado-servicio"
EMT_ESTADO_SERVICIO_URL = "https://www.emtvalencia.es/wp/wp-json/wp/v2/estado-servicio"


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        text = data.strip()
        if text:
            self._parts.append(text)

    @property
    def text(self) -> str:
        return " ".join(self._parts)


def strip_html(value: str | None) -> str:
    """Return plain text from a small HTML fragment."""
    if not value:
        return ""
    parser = _TextExtractor()
    parser.feed(value)
    return " ".join(parser.text.split())


def parse_wordpress_datetime(value: str | None) -> datetime | None:
    """Parse WordPress ISO-ish datetimes without assuming timezone."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def extract_emt_lines(class_list: list[str] | None) -> list[str]:
    """Extract EMT line codes from WordPress class names."""
    if not class_list:
        return []

    lines: set[str] = set()
    prefix = "linea-servicio-"
    for class_name in class_list:
        if not class_name.startswith(prefix):
            continue
        line = class_name.removeprefix(prefix).split("-", maxsplit=1)[0].upper()
        if line:
            lines.add(line)

    def sort_key(line: str) -> tuple[int, int | str]:
        return (0, int(line)) if line.isdigit() else (1, line)

    return sorted(lines, key=sort_key)


def classify_notice(title: str, description: str) -> str:
    """Classify notices with conservative keyword rules."""
    text = f"{title} {description}".casefold()
    keyword_map = {
        "EVENTO_FALLAS": ("fallas", "mascleta", "castillo", "plantà", "cremà"),
        "SPORT_EVENT": ("maraton", "maratón", "carrera", "10k", "medio maraton"),
        "ROADWORK": ("obra", "obras", "trabajos"),
        "PUBLIC_ACT": ("acto", "actos", "manifestacion", "manifestación", "fiesta"),
    }
    for notice_type, keywords in keyword_map.items():
        if any(keyword in text for keyword in keywords):
            return notice_type
    return "TRANSPORT_NOTICE"


def parse_emt_estado_servicio_item(item: dict[str, Any]) -> dict[str, Any]:
    """Normalize one EMT estado-servicio WordPress item to OfficialNotice data."""
    source_id_raw = item.get("id")
    title = strip_html(item.get("title", {}).get("rendered"))
    description = strip_html(item.get("content", {}).get("rendered"))
    url = item.get("link") or ""
    affected_lines = extract_emt_lines(item.get("class_list"))
    notice_type = classify_notice(title, description)

    return {
        "record_kind": "official_notice",
        "source": EMT_ESTADO_SERVICIO_SOURCE,
        "source_id": f"emt_estado_servicio:{source_id_raw}",
        "notice_type": notice_type,
        "classification": "official_public_info",
        "title": title,
        "description": description,
        "url": url,
        "published_at": parse_wordpress_datetime(item.get("date")),
        "source_updated_at": parse_wordpress_datetime(item.get("modified")),
        "extra_data": {
            "slug": item.get("slug"),
            "wp_type": item.get("type"),
            "affected_lines": affected_lines,
            "status": item.get("status"),
        },
    }


def deduplicate_official_notices(
    notices: list[dict[str, Any]],
    existing_keys: set[tuple[str, str]],
) -> tuple[list[dict[str, Any]], int]:
    """Remove notices already present by (source, source_id)."""
    deduped: list[dict[str, Any]] = []
    skipped = 0
    seen = set(existing_keys)

    for notice in notices:
        key = (notice["source"], notice["source_id"])
        if key in seen:
            skipped += 1
            continue
        seen.add(key)
        deduped.append(notice)

    return deduped, skipped


class EmtEstadoServicioClient:
    """Fetch EMT Valencia service notices from the public WordPress API."""

    def __init__(self, endpoint: str = EMT_ESTADO_SERVICIO_URL) -> None:
        self.endpoint = endpoint

    async def fetch(self, per_page: int = 20) -> list[dict[str, Any]]:
        params = {"per_page": per_page}
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            response = await client.get(self.endpoint, params=params)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, list):
                return []
            return [parse_emt_estado_servicio_item(item) for item in payload]
