from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from core.settings import get_settings


def is_admin_telegram_user(update: Update) -> bool:
    settings = get_settings()
    user = update.effective_user or (
        update.callback_query.from_user if update.callback_query else None
    )
    chat = update.effective_chat

    if user:
        if str(user.id) in settings.admin_id_set:
            return True

        username = (user.username or "").removeprefix("@").lower()
        if username and username in settings.admin_username_set:
            return True

    if chat and str(chat.id) in settings.admin_chat_id_set:
        return True

    return False


async def require_admin(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> bool:
    if is_admin_telegram_user(update):
        return True

    if update.effective_message:
        await update.effective_message.reply_text(
            "Admin access required for this command."
        )
    return False
