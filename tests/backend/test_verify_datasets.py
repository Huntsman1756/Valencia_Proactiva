import importlib.util
import sys
from pathlib import Path

from ingestion.scraper_opendata import DATASETS


MODULE_PATH = Path(__file__).resolve().parents[2] / "src" / "scripts" / "verify_datasets.py"
SPEC = importlib.util.spec_from_file_location("verify_datasets", MODULE_PATH)
verify_datasets = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = verify_datasets
SPEC.loader.exec_module(verify_datasets)


def test_verify_datasets_covers_all_scraper_datasets():
    assert set(verify_datasets.CKAN_IDS) == set(DATASETS)


def test_verify_datasets_contains_multimodal_layers():
    for dataset_key in {
        "parkings",
        "emt_paradas",
        "fgv_estaciones",
        "fgv_bocas",
        "valenbisi_disponibilidad",
        "itinerarios_ciclistas",
        "recarrega_vehicles_electrics",
    }:
        assert dataset_key in verify_datasets.CKAN_IDS
        assert DATASETS[dataset_key]["record_kind"] == "poi"
