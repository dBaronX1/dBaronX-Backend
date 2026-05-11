from __future__ import annotations

from typing import Any

import httpx
from app.core.config import get_settings
from app.core.logging import get_logger
from app.schemas.captcha import CaptchaVerifyRequest, CaptchaVerifyResponse

logger = get_logger("app.captcha_service")


class CaptchaService:
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        # Service registry still injects shared services in some code paths; keep
        # those arguments accepted for backward compatibility while CAPTCHA
        # verification remains provider/API based.
        self.settings = get_settings()

    async def verify(self, payload: CaptchaVerifyRequest) -> CaptchaVerifyResponse:
        result = await self.verify_token(
            token=payload.token,
            action=payload.action,
            ip=payload.ip,
            risk_level=payload.risk_level,
        )
        return CaptchaVerifyResponse(**result)

    async def verify_token(
        self,
        *,
        token: str,
        action: str | None,
        ip: str | None,
        risk_level: str | None = None,
    ) -> dict[str, Any]:
        normalized_action = (action or "captcha_verify").strip().lower()
        normalized_risk_level = (risk_level or self._risk_level_for_action(normalized_action)).strip().lower()
        attempted: list[str] = []
        reasons: list[str] = []

        for provider in self._provider_order():
            attempted.append(provider)
            result = await self._verify_with_provider(
                provider=provider,
                token=token,
                action=normalized_action,
                ip=ip,
                risk_level=normalized_risk_level,
            )
            provider_reasons = list(result.get("reasons", []))
            if result.get("success"):
                return result
            reasons.extend(f"{provider}:{reason}" for reason in provider_reasons or ["verification_failed"])

            # A missing primary secret is a configuration issue where fallback is
            # useful. A rejected token normally belongs to a specific widget, but
            # trying the configured fallback still keeps the env-driven contract
            # deterministic without forcing both providers for normal actions.
            if normalized_risk_level == "high" and provider_reasons and "action_mismatch" in provider_reasons:
                break

        failure_reason = ";".join(reasons) if reasons else "captcha_provider_not_configured"
        return self._result(
            provider=attempted[0] if attempted else "none",
            passed=False,
            action=normalized_action,
            risk_level=normalized_risk_level,
            reasons=reasons or [failure_reason],
            failure_reason=failure_reason,
            attempted_providers=attempted,
        )

    def _provider_order(self) -> list[str]:
        providers: list[str] = []
        for provider in [self.settings.captcha_primary, self.settings.captcha_fallback]:
            normalized = (provider or "").strip().lower()
            if normalized and normalized not in providers:
                providers.append(normalized)
        return providers

    async def _verify_with_provider(
        self,
        *,
        provider: str,
        token: str,
        action: str,
        ip: str | None,
        risk_level: str,
    ) -> dict[str, Any]:
        if provider == "disabled":
            return self._result(
                provider="disabled",
                passed=True,
                action=action,
                risk_level=risk_level,
                reasons=[],
                failure_reason=None,
            )
        if provider == "hcaptcha":
            return await self._verify_hcaptcha(token=token, action=action, ip=ip, risk_level=risk_level)
        if provider == "turnstile":
            return await self._verify_turnstile(token=token, action=action, ip=ip, risk_level=risk_level)
        return self._result(
            provider=provider,
            passed=False,
            action=action,
            risk_level=risk_level,
            reasons=["unsupported_captcha_provider"],
            failure_reason="unsupported_captcha_provider",
        )

    async def _verify_hcaptcha(
        self,
        *,
        token: str,
        action: str,
        ip: str | None,
        risk_level: str,
    ) -> dict[str, Any]:
        if not self.settings.hcaptcha_secret:
            logger.warning("hCaptcha secret missing; provider cannot verify token")
            return self._result(
                provider="hcaptcha",
                passed=False,
                action=action,
                risk_level=risk_level,
                reasons=["hcaptcha_secret_missing"],
                failure_reason="hcaptcha_secret_missing",
            )

        payload = {"secret": self.settings.hcaptcha_secret, "response": token}
        if ip:
            payload["remoteip"] = ip

        try:
            async with httpx.AsyncClient(timeout=self.settings.captcha_verify_timeout_seconds) as client:
                response = await client.post("https://api.hcaptcha.com/siteverify", data=payload)
                response.raise_for_status()
                data = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("hCaptcha verification request failed: %s", exc.__class__.__name__)
            return self._result(
                provider="hcaptcha",
                passed=False,
                action=action,
                risk_level=risk_level,
                reasons=["hcaptcha_verification_unavailable"],
                failure_reason="hcaptcha_verification_unavailable",
            )

        success = bool(data.get("success"))
        reasons = [str(item) for item in data.get("error-codes", [])]
        return self._result(
            provider="hcaptcha",
            passed=success,
            action=action,
            risk_level=risk_level,
            reasons=reasons,
            failure_reason=None if success else (";".join(reasons) or "hcaptcha_rejected"),
        )

    async def _verify_turnstile(
        self,
        *,
        token: str,
        action: str,
        ip: str | None,
        risk_level: str,
    ) -> dict[str, Any]:
        if not self.settings.effective_turnstile_secret_key:
            logger.warning("Turnstile secret key missing; provider cannot verify token")
            return self._result(
                provider="turnstile",
                passed=False,
                action=action,
                risk_level=risk_level,
                reasons=["turnstile_secret_missing"],
                failure_reason="turnstile_secret_missing",
            )

        payload = {"secret": self.settings.effective_turnstile_secret_key, "response": token}
        if ip:
            payload["remoteip"] = ip

        try:
            async with httpx.AsyncClient(timeout=self.settings.captcha_verify_timeout_seconds) as client:
                response = await client.post(
                    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                    data=payload,
                )
                response.raise_for_status()
                data = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Turnstile verification request failed: %s", exc.__class__.__name__)
            return self._result(
                provider="turnstile",
                passed=False,
                action=action,
                risk_level=risk_level,
                reasons=["turnstile_verification_unavailable"],
                failure_reason="turnstile_verification_unavailable",
            )

        success = bool(data.get("success"))
        reasons = [str(item) for item in data.get("error-codes", [])]
        if action and data.get("action") and str(data.get("action")).lower() != action:
            success = False
            reasons.append("action_mismatch")

        return self._result(
            provider="turnstile",
            passed=success,
            action=action,
            risk_level=risk_level,
            reasons=reasons,
            failure_reason=None if success else (";".join(reasons) or "turnstile_rejected"),
        )

    def _risk_level_for_action(self, action: str) -> str:
        action_key = action.strip().lower()
        if action_key in {"watch_reward", "watch_completion", "ad_confirmation"}:
            return "medium"
        if action_key in {"admin_action", "payout", "wallet_change", "supplier_admin", "advertiser_funding"}:
            return "high"
        return "low"

    def _result(
        self,
        *,
        provider: str,
        passed: bool,
        action: str,
        risk_level: str,
        reasons: list[str],
        failure_reason: str | None,
        attempted_providers: list[str] | None = None,
    ) -> dict[str, Any]:
        return {
            "success": passed,
            "verified": passed,
            "passed": passed,
            "provider": provider,
            "score": 1.0 if passed else 0.0,
            "action": action,
            "risk_level": risk_level,
            "failure_reason": failure_reason,
            "reasons": reasons,
            "attempted_providers": attempted_providers or [provider],
        }
