"""Spatial queries API"""

from typing import Any, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from core.database import get_db
from schemas.schemas import (
    SpatialQueryRequest,
    ProactiveResponse,
    ProactiveSuggestion,
    UrbanEventResponse,
    ImpactZoneResponse,
    MitigationActionResponse,
)
from models.models import ImpactZone, MitigationAction

router = APIRouter()


def _profile_requires_accessible(profile: str | None) -> bool:
    return (profile or "").upper() == "PMR"


def _location_label_from_extra_data(extra_data: dict | None) -> str | None:
    data = extra_data or {}
    for key in ("location_label", "direccion", "address", "calle", "localizacion", "localización"):
        value = data.get(key)
        if value not in (None, ""):
            return str(value)
    return None


def _build_alternatives_query(
    *,
    lon: float,
    lat: float,
    radius_meters: float,
    profile: str | None,
    poi_type: str | None,
    event_id: int | None,
) -> tuple[str, dict[str, Any]]:
    sql = """
        SELECT
            poi.id,
            poi.name,
            poi.poi_type,
            poi.accessible,
            poi.source,
            poi.source_id,
            poi.extra_data,
            ST_Distance(
                ST_Transform(
                    ST_SetSRID(ST_Point(:lon, :lat), 4326),
                    3857
                ),
                ST_Transform(poi.geometry, 3857)
            ) as distance_meters,
            ST_AsGeoJSON(poi.geometry)::json as geometry_geojson
        FROM points_of_interest poi
        WHERE ST_DWithin(
            ST_Transform(
                ST_SetSRID(ST_Point(:lon, :lat), 4326),
                3857
            ),
            ST_Transform(poi.geometry, 3857),
            :radius
        )
    """
    params: dict[str, Any] = {"lon": lon, "lat": lat, "radius": radius_meters}

    if _profile_requires_accessible(profile):
        sql += " AND poi.accessible = true"

    if poi_type:
        sql += " AND poi.poi_type = :poi_type"
        params["poi_type"] = poi_type

    if event_id is not None:
        sql += """
            AND NOT EXISTS (
                SELECT 1
                FROM impact_zones iz
                WHERE iz.id = (
                    SELECT latest_iz.id
                    FROM impact_zones latest_iz
                    WHERE latest_iz.event_id = :event_id
                    ORDER BY latest_iz.created_at DESC
                    LIMIT 1
                )
                AND ST_Covers(iz.geometry, poi.geometry)
            )
        """
        params["event_id"] = event_id

    sql += " ORDER BY distance_meters LIMIT 25"
    return sql, params


def _build_impact_zones_query(*, limit: int) -> tuple[str, dict[str, Any]]:
    sql = """
        SELECT
            iz.id,
            iz.event_id,
            iz.buffer_distance,
            iz.created_at,
            ue.type as event_type,
            ue.severity,
            ST_AsGeoJSON(iz.geometry)::json as geometry_geojson
        FROM impact_zones iz
        JOIN urban_events ue ON ue.id = iz.event_id
        WHERE iz.id IN (
            SELECT DISTINCT ON (event_id) id
            FROM impact_zones
            ORDER BY event_id, created_at DESC
        )
        ORDER BY iz.created_at DESC
        LIMIT :limit
    """
    return sql, {"limit": limit}


def _build_events_layer_query(*, event_type: str | None, limit: int) -> tuple[str, dict[str, Any]]:
    sql = """
        SELECT
            ue.id,
            ue.type,
            ue.title,
            ue.severity,
            ST_AsGeoJSON(ue.geometry)::json as geometry_geojson
        FROM urban_events ue
    """
    params: dict[str, Any] = {"limit": limit}

    if event_type:
        sql += " WHERE ue.type = :event_type"
        params["event_type"] = event_type

    sql += " ORDER BY ue.created_at DESC LIMIT :limit"
    return sql, params


@router.post("/suggestions", response_model=ProactiveResponse)
async def get_proactive_suggestions(
    query: SpatialQueryRequest,
    db: Session = Depends(get_db),
):
    """Get proactive suggestions for a user at a given location"""
    sql = text("""
        SELECT 
            ue.id, ue.type, ue.title, ue.description,
            ue.start_time, ue.end_time, ue.severity,
            ue.source, ue.source_id, ue.extra_data,
            ue.created_at, ue.updated_at,
            ST_Distance(
                ST_Transform(
                    ST_SetSRID(ST_Point(:lon, :lat), 4326),
                    3857
                ),
                ST_Transform(ue.geometry, 3857)
            ) as distance_meters,
            ST_AsGeoJSON(ue.geometry)::json as geometry_geojson
        FROM urban_events ue
        WHERE ST_DWithin(
            ST_Transform(
                ST_SetSRID(ST_Point(:lon, :lat), 4326),
                3857
            ),
            ST_Transform(ue.geometry, 3857),
            :radius
        )
    """)
    
    where_clauses = []
    params = {
        "lon": query.lon,
        "lat": query.lat,
        "radius": query.radius_meters,
    }
    
    if query.event_types:
        placeholders = ", ".join([f":type_{i}" for i in range(len(query.event_types))])
        for i, et in enumerate(query.event_types):
            params[f"type_{i}"] = et.value
        where_clauses.append(f"ue.type IN ({placeholders})")
    
    if query.max_severity:
        where_clauses.append("ue.severity <= :max_severity")
        params["max_severity"] = query.max_severity
    
    if where_clauses:
        sql = text(str(sql) + " WHERE " + " AND ".join(where_clauses))
    
    sql = text(str(sql) + " ORDER BY distance_meters")
    
    result = db.execute(sql, params)
    events = result.mappings().all()
    
    suggestions = []
    total_actions = 0
    
    for event_row in events:
        actions = db.query(MitigationAction).filter(
            MitigationAction.event_id == event_row["id"]
        ).order_by(MitigationAction.priority.desc()).all()
        
        impact_zone = db.query(ImpactZone).filter(
            ImpactZone.event_id == event_row["id"]
        ).order_by(ImpactZone.created_at.desc()).first()
        
        geojson = event_row["geometry_geojson"]
        center = (0.0, 0.0)
        if geojson.get("coordinates"):
            coords = geojson["coordinates"]
            if isinstance(coords[0][0], list):
                center = (coords[0][0][0][0], coords[0][0][0][1])
        
        suggestion = ProactiveSuggestion(
            event=UrbanEventResponse(
                id=event_row["id"],
                type=event_row["type"],
                title=event_row["title"],
                description=event_row["description"],
                location_label=_location_label_from_extra_data(event_row["extra_data"]),
                start_time=event_row["start_time"],
                end_time=event_row["end_time"],
                severity=event_row["severity"],
                source=event_row["source"],
                source_id=event_row["source_id"],
                geometry=geojson,
                center=center,
                created_at=event_row["created_at"],
                updated_at=event_row["updated_at"],
            ),
            impact_zone=ImpactZoneResponse(
                id=impact_zone.id,
                buffer_distance=impact_zone.buffer_distance,
                geometry=impact_zone.geometry_as_geojson,
                created_at=impact_zone.created_at,
            ) if impact_zone else None,
            mitigation_actions=[
                MitigationActionResponse(
                    id=action.id,
                    action_type=action.action_type,
                    title=action.title,
                    description=action.description,
                    payload=action.payload,
                    priority=action.priority,
                    created_at=action.created_at,
                )
                for action in actions
            ],
            distance_meters=float(event_row["distance_meters"]) if event_row["distance_meters"] else None,
        )
        
        suggestions.append(suggestion)
        total_actions += len(actions)
    
    return ProactiveResponse(
        user_location=(query.lon, query.lat),
        radius_meters=query.radius_meters,
        suggestions=suggestions,
        total_events=len(suggestions),
        total_actions=total_actions,
    )


@router.get("/alternatives", response_model=List[dict])
async def get_alternatives(
    lon: float = Query(..., ge=-180, le=180),
    lat: float = Query(..., ge=-90, le=90),
    radius_meters: float = Query(500, ge=100, le=5000),
    event_id: int | None = Query(None, gt=0),
    profile: str | None = Query(None, max_length=32),
    poi_type: str | None = Query(None, max_length=50),
    db: Session = Depends(get_db),
):
    """Get nearby points of interest that can mitigate an urban disruption."""
    sql, params = _build_alternatives_query(
        lon=lon,
        lat=lat,
        radius_meters=radius_meters,
        profile=profile,
        poi_type=poi_type,
        event_id=event_id,
    )
    result = db.execute(text(sql), params)

    return [
        {
            "id": row["id"],
            "name": row["name"],
            "poi_type": row["poi_type"],
            "accessible": row["accessible"],
            "source": row["source"],
            "source_id": row["source_id"],
            "extra_data": row["extra_data"] or {},
            "geometry": row["geometry_geojson"],
            "distance_meters": float(row["distance_meters"]) if row["distance_meters"] else None,
        }
        for row in result.mappings().all()
    ]


@router.get("/events-layer", response_model=List[dict])
async def get_events_layer(
    event_type: str | None = Query(None, max_length=50),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Get urban events as GeoJSON-ready records for map layers."""
    sql, params = _build_events_layer_query(event_type=event_type, limit=limit)
    result = db.execute(text(sql), params)

    return [
        {
            "id": row["id"],
            "type": row["type"],
            "title": row["title"],
            "severity": row["severity"],
            "geometry": row["geometry_geojson"],
        }
        for row in result.mappings().all()
    ]


@router.get("/impact-zones", response_model=List[dict])
async def get_impact_zones(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Get latest impact zones as GeoJSON-ready records for map layers."""
    sql, params = _build_impact_zones_query(limit=limit)
    result = db.execute(text(sql), params)

    return [
        {
            "id": row["id"],
            "event_id": row["event_id"],
            "event_type": row["event_type"],
            "severity": row["severity"],
            "buffer_distance": float(row["buffer_distance"]),
            "geometry": row["geometry_geojson"],
            "created_at": row["created_at"],
        }
        for row in result.mappings().all()
    ]


@router.get("/events/nearby", response_model=List[dict])
async def get_nearby_events(
    lon: float = Query(..., ge=-180, le=180),
    lat: float = Query(..., ge=-90, le=90),
    radius_meters: float = Query(500, ge=100, le=5000),
    db: Session = Depends(get_db),
):
    """Get events nearby a location (simplified response)"""
    sql = text("""
        SELECT 
            ue.id, ue.type, ue.title, ue.severity,
            ST_Distance(
                ST_Transform(
                    ST_SetSRID(ST_Point(:lon, :lat), 4326),
                    3857
                ),
                ST_Transform(ue.geometry, 3857)
            ) as distance_meters
        FROM urban_events ue
        WHERE ST_DWithin(
            ST_Transform(
                ST_SetSRID(ST_Point(:lon, :lat), 4326),
                3857
            ),
            ST_Transform(ue.geometry, 3857),
            :radius
        )
        ORDER BY distance_meters
    """)
    
    result = db.execute(sql, {"lon": lon, "lat": lat, "radius": radius_meters})
    rows = result.mappings().all()
    
    return [
        {
            "id": row["id"],
            "type": row["type"],
            "title": row["title"],
            "severity": row["severity"],
            "distance_meters": float(row["distance_meters"]) if row["distance_meters"] else None,
        }
        for row in rows
    ]
