from __future__ import annotations

import json
import logging
import time
from contextlib import contextmanager
from typing import Any, Iterator, Optional

logger = logging.getLogger("dbaronx.fastapi.dbx")


def redact(value: Any) -> Any:
    if isinstance(value, dict):
        output: dict[str, Any] = {}
        for key, item in value.items():
            lowered = str(key).lower()
            if any(secret in lowered for secret in ("token", "secret", "authorization", "api_key")):
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
    elif level == "warning":
        logger.warning(serialized)
    elif level == "debug":
        logger.debug(serialized)
    else:
        logger.info(serialized)


@contextmanager
def observe_duration(
    event: str,
    *,
    reference: Optional[str] = None,
    signature: Optional[str] = None,
) -> Iterator[None]:
    started = time.perf_counter()

    try:
        yield
        log_event(
            event,
            reference=reference,
            signature=signature,
            durationMs=round((time.perf_counter() - started) * 1000, 2),
            status="success",
        )
    except Exception as exc:
        log_event(
            event,
            level="error",
            reference=reference,
            signature=signature,
            durationMs=round((time.perf_counter() - started) * 1000, 2),
            status="failed",
            errorType=exc.__class__.__name__,
            error=str(exc),
        )
        raise