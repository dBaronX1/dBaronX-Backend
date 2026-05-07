from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.routes.snapshot_contract import (
    compat_snapshot,
    degraded_snapshot,
    exception_blocker,
)

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
    try:
        result = service.build()
    except Exception as exc:
        return degraded_snapshot(
            "runtime_snapshot",
            exception_blocker("runtime_snapshot", exc),
        )

    return compat_snapshot("runtime_snapshot", result)
