from __future__ import annotations

import time

from fastapi import APIRouter, Depends

from app.core.dependencies import get_redis_service, get_settings, get_supabase_service
from app.core.logging import get_logger
from app.schemas.common import HealthDependencyState
from app.services.redis_service import RedisService
from app.services.supabase_service import SupabaseService

router = APIRouter()
logger = get_logger("app.routes.health")


@router.get("/health")
async def health_overview(
    supabase: SupabaseService = Depends(get_supabase_service),
    redis: RedisService = Depends(get_redis_service),
) -> dict:
    started = time.perf_counter()

    supabase_started = time.perf_counter()
    supabase_ok = await supabase.healthcheck()
    supabase_latency = (time.perf_counter() - supabase_started) * 1000

    redis_started = time.perf_counter()
    redis_ok = await redis.healthcheck()
    redis_latency = (time.perf_counter() - redis_started) * 1000

    dependencies = {
        "supabase": HealthDependencyState(
            ok=supabase_ok,
            source="supabase",
            latency_ms=round(supabase_latency, 2),
        ).model_dump(),
        "redis": HealthDependencyState(
            ok=redis_ok,
            source="redis",
            latency_ms=round(redis_latency, 2),
        ).model_dump(),
    }

    all_ok = all(item["ok"] for item in dependencies.values())
    total_latency_ms = (time.perf_counter() - started) * 1000

    return {
        "success": all_ok,
        "service": "dbaronx-fastapi",
        "status": "healthy" if all_ok else "degraded",
        "dependencies": dependencies,
        "latency_ms": round(total_latency_ms, 2),
    }


@router.get("/health/live")
async def health_live() -> dict:
    return {
        "success": True,
        "service": "dbaronx-fastapi",
        "status": "alive",
    }


@router.get("/health/ready")
async def health_ready(
    supabase: SupabaseService = Depends(get_supabase_service),
    redis: RedisService = Depends(get_redis_service),
) -> dict:
    supabase_ok = await supabase.healthcheck()
    redis_ok = await redis.healthcheck()
    ready = supabase_ok and redis_ok

    return {
        "success": ready,
        "service": "dbaronx-fastapi",
        "status": "ready" if ready else "not_ready",
        "dependencies": {
            "supabase": supabase_ok,
            "redis": redis_ok,
        },
    }


@router.get("/meta")
async def service_meta() -> dict:
    settings = get_settings()
    return {
        "success": True,
        "service": "dbaronx-fastapi",
        "environment": settings.environment,
        "version": settings.app_version,
        "debug": settings.debug,
    }
