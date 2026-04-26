from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from shared.security.admin_guard import is_admin_telegram_user


async def help_handler(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    admin = is_admin_telegram_user(update)

    lines = [
        "dBaronX Telegram Bot Commands",
        "/start - open bot",
        "/help - show commands",
    ]

    if admin:
        lines.extend(
            [
                "",
                "Admin Commands",
                "/admin - open admin surface",
                "/launch - launch closure status",
                "/readiness - readiness matrix",
                "/fastapi - FastAPI closure status",
                "/platform_pack - platform admin pack",
                "/payout_queue - payout review queue",
                "/payout_approve <id>",
                "/payout_reject <id> [reason]",
                "/payout_settle <id> [external_ref]",
                "/ads_queue - ads review queue",
                "/ai_queue - AI stories review queue",
                "/suppliers_ops - supplier ops dashboard",
            ]
        )

    if update.effective_message:
        await update.effective_message.reply_text("\n".join(lines))
