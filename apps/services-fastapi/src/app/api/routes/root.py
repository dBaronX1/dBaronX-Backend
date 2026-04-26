from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["system"])


@router.get(
    "/",
    summary="FastAPI intelligence layer root",
)
async def root() -> dict:
    settings = get_settings()
    return {
        "success": True,
        "service": settings.app_name,
        "layer": "intelligence",
        "environment": settings.environment,
        "version": "1.0.0",
        "timestamp": datetime.now(UTC).isoformat(),
        "features": {
            "risk_scoring": True,
            "captcha": True,
            "ai_generation": True,
            "internal_admin": True,
        },
    }
