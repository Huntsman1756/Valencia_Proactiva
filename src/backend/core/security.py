"""Security utilities for V-PRO API."""

from fastapi import Header, HTTPException, status
from core.config import settings


def require_admin_token(x_admin_token: str | None = Header(default=None)):
    """Require valid admin token in X-Admin-Token header."""
    if not settings.ADMIN_TOKEN or x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token",
        )
