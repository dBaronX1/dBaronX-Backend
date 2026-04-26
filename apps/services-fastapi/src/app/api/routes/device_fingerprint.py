from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.device_fingerprint import (
    DeviceFingerprintRequest,
    DeviceFingerprintResponse,
)
from app.services.device_fingerprint_service import DeviceFingerprintService

router = APIRouter(prefix="/device-fingerprint", tags=["device-fingerprint"])


def device_fingerprint_service_dep() -> DeviceFingerprintService:
    return DeviceFingerprintService()


@router.post("/build", response_model=DeviceFingerprintResponse)
async def build_device_fingerprint(
    payload: DeviceFingerprintRequest,
    service: DeviceFingerprintService = Depends(device_fingerprint_service_dep),
):
    result = service.build(
        headers=payload.headers,
        ip=payload.ip,
        account_id=payload.account_id,
        fingerprint_seed=payload.fingerprint_seed,
    )
    return DeviceFingerprintResponse(**result)
