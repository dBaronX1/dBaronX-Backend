from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin
from services.nestjs_client import NestJsClient


nestjs_client = NestJsClient()


async def telegram_admin_summary_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    if not await require_admin(update, context):
        return

    actor = build_actor_context(update)
    payload = await nestjs_client.get_system_admin_pack(actor_id=actor.telegram_user_id)
    summary = payload.get("platformAdminPack", {}).get("summary", {})

    lines = [
        "Admin Summary",
        f"Wallet sections: {'YES' if 'wallet' in summary else 'NO'}",
        f"Payout sections: {'YES' if 'payouts' in summary else 'NO'}",
        f"Payments sections: {'YES' if 'payments' in summary else 'NO'}",
        f"Suppliers sections: {'YES' if 'suppliers' in summary else 'NO'}",
        f"Ads sections: {'YES' if 'ads' in summary else 'NO'}",
        f"AI Stories sections: {'YES' if 'aiStories' in summary else 'NO'}",
        f"Commerce sections: {'YES' if 'commerce' in summary else 'NO'}",
    ]

    if update.effective_message:
        await update.effective_message.reply_text("\n".join(lines))
