from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.captcha import CaptchaVerifyRequest, CaptchaVerifyResponse
from app.services.captcha_service import CaptchaService


def captcha_service_dep() -> CaptchaService:
    return CaptchaService()

router = APIRouter(prefix="/captcha", tags=["captcha"])


@router.post(
    "/verify",
    response_model=CaptchaVerifyResponse,
    summary="Verify anti-abuse captcha token under canonical DBX contract",
)
async def verify_captcha(
    payload: CaptchaVerifyRequest,
    service: CaptchaService = Depends(captcha_service_dep),
) -> CaptchaVerifyResponse:
    return await service.verify(payload)
