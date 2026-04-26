from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from shared.security.admin_guard import require_admin


async def callback_fallback_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    if not await require_admin(update, context):
        return

    query = update.callback_query
    if not query:
        return

    await query.answer()
    await query.edit_message_text("Unhandled callback action.")
