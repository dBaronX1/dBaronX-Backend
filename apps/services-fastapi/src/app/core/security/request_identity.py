from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping


@dataclass(slots=True)
class RequestIdentity:
    request_id: str | None
    caller_service: str | None
    caller_surface: str | None
    actor_id: str | None
    forwarded_for: str | None
    user_agent: str | None
    internal: bool


class RequestIdentityBuilder:
    """
    Canonical request identity extractor for internal intelligence calls.
    """

    def build(self, headers: Mapping[str, str | None], *, internal: bool) -> RequestIdentity:
        normalized = {str(k).lower(): (v.strip() if isinstance(v, str) else None) for k, v in headers.items()}

        return RequestIdentity(
            request_id=normalized.get("x-request-id"),
            caller_service=normalized.get("x-caller-service"),
            caller_surface=normalized.get("x-caller-surface"),
            actor_id=normalized.get("x-actor-id"),
            forwarded_for=normalized.get("x-forwarded-for"),
            user_agent=normalized.get("user-agent"),
            internal=internal,
        )
