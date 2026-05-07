from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.routes.snapshot_contract import (
    compat_snapshot,
    degraded_snapshot,
    exception_blocker,
)

from app.schemas.nestjs_handshake import NestJsHandshakeResponse
from app.services.nestjs_handshake_service import NestJsHandshakeService

router = APIRouter(
    prefix="/nestjs-handshake",
    tags=["nestjs-handshake"],
)


def nestjs_handshake_service_dep() -> NestJsHandshakeService:
    return NestJsHandshakeService()


@router.get("/snapshot", response_model=NestJsHandshakeResponse)
async def get_nestjs_handshake_snapshot(
    service: NestJsHandshakeService = Depends(
        nestjs_handshake_service_dep
    ),
):
    try:
        result = service.build()
    except Exception as exc:
        return degraded_snapshot(
            "nestjs_handshake",
            exception_blocker("nestjs_handshake", exc),
        )

    return compat_snapshot("nestjs_handshake", result)
