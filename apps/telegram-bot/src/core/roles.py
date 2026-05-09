from __future__ import annotations

from enum import IntEnum


class Role(IntEnum):
    UNKNOWN = 0
    VIEWER = 10
    OPS = 20
    ADMIN = 30
    OWNER = 40


def parse_role(value: str | None) -> Role:
    normalized = (value or "").strip().upper()
    return {
        "VIEWER": Role.VIEWER,
        "OPS": Role.OPS,
        "ADMIN": Role.ADMIN,
        "OWNER": Role.OWNER,
    }.get(normalized, Role.OWNER)
