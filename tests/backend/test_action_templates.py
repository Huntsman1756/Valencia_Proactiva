from datetime import datetime

from engine.action_templates import generate_actions
from models.models import UrbanEvent, UrbanEventType


def _event(event_type=UrbanEventType.OCUPACION, severity=3):
    return UrbanEvent(
        id=1,
        type=event_type,
        title="Ocupacion Av. del Reino",
        description="Afeccion en via publica",
        geometry="SRID=4326;POINT(-0.3763 39.4699)",
        start_time=datetime(2026, 5, 10, 12, 0, 0),
        severity=severity,
        source="test",
        source_id="test:1",
        extra_data={},
    )


def test_ocupacion_generates_distinct_generic_and_pmr_actions():
    actions = generate_actions(_event(), impact_zone_id=10)

    generic = [action for action in actions if "GENERIC" in action.payload["profiles"]]
    pmr = [action for action in actions if "PMR" in action.payload["profiles"]]

    assert len(generic) >= 1
    assert len(pmr) >= 1
    assert {action.title for action in generic} != {action.title for action in pmr}


def test_templates_cover_all_demo_profiles():
    actions = generate_actions(_event(), impact_zone_id=10)
    profiles = {
        profile
        for action in actions
        for profile in action.payload["profiles"]
    }

    assert {"GENERIC", "COMMERCIAL", "PMR", "CYCLIST", "PUBLIC_TRANSPORT"} <= profiles
