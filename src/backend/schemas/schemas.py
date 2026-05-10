"""Pydantic schemas for V-PRO API"""

from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class UrbanEventType(str, Enum):
    OCUPACION = "OCUPACION"
    TRAFICO = "TRAFICO"
    ZBE = "ZBE"
    EVENTO_FALLAS = "EVENTO_FALLAS"
    APARCAMIENTO = "APARCAMIENTO"
    OTRO = "OTRO"


class MitigationActionType(str, Enum):
    PARKING_SUGGESTION = "PARKING_SUGGESTION"
    ROUTE_CHANGE = "ROUTE_CHANGE"
    ADMIN_TASK = "ADMIN_TASK"
    ALERT = "ALERT"
    INFORMATION = "INFORMATION"


class UrbanEventCreate(BaseModel):
    type: UrbanEventType
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    geometry: dict = Field(..., description="GeoJSON polygon geometry")
    start_time: datetime
    end_time: Optional[datetime] = None
    severity: int = Field(default=1, ge=1, le=5)
    source_id: Optional[str] = None
    source: str = Field(default="opendata_valencia")
    extra_data: Optional[dict] = None


class UrbanEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[int] = Field(None, ge=1, le=5)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    extra_data: Optional[dict] = None


class ImpactZoneResponse(BaseModel):
    id: int
    buffer_distance: float
    geometry: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class MitigationActionCreate(BaseModel):
    action_type: MitigationActionType
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    payload: Optional[dict] = None
    priority: int = Field(default=0)


class MitigationActionResponse(BaseModel):
    id: int
    action_type: MitigationActionType
    title: str
    description: Optional[str] = None
    payload: Optional[dict] = None
    priority: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UrbanEventResponse(BaseModel):
    id: int
    type: UrbanEventType
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    severity: int
    source: str
    source_id: Optional[str] = None
    geometry: dict
    center: tuple[float, float]
    created_at: datetime
    updated_at: Optional[datetime] = None
    mitigation_actions: List[MitigationActionResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class FeedbackCreate(BaseModel):
    mitigation_action_id: int = Field(..., gt=0)
    vote: Literal[-1, 1] = Field(..., description="Use +1 for useful and -1 for not useful")
    session_token: str = Field(..., min_length=8, max_length=64)
    profile: Optional[str] = Field(None, max_length=32)


class FeedbackResponse(BaseModel):
    id: int
    mitigation_action_id: int
    vote: int
    session_token: str
    profile: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OfficialNoticeResponse(BaseModel):
    id: int
    source: str
    source_id: str
    notice_type: str
    classification: str
    title: str
    description: Optional[str] = None
    url: str
    published_at: Optional[datetime] = None
    source_updated_at: Optional[datetime] = None
    extra_data: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ProactiveSuggestion(BaseModel):
    event: UrbanEventResponse
    impact_zone: Optional[ImpactZoneResponse] = None
    mitigation_actions: List[MitigationActionResponse] = Field(default_factory=list)
    distance_meters: Optional[float] = None


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class SpatialQueryRequest(BaseModel):
    lon: float = Field(..., ge=-180, le=180)
    lat: float = Field(..., ge=-90, le=90)
    radius_meters: float = Field(default=500, ge=100, le=5000)
    event_types: Optional[List[UrbanEventType]] = None
    max_severity: Optional[int] = Field(None, ge=1, le=5)


class SpatialAlternativesQuery(BaseModel):
    lon: float = Field(..., ge=-180, le=180)
    lat: float = Field(..., ge=-90, le=90)
    radius_meters: float = Field(default=500, ge=100, le=5000)
    event_id: Optional[int] = Field(None, gt=0)
    profile: Optional[str] = Field(None, max_length=32)
    poi_type: Optional[str] = Field(None, max_length=50)


class ProactiveResponse(BaseModel):
    user_location: tuple[float, float]
    radius_meters: float
    suggestions: List[ProactiveSuggestion] = Field(default_factory=list)
    total_events: int = 0
    total_actions: int = 0
