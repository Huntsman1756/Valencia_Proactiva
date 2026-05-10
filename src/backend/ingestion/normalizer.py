"""Data normalizer for Valencia Open Data"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class Normalizer:
    """Normalizes raw data from Valencia Open Data to UrbanEvent schema"""
    
    def __init__(self):
        pass
    
    def normalize(self, raw_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Normalize a list of raw data items"""
        normalized = []
        
        for item in raw_data:
            try:
                normalized_item = self._normalize_item(item)
                if normalized_item:
                    normalized.append(normalized_item)
            except Exception as e:
                logger.error(f"Error normalizing item: {e}")
                continue
        
        logger.info(f"Normalized {len(normalized)} items successfully")
        return normalized
    
    def _normalize_item(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Normalize a single data item"""
        if not item.get("geometry"):
            logger.warning("Skipping item without geometry")
            return None
        
        if not item.get("type"):
            logger.warning("Skipping item without type")
            return None
        
        return {
            "record_kind": item.get("record_kind", "event"),
            "type": item["type"],
            "title": item.get("title", "Sin título"),
            "description": item.get("description", ""),
            "geometry": item["geometry"],
            "start_time": item.get("start_time") or datetime.now(),
            "end_time": item.get("end_time"),
            "severity": item.get("severity", 1),
            "source": item.get("source", "opendata_valencia"),
            "source_id": item.get("source_id"),
            "extra_data": item.get("extra_data", {}),
        }
    
    def validate_geometry(self, geometry: Dict) -> bool:
        """Validate that geometry is valid GeoJSON"""
        import shapely.geometry

        try:
            geom = shapely.geometry.shape(geometry)
            return geom.is_valid and not geom.is_empty
        except Exception:
            return False
