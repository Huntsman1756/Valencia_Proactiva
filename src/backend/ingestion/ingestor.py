"""Orchestrates the ingestion pipeline"""

import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from shapely.geometry import Point

from ingestion.scraper_opendata import ArcGiSCRaper
from ingestion.normalizer import Normalizer
from ingestion.official_sources import EmtEstadoServicioClient, deduplicate_official_notices
from ingestion.official_promotion import promote_official_notice_to_event
from engine.action_templates import generate_actions
from models.models import UrbanEvent, ImpactZone, PointOfInterest, OfficialNotice
from core.database import engine

logger = logging.getLogger(__name__)


class Ingestor:
    """Orchestrates scraping, normalization, and storage"""
    
    def __init__(self):
        self.scraper = ArcGiSCRaper()
        self.normalizer = Normalizer()
        self.emt_estado_servicio = EmtEstadoServicioClient()
    
    async def run(self) -> Dict[str, int]:
        """Run the full ingestion pipeline"""
        logger.info("Starting ingestion pipeline...")
        
        # Step 1: Scrape
        logger.info("Step 1: Scraping data from Valencia Open Data")
        raw_data = await self.scraper.fetch_all()
        logger.info(f"Scraped {len(raw_data)} items")
        
        if not raw_data:
            logger.warning("No data scraped, aborting pipeline")
            return {"scraped": 0, "normalized": 0, "stored": 0, "errors": 0}
        
        # Step 2: Normalize
        logger.info("Step 2: Normalizing data")
        normalized_data = self.normalizer.normalize(raw_data)
        logger.info(f"Normalized {len(normalized_data)} items")
        
        # Step 3: Store
        logger.info("Step 3: Storing data in database")
        event_records, poi_records = self._partition_records(normalized_data)
        storage_result = self._store_records(event_records, poi_records)
        
        return {
            "scraped": len(raw_data),
            "normalized": len(normalized_data),
            **storage_result,
        }

    async def run_official_sources(self) -> Dict[str, int]:
        """Ingest complementary official sources into staging tables."""
        logger.info("Starting official sources ingestion...")
        notices = await self.emt_estado_servicio.fetch()
        result = self._store_official_notices(notices)
        return {
            "scraped": len(notices),
            "normalized": len(notices),
            **result,
        }

    def promote_staged_official_notices(self) -> Dict[str, int]:
        """Promote safe staged notices to UrbanEvent records."""
        staged_notices, candidates = self._build_official_notice_promotion_candidates()
        result = self._store_events(candidates)
        return {
            "scanned_official_notices": len(staged_notices),
            "promotion_candidates": len(candidates),
            "promoted_events": result["stored"],
            "skipped_duplicates": result["skipped_duplicates"],
            "errors": result["errors"],
        }

    def preview_staged_official_notice_promotions(self) -> Dict[str, int]:
        """Preview safe staged notice promotions without writing events."""
        staged_notices, candidates = self._build_official_notice_promotion_candidates()
        return {
            "scanned_official_notices": len(staged_notices),
            "promotion_candidates": len(candidates),
            "would_promote_events": len(candidates),
            "errors": 0,
        }

    def _build_official_notice_promotion_candidates(
        self,
    ) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        with Session(engine) as session:
            staged_notices = [
                self._official_notice_to_dict(notice)
                for notice in session.query(OfficialNotice).all()
            ]
            existing_events = [
                {
                    "type": str(event.type.value if hasattr(event.type, "value") else event.type),
                    "source": event.source,
                    "source_id": event.source_id,
                    "geometry": event.geometry_as_geojson,
                    "center": event.center,
                }
                for event in session.query(UrbanEvent).all()
            ]

        candidates = [
            candidate
            for notice in staged_notices
            if (candidate := promote_official_notice_to_event(notice, existing_events)) is not None
        ]
        return staged_notices, candidates
    
    def _partition_records(
        self,
        normalized_data: List[Dict[str, Any]],
    ) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        events = [item for item in normalized_data if item.get("record_kind", "event") == "event"]
        pois = [item for item in normalized_data if item.get("record_kind") == "poi"]
        return events, pois

    def _store_records(
        self,
        event_records: List[Dict[str, Any]],
        poi_records: List[Dict[str, Any]],
    ) -> Dict[str, int]:
        event_result = self._store_events(event_records)
        poi_result = self._store_pois(poi_records)
        return {
            "stored": event_result["stored"] + poi_result["stored"],
            "stored_events": event_result["stored"],
            "stored_pois": poi_result["stored"],
            "skipped_duplicates": (
                event_result["skipped_duplicates"] + poi_result["skipped_duplicates"]
            ),
            "errors": event_result["errors"] + poi_result["errors"],
        }

    def _store_official_notices(self, notices: List[Dict[str, Any]]) -> Dict[str, int]:
        """Store official complementary notices in a staging table."""
        stored_count = 0

        with engine.begin() as conn:
            from sqlalchemy import text

            result = conn.execute(
                text(
                    "SELECT source, source_id FROM official_notices "
                    "WHERE source_id IS NOT NULL"
                )
            )
            existing_keys = {(row[0], row[1]) for row in result}

        new_notices, skipped_duplicates = deduplicate_official_notices(notices, existing_keys)

        with Session(engine) as session:
            for item in new_notices:
                try:
                    notice = OfficialNotice(
                        source=item["source"],
                        source_id=item["source_id"],
                        notice_type=item.get("notice_type", "TRANSPORT_NOTICE"),
                        classification=item.get("classification", "official_public_info"),
                        title=item["title"],
                        description=item.get("description"),
                        url=item["url"],
                        published_at=item.get("published_at"),
                        source_updated_at=item.get("source_updated_at"),
                        extra_data=item.get("extra_data", {}),
                    )
                    session.add(notice)
                    stored_count += 1
                except Exception as e:
                    logger.error(f"Error storing official notice: {e}")
                    session.rollback()
                    continue

            try:
                session.commit()
            except Exception as e:
                logger.error(f"Error committing official notices transaction: {e}")
                session.rollback()

        errors = len(notices) - stored_count - skipped_duplicates
        logger.info(
            "Stored %s official notices, skipped %s duplicates, errors %s",
            stored_count,
            skipped_duplicates,
            errors,
        )
        return {
            "stored": stored_count,
            "stored_official_notices": stored_count,
            "skipped_duplicates": skipped_duplicates,
            "errors": errors,
        }

    def _official_notice_to_dict(self, notice: OfficialNotice) -> Dict[str, Any]:
        return {
            "source": notice.source,
            "source_id": notice.source_id,
            "notice_type": notice.notice_type,
            "classification": notice.classification,
            "title": notice.title,
            "description": notice.description,
            "url": notice.url,
            "published_at": notice.published_at,
            "source_updated_at": notice.source_updated_at,
            "extra_data": notice.extra_data or {},
        }

    def _store_events(self, normalized_data: List[Dict[str, Any]]) -> Dict[str, int]:
        """Store normalized events in the database"""
        stored_count = 0
        skipped_duplicates = 0
        existing_ids = set()
        
        with engine.begin() as conn:
            from sqlalchemy import text
            result = conn.execute(text("SELECT source_id FROM urban_events WHERE source_id IS NOT NULL"))
            existing_ids = {row[0] for row in result}
        
        with Session(engine) as session:
            for item in normalized_data:
                source_id = item.get("source_id")
                if source_id and source_id in existing_ids:
                    skipped_duplicates += 1
                    logger.debug(f"Skipping duplicate event: {source_id}")
                    continue
                
                try:
                    import shapely
                    import shapely.wkt
                    
                    geom = shapely.geometry.shape(item["geometry"])
                    geom_wkt = f"SRID=4326;{shapely.wkt.dumps(geom)}"
                    
                    event = UrbanEvent(
                        type=item["type"],
                        title=item["title"],
                        description=item["description"],
                        geometry=geom_wkt,
                        start_time=item["start_time"],
                        end_time=item.get("end_time"),
                        severity=item.get("severity", 1),
                        source=item.get("source", "opendata_valencia"),
                        source_id=source_id,
                        extra_data=item.get("extra_data", {}),
                    )
                    
                    session.add(event)
                    session.flush()
                    
                    impact_zone = self._create_impact_zone(session, event, geom)
                    session.flush()
                    self._create_mitigation_actions(session, event, impact_zone.id)
                    
                    existing_ids.add(source_id)
                    stored_count += 1
                    
                except Exception as e:
                    logger.error(f"Error storing event: {e}")
                    session.rollback()
                    continue
            
            try:
                session.commit()
            except Exception as e:
                logger.error(f"Error committing transaction: {e}")
                session.rollback()
        
        errors = len(normalized_data) - stored_count - skipped_duplicates
        logger.info(
            "Stored %s events, skipped %s duplicates, errors %s",
            stored_count,
            skipped_duplicates,
            errors,
        )
        return {
            "stored": stored_count,
            "skipped_duplicates": skipped_duplicates,
            "errors": errors,
        }

    def _store_pois(self, poi_records: List[Dict[str, Any]]) -> Dict[str, int]:
        """Store normalized points of interest in the database."""
        stored_count = 0
        skipped_duplicates = 0

        with engine.begin() as conn:
            from sqlalchemy import text
            result = conn.execute(text("SELECT source_id FROM points_of_interest WHERE source_id IS NOT NULL"))
            existing_ids = {row[0] for row in result}

        with Session(engine) as session:
            for item in poi_records:
                source_id = item.get("source_id")
                if source_id and source_id in existing_ids:
                    skipped_duplicates += 1
                    logger.debug(f"Skipping duplicate POI: {source_id}")
                    continue

                try:
                    import shapely
                    import shapely.wkt

                    geom = shapely.geometry.shape(item["geometry"])
                    if geom.geom_type != "Point":
                        geom = geom.centroid

                    extra_data = item.get("extra_data", {})
                    poi = PointOfInterest(
                        name=item["title"],
                        poi_type=extra_data.get("poi_type") or item["type"],
                        geometry=f"SRID=4326;{shapely.wkt.dumps(geom)}",
                        accessible=bool(extra_data.get("accessible", False)),
                        source=item.get("source", "geoportal_valencia"),
                        source_id=source_id,
                        extra_data=extra_data,
                    )

                    session.add(poi)
                    existing_ids.add(source_id)
                    stored_count += 1
                except Exception as e:
                    logger.error(f"Error storing POI: {e}")
                    session.rollback()
                    continue

            try:
                session.commit()
            except Exception as e:
                logger.error(f"Error committing POI transaction: {e}")
                session.rollback()

        errors = len(poi_records) - stored_count - skipped_duplicates
        logger.info(
            "Stored %s POIs, skipped %s duplicate POIs, errors %s",
            stored_count,
            skipped_duplicates,
            errors,
        )
        return {
            "stored": stored_count,
            "skipped_duplicates": skipped_duplicates,
            "errors": errors,
        }
    
    def _create_impact_zone(self, session: Session, event: UrbanEvent, geometry):
        """Create an impact zone (buffer) around an event.

        Buffer is computed in projected CRS (EPSG:32630) because buffer()
        on WGS84 (degrees) produces meaningless distances.
        Accepts both POLYGON and LINESTRING geometries.
        """
        from geoalchemy2.shape import from_shape
        from shapely.ops import transform
        import pyproj

        # Project centroid to UTM zone 30N (valencia area)
        to_utm = pyproj.Transformer.from_crs(
            4326, 32630, always_xy=True
        ).transform
        to_wgs = pyproj.Transformer.from_crs(
            32630, 4326, always_xy=True
        ).transform

        # Compute buffer distance in meters
        buffer_distance = min(event.severity * 100, 500)

        # Use the centroid for heterogeneous inputs (Point, LineString, Polygon, Multi*).
        projected_centroid = Point(*to_utm(geometry.centroid.x, geometry.centroid.y))
        buffered_projected = projected_centroid.buffer(buffer_distance)
        buffered_wgs84 = transform(to_wgs, buffered_projected)

        impact_zone = ImpactZone(
            event_id=event.id,
            buffer_distance=buffer_distance,
            geometry=from_shape(buffered_wgs84, srid=4326),
        )

        session.add(impact_zone)
        return impact_zone

    def _create_mitigation_actions(
        self,
        session: Session,
        event: UrbanEvent,
        impact_zone_id: int | None,
    ) -> None:
        """Create template-driven mitigation actions for a stored event."""
        actions = generate_actions(event, impact_zone_id=impact_zone_id)
        if actions:
            session.add_all(actions)
