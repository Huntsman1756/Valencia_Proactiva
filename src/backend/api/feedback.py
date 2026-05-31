"""Citizen feedback API."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core.database import get_db
from core.rate_limit import limiter
from models.models import Feedback, MitigationAction
from schemas.schemas import FeedbackCreate, FeedbackResponse

router = APIRouter()


@router.post("", response_model=FeedbackResponse, status_code=201)
@limiter.limit("30/minute")
async def submit_feedback(
    request: Request,
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
):
    """Persist one anonymous vote per session token and mitigation action."""
    action = db.query(MitigationAction).filter(MitigationAction.id == payload.mitigation_action_id).first()
    if action is None:
        raise HTTPException(status_code=404, detail="Mitigation action not found")

    existing = db.query(Feedback).filter_by(
        mitigation_action_id=payload.mitigation_action_id,
        session_token=payload.session_token,
    ).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Already voted")

    feedback = Feedback(**payload.model_dump())
    db.add(feedback)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Already voted") from exc

    db.refresh(feedback)
    return feedback
