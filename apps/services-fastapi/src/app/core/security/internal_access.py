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
    - internal callers must provide x-internal-token
    - token compare must be constant-time
    - caller metadata should be normalized but optional
    """

    def __init__(self, *, expected_token: str | None) -> None:
        self.expected_token = (expected_token or "").strip()

    def validate(self, headers: Mapping[str, str | None]) -> InternalAccessResult:
        normalized = {str(k).lower(): (v.strip() if isinstance(v, str) else None) for k, v in headers.items()}

        provided = normalized.get("x-internal-token")
        caller_service = normalized.get("x-caller-service")
        caller_surface = normalized.get("x-caller-surface")
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
                reason="invalid internal token",
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
