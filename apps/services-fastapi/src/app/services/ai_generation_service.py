from __future__ import annotations

from app.schemas.ai_generation import AIGenerationRequest, AIGenerationResult
from app.schemas.risk import AiGenerationRiskRequest
from app.services.ai_provider_router import AIProviderRouter
from app.services.nestjs_client import NestJSClient
from app.services.redis_service import RedisService
from app.services.risk_engine import RiskEngine
from app.services.supabase_service import SupabaseService
from app.services.trust_signal_service import TrustSignalService


class AIGenerationService:
    def __init__(
        self,
        *,
        redis: RedisService,
        supabase: SupabaseService,
        nestjs: NestJSClient,
    ) -> None:
        self.redis = redis
        self.supabase = supabase
        self.nestjs = nestjs
        self.provider_router = AIProviderRouter()
        self.risk_engine = RiskEngine(
            redis=redis,
            supabase=supabase,
            trust_signals=TrustSignalService(supabase),
        )

    async def generate(self, payload: AIGenerationRequest) -> AIGenerationResult:
        risk = await self.risk_engine.assess(
            AiGenerationRiskRequest(
                user_id=payload.user_id,
                ip=payload.ip,
                user_agent=payload.user_agent,
                request_id=payload.request_id,
                fingerprint=payload.fingerprint,
                session_id=payload.session_id,
                prompt=payload.prompt,
                provider_preference=payload.preferred_provider,
                metadata={
                    **payload.metadata,
                    "task": payload.task,
                    "language": payload.language,
                    "genre": payload.genre,
                    "tone": payload.tone,
                },
            )
        )

        if not risk.allowed and risk.decision == "block":
            result = AIGenerationResult(
                ok=False,
                task=payload.task,
                provider=payload.preferred_provider or "anthropic",
                fallback_used=False,
                title=payload.title,
                content="",
                moderation_flags=["blocked_by_risk_engine"],
                metadata={
                    "risk_score": risk.score,
                    "risk_level": risk.level,
                    "reason": risk.reason,
                },
            )
            await self.nestjs.notify_ai_generation_result(
                {
                    "userId": payload.user_id,
                    "requestId": payload.request_id,
                    "task": payload.task,
                    "ok": False,
                    "provider": result.provider,
                    "metadata": result.metadata,
                }
            )
            return result

        last_error: str | None = None
        providers = self.provider_router.resolve_order(payload)

        for index, provider in enumerate(providers):
            try:
                result = await provider.generate(payload)
                if index > 0:
                    result.fallback_used = True
                result.metadata.update(
                    {
                        "risk_score": risk.score,
                        "risk_level": risk.level,
                        "risk_decision": risk.decision,
                    }
                )

                await self.nestjs.notify_ai_generation_result(
                    {
                        "userId": payload.user_id,
                        "requestId": payload.request_id,
                        "task": payload.task,
                        "ok": result.ok,
                        "provider": result.provider,
                        "fallbackUsed": result.fallback_used,
                        "title": result.title,
                        "excerpt": result.excerpt,
                        "tags": result.tags,
                        "usage": result.usage.model_dump(mode="json"),
                        "metadata": result.metadata,
                    }
                )
                return result
            except Exception as exc:
                last_error = str(exc)

        return AIGenerationResult(
            ok=False,
            task=payload.task,
            provider=payload.preferred_provider or "anthropic",
            fallback_used=True,
            title=payload.title,
            content="",
            moderation_flags=["provider_chain_failed"],
            metadata={
                "error": last_error or "All providers failed",
            },
        )
