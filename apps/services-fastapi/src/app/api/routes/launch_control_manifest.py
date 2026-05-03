from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.launch_control_manifest import (
    LaunchControlManifestResponse,
)
from app.services.launch_control_manifest_service import (
    LaunchControlManifestService,
)

router = APIRouter(
    prefix="/launch-control-manifest",
    tags=["launch-control-manifest"],
)


def launch_control_manifest_service_dep() -> LaunchControlManifestService:
    return LaunchControlManifestService()


@router.get("/snapshot", response_model=LaunchControlManifestResponse)
async def get_launch_control_manifest_snapshot(
    service: LaunchControlManifestService = Depends(
        launch_control_manifest_service_dep
    ),
):
    result = service.build()
    return _compat_snapshot("launch_control_manifest", result)


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
