from datetime import datetime
import asyncio

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

    def test_normalize_removes_terminal_source_placeholder_from_title(self):
        raw = {
            "type": "TRAFICO",
            "title": "PUENTE DEL ÁNGEL CUSTODIO HACIA E. BOSCÁ?",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [-0.3763, 39.4699],
                    [-0.3764, 39.4700],
                ],
            },
            "start_time": datetime.now(),
        }

        result = self.normalizer._normalize_item(raw)

        assert result is not None
        assert result["title"] == "PUENTE DEL ÁNGEL CUSTODIO HACIA E. BOSCÁ"


class TestArcGiSCRaper:
    def test_estimate_occupation_severity_from_sidewalk(self):
        scraper = ArcGiSCRaper()

        severity = scraper._estimate_severity(
            {"tipo_afectacion": "ACERA"},
            state=None,
            config={"event_type": "OCUPACION"},
        )

        assert severity == 2

    def test_estimate_occupation_severity_from_surface_area(self):
        scraper = ArcGiSCRaper()

        severity = scraper._estimate_severity(
            {"tipo_afectacion": "47,12 M2(VER LICENCIA E INFORME MOVILIDAD)"},
            state=None,
            config={"event_type": "OCUPACION"},
        )

        assert severity == 3

    def test_estimate_occupation_severity_from_parking_corner(self):
        scraper = ArcGiSCRaper()

        severity = scraper._estimate_severity(
            {"tipo_afectacion": "ACERA Y ZONA ESTACIONAMIENTO CHAFLAN"},
            state=None,
            config={"event_type": "OCUPACION"},
        )

        assert severity == 3

    def test_estimate_occupation_severity_from_large_surface_area(self):
        scraper = ArcGiSCRaper()

        severity = scraper._estimate_severity(
            {"tipo_afectacion": "150 M2"},
            state=None,
            config={"event_type": "OCUPACION"},
        )

        assert severity == 4

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

    def test_build_item_keeps_human_location_label_from_address_fields(self):
        item = ArcGiSCRaper()._build_item(
            {"id_incidencia": 240227702, "direccion": "Carrer de Colon 12"},
            {"type": "Point", "coordinates": [-0.3763, 39.4699]},
            {
                "dataset_key": "ocupacio_via_publica",
                "event_type": "OCUPACION",
                "default_title": "Ocupacion via publica",
            },
        )

        assert item is not None
        assert item["extra_data"]["location_label"] == "Carrer de Colon 12"

    def test_build_item_uses_real_open_data_street_fields_as_location_label(self):
        item = ArcGiSCRaper()._build_item(
            {
                "id_incidencia": 260151002,
                "desc_calle": "C/ BILBAO",
                "numero_policia_origen": "2",
            },
            {"type": "Point", "coordinates": [-0.3763, 39.4699]},
            {
                "dataset_key": "ocupacio_via_publica",
                "event_type": "OCUPACION",
                "default_title": "Ocupacion via publica",
            },
        )

        assert item is not None
        assert item["title"] == "C/ BILBAO"
        assert item["extra_data"]["location_label"] == "C/ BILBAO 2"

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
    def test_refresh_existing_event_updates_location_label_even_when_severity_is_unchanged(self, monkeypatch):
        event = type(
            "Event",
            (),
            {
                "source_id": "ocupacio_via_publica:1",
                "title": "Sin titulo",
                "severity": 3,
                "extra_data": {},
            },
        )()

        class FakeQuery:
            def filter(self, *_args):
                return self

            def one_or_none(self):
                return event

        class FakeSession:
            def query(self, _model):
                return FakeQuery()

            def rollback(self):
                raise AssertionError("rollback should not be called")

        ingestor = Ingestor()
        monkeypatch.setattr(ingestor, "_create_impact_zone", lambda *_args: None)

        refreshed = ingestor._refresh_existing_event(
            FakeSession(),
            {
                "source_id": "ocupacio_via_publica:1",
                "title": "C/ BILBAO",
                "severity": 3,
                "geometry": {"type": "Point", "coordinates": [-0.3763, 39.4699]},
                "extra_data": {"location_label": "Carrer de Colon 12"},
            },
        )

        assert refreshed == 1
        assert event.title == "C/ BILBAO"
        assert event.extra_data["location_label"] == "Carrer de Colon 12"

    def test_store_records_merges_event_and_poi_results(self, monkeypatch):
        ingestor = Ingestor()

        monkeypatch.setattr(
            ingestor,
            "_store_events",
            lambda records: {
                "stored": len(records),
                "refreshed": 4,
                "skipped_duplicates": 1,
                "errors": 0,
            },
        )
        monkeypatch.setattr(
            ingestor,
            "_store_pois",
            lambda records: {
                "stored": len(records) * 2,
                "skipped_duplicates": 2,
                "errors": 1,
            },
        )

        result = ingestor._store_records(
            [{"type": "OCUPACION"}],
            [{"type": "APARCAMIENTO"}],
        )

        assert result == {
            "stored": 3,
            "stored_events": 1,
            "stored_pois": 2,
            "refreshed_events": 4,
            "skipped_duplicates": 3,
            "errors": 1,
        }

    def test_run_aborts_when_scraper_returns_no_data(self):
        class FakeScraper:
            async def fetch_all(self):
                return []

        ingestor = Ingestor()
        ingestor.scraper = FakeScraper()

        result = asyncio.run(ingestor.run())

        assert result == {"scraped": 0, "normalized": 0, "stored": 0, "errors": 0}

    def test_run_normalizes_and_stores_partitioned_records(self, monkeypatch):
        class FakeScraper:
            async def fetch_all(self):
                return [{"raw": 1}, {"raw": 2}]

        class FakeNormalizer:
            def normalize(self, raw_data):
                assert raw_data == [{"raw": 1}, {"raw": 2}]
                return [
                    {"record_kind": "event", "type": "OCUPACION"},
                    {"record_kind": "poi", "type": "APARCAMIENTO"},
                ]

        ingestor = Ingestor()
        ingestor.scraper = FakeScraper()
        ingestor.normalizer = FakeNormalizer()
        monkeypatch.setattr(
            ingestor,
            "_store_records",
            lambda events, pois: {
                "stored": len(events) + len(pois),
                "stored_events": len(events),
                "stored_pois": len(pois),
                "skipped_duplicates": 0,
                "errors": 0,
            },
        )

        result = asyncio.run(ingestor.run())

        assert result["scraped"] == 2
        assert result["normalized"] == 2
        assert result["stored_events"] == 1
        assert result["stored_pois"] == 1

    def test_run_official_sources_stores_fetched_notices(self, monkeypatch):
        class FakeOfficialClient:
            async def fetch(self):
                return [{"source": "emt", "source_id": "1"}]

        ingestor = Ingestor()
        ingestor.emt_estado_servicio = FakeOfficialClient()
        monkeypatch.setattr(
            ingestor,
            "_store_official_notices",
            lambda notices: {
                "stored": len(notices),
                "stored_official_notices": len(notices),
                "skipped_duplicates": 0,
                "errors": 0,
            },
        )

        result = asyncio.run(ingestor.run_official_sources())

        assert result["scraped"] == 1
        assert result["stored_official_notices"] == 1

    def test_preview_promotions_is_read_only_summary(self, monkeypatch):
        ingestor = Ingestor()
        monkeypatch.setattr(
            ingestor,
            "_build_official_notice_promotion_candidates",
            lambda: ([{"notice": 1}, {"notice": 2}], [{"event": 1}]),
        )

        assert ingestor.preview_staged_official_notice_promotions() == {
            "scanned_official_notices": 2,
            "promotion_candidates": 1,
            "would_promote_events": 1,
            "errors": 0,
        }

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
