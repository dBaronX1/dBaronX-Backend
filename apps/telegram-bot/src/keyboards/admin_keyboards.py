from __future__ import annotations

from telegram import InlineKeyboardButton, InlineKeyboardMarkup


def admin_home_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Launch", callback_data="admin:launch"),
                InlineKeyboardButton("Readiness", callback_data="admin:readiness"),
            ],
            [
                InlineKeyboardButton("Payout Queue", callback_data="admin:payout_queue"),
                InlineKeyboardButton("Ads Queue", callback_data="admin:ads_queue"),
            ],
            [
                InlineKeyboardButton("AI Stories", callback_data="admin:ai_queue"),
                InlineKeyboardButton("Suppliers", callback_data="admin:suppliers"),
            ],
            [
                InlineKeyboardButton("FastAPI", callback_data="admin:fastapi"),
            ],
        ]
    )
