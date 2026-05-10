from datetime import datetime
import asyncio

from fastapi import HTTPException

from api.events import _event_to_response, _geojson_to_wkt, get_event, list_events


class _Action:
    id = 31
    action_type = "PARKING_SUGGESTION"
    title = "Aparcamiento PMR cercano"
    description = "Busca una plaza accesible fuera de la zona afectada."
    payload = {"profiles": ["PMR"]}
    priority = 90
    created_at = datetime(2026, 5, 10, 12, 0, 0)


class _Event:
    id = 5
    type = "OCUPACION"
    title = "Ocupacion via publica"
    description = "Afeccion activa"
    start_time = datetime(2026, 5, 10, 12, 0, 0)
    end_time = None
    severity = 3
    source = "test"
    source_id = "test:5"
    geometry_as_geojson = {"type": "Point", "coordinates": [-0.3763, 39.4699]}
    center = (-0.3763, 39.4699)
    created_at = datetime(2026, 5, 10, 12, 0, 0)
    updated_at = None
    mitigation_actions = [_Action()]


def test_event_response_includes_mitigation_actions():
    response = _event_to_response(_Event())

    assert response.mitigation_actions[0].id == 31
    assert response.mitigation_actions[0].payload["profiles"] == ["PMR"]


def test_geojson_to_wkt_sets_srid():
    wkt = _geojson_to_wkt({"type": "Point", "coordinates": [-0.3763, 39.4699]})

    assert wkt.startswith("SRID=4326;POINT")


class _Query:
    def __init__(self, rows):
        self.rows = rows
        self.filtered = False

    def filter(self, *_args):
        self.filtered = True
        return self

    def order_by(self, *_args):
        return self

    def limit(self, _limit):
        return self

    def offset(self, _offset):
        return self

    def all(self):
        return self.rows

    def first(self):
        return self.rows[0] if self.rows else None


class _Db:
    def __init__(self, rows):
        self.query_obj = _Query(rows)

    def query(self, _model):
        return self.query_obj


def test_list_events_returns_responses_with_type_filter():
    db = _Db([_Event()])

    response = asyncio.run(list_events(limit=10, offset=0, event_type="OCUPACION", db=db))

    assert db.query_obj.filtered is True
    assert response[0].id == 5


def test_get_event_raises_404_when_missing():
    try:
        asyncio.run(get_event(404, db=_Db([])))
        assert False, "Should have raised HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 404
