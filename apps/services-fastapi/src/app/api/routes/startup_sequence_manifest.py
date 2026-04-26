from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.startup_sequence_manifest import (
    StartupSequenceManifestResponse,
)
from app.services.startup_sequence_manifest_service import (
    StartupSequenceManifestService,
)

router = APIRouter(
    prefix="/startup-sequence-manifest",
    tags=["startup-sequence-manifest"],
)


def startup_sequence_manifest_service_dep() -> StartupSequenceManifestService:
    return StartupSequenceManifestService()


@router.get("/snapshot", response_model=StartupSequenceManifestResponse)
async def get_startup_sequence_manifest_snapshot(
    service: StartupSequenceManifestService = Depends(
        startup_sequence_manifest_service_dep
    ),
):
    result = service.build()
    return StartupSequenceManifestResponse(**result)
