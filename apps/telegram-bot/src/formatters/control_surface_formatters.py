from __future__ import annotations

import json
from typing import Any

MAX_TELEGRAM_CHARS = 3900


def icon(success: bool | None, blockers: list[Any] | None = None) -> str:
    if success is True and not blockers:
        return "✅"
    if success is False:
        return "❌"
    return "⚠️"


def truncate(text: str, limit: int = MAX_TELEGRAM_CHARS) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 40].rstrip() + "\n… truncated for Telegram. Use debug command."


def blockers_from(payload: dict[str, Any]) -> list[str]:
    blockers = payload.get("blockers") or []
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    for key in ("blockers", "recentBlockers", "errors"):
        value = data.get(key)
        if isinstance(value, list):
            blockers.extend(str(item) for item in value)
        elif value:
            blockers.append(str(value))
    seen: list[str] = []
    for item in blockers:
        value = str(item)
        if value and value not in seen:
            seen.append(value)
    return seen[:8]


def summarize_response(label: str, payload: dict[str, Any]) -> str:
    blockers = blockers_from(payload)
    status = icon(payload.get("success"), blockers)
    lines = [f"{status} {label}"]
    lines.append(f"Status code: {payload.get('statusCode', 'n/a')}")
    message = payload.get("message")
    if message and message != "ok":
        lines.append(f"Message: {message}")
    if blockers:
        lines.append("Blockers: " + ", ".join(blockers))
    else:
        lines.append("Blockers: none reported")
    return "\n".join(lines)


def json_block(title: str, payload: Any, *, next_action: str) -> str:
    body = json.dumps(payload, indent=2, sort_keys=True, default=str)
    return truncate(f"{title}\n```json\n{body}\n```\nNext action: {next_action}")


def diagnostic(title: str, sections: list[str], *, next_action: str) -> str:
    return truncate("\n\n".join([title, *sections, f"Next action: {next_action}"]))
