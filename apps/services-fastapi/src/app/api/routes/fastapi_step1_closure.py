from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.routes.snapshot_contract import (
    compat_snapshot,
    degraded_snapshot,
    exception_blocker,
)

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
    try:
        result = service.build()
    except Exception as exc:
        return degraded_snapshot(
            "fastapi_step1_closure",
            exception_blocker("fastapi_step1_closure", exc),
        )

    return compat_snapshot("fastapi_step1_closure", result)
