import argparse
import asyncio
import importlib.util
import sys
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[2] / "src" / "scripts" / "run_official_sources.py"
SPEC = importlib.util.spec_from_file_location("run_official_sources", SCRIPT_PATH)
run_official_sources = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = run_official_sources
SPEC.loader.exec_module(run_official_sources)


class FakeOfficialClient:
    async def fetch(self):
        return [
            {"source_id": "emt_estado_servicio:1"},
            {"source_id": "emt_estado_servicio:2"},
        ]


class FakeIngestor:
    def __init__(self):
        self.emt_estado_servicio = FakeOfficialClient()

    async def run_official_sources(self):
        return {
            "scraped": 2,
            "normalized": 2,
            "stored": 2,
            "stored_official_notices": 2,
            "skipped_duplicates": 0,
            "errors": 0,
        }

    def preview_staged_official_notice_promotions(self):
        return {
            "scanned_official_notices": 2,
            "promotion_candidates": 1,
            "would_promote_events": 1,
            "errors": 0,
        }

    def promote_staged_official_notices(self):
        return {
            "scanned_official_notices": 2,
            "promotion_candidates": 1,
            "promoted_events": 1,
            "skipped_duplicates": 0,
            "errors": 0,
        }


def test_parse_args_requires_action():
    try:
        run_official_sources.parse_args([])
    except SystemExit as exc:
        assert exc.code == 2
    else:
        raise AssertionError("parse_args should reject empty actions")


def test_parse_args_accepts_fetch_promote_dry_run():
    args = run_official_sources.parse_args(["--fetch", "--promote", "--dry-run"])

    assert args.fetch is True
    assert args.promote is True
    assert args.dry_run is True


def test_execute_fetch_dry_run_does_not_store():
    args = argparse.Namespace(fetch=True, promote=False, dry_run=True)

    result = asyncio.run(run_official_sources.execute(args, ingestor_factory=FakeIngestor))

    assert result["dry_run"] is True
    assert result["fetch"]["scraped"] == 2
    assert result["fetch"]["would_store_official_notices"] == 2
    assert "stored" not in result["fetch"]


def test_execute_promote_dry_run_previews_without_writing():
    args = argparse.Namespace(fetch=False, promote=True, dry_run=True)

    result = asyncio.run(run_official_sources.execute(args, ingestor_factory=FakeIngestor))

    assert result["promote"]["promotion_candidates"] == 1
    assert result["promote"]["would_promote_events"] == 1
    assert "promoted_events" not in result["promote"]


def test_execute_fetch_and_promote_real_mode_uses_ingestor_methods():
    args = argparse.Namespace(fetch=True, promote=True, dry_run=False)

    result = asyncio.run(run_official_sources.execute(args, ingestor_factory=FakeIngestor))

    assert result["fetch"]["stored_official_notices"] == 2
    assert result["promote"]["promoted_events"] == 1
