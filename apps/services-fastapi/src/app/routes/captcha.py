from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.core.dependencies import get_captcha_service
from app.schemas.captcha import CaptchaVerifyRequest, CaptchaVerifyResponse
from app.services.captcha_service import CaptchaService

router = APIRouter()


@router.post("/verify", response_model=CaptchaVerifyResponse)
async def verify_captcha(
    payload: CaptchaVerifyRequest,
    request: Request,
    service: CaptchaService = Depends(get_captcha_service),
) -> CaptchaVerifyResponse:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    ip = payload.ip or (forwarded_for.split(",")[0].strip() if forwarded_for else None)

    result = await service.verify_token(
        token=payload.token,
        action=payload.action,
        ip=ip,
    )

    return CaptchaVerifyResponse(**result)
