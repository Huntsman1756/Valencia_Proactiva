"""Generate mitigation actions from declarative templates."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from models.models import MitigationAction, MitigationActionType, UrbanEvent

TEMPLATES_DIR = Path(__file__).with_name("templates")


@lru_cache(maxsize=1)
def load_templates() -> list[dict[str, Any]]:
    """Load .yaml templates written in JSON-compatible YAML."""
    templates = []
    for path in sorted(TEMPLATES_DIR.glob("*.yaml")):
        templates.append(json.loads(path.read_text(encoding="utf-8")))
    return templates


def generate_actions(event: UrbanEvent, impact_zone_id: int | None = None) -> list[MitigationAction]:
    """Return mitigation actions that match an event."""
    actions: list[MitigationAction] = []

    for template in load_templates():
        if not _matches(template.get("when", {}), event):
            continue
        for action_data in template.get("actions", []):
            payload = dict(action_data.get("payload", {}))
            payload["template_id"] = template["id"]
            payload["profiles"] = action_data.get("profiles", ["GENERIC"])
            actions.append(
                MitigationAction(
                    event_id=event.id,
                    impact_zone_id=impact_zone_id,
                    action_type=MitigationActionType(action_data["action_type"]),
                    title=action_data["title"],
                    description=action_data.get("description"),
                    payload=payload,
                    priority=action_data.get("priority", 0),
                )
            )

    return actions


def _matches(conditions: dict[str, Any], event: UrbanEvent) -> bool:
    event_type = conditions.get("event_type")
    if event_type and str(event.type.value if hasattr(event.type, "value") else event.type) != event_type:
        return False

    severity_gte = conditions.get("severity_gte")
    if severity_gte is not None and event.severity < int(severity_gte):
        return False

    severity_lte = conditions.get("severity_lte")
    if severity_lte is not None and event.severity > int(severity_lte):
        return False

    return True
