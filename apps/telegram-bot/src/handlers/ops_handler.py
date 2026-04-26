from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from keyboards.ops_keyboards import ops_surface_keyboard
from shared.security.admin_guard import require_admin


async def ops_home_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context):
        return

    lines = [
        "dBaronX Ops Surface",
        "Choose a control area below.",
    ]

    if update.effective_message:
        await update.effective_message.reply_text(
            "\n".join(lines),
            reply_markup=ops_surface_keyboard(),
        )
