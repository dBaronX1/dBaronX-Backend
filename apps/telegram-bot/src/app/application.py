from __future__ import annotations

from telegram.ext import Application

from app.router import register_handlers
from core.settings import get_settings
from shared.errors.error_handler import telegram_error_handler


def build_telegram_application() -> Application:
    settings = get_settings()

    token = settings.TELEGRAM_BOT_TOKEN or "0:missing-token-placeholder"
    application = Application.builder().token(token).build()
    register_handlers(application)
    application.add_error_handler(telegram_error_handler)
    return application
