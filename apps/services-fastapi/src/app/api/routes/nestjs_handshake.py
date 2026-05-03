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
    return _compat_snapshot("nestjs_handshake", result)


def _compat_snapshot(service_name: str, payload: dict) -> dict:
    data = payload.get(service_name, {}) if isinstance(payload.get(service_name), dict) else {}
    status = data.get("status", "ok")
    ready = bool(data.get("ready", True))
    blockers = data.get("blockers", [])
    capabilities = data.get("capabilities", [])
    timestamp = data.get("timestamp") or payload.get("timestamp")
    return {
        "success": bool(payload.get("success", True)),
        "service": service_name,
        "status": status,
        "ready": ready,
        "timestamp": timestamp,
        "blockers": blockers,
        "capabilities": capabilities,
        service_name: data,
    }
