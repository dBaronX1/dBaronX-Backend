from __future__ import annotations

from telegram import InlineKeyboardButton, InlineKeyboardMarkup


def ops_surface_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Watch", callback_data="ops:watch"),
                InlineKeyboardButton("Affiliate", callback_data="ops:affiliate"),
            ],
            [
                InlineKeyboardButton("AI Stories", callback_data="ops:ai_stories"),
                InlineKeyboardButton("Commerce", callback_data="ops:commerce"),
            ],
            [
                InlineKeyboardButton("Status", callback_data="ops:status"),
                InlineKeyboardButton("Admin", callback_data="ops:admin"),
            ],
            [
                InlineKeyboardButton("Ops Pack", callback_data="ops:ops_pack"),
                InlineKeyboardButton("Command Manifest", callback_data="ops:commands"),
            ],
            [
                InlineKeyboardButton("Help", callback_data="ops:help"),
            ],
        ]
    )
