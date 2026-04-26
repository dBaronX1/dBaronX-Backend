from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.core.security.request_identity import RequestIdentity


class RequestAuditEnvelopeService:
    """
    Canonical low-bandwidth request envelope builder.

    Used for:
    - NestJS trace persistence
    - ops audit export
    - inter-service observability
    """

    def build(
        self,
        *,
        route_path: str,
        method: str,
        request_identity: RequestIdentity,
        payload_summary: dict[str, Any] | None = None,
        response_summary: dict[str, Any] | None = None,
        tags: list[str] | None = None,
    ) -> dict[str, Any]:
        return {
            "success": True,
            "request_audit_envelope": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "route_path": route_path,
                "method": method.upper(),
                "identity": {
                    "request_id": request_identity.request_id,
                    "caller_service": request_identity.caller_service,
                    "caller_surface": request_identity.caller_surface,
                    "actor_id": request_identity.actor_id,
                    "forwarded_for": request_identity.forwarded_for,
                    "user_agent": request_identity.user_agent,
                    "internal": request_identity.internal,
                },
                "payload_summary": payload_summary or {},
                "response_summary": response_summary or {},
                "tags": tags or [],
            },
        }
