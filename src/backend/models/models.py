"""SQLAlchemy models for V-PRO"""

from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Enum as SQLEnum, Boolean,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape
import shapely
from enum import Enum
from core.database import Base


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


class UrbanEvent(Base):
    __tablename__ = "urban_events"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(SQLEnum(UrbanEventType), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    geometry = Column(Geometry(geometry_type="GEOMETRY", srid=4326), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    severity = Column(Integer, nullable=False, default=1)
    source = Column(String(100), nullable=False, default="opendata_valencia")
    source_id = Column(String(255), nullable=True)
    extra_data = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    impact_zones = relationship("ImpactZone", back_populates="event", cascade="all, delete-orphan")
    mitigation_actions = relationship("MitigationAction", back_populates="event", cascade="all, delete-orphan")

    @property
    def geometry_as_geojson(self) -> dict:
        """Return geometry as GeoJSON dict"""
        try:
            geom = to_shape(self.geometry)  # type: ignore[arg-type]
            return shapely.mapping(geom)
        except Exception:
            return {}

    @property
    def center(self) -> tuple:
        """Return center point (lon, lat) of the event geometry"""
        try:
            geom = to_shape(self.geometry)  # type: ignore[arg-type]
            return (geom.centroid.x, geom.centroid.y)
        except Exception:
            return (0.0, 0.0)


class ImpactZone(Base):
    __tablename__ = "impact_zones"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("urban_events.id"), nullable=False)
    buffer_distance = Column(Float, nullable=False)
    geometry = Column(Geometry(geometry_type="GEOMETRY", srid=4326), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("UrbanEvent", back_populates="impact_zones")
    mitigation_actions = relationship("MitigationAction", back_populates="impact_zone")

    @property
    def geometry_as_geojson(self) -> dict:
        """Return geometry as GeoJSON dict"""
        try:
            geom = to_shape(self.geometry)  # type: ignore[arg-type]
            return shapely.mapping(geom)
        except Exception:
            return {}


class PointOfInterest(Base):
    __tablename__ = "points_of_interest"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    poi_type = Column(String(50), nullable=False, index=True)
    geometry = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    accessible = Column(Boolean, nullable=False, default=False, server_default="f")
    source = Column(String(100), nullable=False, default="geoportal_valencia")
    source_id = Column(String(255), nullable=True, index=True)
    extra_data = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OfficialNotice(Base):
    __tablename__ = "official_notices"
    __table_args__ = (
        UniqueConstraint("source", "source_id", name="uq_official_notice_source_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(100), nullable=False, index=True)
    source_id = Column(String(255), nullable=False, index=True)
    notice_type = Column(String(50), nullable=False, default="TRANSPORT_NOTICE", index=True)
    classification = Column(String(50), nullable=False, default="official_public_info")
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    url = Column(String(500), nullable=False)
    published_at = Column(DateTime, nullable=True)
    source_updated_at = Column(DateTime, nullable=True)
    extra_data = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Feedback(Base):
    __tablename__ = "feedback"
    __table_args__ = (
        UniqueConstraint("mitigation_action_id", "session_token", name="uq_feedback_action_session"),
    )

    id = Column(Integer, primary_key=True, index=True)
    mitigation_action_id = Column(Integer, ForeignKey("mitigation_actions.id"), nullable=False)
    vote = Column(Integer, nullable=False)  # -1 or +1
    session_token = Column(String(64), nullable=False, index=True)
    profile = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    mitigation_action = relationship("MitigationAction", back_populates="feedback_items")


class MitigationAction(Base):
    __tablename__ = "mitigation_actions"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("urban_events.id"), nullable=False)
    impact_zone_id = Column(Integer, ForeignKey("impact_zones.id"), nullable=True)
    action_type = Column(SQLEnum(MitigationActionType), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    payload = Column(JSON, default=dict)
    priority = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("UrbanEvent", back_populates="mitigation_actions")
    impact_zone = relationship("ImpactZone", back_populates="mitigation_actions")
    feedback_items = relationship("Feedback", back_populates="mitigation_action", cascade="all, delete-orphan")
