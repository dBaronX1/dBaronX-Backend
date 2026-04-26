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
    return RuntimeSnapshotResponse(**result)
