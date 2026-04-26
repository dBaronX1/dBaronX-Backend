from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from keyboards.admin_keyboards import admin_home_keyboard
from shared.context.actor_context import build_actor_context


async def start_handler(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    actor = build_actor_context(update)

    lines = [
        "dBaronX Telegram Control Surface",
        f"Telegram User ID: {actor.telegram_user_id}",
        f"Admin: {'YES' if actor.is_admin else 'NO'}",
    ]

    if update.effective_message:
        await update.effective_message.reply_text(
            "\n".join(lines),
            reply_markup=admin_home_keyboard() if actor.is_admin else None,
        )
