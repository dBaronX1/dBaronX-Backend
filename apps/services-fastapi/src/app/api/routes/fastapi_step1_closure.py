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
    return FastapiStep1ClosureResponse(**result)
