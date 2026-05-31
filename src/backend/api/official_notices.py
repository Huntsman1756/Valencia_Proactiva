"""Admin API for official complementary notices."""

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import require_admin_token
from models.models import OfficialNotice
from schemas.schemas import OfficialNoticeResponse

router = APIRouter(dependencies=[Depends(require_admin_token)])


def _build_official_notices_query(
    db: Session,
    *,
    source: str | None,
    notice_type: str | None,
):
    query = db.query(OfficialNotice)
    if source:
        query = query.filter(OfficialNotice.source == source)
    if notice_type:
        query = query.filter(OfficialNotice.notice_type == notice_type)
    return query


@router.get("", response_model=List[OfficialNoticeResponse])
async def list_official_notices(
    source: str | None = Query(None, max_length=100),
    notice_type: str | None = Query(None, max_length=50),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List staged official notices for admin/debug workflows."""
    query = _build_official_notices_query(db, source=source, notice_type=notice_type)
    return (
        query.order_by(OfficialNotice.published_at.desc().nullslast(), OfficialNotice.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
