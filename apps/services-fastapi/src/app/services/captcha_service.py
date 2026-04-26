from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("app.captcha_service")


class CaptchaService:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def verify_token(
        self,
        *,
        token: str,
        action: str | None,
        ip: str | None,
    ) -> dict[str, Any]:
        provider = self.settings.captcha_provider.lower()

        if provider == "turnstile":
            return await self._verify_turnstile(token=token, action=action, ip=ip)

        if provider == "disabled":
            return {
                "success": True,
                "verified": True,
                "provider": "disabled",
                "score": 1.0,
                "reasons": [],
            }

        return {
            "success": False,
            "verified": False,
            "provider": provider,
            "score": 0.0,
            "reasons": ["unsupported_captcha_provider"],
        }

    async def _verify_turnstile(
        self,
        *,
        token: str,
        action: str | None,
        ip: str | None,
    ) -> dict[str, Any]:
        if not self.settings.turnstile_secret_key:
            logger.warning("Turnstile secret key missing")
            return {
                "success": False,
                "verified": False,
                "provider": "turnstile",
                "score": 0.0,
                "reasons": ["turnstile_secret_missing"],
            }

        payload = {
            "secret": self.settings.turnstile_secret_key,
            "response": token,
        }

        if ip:
            payload["remoteip"] = ip

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data=payload,
            )
            data = response.json()

        success = bool(data.get("success"))
        reasons = list(data.get("error-codes", []))

        if action and data.get("action") and data.get("action") != action:
            success = False
            reasons.append("action_mismatch")

        return {
            "success": success,
            "verified": success,
            "provider": "turnstile",
            "score": 1.0 if success else 0.0,
            "reasons": reasons,
        }
