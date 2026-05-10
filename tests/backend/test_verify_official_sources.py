import importlib.util
import sys
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[2] / "src" / "scripts" / "verify_official_sources.py"
SPEC = importlib.util.spec_from_file_location("verify_official_sources", MODULE_PATH)
verify_official_sources = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules["verify_official_sources"] = verify_official_sources
SPEC.loader.exec_module(verify_official_sources)

OFFICIAL_SOURCES = verify_official_sources.OFFICIAL_SOURCES
SourceCheck = verify_official_sources.SourceCheck


def test_official_sources_have_stable_keys():
    keys = [source.key for source in OFFICIAL_SOURCES]

    assert len(keys) == len(set(keys))
    assert "emt_estado_servicio" in keys
    assert "valencia_rss_catalog" in keys


def test_source_check_shape_supports_traceability():
    check = SourceCheck(
        key="sample",
        name="Sample",
        url="https://example.test/feed",
        classification="official_public_info",
        status_code=200,
        final_url="https://example.test/feed",
        content_type="application/json",
        reachable=True,
        machine_readable=True,
        record_count=3,
        note="ok",
    )

    assert check.classification in {"official_public_info", "official_feed", "official_feed_catalog"}
    assert check.reachable is True
    assert check.record_count == 3
