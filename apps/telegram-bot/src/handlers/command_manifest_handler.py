from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from services.telegram_command_manifest_service import TelegramCommandManifestService
from shared.security.admin_guard import require_admin


manifest_service = TelegramCommandManifestService()


async def command_manifest_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    if not await require_admin(update, context):
        return

    payload = manifest_service.build().get("telegram_command_manifest", {})

    lines = ["Telegram Command Manifest"]
    for section, commands in payload.items():
        lines.append("")
        lines.append(section.replace("_", " ").title())
        lines.extend(f"- {cmd}" for cmd in commands[:20])

    if update.effective_message:
        await update.effective_message.reply_text("\n".join(lines))
