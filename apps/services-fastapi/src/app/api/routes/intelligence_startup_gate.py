from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.intelligence_startup_gate import (
    IntelligenceStartupGateResponse,
)
from app.services.intelligence_startup_gate_service import (
    IntelligenceStartupGateService,
)

router = APIRouter(
    prefix="/intelligence-startup-gate",
    tags=["intelligence-startup-gate"],
)


def intelligence_startup_gate_service_dep() -> IntelligenceStartupGateService:
    return IntelligenceStartupGateService()


@router.get("/snapshot", response_model=IntelligenceStartupGateResponse)
async def get_intelligence_startup_gate_snapshot(
    service: IntelligenceStartupGateService = Depends(
        intelligence_startup_gate_service_dep
    ),
):
    result = service.build()
    return _compat_snapshot("intelligence_startup_gate", result)


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
