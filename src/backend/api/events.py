"""Event management API"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import shapely
import shapely.geometry
import shapely.wkt

from core.database import get_db
from core.security import require_admin_token
from ingestion.normalizer import clean_public_text
from schemas.schemas import (
    UrbanEventCreate,
    UrbanEventUpdate,
    UrbanEventResponse,
    MitigationActionResponse,
)
from models.models import UrbanEvent

router = APIRouter()


def _location_label_from_event(event: UrbanEvent) -> str | None:
    extra_data = event.extra_data or {}
    for key in ("location_label", "direccion", "address", "calle", "localizacion", "localización"):
        value = extra_data.get(key)
        if value not in (None, ""):
            return clean_public_text(value)
    return None


def _geojson_to_wkt(geojson: dict) -> str:
    """Convert GeoJSON dict to WKT string (with SRID) for PostGIS"""
    geom = shapely.geometry.shape(geojson)
    return f"SRID=4326;{shapely.wkt.dumps(geom)}"


def _event_to_response(event: UrbanEvent) -> UrbanEventResponse:
    """Convert ORM event to response model"""
    return UrbanEventResponse(
        id=event.id,
        type=event.type,
        title=clean_public_text(event.title),
        description=clean_public_text(event.description),
        location_label=_location_label_from_event(event),
        start_time=event.start_time,
        end_time=event.end_time,
        severity=event.severity,
        source=event.source,
        source_id=event.source_id,
        geometry=event.geometry_as_geojson,
        center=event.center,
        created_at=event.created_at,
        updated_at=event.updated_at,
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
            for action in event.mitigation_actions
        ],
    )


@router.post("/", response_model=UrbanEventResponse, status_code=201, dependencies=[Depends(require_admin_token)])
async def create_event(
    event_data: UrbanEventCreate,
    db: Session = Depends(get_db),
):
    """Create a new urban event with geometry"""
    try:
        geom_wkt = _geojson_to_wkt(event_data.geometry)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid geometry: {str(e)}")

    db_event = UrbanEvent(
        type=event_data.type,
        title=event_data.title,
        description=event_data.description,
        geometry=geom_wkt,
        start_time=event_data.start_time,
        end_time=event_data.end_time,
        severity=event_data.severity,
        source=event_data.source,
        source_id=event_data.source_id,
        extra_data=event_data.extra_data or {},
    )

    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    return _event_to_response(db_event)


@router.get("/", response_model=List[UrbanEventResponse])
async def list_events(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    db: Session = Depends(get_db),
):
    """List urban events with optional filtering"""
    query = db.query(UrbanEvent)

    if event_type:
        query = query.filter(UrbanEvent.type == event_type)

    events = query.order_by(UrbanEvent.created_at.desc()).limit(limit).offset(offset).all()

    return [_event_to_response(e) for e in events]


@router.get("/{event_id}", response_model=UrbanEventResponse)
async def get_event(event_id: int, db: Session = Depends(get_db)):
    """Get a single urban event by ID"""
    event = db.query(UrbanEvent).filter(UrbanEvent.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    return _event_to_response(event)


@router.put("/{event_id}", response_model=UrbanEventResponse, dependencies=[Depends(require_admin_token)])
async def update_event(
    event_id: int,
    event_data: UrbanEventUpdate,
    db: Session = Depends(get_db),
):
    """Update an urban event"""
    event = db.query(UrbanEvent).filter(UrbanEvent.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    update_data = event_data.model_dump(exclude_unset=True)

    if "geometry" in update_data:
        try:
            geom_wkt = _geojson_to_wkt(update_data.pop("geometry"))
            event.geometry = geom_wkt
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid geometry: {str(e)}")

    for field, value in update_data.items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)

    return _event_to_response(event)


@router.delete("/{event_id}", status_code=204, dependencies=[Depends(require_admin_token)])
async def delete_event(event_id: int, db: Session = Depends(get_db)):
    """Delete an urban event"""
    event = db.query(UrbanEvent).filter(UrbanEvent.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(event)
    db.commit()
