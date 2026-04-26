from __future__ import annotations

import json
import logging
import time
from typing import Any

logger = logging.getLogger("dbaronx.fastapi")


SENSITIVE_KEYS = {
    "authorization",
    "cookie",
    "set-cookie",
    "token",
    "secret",
    "api_key",
    "apikey",
    "password",
    "internal_service_token",
}


def redact(value: Any) -> Any:
    if isinstance(value, dict):
        output: dict[str, Any] = {}
        for key, item in value.items():
            lowered = str(key).lower()
            if any(secret in lowered for secret in SENSITIVE_KEYS):
                output[key] = "[REDACTED]"
            else:
                output[key] = redact(item)
        return output

    if isinstance(value, list):
        return [redact(item) for item in value]

    return value


def log_event(event: str, *, level: str = "info", **payload: Any) -> None:
    entry = {
        "event": event,
        **redact(payload),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    serialized = json.dumps(entry, default=str, separators=(",", ":"))

    if level == "error":
        logger.error(serialized)
        return

    if level == "warning":
        logger.warning(serialized)
        return

    if level == "debug":
        logger.debug(serialized)
        return

    logger.info(serialized)


def configure_logging() -> None:
    level = __import__("os").getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, level, logging.INFO),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )