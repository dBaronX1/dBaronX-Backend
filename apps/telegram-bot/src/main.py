from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException, Request
from telegram import Update

from app.application import build_telegram_application
from core.logging import configure_logging
from core.settings import get_settings

configure_logging()
settings = get_settings()
telegram_app = build_telegram_application()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await telegram_app.initialize()
    await telegram_app.start()
    try:
        yield
    finally:
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
    }


@app.post("/webhook/telegram")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> dict[str, bool]:
    if settings.ENABLE_WEBHOOK_SIGNATURE_CHECK:
        expected = settings.TELEGRAM_WEBHOOK_SECRET
        if not expected or x_telegram_bot_api_secret_token != expected:
            raise HTTPException(status_code=401, detail="invalid webhook secret")

    payload = await request.json()
    update = Update.de_json(payload, telegram_app.bot)
    await telegram_app.process_update(update)
    return {"ok": True}
