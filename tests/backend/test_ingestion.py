from datetime import datetime

from ingestion.normalizer import Normalizer
from ingestion.scraper_opendata import ArcGiSCRaper, DATASETS
from ingestion.ingestor import Ingestor
from api.spatial import (
    _build_alternatives_query,
    _build_events_layer_query,
    _build_impact_zones_query,
    _profile_requires_accessible,
)
from models.models import MitigationAction


class TestNormalizer:
    def setup_method(self):
        self.normalizer = Normalizer()
    
    def test_normalize_valid_item(self):
        raw = {
            "type": "OCUPACION",
            "title": "Test ocupacion",
            "description": "Description",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-0.3763, 39.4699],
                    [-0.3763, 39.4709],
                    [-0.3753, 39.4709],
                    [-0.3753, 39.4699],
                    [-0.3763, 39.4699]
                ]]
            },
            "start_time": datetime.now(),
            "severity": 3,
        }
        
        result = self.normalizer._normalize_item(raw)
        
        assert result is not None
        assert result["type"] == "OCUPACION"
        assert result["title"] == "Test ocupacion"
        assert result["severity"] == 3
        assert result["extra_data"] == {}
    
    def test_normalize_invalid_item_no_geometry(self):
        raw = {
            "type": "OCUPACION",
            "title": "Test",
            "start_time": datetime.now(),
        }
        
        result = self.normalizer._normalize_item(raw)
        assert result is None
    
    def test_validate_valid_geometry(self):
        valid_geo = {
            "type": "Polygon",
            "coordinates": [[
                [-0.3763, 39.4699],
                [-0.3763, 39.4709],
                [-0.3753, 39.4709],
                [-0.3753, 39.4699],
                [-0.3763, 39.4699]
            ]]
        }
        assert self.normalizer.validate_geometry(valid_geo) is True
    
    def test_validate_invalid_geometry(self):
        invalid_geo = {"type": "Invalid"}
        assert self.normalizer.validate_geometry(invalid_geo) is False
    
    def test_normalize_batch(self):
        raw_data = [
            {
                "type": "OCUPACION",
                "title": "Obra 1",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-0.3763, 39.4699],
                        [-0.3763, 39.4709],
                        [-0.3753, 39.4709],
                        [-0.3753, 39.4699],
                        [-0.3763, 39.4699]
                    ]]
                },
                "start_time": datetime.now(),
            },
            {
                "type": "TRAFICO",
                "title": "Tráfico 1",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [-0.3800, 39.4650],
                        [-0.3790, 39.4660]
                    ]
                },
                "start_time": datetime.now(),
            },
        ]
        
        result = self.normalizer.normalize(raw_data)
        
        assert len(result) == 2
        assert result[0]["type"] == "OCUPACION"
        assert result[1]["type"] == "TRAFICO"

    def test_normalize_preserves_record_kind(self):
        raw = {
            "record_kind": "poi",
            "type": "APARCAMIENTO",
            "title": "Plaza PMR",
            "geometry": {"type": "Point", "coordinates": [-0.3763, 39.4699]},
            "start_time": datetime.now(),
            "extra_data": {"accessible": True},
        }

        result = self.normalizer._normalize_item(raw)

        assert result is not None
        assert result["record_kind"] == "poi"


class TestArcGiSCRaper:
    def test_parse_epoch_milliseconds(self):
        scraper = ArcGiSCRaper()

        parsed = scraper._parse_date("1778450340000")

        assert parsed is not None
        assert parsed.year == 2026

    def test_extract_source_id_uses_arcgis_fields(self):
        scraper = ArcGiSCRaper()

        source_id = scraper._extract_source_id(
            {"id_incidencia": 240227702, "objectid": 74665},
            {"dataset_key": "occupacio_via_publica", "event_type": "OCUPACION"},
        )

        assert source_id == "occupacio_via_publica:240227702"

    def test_build_item_marks_aparcaments_pmr_as_poi(self):
        scraper = ArcGiSCRaper()

        item = scraper._build_item(
            {"objectid": 799943, "numplazas": 1},
            {"type": "Point", "coordinates": [-0.3763, 39.4699]},
            {
                "dataset_key": "aparcaments_pmr",
                "event_type": "APARCAMIENTO",
                "event_type_detail": "PMR",
                "record_kind": "poi",
                "poi_type": "APARCAMIENTO_PMR",
                "accessible": True,
                "default_title": "Aparcamiento PMR",
            },
        )

        assert item is not None
        assert item["record_kind"] == "poi"
        assert item["title"] == "Aparcamiento PMR"
        assert item["extra_data"]["accessible"] is True

    def test_multimodal_datasets_are_registered_as_pois(self):
        expected = {
            "parkings": "PARKING",
            "aparcaments_ora": "APARCAMIENTO_ORA",
            "aparcaments_no_regulats": "APARCAMIENTO_NO_REGULADO",
            "aparcaments_motos": "APARCAMIENTO_MOTO",
            "aparcaments_bicicletes": "APARCAMIENTO_BICI",
            "recarrega_vehicles_electrics": "CARGADOR_VE",
            "emt_paradas": "PARADA_EMT",
            "fgv_estaciones": "ESTACION_FGV",
            "fgv_bocas": "BOCA_FGV",
            "valenbisi_disponibilidad": "VALENBISI",
            "itinerarios_ciclistas": "ITINERARIO_CICLISTA",
        }

        for dataset_key, poi_type in expected.items():
            assert DATASETS[dataset_key]["record_kind"] == "poi"
            assert DATASETS[dataset_key]["poi_type"] == poi_type

    def test_build_item_for_valenbisi_keeps_realtime_availability(self):
        item = ArcGiSCRaper()._build_item(
            {
                "gid": 902133,
                "name": "001_GUILLEN_DE_CASTRO",
                "available": 8,
                "free": 17,
                "total": 25,
            },
            {"type": "Point", "coordinates": [-0.3763, 39.4699]},
            {**DATASETS["valenbisi_disponibilidad"], "dataset_key": "valenbisi_disponibilidad"},
        )

        assert item is not None
        assert item["record_kind"] == "poi"
        assert item["title"] == "001_GUILLEN_DE_CASTRO"
        assert item["source_id"] == "valenbisi_disponibilidad:902133"
        assert item["extra_data"]["poi_type"] == "VALENBISI"
        assert item["extra_data"]["available"] == 8
        assert item["extra_data"]["free"] == 17

    def test_build_item_for_emt_stop_uses_stop_id_and_lines(self):
        item = ArcGiSCRaper()._build_item(
            {"id_parada": 1044, "denominacion": "Poliesportiu de Burjassot", "lineas": "63"},
            {"type": "Point", "coordinates": [-0.3763, 39.4699]},
            {**DATASETS["emt_paradas"], "dataset_key": "emt_paradas"},
        )

        assert item is not None
        assert item["title"] == "Poliesportiu de Burjassot"
        assert item["source_id"] == "emt_paradas:1044"
        assert item["extra_data"]["poi_type"] == "PARADA_EMT"
        assert item["description"] == "63"

    def test_build_item_for_ev_charger_uses_location(self):
        item = ArcGiSCRaper()._build_item(
            {"objectid": 1, "localización": "C/ Acequia de la cadena", "estado": "En servicio"},
            {"type": "Point", "coordinates": [-0.3763, 39.4699]},
            {**DATASETS["recarrega_vehicles_electrics"], "dataset_key": "recarrega_vehicles_electrics"},
        )

        assert item is not None
        assert item["title"] == "C/ Acequia de la cadena"
        assert item["extra_data"]["poi_type"] == "CARGADOR_VE"
        assert item["description"] == "En servicio"


class TestIngestorRecordRouting:
    def test_partition_records_splits_events_and_pois(self):
        ingestor = Ingestor()

        events, pois = ingestor._partition_records(
            [
                {"record_kind": "event", "type": "OCUPACION"},
                {"record_kind": "poi", "type": "APARCAMIENTO"},
            ]
        )

        assert events == [{"record_kind": "event", "type": "OCUPACION"}]
        assert pois == [{"record_kind": "poi", "type": "APARCAMIENTO"}]

    def test_create_mitigation_actions_adds_generated_actions(self):
        class FakeSession:
            def __init__(self):
                self.items = []

            def add_all(self, items):
                self.items.extend(items)

        event = type("Event", (), {"id": 7, "type": "OCUPACION", "severity": 3})()
        session = FakeSession()

        Ingestor()._create_mitigation_actions(session, event, impact_zone_id=12)

        assert len(session.items) >= 2
        assert all(isinstance(item, MitigationAction) for item in session.items)
        assert {item.event_id for item in session.items} == {7}
        assert {item.impact_zone_id for item in session.items} == {12}


class TestSpatialAlternatives:
    def test_pmr_profile_requires_accessible_pois(self):
        assert _profile_requires_accessible("PMR") is True

    def test_generic_profile_does_not_require_accessible_pois(self):
        assert _profile_requires_accessible("GENERIC") is False

    def test_alternatives_query_excludes_latest_event_impact_zone(self):
        sql, params = _build_alternatives_query(
            lon=-0.3763,
            lat=39.4699,
            radius_meters=500,
            profile=None,
            poi_type=None,
            event_id=42,
        )

        assert "NOT EXISTS" in sql
        assert "latest_iz.event_id = :event_id" in sql
        assert "ST_Covers(iz.geometry, poi.geometry)" in sql
        assert params["event_id"] == 42

    def test_impact_zones_query_limits_result(self):
        sql, params = _build_impact_zones_query(limit=75)

        assert "FROM impact_zones iz" in sql
        assert "ST_AsGeoJSON(iz.geometry)::json" in sql
        assert params["limit"] == 75

    def test_events_layer_query_filters_type(self):
        sql, params = _build_events_layer_query(event_type="TRAFICO", limit=50)

        assert "FROM urban_events ue" in sql
        assert "ST_AsGeoJSON(ue.geometry)::json" in sql
        assert "ue.type = :event_type" in sql
        assert params == {"event_type": "TRAFICO", "limit": 50}
