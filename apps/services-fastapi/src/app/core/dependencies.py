from __future__ import annotations

from functools import lru_cache

from app.core.config import Settings, get_settings
from app.services.ai_generation_service import AIGenerationService
from app.services.ai_provider_service import AIProviderService
from app.services.captcha_service import CaptchaService
from app.services.internal_admin_service import InternalAdminService
from app.services.moderation_service import ModerationService
from app.services.redis_service import RedisService
from app.services.risk_service import RiskService
from app.services.supabase_service import SupabaseService


@lru_cache(maxsize=1)
def _get_redis_singleton() -> RedisService:
    return RedisService()


@lru_cache(maxsize=1)
def _get_supabase_singleton() -> SupabaseService:
    return SupabaseService()


@lru_cache(maxsize=1)
def _get_moderation_singleton() -> ModerationService:
    return ModerationService()


@lru_cache(maxsize=1)
def _get_ai_provider_singleton() -> AIProviderService:
    return AIProviderService()


@lru_cache(maxsize=1)
def _get_ai_generation_singleton() -> AIGenerationService:
    return AIGenerationService(
        provider_service=_get_ai_provider_singleton(),
        moderation_service=_get_moderation_singleton(),
        supabase_service=_get_supabase_singleton(),
    )


@lru_cache(maxsize=1)
def _get_risk_singleton() -> RiskService:
    return RiskService(
        redis=_get_redis_singleton(),
        supabase=_get_supabase_singleton(),
    )


@lru_cache(maxsize=1)
def _get_internal_admin_singleton() -> InternalAdminService:
    return InternalAdminService(
        redis=_get_redis_singleton(),
        supabase=_get_supabase_singleton(),
    )


def get_redis_service() -> RedisService:
    return _get_redis_singleton()


def get_supabase_service() -> SupabaseService:
    return _get_supabase_singleton()


def get_captcha_service() -> CaptchaService:
    return CaptchaService()


def get_risk_service() -> RiskService:
    return _get_risk_singleton()


def get_ai_generation_service() -> AIGenerationService:
    return _get_ai_generation_singleton()


def get_internal_admin_service() -> InternalAdminService:
    return _get_internal_admin_singleton()


def get_settings_dependency() -> Settings:
    return get_settings()
