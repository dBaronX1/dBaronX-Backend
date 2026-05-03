from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.fastapi_step1_closure import FastapiStep1ClosureResponse
from app.services.fastapi_step1_closure_service import (
    FastapiStep1ClosureService,
)

router = APIRouter(
    prefix="/fastapi-step1-closure",
    tags=["fastapi-step1-closure"],
)


def fastapi_step1_closure_service_dep() -> FastapiStep1ClosureService:
    return FastapiStep1ClosureService()


@router.get("/snapshot", response_model=FastapiStep1ClosureResponse)
async def get_fastapi_step1_closure_snapshot(
    service: FastapiStep1ClosureService = Depends(
        fastapi_step1_closure_service_dep
    ),
):
    result = service.build()
    return _compat_snapshot("fastapi_step1_closure", result)


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
