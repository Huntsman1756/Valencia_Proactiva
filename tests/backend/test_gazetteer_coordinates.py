from pathlib import Path

import importlib.util
import sys


SCRIPT_PATH = (
    Path(__file__).resolve().parents[2]
    / "src"
    / "scripts"
    / "generate_gazetteer_coordinates.py"
)
spec = importlib.util.spec_from_file_location("generate_gazetteer_coordinates", SCRIPT_PATH)
gazetteer_coordinates = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = gazetteer_coordinates
spec.loader.exec_module(gazetteer_coordinates)


def test_derive_coordinate_report_from_street_axes_fixture():
    street_axes = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "tipnomcalle": "AVINGUDA DEL REINO",
                    "nomcalle": "DEL REINO",
                    "tipcalle": "AVINGUDA",
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[-0.366, 39.464], [-0.3658, 39.4658]],
                },
            }
        ],
    }

    report = gazetteer_coordinates.derive_coordinate_report(street_axes=street_axes)
    av_reino = next(check for check in report["checks"] if check["id"] == "av-del-reino")

    assert report["source"]["feature_count"] == 1
    assert report["gazetteer"]["location_count"] >= 20
    assert av_reino["matched"] is True
    assert av_reino["matched_alias"] in {"av del reino", "avenida del reino", "avinguda del reino"}
    assert av_reino["derived_coordinates"] is not None
    assert av_reino["status"] == "ok"


def test_report_matches_spanish_and_valencian_street_type_equivalents():
    street_axes = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "tipnomcalle": "PLAÇA AJUNTAMENT",
                    "nomcalle": "AJUNTAMENT",
                    "tipcalle": "PLAÇA",
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[-0.3766, 39.4698], [-0.3764, 39.4700]],
                },
            },
            {
                "type": "Feature",
                "properties": {
                    "tipnomcalle": "AVINGUDA PORT",
                    "nomcalle": "PORT",
                    "tipcalle": "AVINGUDA",
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[-0.3465, 39.4645], [-0.3463, 39.4647]],
                },
            },
        ],
    }

    report = gazetteer_coordinates.derive_coordinate_report(street_axes=street_axes)
    ayuntamiento = next(check for check in report["checks"] if check["id"] == "plaza-ayuntamiento")
    puerto = next(check for check in report["checks"] if check["id"] == "avenida-puerto")

    assert ayuntamiento["matched"] is True
    assert ayuntamiento["status"] == "ok"
    assert puerto["matched"] is True
    assert puerto["status"] == "ok"


def test_report_justifies_non_linear_locations_without_street_axis_match():
    street_axes = {"type": "FeatureCollection", "features": []}

    report = gazetteer_coordinates.derive_coordinate_report(street_axes=street_axes)
    mercado = next(check for check in report["checks"] if check["id"] == "mercado-central")

    assert mercado["matched"] is False
    assert mercado["status"] == "justified"
    assert "non-linear facility" in mercado["note"]


def test_report_justifies_long_axis_curated_point():
    street_axes = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "tipnomcalle": "AVINGUDA ARAGÓ",
                    "nomcalle": "ARAGÓ",
                    "tipcalle": "AVINGUDA",
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[-0.38, 39.43], [-0.34, 39.47]],
                },
            }
        ],
    }

    report = gazetteer_coordinates.derive_coordinate_report(street_axes=street_axes)
    aragon = next(check for check in report["checks"] if check["id"] == "avenida-aragon")

    assert aragon["matched"] is True
    assert aragon["distance_meters"] > 250
    assert aragon["status"] == "justified"
    assert "long_axis_curated_point" in aragon["note"]


def test_report_marks_missing_locations_for_review_input():
    street_axes = {"type": "FeatureCollection", "features": []}

    report = gazetteer_coordinates.derive_coordinate_report(street_axes=street_axes)

    assert report["summary"]["missing_match"] < report["gazetteer"]["location_count"]
    assert report["summary"]["justified"] > 0
    assert report["summary"]["ok"] == 0
