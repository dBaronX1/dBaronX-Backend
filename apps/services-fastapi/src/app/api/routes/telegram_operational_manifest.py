from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.telegram_operational_manifest import (
    TelegramOperationalManifestResponse,
)
from app.services.telegram_operational_manifest_service import (
    TelegramOperationalManifestService,
)

router = APIRouter(
    prefix="/telegram-operational-manifest",
    tags=["telegram-operational-manifest"],
)


def telegram_operational_manifest_service_dep() -> TelegramOperationalManifestService:
    return TelegramOperationalManifestService()


@router.get("/snapshot", response_model=TelegramOperationalManifestResponse)
async def get_telegram_operational_manifest_snapshot(
    service: TelegramOperationalManifestService = Depends(
        telegram_operational_manifest_service_dep
    ),
):
    result = service.build()
    return TelegramOperationalManifestResponse(**result)
