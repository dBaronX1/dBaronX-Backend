from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.fastapi_handoff_pack import FastapiHandoffPackResponse
from app.services.fastapi_handoff_pack_service import FastapiHandoffPackService

router = APIRouter(
    prefix="/fastapi-handoff-pack",
    tags=["fastapi-handoff-pack"],
)


def fastapi_handoff_pack_service_dep() -> FastapiHandoffPackService:
    return FastapiHandoffPackService()


@router.get("/snapshot", response_model=FastapiHandoffPackResponse)
async def get_fastapi_handoff_pack_snapshot(
    service: FastapiHandoffPackService = Depends(
        fastapi_handoff_pack_service_dep
    ),
):
    result = service.build()
    return _compat_snapshot("fastapi_handoff_pack", result)


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
