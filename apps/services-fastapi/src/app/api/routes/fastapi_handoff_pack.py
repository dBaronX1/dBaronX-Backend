from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.fastapi_handoff_pack import FastapiHandoffPackResponse
from app.services.fastapi_handoff_pack_service import FastapiHandoffPackService

router = APIRouter(
    prefix="/fastapi-handoff-pack",
    tags=["fastapi-handoff-pack"],
)


def fastapi_handoff_pack_service_dep() -> FastapiHandoffPackService:
    return FastapiHandoffPackService()


@router.get("/snapshot", response_model=FastapiHandoffPackResponse)
async def get_fastapi_handoff_pack_snapshot(
    service: FastapiHandoffPackService = Depends(
        fastapi_handoff_pack_service_dep
    ),
):
    result = service.build()
    return FastapiHandoffPackResponse(**result)
