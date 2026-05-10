from datetime import datetime

from fastapi.testclient import TestClient

from core.database import get_db
from main import app
from models.models import OfficialNotice


class _Notice:
    id = 1
    source = "emt_valencia:estado-servicio"
    source_id = "emt_estado_servicio:1"
    notice_type = "PUBLIC_ACT"
    classification = "official_public_info"
    title = "Aviso EMT"
    description = "Desvio por actos"
    url = "https://www.emtvalencia.es/wp/ultima-hora/test/"
    published_at = datetime(2026, 5, 10, 10, 0, 0)
    source_updated_at = datetime(2026, 5, 10, 11, 0, 0)
    extra_data = {"affected_lines": ["14"]}
    created_at = datetime(2026, 5, 10, 12, 0, 0)
    updated_at = datetime(2026, 5, 10, 12, 0, 0)


class _Query:
    def __init__(self, rows):
        self.rows = rows
        self.filters = []
        self.offset_value = None
        self.limit_value = None

    def filter(self, *args):
        self.filters.extend(args)
        return self

    def order_by(self, *_args):
        return self

    def offset(self, value):
        self.offset_value = value
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    def all(self):
        start = self.offset_value or 0
        end = start + self.limit_value if self.limit_value is not None else None
        return self.rows[start:end]


class _FakeDb:
    def __init__(self, rows):
        self.query_obj = _Query(rows)

    def query(self, model):
        assert model is OfficialNotice
        return self.query_obj


def _override_db(fake_db):
    def _dependency():
        return fake_db

    app.dependency_overrides[get_db] = _dependency


def test_official_notices_requires_admin_token():
    client = TestClient(app)

    response = client.get("/api/v1/official-notices")

    assert response.status_code == 401


def test_official_notices_lists_admin_records():
    fake_db = _FakeDb([_Notice()])
    _override_db(fake_db)
    client = TestClient(app)

    response = client.get(
        "/api/v1/official-notices",
        headers={"X-Admin-Token": "test_token"},
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()[0]["source_id"] == "emt_estado_servicio:1"
    assert response.json()[0]["extra_data"]["affected_lines"] == ["14"]


def test_official_notices_accepts_filters_and_pagination():
    fake_db = _FakeDb([_Notice(), _Notice()])
    _override_db(fake_db)
    client = TestClient(app)

    response = client.get(
        "/api/v1/official-notices?source=emt_valencia:estado-servicio&notice_type=PUBLIC_ACT&limit=1&offset=1",
        headers={"X-Admin-Token": "test_token"},
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert fake_db.query_obj.offset_value == 1
    assert fake_db.query_obj.limit_value == 1
    assert len(fake_db.query_obj.filters) == 2
