from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, Request

from app.core.config import Settings, get_settings
from app.core.constants import REQUEST_ID_HEADER
from app.core.exceptions import InternalAuthError


def get_request_id(
    request: Request,
    x_request_id: Annotated[str | None, Header(alias=REQUEST_ID_HEADER)] = None,
) -> str:
    request_id = x_request_id or getattr(request.state, "request_id", None)
    if not request_id:
        request_id = "req_unknown"
    return request_id


def require_internal_token(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    raw = authorization or ""
    expected = settings.internal_service_token

    if not raw.startswith("Bearer "):
        raise InternalAuthError()

    token = raw.replace("Bearer ", "", 1).strip()

    if token != expected:
        raise InternalAuthError()

    request.state.internal_authenticated = True
    return token
