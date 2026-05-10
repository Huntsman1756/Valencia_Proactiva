from datetime import datetime

from api.events import _event_to_response


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
