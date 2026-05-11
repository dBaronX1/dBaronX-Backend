from __future__ import annotations

from typing import Any

from app.core.config import get_settings


class FirstSaleRiskPolicyService:
    """Lightweight first-sale security ladder policy.

    This policy documents and exposes the currently enforceable controls without
    pretending that phase-two passkey/TOTP step-up is implemented. Buyer checkout
    remains mobile-friendly unless CAPTCHA_REQUIRED_FOR_CHECKOUT is explicitly
    enabled.
    """

    def __init__(self) -> None:
        self.settings = get_settings()

    def policy(self) -> dict[str, dict[str, Any]]:
        checkout_captcha_required = bool(self.settings.captcha_required_for_checkout)
        watch_captcha_required = bool(self.settings.captcha_required_for_watch_reward)
        return {
            "buyer_first_checkout": {
                "risk_level": "low",
                "captcha": "required" if checkout_captcha_required else "optional",
                "blocks_first_sale_without_captcha": checkout_captcha_required,
                "mfa_step_up": "not_required_for_buyer_first_sale",
            },
            "guest_checkout": {
                "risk_level": "low",
                "captcha": "recommended",
                "mfa_step_up": "not_required_for_buyer_first_sale",
            },
            "admin_action": {
                "risk_level": "high",
                "admin_or_internal_auth_required": True,
                "mfa_step_up": "phase_two_required_when_implemented_and_configured",
            },
            "payout": {"risk_level": "high", "mfa_step_up": "phase_two_required"},
            "wallet_change": {"risk_level": "high", "mfa_step_up": "phase_two_required"},
            "supplier_admin": {"risk_level": "high", "mfa_step_up": "phase_two_required"},
            "advertiser_funding": {"risk_level": "high", "mfa_step_up": "phase_two_required"},
            "watch_reward": {
                "risk_level": "medium",
                "captcha": "required" if watch_captcha_required else "recommended",
            },
        }
