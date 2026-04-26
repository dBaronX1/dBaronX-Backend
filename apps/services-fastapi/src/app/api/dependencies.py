from __future__ import annotations

from app.services.affiliate_risk_service import AffiliateRiskService
from app.services.captcha_service import CaptchaService
from app.services.checkout_risk_service import CheckoutRiskService
from app.services.internal_admin_service import InternalAdminService
from app.services.service_registry import (
    get_affiliate_risk_service,
    get_captcha_service,
    get_checkout_risk_service,
    get_internal_admin_service,
    get_story_generation_service,
    get_watch_risk_service,
)
from app.services.story_generation_service import StoryGenerationService
from app.services.watch_risk_service import WatchRiskService


def checkout_risk_service_dep() -> CheckoutRiskService:
    return get_checkout_risk_service()


def affiliate_risk_service_dep() -> AffiliateRiskService:
    return get_affiliate_risk_service()


def watch_risk_service_dep() -> WatchRiskService:
    return get_watch_risk_service()


def captcha_service_dep() -> CaptchaService:
    return get_captcha_service()


def story_generation_service_dep() -> StoryGenerationService:
    return get_story_generation_service()


def internal_admin_service_dep() -> InternalAdminService:
    return get_internal_admin_service()
