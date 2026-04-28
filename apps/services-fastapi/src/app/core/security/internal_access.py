from __future__ import annotations

import hmac
from dataclasses import dataclass
from typing import Mapping


@dataclass(slots=True)
class InternalAccessResult:
    authorized: bool
    reason: str | None
    caller_service: str | None
    caller_surface: str | None
    actor_id: str | None


class InternalAccessValidator:
    """
    Canonical internal access validator for FastAPI intelligence surfaces.

    Rules:
    - internal callers must provide an internal token (x-internal-token preferred)
    - token compare must be constant-time
    - caller metadata should be normalized but optional
    """

    def __init__(self, *, expected_token: str | None) -> None:
        self.expected_token = (expected_token or "").strip()

    def validate(self, headers: Mapping[str, str | None]) -> InternalAccessResult:
        normalized = {str(k).lower(): (v.strip() if isinstance(v, str) else None) for k, v in headers.items()}

        provided, token_source = self._resolve_provided_token(normalized)
        caller_service = (
            normalized.get("x-caller-service")
            or normalized.get("x-service-name")
            or normalized.get("x-service")
            or normalized.get("x-internal-service")
        )
        caller_surface = normalized.get("x-caller-surface") or normalized.get("x-surface")
        actor_id = normalized.get("x-actor-id")

        if not self.expected_token:
            return InternalAccessResult(
                authorized=False,
                reason="internal token not configured",
                caller_service=caller_service,
                caller_surface=caller_surface,
                actor_id=actor_id,
            )

        if not provided:
            return InternalAccessResult(
                authorized=False,
                reason="missing internal token",
                caller_service=caller_service,
                caller_surface=caller_surface,
                actor_id=actor_id,
            )

        if not hmac.compare_digest(provided, self.expected_token):
            return InternalAccessResult(
                authorized=False,
                reason=f"invalid internal token ({token_source})",
                caller_service=caller_service,
                caller_surface=caller_surface,
                actor_id=actor_id,
            )

        return InternalAccessResult(
            authorized=True,
            reason=None,
            caller_service=caller_service,
            caller_surface=caller_surface,
            actor_id=actor_id,
        )

    def _resolve_provided_token(self, headers: Mapping[str, str | None]) -> tuple[str | None, str]:
        canonical = headers.get("x-internal-token")
        if canonical:
            return canonical, "x-internal-token"

        service_token = headers.get("x-service-token")
        if service_token:
            return service_token, "x-service-token"

        api_key = headers.get("x-api-key")
        if api_key:
            return api_key, "x-api-key"

        authorization = headers.get("authorization")
        if authorization:
            if authorization.lower().startswith("bearer "):
                bearer = authorization[7:].strip()
                if bearer:
                    return bearer, "authorization"
            return authorization, "authorization"

        return None, "none"
