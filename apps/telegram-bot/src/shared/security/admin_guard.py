from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from core.audit import audit_command
from core.roles import Role
from core.settings import get_settings

SAFE_UNAUTHORIZED_MESSAGE = "This bot is restricted to authorized dBaronX admins."


def _effective_user(update: Update):
    return update.effective_user or (update.callback_query.from_user if update.callback_query else None)


def is_admin_telegram_user(update: Update) -> bool:
    return user_role(update) >= Role.VIEWER


def user_role(update: Update) -> Role:
    settings = get_settings()
    user = _effective_user(update)
    chat = update.effective_chat

    if user:
        user_id = str(user.id)
        if user_id in settings.admin_role_map:
            return settings.admin_role_map[user_id]

        username = (user.username or "").removeprefix("@").lower()
        if username and username in settings.admin_username_set:
            return Role.OWNER

    if chat and str(chat.id) in settings.admin_chat_id_set:
        return Role.OWNER

    return Role.UNKNOWN


async def require_admin(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> bool:
    if is_admin_telegram_user(update):
        return True

    user = _effective_user(update)
    audit_command("unknown", str(user.id) if user else None, "unauthorized")
    if update.effective_message:
        await update.effective_message.reply_text(SAFE_UNAUTHORIZED_MESSAGE)
    return False


async def require_role(update: Update, command: str, required_role: Role) -> bool:
    role = user_role(update)
    user = _effective_user(update)
    if role >= required_role:
        return True
    audit_command(command, str(user.id) if user else None, "unauthorized")
    if update.effective_message:
        await update.effective_message.reply_text(SAFE_UNAUTHORIZED_MESSAGE)
    return False
