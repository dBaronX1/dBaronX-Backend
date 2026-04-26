from __future__ import annotations

from fastapi import APIRouter, Depends

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
    result = service.build()
    return NestJsHandshakeResponse(**result)
