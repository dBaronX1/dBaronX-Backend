from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from shared.security.admin_guard import require_admin


async def ops_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context):
        return

    query = update.callback_query
    if not query:
        return

    await query.answer()

    mapping = {
        "ops:watch": "Use /watch_ops",
        "ops:affiliate": "Use /affiliate_ops",
        "ops:ai_stories": "Use /ai_stories_ops",
        "ops:commerce": "Use /commerce_ops",
        "ops:status": "Use /status",
        "ops:admin": "Use /admin",
    }

    await query.edit_message_text(mapping.get(query.data or "", "Unknown ops action."))
