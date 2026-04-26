from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import ORJSONResponse

from app.core.deps import require_internal_token
from app.schemas.ai_generation import AIGenerationRequest
from app.schemas.common import SuccessEnvelope
from app.services.ai_generation_service import AIGenerationService
from app.services.nestjs_client import NestJSClient
from app.services.redis_service import RedisService
from app.services.supabase_service import SupabaseService

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/generate")
async def generate_content(
    payload: AIGenerationRequest,
    request: Request,
    _token: str = Depends(require_internal_token),
) -> ORJSONResponse:
    service = AIGenerationService(
        redis=RedisService(),
        supabase=SupabaseService(),
        nestjs=NestJSClient(),
    )
    result = await service.generate(payload)

    envelope = SuccessEnvelope(
        message="AI generation completed",
        data=result,
        request_id=getattr(request.state, "request_id", None),
    )
    return ORJSONResponse(content=envelope.model_dump(mode="json"))
