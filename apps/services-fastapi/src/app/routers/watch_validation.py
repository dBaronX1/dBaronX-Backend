from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import ORJSONResponse

from app.core.deps import require_internal_token
from app.schemas.common import SuccessEnvelope
from app.schemas.telemetry import WatchValidationRequest
from app.services.nestjs_client import NestJSClient
from app.services.redis_service import RedisService
from app.services.supabase_service import SupabaseService
from app.services.watch_validation_service import WatchValidationService

router = APIRouter(prefix="/watch-validation", tags=["watch-validation"])


@router.post("/validate")
async def validate_watch_session(
    payload: WatchValidationRequest,
    request: Request,
    _token: str = Depends(require_internal_token),
) -> ORJSONResponse:
    service = WatchValidationService(
        redis=RedisService(),
        supabase=SupabaseService(),
        nestjs=NestJSClient(),
    )
    result = await service.validate(payload)

    envelope = SuccessEnvelope(
        message="Watch validation completed",
        data=result,
        request_id=getattr(request.state, "request_id", None),
    )
    return ORJSONResponse(content=envelope.model_dump(mode="json"))
