from __future__ import annotations

from fastapi import Depends, Header, HTTPException, Request, status

from app.core.security.internal_access import InternalAccessValidator
from app.core.security.request_identity import RequestIdentity, RequestIdentityBuilder
from app.core.config import get_settings


def require_internal_access(
    request: Request,
    x_internal_token: str | None = Header(default=None),
    x_caller_service: str | None = Header(default=None),
    x_caller_surface: str | None = Header(default=None),
    x_actor_id: str | None = Header(default=None),
    x_request_id: str | None = Header(default=None),
    x_forwarded_for: str | None = Header(default=None),
    user_agent: str | None = Header(default=None),
) -> RequestIdentity:
    settings = get_settings()

    validator = InternalAccessValidator(
        expected_token=getattr(settings, "INTERNAL_SERVICE_TOKEN", None),
    )

    result = validator.validate(
        {
            "x-internal-token": x_internal_token,
            "x-caller-service": x_caller_service,
            "x-caller-surface": x_caller_surface,
            "x-actor-id": x_actor_id,
            "x-request-id": x_request_id,
            "x-forwarded-for": x_forwarded_for,
            "user-agent": user_agent,
        }
    )

    if not result.authorized:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "message": result.reason or "unauthorized internal access",
            },
        )

    identity = RequestIdentityBuilder().build(
        {
            "x-request-id": x_request_id,
            "x-caller-service": x_caller_service,
            "x-caller-surface": x_caller_surface,
            "x-actor-id": x_actor_id,
            "x-forwarded-for": x_forwarded_for,
            "user-agent": user_agent,
        },
        internal=True,
    )

    request.state.request_identity = identity
    return identity


def optional_internal_access(
    request: Request,
    x_internal_token: str | None = Header(default=None),
    x_caller_service: str | None = Header(default=None),
    x_caller_surface: str | None = Header(default=None),
    x_actor_id: str | None = Header(default=None),
    x_request_id: str | None = Header(default=None),
    x_forwarded_for: str | None = Header(default=None),
    user_agent: str | None = Header(default=None),
) -> RequestIdentity:
    settings = get_settings()

    validator = InternalAccessValidator(
        expected_token=getattr(settings, "INTERNAL_SERVICE_TOKEN", None),
    )

    result = validator.validate(
        {
            "x-internal-token": x_internal_token,
            "x-caller-service": x_caller_service,
            "x-caller-surface": x_caller_surface,
            "x-actor-id": x_actor_id,
            "x-request-id": x_request_id,
            "x-forwarded-for": x_forwarded_for,
            "user-agent": user_agent,
        }
    )

    identity = RequestIdentityBuilder().build(
        {
            "x-request-id": x_request_id,
            "x-caller-service": x_caller_service,
            "x-caller-surface": x_caller_surface,
            "x-actor-id": x_actor_id,
            "x-forwarded-for": x_forwarded_for,
            "user-agent": user_agent,
        },
        internal=result.authorized,
    )
    request.state.request_identity = identity
    return identity
