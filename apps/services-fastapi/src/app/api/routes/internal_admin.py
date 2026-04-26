from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.api.dependencies import internal_admin_service_dep
from app.core.config import get_settings
from app.schemas.internal_admin import CacheDeleteRequest, RiskEventListRequest, ServiceHealthResponse
from app.services.internal_admin_service import InternalAdminService

router = APIRouter(prefix="/internal", tags=["internal-admin"])


def _assert_internal_token(x_internal_token: str | None) -> None:
    settings = get_settings()
    expected = settings.internal_service_token.strip()

    if not expected:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal token not configured",
        )

    if not x_internal_token or x_internal_token != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal token",
        )


@router.get(
    "/health",
    response_model=ServiceHealthResponse,
    summary="Internal service health and dependency state",
)
async def internal_health(
    x_internal_token: str | None = Header(default=None),
    service: InternalAdminService = Depends(internal_admin_service_dep),
) -> ServiceHealthResponse:
    _assert_internal_token(x_internal_token)
    return await service.health()


@router.post(
    "/cache/delete",
    summary="Delete a specific Redis-backed key",
)
async def delete_cache_key(
    payload: CacheDeleteRequest,
    x_internal_token: str | None = Header(default=None),
    service: InternalAdminService = Depends(internal_admin_service_dep),
) -> dict:
    _assert_internal_token(x_internal_token)
    return await service.delete_cache_key(payload.key)


@router.post(
    "/risk/events",
    summary="List recent canonical risk events for ops and audit review",
)
async def list_risk_events(
    payload: RiskEventListRequest,
    x_internal_token: str | None = Header(default=None),
    service: InternalAdminService = Depends(internal_admin_service_dep),
) -> dict:
    _assert_internal_token(x_internal_token)
    return await service.get_risk_events(
        event_type=payload.event_type,
        decision=payload.decision,
        user_id=payload.user_id,
        limit=payload.limit,
    )
