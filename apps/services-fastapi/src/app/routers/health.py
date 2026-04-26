from __future__ import annotations

from logging import getLogger

from fastapi import APIRouter, Depends, Request
from fastapi.responses import ORJSONResponse

from app.core.config import Settings, get_settings
from app.core.responses import ApiSuccessResponse

router = APIRouter(tags=["health"])
logger = getLogger("app.health")


@router.get("/", include_in_schema=False)
async def root(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> ORJSONResponse:
    payload = ApiSuccessResponse(
        message="dBaronX FastAPI is running",
        data={
            "service": settings.app_name,
            "layer": "intelligence",
            "environment": settings.app_env,
            "version": settings.app_version,
        },
        request_id=getattr(request.state, "request_id", None),
    )
    return ORJSONResponse(content=payload.model_dump())


@router.get("/health/live")
async def live(
    request: Request,
) -> ORJSONResponse:
    payload = ApiSuccessResponse(
        message="Service is alive",
        data={"status": "alive"},
        request_id=getattr(request.state, "request_id", None),
    )
    return ORJSONResponse(content=payload.model_dump())


@router.get("/health/ready")
async def ready(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> ORJSONResponse:
    dependencies = {
        "supabase": bool(settings.supabase_url and settings.supabase_service_role_key),
        "nestjs": bool(settings.nestjs_base_url),
        "redis": bool(settings.redis_url),
    }

    ready_status = dependencies["supabase"] and dependencies["nestjs"]

    payload = ApiSuccessResponse(
        message="Service readiness evaluated",
        data={
            "status": "ready" if ready_status else "not_ready",
            "dependencies": dependencies,
        },
        request_id=getattr(request.state, "request_id", None),
    )
    status_code = 200 if ready_status else 503
    return ORJSONResponse(status_code=status_code, content=payload.model_dump())


@router.get("/health")
async def detailed_health(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> ORJSONResponse:
    payload = ApiSuccessResponse(
        message="Detailed health status",
        data={
            "service": settings.app_name,
            "version": settings.app_version,
            "environment": settings.app_env,
            "status": "healthy",
            "dependencies": {
                "supabase_configured": bool(
                    settings.supabase_url and settings.supabase_service_role_key
                ),
                "redis_configured": bool(settings.redis_url),
                "ai_provider_available": settings.has_ai_provider,
                "docs_enabled": settings.app_docs_enabled,
            },
        },
        request_id=getattr(request.state, "request_id", None),
    )
    return ORJSONResponse(content=payload.model_dump())
