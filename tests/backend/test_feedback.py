"""Tests for citizen feedback endpoint."""

from datetime import datetime

from fastapi.testclient import TestClient

from core.database import get_db
from main import app
from models.models import Feedback, MitigationAction


class _Query:
    def __init__(self, result):
        self.result = result

    def filter(self, *_args, **_kwargs):
        return self

    def filter_by(self, **_kwargs):
        return self

    def first(self):
        return self.result


class _FakeDb:
    def __init__(self, action=None, existing=None):
        self.action = action
        self.existing = existing
        self.added = None

    def query(self, model):
        if model is MitigationAction:
            return _Query(self.action)
        if model is Feedback:
            return _Query(self.existing)
        return _Query(None)

    def add(self, item):
        self.added = item

    def commit(self):
        self.added.id = 1
        self.added.created_at = datetime(2026, 5, 10, 12, 0, 0)

    def rollback(self):
        pass

    def refresh(self, _item):
        pass


def _override_db(fake_db):
    def _dependency():
        return fake_db

    app.dependency_overrides[get_db] = _dependency


def test_submit_feedback_persists_vote():
    fake_db = _FakeDb(action=object())
    _override_db(fake_db)
    client = TestClient(app)

    response = client.post(
        "/api/v1/feedback",
        json={
            "mitigation_action_id": 1,
            "vote": 1,
            "session_token": "session_123",
            "profile": "PMR",
        },
    )

    app.dependency_overrides.clear()

    assert response.status_code == 201
    assert response.json()["vote"] == 1
    assert fake_db.added.session_token == "session_123"


def test_submit_feedback_rejects_duplicate_vote():
    fake_db = _FakeDb(action=object(), existing=object())
    _override_db(fake_db)
    client = TestClient(app)

    response = client.post(
        "/api/v1/feedback",
        json={
            "mitigation_action_id": 1,
            "vote": -1,
            "session_token": "session_123",
        },
    )

    app.dependency_overrides.clear()

    assert response.status_code == 409
    assert response.json()["detail"] == "Already voted"


def test_submit_feedback_requires_existing_action():
    fake_db = _FakeDb(action=None)
    _override_db(fake_db)
    client = TestClient(app)

    response = client.post(
        "/api/v1/feedback",
        json={
            "mitigation_action_id": 1,
            "vote": 1,
            "session_token": "session_123",
        },
    )

    app.dependency_overrides.clear()

    assert response.status_code == 404
    assert response.json()["detail"] == "Mitigation action not found"
