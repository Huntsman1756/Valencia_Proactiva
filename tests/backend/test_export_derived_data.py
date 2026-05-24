import csv
import json
import shutil

from src.scripts import export_derived_data


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def mappings(self):
        return self

    def all(self):
        return self._rows


class FakeSession:
    def __init__(self, batches):
        self.batches = batches
        self.index = 0

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, _query, _params=None):
        rows = self.batches[self.index]
        self.index += 1
        return FakeResult(rows)


def test_export_all_writes_geojson_and_csv(monkeypatch):
    output_dir = export_derived_data.REPO_ROOT / ".tmp_test_exports"
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir()

    batches = [
        [
            {
                "id": 1,
                "event_id": 10,
                "buffer_distance": 100.0,
                "created_at": None,
                "event_type": "OCUPACION",
                "event_title": "Ocupacion via publica",
                "severity": 3,
                "source": "geoportal_valencia",
                "source_id": "occupacio:1",
                "geometry": {"type": "Polygon", "coordinates": []},
            }
        ],
        [
            {
                "id": 7,
                "event_id": 10,
                "event_type": "OCUPACION",
                "event_title": "Ocupacion via publica",
                "event_source": "geoportal_valencia",
                "event_source_id": "occupacio:1",
                "action_type": "ADMIN_TASK",
                "title": "Tramite",
                "description": "Descripcion",
                "priority": 50,
                "payload": {
                    "template_id": "comercio-ocupacion",
                    "profiles": ["COMMERCIAL"],
                    "url": "https://www.valencia.es/",
                },
                "created_at": None,
            }
        ],
        [
            {
                "action_id": 7,
                "action_type": "ADMIN_TASK",
                "title": "Tramite",
                "profile": "COMMERCIAL",
                "up_votes": 2,
                "down_votes": 1,
                "total_votes": 3,
            }
        ],
        [
            {
                "id": 10,
                "type": "OCUPACION",
                "title": "Ocupacion via publica",
                "description": "Corte de acera",
                "severity": 3,
                "source": "geoportal_valencia",
                "source_id": "occupacio:1",
                "start_time": None,
                "end_time": None,
                "created_at": None,
                "updated_at": None,
                "extra_data": {"location_label": "C/ Prova 1"},
                "geometry": {"type": "Point", "coordinates": [-0.37, 39.47]},
                "lon": -0.37,
                "lat": 39.47,
                "mitigation_action_count": 1,
            }
        ],
        [
            {"metric": "urban_events", "value": "1", "observed_at": "2026-05-24 10:00:00"},
            {"metric": "points_of_interest", "value": "2", "observed_at": "2026-05-24 10:00:00"},
        ],
    ]
    session = FakeSession(batches)
    monkeypatch.setattr(export_derived_data, "SessionLocal", lambda: session)

    try:
        summary = export_derived_data.export_all(output_dir)

        assert summary == {
            "impact_zones": 1,
            "mitigation_actions": 1,
            "feedback_aggregated": 1,
            "latest_events": 1,
            "event_pages": 1,
            "data_health": 2,
        }

        geojson = json.loads((output_dir / "impact_zones.geojson").read_text(encoding="utf-8"))
        assert geojson["license"] == "CC-BY-4.0"
        assert geojson["features"][0]["properties"]["source_id"] == "occupacio:1"

        actions_text = (output_dir / "mitigation_actions.csv").read_text(encoding="utf-8")
        assert actions_text.startswith("# source:")
        rows = list(csv.DictReader(actions_text.splitlines()[2:]))
        assert rows[0]["profiles"] == "COMMERCIAL"
        assert rows[0]["url"] == "https://www.valencia.es/"

        feedback_text = (output_dir / "feedback_aggregated.csv").read_text(encoding="utf-8")
        feedback_rows = list(csv.DictReader(feedback_text.splitlines()[2:]))
        assert feedback_rows[0]["total_votes"] == "3"
        assert "session_token" not in feedback_rows[0]

        latest_events = json.loads((output_dir / "latest_events.json").read_text(encoding="utf-8"))
        assert latest_events["events"][0]["permalink"] == "events/10.html"
        assert latest_events["events"][0]["location_label"] == "C/ Prova 1"
        assert (output_dir / "events" / "10.html").exists()

        data_health = json.loads((output_dir / "data_health.json").read_text(encoding="utf-8"))
        assert data_health["metrics"]["urban_events"]["count"] == 1
    finally:
        shutil.rmtree(output_dir, ignore_errors=True)
