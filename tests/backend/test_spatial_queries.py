from api.spatial import (
    _build_alternatives_query,
    _build_events_layer_query,
    _build_impact_zones_query,
    _location_label_from_extra_data,
    _profile_requires_accessible,
)


def test_profile_requires_accessible_only_for_pmr():
    assert _profile_requires_accessible("PMR") is True
    assert _profile_requires_accessible("pmr") is True
    assert _profile_requires_accessible("CYCLIST") is False
    assert _profile_requires_accessible(None) is False


def test_location_label_from_extra_data_prefers_human_place_fields():
    assert _location_label_from_extra_data({"direccion": "Carrer de Colon"}) == "Carrer de Colon"
    assert _location_label_from_extra_data({}) is None


def test_alternatives_query_filters_accessibility_type_and_event_zone():
    sql, params = _build_alternatives_query(
        lon=-0.3763,
        lat=39.4699,
        radius_meters=750,
        profile="PMR",
        poi_type="APARCAMIENTO_PMR",
        event_id=42,
    )

    assert "poi.accessible = true" in sql
    assert "poi.poi_type = :poi_type" in sql
    assert "NOT EXISTS" in sql
    assert params == {
        "lon": -0.3763,
        "lat": 39.4699,
        "radius": 750,
        "poi_type": "APARCAMIENTO_PMR",
        "event_id": 42,
    }


def test_alternatives_query_keeps_generic_case_simple():
    sql, params = _build_alternatives_query(
        lon=-0.3763,
        lat=39.4699,
        radius_meters=500,
        profile="GENERIC",
        poi_type=None,
        event_id=None,
    )

    assert "poi.accessible = true" not in sql
    assert "NOT EXISTS" not in sql
    assert params == {"lon": -0.3763, "lat": 39.4699, "radius": 500}


def test_layer_queries_add_expected_filters():
    events_sql, events_params = _build_events_layer_query(
        event_type="TRAFICO",
        limit=25,
    )
    impact_sql, impact_params = _build_impact_zones_query(limit=10)

    assert "WHERE ue.type = :event_type" in events_sql
    assert events_params == {"limit": 25, "event_type": "TRAFICO"}
    assert "DISTINCT ON (event_id)" in impact_sql
    assert impact_params == {"limit": 10}
