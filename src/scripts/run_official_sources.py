#!/usr/bin/env python
"""CLI for official complementary source ingestion.

Examples:
    python -m src.scripts.run_official_sources --fetch
    python -m src.scripts.run_official_sources --fetch --promote
    python -m src.scripts.run_official_sources --fetch --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from typing import Any, Callable

_BACKEND = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(_BACKEND))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("run_official_sources")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--fetch",
        action="store_true",
        help="Fetch official sources into staging tables.",
    )
    parser.add_argument(
        "--promote",
        action="store_true",
        help="Promote safe staged official notices to UrbanEvent records.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview actions without writing to the database.",
    )
    return parser


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.fetch and not args.promote:
        parser.error("choose at least one action: --fetch or --promote")
    return args


async def execute(
    args: argparse.Namespace,
    ingestor_factory: Callable[[], Any] | None = None,
) -> dict[str, Any]:
    if ingestor_factory is None:
        from ingestion.ingestor import Ingestor

        ingestor_factory = Ingestor

    ingestor = ingestor_factory()
    result: dict[str, Any] = {"dry_run": bool(args.dry_run)}

    if args.fetch:
        if args.dry_run:
            notices = await ingestor.emt_estado_servicio.fetch()
            result["fetch"] = {
                "scraped": len(notices),
                "normalized": len(notices),
                "would_store_official_notices": len(notices),
                "errors": 0,
            }
        else:
            result["fetch"] = await ingestor.run_official_sources()

    if args.promote:
        if args.dry_run:
            result["promote"] = ingestor.preview_staged_official_notice_promotions()
        else:
            result["promote"] = ingestor.promote_staged_official_notices()

    return result


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    result = asyncio.run(execute(args))
    logger.info("Official sources summary: %s", result)
    print(json.dumps(result, ensure_ascii=False, indent=2))

    errors = sum(
        section.get("errors", 0)
        for section in result.values()
        if isinstance(section, dict)
    )
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
