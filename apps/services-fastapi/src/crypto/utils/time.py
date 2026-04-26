from __future__ import annotations

from datetime import datetime, timezone

from crypto.errors.dbx_errors import DbxInvalidInputError


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_iso_datetime(value: str) -> datetime:
    raw = str(value or "").strip()

    if not raw:
        raise DbxInvalidInputError(
            "datetime value cannot be empty",
            code="invalid_datetime",
        )

    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError as exc:
        raise DbxInvalidInputError(
            "datetime value must be ISO-8601",
            code="invalid_datetime",
            details={"value": raw},
        ) from exc

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return parsed.astimezone(timezone.utc)


def is_expired(value: str) -> bool:
    return parse_iso_datetime(value) <= utc_now()


def seconds_until(value: str) -> int:
    delta = parse_iso_datetime(value) - utc_now()
    return max(0, int(delta.total_seconds()))