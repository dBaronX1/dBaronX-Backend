from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException, Request
from telegram import Update

from app.application import build_telegram_application
from core.logging import configure_logging
from core.settings import get_settings

configure_logging()
logger = logging.getLogger(__name__)
settings = get_settings()
telegram_app = build_telegram_application()
telegram_app_started = False


async def _ensure_telegram_runtime_started() -> None:
    global telegram_app_started
    if telegram_app_started:
        return

    await telegram_app.initialize()
    await telegram_app.start()
    telegram_app_started = True


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await _ensure_telegram_runtime_started()
    logger.info(
        "Route status: webhook path=/webhook health path=/health ready path=/ready telegramRuntimeStarted=%s",
        telegram_app_started,
    )
    try:
        yield
    finally:
        if telegram_app_started:
            await telegram_app.stop()
            await telegram_app.shutdown()


app = FastAPI(
    title="dBaronX Telegram Bot",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health() -> dict[str, object]:
    return {
        "success": True,
        "service": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "telegramRuntimeStarted": telegram_app_started,
    }


@app.get("/ready")
async def ready() -> dict[str, object]:
    if not telegram_app_started:
        raise HTTPException(status_code=503, detail="telegram runtime not started")
    return {"ok": True, "telegramRuntimeStarted": True}


async def _process_telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> dict[str, bool]:
    if settings.ENABLE_WEBHOOK_SIGNATURE_CHECK:
        expected = settings.TELEGRAM_WEBHOOK_SECRET
        if not expected or x_telegram_bot_api_secret_token != expected:
            raise HTTPException(status_code=403, detail="invalid webhook secret")

    body = await request.body()
    if len(body) > settings.MAX_WEBHOOK_BODY_BYTES:
        raise HTTPException(status_code=413, detail="webhook payload too large")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="invalid webhook payload") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="invalid webhook payload")

    await _ensure_telegram_runtime_started()
    update = Update.de_json(payload, telegram_app.bot)
    await telegram_app.process_update(update)
    return {"ok": True}


@app.post("/webhook/telegram")
async def telegram_webhook_telegram(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> dict[str, bool]:
    return await _process_telegram_webhook(request, x_telegram_bot_api_secret_token)


@app.post("/webhook")
async def telegram_webhook_compat(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> dict[str, bool]:
    return await _process_telegram_webhook(request, x_telegram_bot_api_secret_token)
