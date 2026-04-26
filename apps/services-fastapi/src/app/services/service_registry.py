from __future__ import annotations

from functools import lru_cache

from app.services.ai_provider_service import AIProviderService
from app.services.affiliate_risk_service import AffiliateRiskService
from app.services.captcha_service import CaptchaService
from app.services.checkout_risk_service import CheckoutRiskService
from app.services.idempotency_service import IdempotencyService
from app.services.internal_admin_service import InternalAdminService
from app.services.moderation_service import ModerationService
from app.services.rate_limit_service import RateLimitService
from app.services.redis_service import RedisService
from app.services.risk_scoring_service import RiskScoringService
from app.services.risk_signal_service import RiskSignalService
from app.services.story_generation_service import StoryGenerationService
from app.services.supabase_service import SupabaseService
from app.services.watch_risk_service import WatchRiskService


@lru_cache(maxsize=1)
def get_redis_service() -> RedisService:
    return RedisService()


@lru_cache(maxsize=1)
def get_supabase_service() -> SupabaseService:
    return SupabaseService()


@lru_cache(maxsize=1)
def get_idempotency_service() -> IdempotencyService:
    return IdempotencyService(redis=get_redis_service())


@lru_cache(maxsize=1)
def get_rate_limit_service() -> RateLimitService:
    return RateLimitService(redis=get_redis_service())


@lru_cache(maxsize=1)
def get_risk_signal_service() -> RiskSignalService:
    return RiskSignalService()


@lru_cache(maxsize=1)
def get_risk_scoring_service() -> RiskScoringService:
    return RiskScoringService()


@lru_cache(maxsize=1)
def get_checkout_risk_service() -> CheckoutRiskService:
    return CheckoutRiskService(
        idempotency=get_idempotency_service(),
        rate_limit=get_rate_limit_service(),
        signal_service=get_risk_signal_service(),
        scoring=get_risk_scoring_service(),
        supabase=get_supabase_service(),
    )


@lru_cache(maxsize=1)
def get_affiliate_risk_service() -> AffiliateRiskService:
    return AffiliateRiskService(
        idempotency=get_idempotency_service(),
        rate_limit=get_rate_limit_service(),
        signal_service=get_risk_signal_service(),
        scoring=get_risk_scoring_service(),
        supabase=get_supabase_service(),
    )


@lru_cache(maxsize=1)
def get_watch_risk_service() -> WatchRiskService:
    return WatchRiskService(
        idempotency=get_idempotency_service(),
        rate_limit=get_rate_limit_service(),
        signal_service=get_risk_signal_service(),
        scoring=get_risk_scoring_service(),
        supabase=get_supabase_service(),
    )


@lru_cache(maxsize=1)
def get_captcha_service() -> CaptchaService:
    return CaptchaService(
        rate_limit=get_rate_limit_service(),
        signal_service=get_risk_signal_service(),
        supabase=get_supabase_service(),
    )


@lru_cache(maxsize=1)
def get_ai_provider_service() -> AIProviderService:
    return AIProviderService()


@lru_cache(maxsize=1)
def get_moderation_service() -> ModerationService:
    return ModerationService()


@lru_cache(maxsize=1)
def get_story_generation_service() -> StoryGenerationService:
    return StoryGenerationService(
        provider_service=get_ai_provider_service(),
        moderation_service=get_moderation_service(),
        idempotency_service=get_idempotency_service(),
        supabase=get_supabase_service(),
    )


@lru_cache(maxsize=1)
def get_internal_admin_service() -> InternalAdminService:
    return InternalAdminService(
        redis=get_redis_service(),
        supabase=get_supabase_service(),
    )
