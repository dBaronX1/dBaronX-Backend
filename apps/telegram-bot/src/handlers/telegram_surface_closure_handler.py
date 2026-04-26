from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from services.telegram_surface_closure_service import TelegramSurfaceClosureService
from shared.security.admin_guard import require_admin


closure_service = TelegramSurfaceClosureService()


async def telegram_surface_closure_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    if not await require_admin(update, context):
        return

    closure = closure_service.build()["telegram_surface_closure"]
    lines = [
        "Telegram Surface Closure",
        f"Closed: {'YES' if closure.get('closed') else 'NO'}",
        f"Sections: {closure.get('section_count', 0)}",
        f"Next Subsystem: {closure.get('next_subsystem', 'unknown')}",
    ]

    for item in closure.get("missing_sections", [])[:10]:
        lines.append(f"- missing: {item}")

    if update.effective_message:
        await update.effective_message.reply_text("\n".join(lines))
