from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from services.telegram_handoff_pack_service import TelegramHandoffPackService
from shared.security.admin_guard import require_admin


handoff_service = TelegramHandoffPackService()


async def telegram_handoff_pack_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    if not await require_admin(update, context):
        return

    pack = handoff_service.build()["telegram_handoff_pack"]
    closure = pack.get("closure", {})

    lines = [
        "Telegram Handoff Pack",
        f"Closed: {'YES' if closure.get('closed') else 'NO'}",
        f"Next Subsystem: {pack.get('next_subsystem', 'unknown')}",
        f"Manifest Sections: {len(pack.get('manifest', {}))}",
    ]

    if update.effective_message:
        await update.effective_message.reply_text("\n".join(lines))
