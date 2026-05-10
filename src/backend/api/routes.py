"""Routes aggregator"""

from fastapi import APIRouter
from .events import router as events_router
from .feedback import router as feedback_router
from .official_notices import router as official_notices_router
from .spatial import router as spatial_router

router = APIRouter()
router.include_router(events_router, prefix="/events", tags=["events"])
router.include_router(feedback_router, prefix="/feedback", tags=["feedback"])
router.include_router(official_notices_router, prefix="/official-notices", tags=["official-notices"])
router.include_router(spatial_router, prefix="/spatial", tags=["spatial"])

__all__ = ["router"]
