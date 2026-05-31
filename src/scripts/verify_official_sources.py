"""Verify official complementary public sources for V-PRO.

This script does not ingest data. It checks whether candidate official sources
are reachable and whether they expose machine-readable records.
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import asdict, dataclass
from typing import Any

import httpx


@dataclass(frozen=True)
class OfficialSource:
    key: str
    name: str
    url: str
    classification: str
    expected: str


@dataclass
class SourceCheck:
    key: str
    name: str
    url: str
    classification: str
    status_code: int | None
    final_url: str | None
    content_type: str | None
    reachable: bool
    machine_readable: bool
    record_count: int | None
    note: str


OFFICIAL_SOURCES = [
    OfficialSource(
        key="valencia_rss_catalog",
        name="Servicios RSS Ayuntamiento",
        url="https://www.valencia.es/cas/atencion-ciudadana/servicios-rss",
        classification="official_feed_catalog",
        expected="html",
    ),
    OfficialSource(
        key="valencia_agenda_city",
        name="Agenda de la Ciudad",
        url="http://www.valencia.es/ayuntamiento/agenda_accesible.nsf/agenda.xml",
        classification="official_public_info",
        expected="rss_or_html",
    ),
    OfficialSource(
        key="valencia_news",
        name="Noticias Ayuntamiento",
        url="http://www.valencia.es/valencia/noticias/rss/index.htm?lang=1",
        classification="official_public_info",
        expected="rss_or_html",
    ),
    OfficialSource(
        key="emt_estado_servicio",
        name="EMT Valencia estado del servicio",
        url="https://www.emtvalencia.es/wp/wp-json/wp/v2/estado-servicio?per_page=5",
        classification="official_public_info",
        expected="json_list",
    ),
    OfficialSource(
        key="emt_posts",
        name="EMT Valencia noticias",
        url="https://www.emtvalencia.es/wp/wp-json/wp/v2/posts?per_page=5",
        classification="official_public_info",
        expected="json_list",
    ),
    OfficialSource(
        key="cultural_valencia_agenda",
        name="Cultural Valencia agenda",
        url="https://cultural.valencia.es/agenda/",
        classification="official_public_info",
        expected="html",
    ),
    OfficialSource(
        key="cultural_valencia_rest_types",
        name="Cultural Valencia REST API",
        url="https://cultural.valencia.es/wp-json/wp/v2/types",
        classification="official_public_info",
        expected="json_or_restricted",
    ),
]


async def check_source(client: httpx.AsyncClient, source: OfficialSource) -> SourceCheck:
    try:
        response = await client.get(source.url, follow_redirects=True)
    except httpx.HTTPError as exc:
        return SourceCheck(
            key=source.key,
            name=source.name,
            url=source.url,
            classification=source.classification,
            status_code=None,
            final_url=None,
            content_type=None,
            reachable=False,
            machine_readable=False,
            record_count=None,
            note=f"request_error: {exc.__class__.__name__}",
        )

    content_type = response.headers.get("content-type", "")
    text = response.text.strip()
    record_count: int | None = None
    machine_readable = False
    note = "ok"

    if "json" in content_type:
        try:
            payload: Any = response.json()
            if isinstance(payload, list):
                record_count = len(payload)
                machine_readable = True
            elif isinstance(payload, dict):
                record_count = len(payload)
                machine_readable = True
        except ValueError:
            note = "invalid_json"
    elif text.startswith("<?xml") or "<rss" in text[:500].lower():
        machine_readable = True
        record_count = text.lower().count("<item")
    elif "html" in content_type:
        note = "html_fallback"
    else:
        note = "unknown_content_type"

    if response.status_code >= 400:
        note = f"http_{response.status_code}"

    return SourceCheck(
        key=source.key,
        name=source.name,
        url=source.url,
        classification=source.classification,
        status_code=response.status_code,
        final_url=str(response.url),
        content_type=content_type,
        reachable=response.status_code < 500,
        machine_readable=machine_readable,
        record_count=record_count,
        note=note,
    )


async def main() -> None:
    async with httpx.AsyncClient(timeout=20.0, headers={"User-Agent": "V-PRO/0.1"}) as client:
        checks = [await check_source(client, source) for source in OFFICIAL_SOURCES]

    print(json.dumps([asdict(check) for check in checks], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
