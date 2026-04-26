from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from core.settings import get_settings


def is_admin_telegram_user(update: Update) -> bool:
    user = update.effective_user
    if not user:
        return False

    settings = get_settings()
    return str(user.id) in settings.admin_id_set


async def require_admin(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> bool:
    if is_admin_telegram_user(update):
        return True

    if update.effective_message:
        await update.effective_message.reply_text(
            "Admin access required for this command."
        )
    return False
