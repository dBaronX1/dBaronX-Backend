from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, frozen=True)
class BackendEnvelope:
    success: bool
    payload: dict[str, Any]


@dataclass(slots=True, frozen=True)
class TelegramActorContext:
    telegram_user_id: str
    telegram_chat_id: str
    username: str | None = None
    language_code: str | None = None
    is_admin: bool = False
