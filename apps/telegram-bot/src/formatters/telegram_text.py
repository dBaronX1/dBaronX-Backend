from __future__ import annotations

from typing import Iterable


def bullet_lines(title: str, items: Iterable[str]) -> str:
    cleaned = [item for item in items if str(item).strip()]
    lines = [title]
    lines.extend(f"- {item}" for item in cleaned)
    return "\n".join(lines)


def compact_kv(title: str, mapping: dict[str, object]) -> str:
    lines = [title]
    for key, value in mapping.items():
        lines.append(f"{key}: {value}")
    return "\n".join(lines)
