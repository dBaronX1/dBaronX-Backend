from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone

logger = logging.getLogger("telegram_bot.audit")


def hash_user_id(user_id: str | int | None) -> str:
    raw = str(user_id or "unknown")
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def audit_command(command: str, user_id: str | int | None, result: str) -> None:
    logger.info(
        "telegram_command command=%s user_hash=%s timestamp=%s result=%s",
        command,
        hash_user_id(user_id),
        datetime.now(timezone.utc).isoformat(),
        result,
    )
