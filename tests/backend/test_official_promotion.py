from datetime import datetime

from ingestion.official_promotion import (
    infer_notice_location,
    is_duplicate_urban_event,
    iter_gazetteer_locations,
    load_valencia_gazetteer,
    promote_official_notice_to_event,
)
from ingestion.official_sources import EMT_ESTADO_SERVICIO_SOURCE


def _notice(**overrides):
    notice = {
        "source": EMT_ESTADO_SERVICIO_SOURCE,
        "source_id": "emt_estado_servicio:90001",
        "notice_type": "PUBLIC_ACT",
        "title": "Recorridos alternativos por actos en barrios de Valencia.",
        "description": "El sabado 09 y el domingo 10. Consulta aqui toda la informacion.",
        "url": "https://www.emtvalencia.es/wp/ultima-hora/test/",
        "published_at": datetime(2026, 5, 8, 13, 7, 45),
        "extra_data": {
            "affected_lines": ["14", "19"],
            "slug": "recorridos-alternativos-por-actos-en-barrios-de-valencia",
        },
    }
    notice.update(overrides)
    return notice


def test_generic_area_notice_stays_in_staging():
    assert infer_notice_location(_notice()) is None
    assert promote_official_notice_to_event(_notice()) is None


def test_gazetteer_has_minimum_documented_locations():
    gazetteer = load_valencia_gazetteer()
    locations = iter_gazetteer_locations()

    assert gazetteer["metadata"]["official_name_source_url"].startswith(
        "https://opendata.vlci.valencia.es/"
    )
    assert "package_show" in gazetteer["metadata"]["official_name_ckan_api_url"]
    assert gazetteer["metadata"]["license"] == "CC BY 4.0"
    assert len(locations) >= 20
    assert all(location["confidence"] >= 0.85 for location in locations)
    assert all(location["geometry"]["type"] == "Point" for location in locations)
    assert all(location["folded_aliases"] for location in locations)


def test_notice_with_known_location_promotes_to_event_candidate():
    promoted = promote_official_notice_to_event(
        _notice(
            title="Desvios por obras en Av. del Reino",
            notice_type="ROADWORK",
            source_id="emt_estado_servicio:90002",
        )
    )

    assert promoted is not None
    assert promoted["record_kind"] == "event"
    assert promoted["type"] == "OCUPACION"
    assert promoted["geometry"] == {"type": "Point", "coordinates": [-0.3659, 39.4649]}
    assert promoted["source_id"] == "promoted:emt_estado_servicio:90002"
    assert promoted["extra_data"]["location_method"] == "known_location_gazetteer"
    assert promoted["extra_data"]["location_label"] == "Av. del Reino"
    assert promoted["extra_data"]["affected_lines"] == ["14", "19"]


def test_notice_with_official_geometry_promotes_without_gazetteer():
    promoted = promote_official_notice_to_event(
        _notice(
            title="Aviso especial EMT",
            source_id="emt_estado_servicio:90003",
            extra_data={
                "affected_lines": [],
                "geometry": {"type": "Point", "coordinates": [-0.3765, 39.4699]},
                "location_label": "Punto oficial EMT",
            },
        )
    )

    assert promoted is not None
    assert promoted["geometry"]["coordinates"] == [-0.3765, 39.4699]
    assert promoted["severity"] == 1
    assert promoted["extra_data"]["location_method"] == "official_geometry"


def test_existing_open_data_event_blocks_duplicate_promotion():
    candidate = promote_official_notice_to_event(
        _notice(title="Desvios por obras en Av. del Reino", source_id="emt_estado_servicio:90004"),
        existing_events=[
            {
                "type": "OCUPACION",
                "source": "opendata_valencia:ocupacio-via-publica",
                "geometry": {"type": "Point", "coordinates": [-0.36591, 39.46491]},
            }
        ],
    )

    assert candidate is None


def test_duplicate_detection_accepts_nearby_open_data_event():
    candidate = {
        "type": "OCUPACION",
        "geometry": {"type": "Point", "coordinates": [-0.3659, 39.4649]},
    }

    assert is_duplicate_urban_event(
        candidate,
        [
            {
                "type": "TRAFICO",
                "source": "opendata_valencia:estat-transit-temps-real",
                "center": (-0.36592, 39.46492),
            }
        ],
    )
