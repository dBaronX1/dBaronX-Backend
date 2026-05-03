from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.runtime_snapshot import RuntimeSnapshotResponse
from app.services.runtime_snapshot_service import RuntimeSnapshotService

router = APIRouter(
    prefix="/runtime-snapshot",
    tags=["runtime-snapshot"],
)


def runtime_snapshot_service_dep() -> RuntimeSnapshotService:
    return RuntimeSnapshotService()


@router.get("/snapshot", response_model=RuntimeSnapshotResponse)
async def get_runtime_snapshot(
    service: RuntimeSnapshotService = Depends(runtime_snapshot_service_dep),
):
    result = service.build()
    return _compat_snapshot("runtime_snapshot", result)


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
