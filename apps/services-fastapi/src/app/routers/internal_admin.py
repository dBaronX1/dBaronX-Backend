from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import ORJSONResponse

from app.core.deps import require_internal_token
from app.schemas.common import ServiceDependencyHealth, SuccessEnvelope
from app.services.nestjs_client import NestJSClient
from app.services.redis_service import RedisService
from app.services.supabase_service import SupabaseService

router = APIRouter(prefix="/internal-admin", tags=["internal-admin"])


@router.get("/dependencies")
async def dependency_status(
    request: Request,
    _token: str = Depends(require_internal_token),
) -> ORJSONResponse:
    redis = RedisService()
    supabase = SupabaseService()
    nestjs = NestJSClient()

    redis_ok = await redis.ping()
    supabase_health = await supabase.health()
    nestjs_health_raw = await nestjs.health()

    dependencies = {
        "redis": ServiceDependencyHealth(
            ok=redis_ok,
            source="redis",
        ),
        "supabase": supabase_health,
        "nestjs": ServiceDependencyHealth(
            ok=bool(nestjs_health_raw.get("ok")),
            source="nestjs",
            details=nestjs_health_raw,
        ),
    }

    envelope = SuccessEnvelope(
        message="Dependency status collected",
        data=dependencies,
        request_id=getattr(request.state, "request_id", None),
    )
    return ORJSONResponse(content=envelope.model_dump(mode="json"))
