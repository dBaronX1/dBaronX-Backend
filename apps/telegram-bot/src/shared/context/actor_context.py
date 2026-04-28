from __future__ import annotations

from telegram import Update

from shared.contracts.backend_contracts import TelegramActorContext
from shared.security.admin_guard import is_admin_telegram_user


def build_actor_context(update: Update) -> TelegramActorContext:
    user = update.effective_user or (
        update.callback_query.from_user if update.callback_query else None
    )
    chat = update.effective_chat or (
        update.callback_query.message.chat if update.callback_query and update.callback_query.message else None
    )

    telegram_user_id = str(user.id) if user else (str(chat.id) if chat else "")

    return TelegramActorContext(
        telegram_user_id=telegram_user_id,
        telegram_chat_id=str(chat.id) if chat else "",
        username=user.username if user else None,
        language_code=user.language_code if user else None,
        is_admin=is_admin_telegram_user(update),
    )
