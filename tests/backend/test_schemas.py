"""Comprehensive tests for V-PRO schemas"""

import pytest
from datetime import datetime

from schemas.schemas import (
    FeedbackCreate,
    SpatialAlternativesQuery,
    UrbanEventCreate,
    UrbanEventUpdate,
    UrbanEventType,
    MitigationActionCreate,
    SpatialQueryRequest,
    ProactiveSuggestion,
)


class TestUrbanEventCreate:
    def test_create_valid_event(self):
        event = UrbanEventCreate(
            type=UrbanEventType.OCUPACION,
            title="Test ocupacion",
            description="Una ocupacion de prueba",
            geometry={
                "type": "Polygon",
                "coordinates": [[
                    [-0.3763, 39.4699],
                    [-0.3763, 39.4709],
                    [-0.3753, 39.4709],
                    [-0.3753, 39.4699],
                    [-0.3763, 39.4699]
                ]]
            },
            start_time=datetime.now(),
            severity=3,
        )
        
        assert event.type == UrbanEventType.OCUPACION
        assert event.title == "Test ocupacion"
        assert event.severity == 3
        assert event.source == "opendata_valencia"  # default
    
    def test_create_event_default_severity(self):
        event = UrbanEventCreate(
            type=UrbanEventType.TRAFICO,
            title="Test trafico",
            geometry={
                "type": "LineString",
                "coordinates": [
                    [-0.3763, 39.4699],
                    [-0.3753, 39.4709]
                ]
            },
            start_time=datetime.now(),
        )
        
        assert event.severity == 1
    
    def test_create_event_max_severity(self):
        event = UrbanEventCreate(
            type=UrbanEventType.OCUPACION,
            title="Test",
            geometry={
                "type": "Polygon",
                "coordinates": [[
                    [-0.3763, 39.4699],
                    [-0.3763, 39.4709],
                    [-0.3753, 39.4709],
                    [-0.3753, 39.4699],
                    [-0.3763, 39.4699]
                ]]
            },
            start_time=datetime.now(),
            severity=5,
        )
        assert event.severity == 5
    
    def test_create_event_invalid_severity_low(self):
        with pytest.raises(Exception):
            UrbanEventCreate(
                type=UrbanEventType.OCUPACION,
                title="Test",
                geometry={
                    "type": "Polygon",
                    "coordinates": [[
                        [-0.3763, 39.4699],
                        [-0.3763, 39.4709],
                        [-0.3753, 39.4709],
                        [-0.3753, 39.4699],
                        [-0.3763, 39.4699]
                    ]]
                },
                start_time=datetime.now(),
                severity=0,
            )
    
    def test_create_event_invalid_severity_high(self):
        with pytest.raises(Exception):
            UrbanEventCreate(
                type=UrbanEventType.OCUPACION,
                title="Test",
                geometry={
                    "type": "Polygon",
                    "coordinates": [[
                        [-0.3763, 39.4699],
                        [-0.3763, 39.4709],
                        [-0.3753, 39.4709],
                        [-0.3753, 39.4699],
                        [-0.3763, 39.4699]
                    ]]
                },
                start_time=datetime.now(),
                severity=6,
            )
    
    def test_create_event_extra_data(self):
        event = UrbanEventCreate(
            type=UrbanEventType.ZBE,
            title="Test ZBE",
            geometry={
                "type": "Polygon",
                "coordinates": [[
                    [-0.3763, 39.4699],
                    [-0.3763, 39.4709],
                    [-0.3753, 39.4709],
                    [-0.3753, 39.4699],
                    [-0.3763, 39.4699]
                ]]
            },
            start_time=datetime.now(),
            extra_data={"zone": "central"},
        )
        assert event.extra_data == {"zone": "central"}


class TestUrbanEventUpdate:
    def test_update_title(self):
        update = UrbanEventUpdate(title="New title")
        assert update.title == "New title"
    
    def test_update_severity(self):
        update = UrbanEventUpdate(severity=4)
        assert update.severity == 4
    
    def test_update_partial(self):
        update = UrbanEventUpdate(title="Only title")
        assert update.title == "Only title"
        assert update.description is None


class TestMitigationActionCreate:
    def test_create_action(self):
        action = MitigationActionCreate(
            action_type="PARKING_SUGGESTION",
            title="Parking suggestion",
            description="Use alternative parking",
            priority=2,
        )
        
        assert action.action_type == "PARKING_SUGGESTION"
        assert action.priority == 2


class TestFeedbackCreate:
    def test_create_valid_feedback(self):
        feedback = FeedbackCreate(
            mitigation_action_id=1,
            vote=1,
            session_token="session_123",
            profile="PMR",
        )

        assert feedback.vote == 1
        assert feedback.profile == "PMR"

    def test_feedback_rejects_neutral_vote(self):
        with pytest.raises(Exception):
            FeedbackCreate(
                mitigation_action_id=1,
                vote=0,
                session_token="session_123",
            )

    def test_feedback_requires_non_empty_session_token(self):
        with pytest.raises(Exception):
            FeedbackCreate(
                mitigation_action_id=1,
                vote=-1,
                session_token="short",
            )


class TestSpatialQueryRequest:
    def test_valid_query(self):
        query = SpatialQueryRequest(lon=-0.3763, lat=39.4699)
        assert query.lon == -0.3763
        assert query.lat == 39.4699
        assert query.radius_meters == 500  # default
    
    def test_query_custom_radius(self):
        query = SpatialQueryRequest(lon=-0.3763, lat=39.4699, radius_meters=1000)
        assert query.radius_meters == 1000
    
    def test_query_invalid_lon(self):
        with pytest.raises(Exception):
            SpatialQueryRequest(lon=-200, lat=39.4699)
    
    def test_query_invalid_lat(self):
        with pytest.raises(Exception):
            SpatialQueryRequest(lon=-0.3763, lat=100)
    
    def test_query_invalid_radius(self):
        with pytest.raises(Exception):
            SpatialQueryRequest(lon=-0.3763, lat=39.4699, radius_meters=50)


class TestSpatialAlternativesQuery:
    def test_valid_alternatives_query_defaults(self):
        query = SpatialAlternativesQuery(lon=-0.3763, lat=39.4699)

        assert query.radius_meters == 500
        assert query.profile is None
        assert query.poi_type is None
        assert query.event_id is None

    def test_alternatives_query_rejects_invalid_lat(self):
        with pytest.raises(Exception):
            SpatialAlternativesQuery(lon=-0.3763, lat=100)

    def test_alternatives_query_rejects_invalid_event_id(self):
        with pytest.raises(Exception):
            SpatialAlternativesQuery(lon=-0.3763, lat=39.4699, event_id=0)


class TestProactiveSuggestion:
    def test_suggestion_structure(self):
        from schemas.schemas import UrbanEventResponse
        suggestion = ProactiveSuggestion(
            event=UrbanEventResponse(
                id=1,
                type=UrbanEventType.OCUPACION,
                title="Test",
                start_time=datetime.now(),
                severity=1,
                source="test",
                geometry={},
                center=(0.0, 0.0),
                created_at=datetime.now(),
            ),
            mitigation_actions=[],
        )
        assert suggestion.mitigation_actions == []
        assert suggestion.impact_zone is None
        assert suggestion.distance_meters is None


class TestRequireAdminToken:
    def test_invalid_token_returns_401(self):
        from fastapi import HTTPException
        from core.security import require_admin_token
        
        try:
            require_admin_token(x_admin_token="wrong_token")
            assert False, "Should have raised HTTPException"
        except HTTPException as e:
            assert e.status_code == 401
    
    def test_empty_token_returns_401(self):
        from fastapi import HTTPException
        from core.security import require_admin_token
        
        try:
            require_admin_token(x_admin_token="")
            assert False, "Should have raised HTTPException"
        except HTTPException as e:
            assert e.status_code == 401
    
    def test_none_token_returns_401(self):
        from fastapi import HTTPException
        from core.security import require_admin_token
        
        try:
            require_admin_token(x_admin_token=None)
            assert False, "Should have raised HTTPException"
        except HTTPException as e:
            assert e.status_code == 401


class TestSlowAPI:
    def test_rate_limit_response(self):
        from fastapi.testclient import TestClient
        from main import app
        
        client = TestClient(app)
        
        # First request should succeed
        response = client.get("/health")
        assert response.status_code == 200
