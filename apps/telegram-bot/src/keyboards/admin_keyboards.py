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
                InlineKeyboardButton("Ops", callback_data="admin:ops"),
            ],
            [
                InlineKeyboardButton("Admin Summary", callback_data="admin:admin_summary"),
                InlineKeyboardButton("Launch Audit", callback_data="admin:launch_audit"),
            ],
            [
                InlineKeyboardButton("Command Manifest", callback_data="admin:commands"),
                InlineKeyboardButton("Help", callback_data="admin:help"),
            ],
            [
                InlineKeyboardButton(
                    "Telegram Closure",
                    callback_data="admin:telegram_closure",
                ),
                InlineKeyboardButton(
                    "Telegram Handoff",
                    callback_data="admin:telegram_handoff",
                ),
            ],
        ]
    )
