from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.public_runtime_summary import PublicRuntimeSummaryResponse
from app.services.public_runtime_summary_service import (
    PublicRuntimeSummaryService,
)

router = APIRouter(
    prefix="/public-runtime-summary",
    tags=["public-runtime-summary"],
)


def public_runtime_summary_service_dep() -> PublicRuntimeSummaryService:
    return PublicRuntimeSummaryService()


@router.get("/snapshot", response_model=PublicRuntimeSummaryResponse)
async def get_public_runtime_summary_snapshot(
    service: PublicRuntimeSummaryService = Depends(
        public_runtime_summary_service_dep
    ),
):
    result = service.build()
    return PublicRuntimeSummaryResponse(**result)
